import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';
import { responsiveCameraFov } from '../../features/spacecraft/navigation/scene-controls.ts';
import {
  NIGHT_EARTH_OPENING,
  createOrbitalWorldReference,
} from '../../features/orbit/earth-view-transform.ts';

const bundled = await build({
  entryPoints: ['features/orbit/orbital-environment.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const { createOrbitalEnvironment } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);

const textureFixture = () => new THREE.Texture({ width: 2560, height: 1536 });
const surfaceOf = (env) => env.scene.getObjectByName('satellite-earth-surface');

void test('Night Earth shares one geometry with one atmosphere and has no unused daylight rig', async (t) => {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    earthTexture: textureFixture(),
  });
  t.after(() => env.dispose());
  await env.ready;
  const surface = surfaceOf(env);
  const atmosphere = env.scene.getObjectByName('night-earth-atmosphere');
  assert.equal(surface.parent.children.length, 2);
  assert.equal(
    atmosphere.geometry,
    surface.geometry,
    'No duplicate sphere allocation',
  );
  assert.equal(
    atmosphere.material.depthWrite,
    false,
    'Glow never occludes other scene objects',
  );
  assert.equal(atmosphere.material.toneMapped, false);
  assert.ok(atmosphere.scale.x > surface.scale.x);
  let lights = 0;
  env.scene.traverse((object) => {
    if (object.isLight) lights++;
  });
  assert.equal(lights, 0, 'The photograph and airglow need no daylight lights');
  assert.equal(env.getDiagnostics().earthAtmosphereLayers, 1);
  assert.equal(env.getDiagnostics().drawCallBudget, 13);
});

const close = (actual, expected, message) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-8,
    `${message}: ${actual} ≠ ${expected}`,
  );

function resourcesOf(scene) {
  const resources = new Set();
  scene.traverse((object) => {
    if (object.geometry) resources.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      resources.add(material);
      if (material.map) resources.add(material.map);
      for (const uniform of Object.values(material.uniforms ?? {})) {
        if (uniform.value?.isTexture) resources.add(uniform.value);
      }
    }
  });
  return resources;
}

function starClock(env) {
  const uniforms = [];
  env.scene.traverse((object) => {
    if (object.isPoints && object.material.uniforms?.time)
      uniforms.push(object.material.uniforms.time.value);
  });
  assert.equal(uniforms.length, 1, 'Inspect the actual star shader clock');
  return uniforms[0];
}

function mockBitmap(t, decode) {
  const previous = Object.getOwnPropertyDescriptor(
    globalThis,
    'createImageBitmap',
  );
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: decode,
  });
  t.after(() => {
    if (previous)
      Object.defineProperty(globalThis, 'createImageBitmap', previous);
    else delete globalThis.createImageBitmap;
  });
}

// Project the approved geography through the real scene, independently of the
// placement function. This catches points placed behind Earth or below the crop.
function projectGeography(env, longitude = 12, latitude = 48) {
  const phi = THREE.MathUtils.degToRad(latitude);
  const theta = THREE.MathUtils.degToRad(longitude);
  const normal = new THREE.Vector3(
    Math.cos(phi) * Math.cos(theta),
    Math.sin(phi),
    -Math.cos(phi) * Math.sin(theta),
  );
  env.scene.updateMatrixWorld(true);
  env.camera.updateMatrixWorld(true);
  const surface = surfaceOf(env);
  const point = normal
    .clone()
    .applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      env.getDiagnostics().earthRotation,
    )
    .applyMatrix4(surface.matrixWorld);
  const center = surface.getWorldPosition(new THREE.Vector3());
  return {
    screen: point.clone().project(env.camera),
    front: point
      .clone()
      .sub(center)
      .dot(env.camera.position.clone().sub(point)),
    matrices: [
      ...surface.matrixWorld.elements,
      ...env.camera.projectionMatrix.elements,
    ],
  };
}

for (const [width, height, mobile] of [[1280, 720, false]]) {
  void test(`The approved Europe opening stays visible for the first ten seconds at ${width}×${height}`, async (t) => {
    const env = createOrbitalEnvironment(THREE, () => {}, {
      mobile,
      cameraFov: 38,
      earthTexture: textureFixture(),
    });
    t.after(() => env.dispose());
    await env.ready;
    assert.deepEqual(NIGHT_EARTH_OPENING, {
      longitude: 12,
      latitude: 48,
      roll: -10,
    });
    assert.deepEqual(env.getDiagnostics().earthOpening, NIGHT_EARTH_OPENING);
    env.resize(width, height, mobile ? 1 : 2);
    for (const elapsed of [0, 5, 10]) {
      env.update(elapsed, true, 0, 0);
      const { screen, front, matrices } = projectGeography(env);
      const context = JSON.stringify({
        width,
        height,
        elapsed,
        projected: screen.toArray(),
      });
      assert.ok(matrices.every(Number.isFinite), context);
      assert.ok(
        front > 0,
        `The opening region must face the viewer: ${context}`,
      );
      assert.ok(
        screen.x >= -1 && screen.x <= 1,
        `Horizontal visibility: ${context}`,
      );
      assert.ok(
        screen.y >= -1 && screen.y <= -0.6,
        `Below the ship, inside the viewport: ${context}`,
      );
      assert.ok(
        screen.z >= -1 && screen.z <= 1,
        `Inside camera clipping planes: ${context}`,
      );
      assert.ok(
        surfaceOf(env).parent.position.distanceTo(env.camera.position) > 181.5,
        'Camera stays outside the atmosphere',
      );
    }
  });
}

void test('Resizing crops a fixed geographic scene without moving Earth or resetting the physical camera', async (t) => {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    cameraFov: 38,
    earthTexture: textureFixture(),
  });
  t.after(() => env.dispose());
  await env.ready;
  const reference = createOrbitalWorldReference(THREE);
  const camera = reference.clone();
  camera.position.add(new THREE.Vector3(3, -2, 4));
  camera.rotateY(0.08);
  camera.updateMatrixWorld(true);
  env.followCamera(camera, reference);
  env.update(83, true, 0, 0);
  const surface = surfaceOf(env);
  env.scene.updateMatrixWorld(true);
  const earthMatrix = surface.matrixWorld.toArray();
  const cameraMatrix = env.camera.matrixWorld.toArray();
  const offset = surface.material.map.offset.toArray();
  let referenceProjection;
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [2560, 600],
    [768, 4096],
    [1280, 720],
  ]) {
    const fov = responsiveCameraFov(width / height);
    env.resize(width, height, 2, fov);
    env.scene.updateMatrixWorld(true);
    assert.deepEqual(
      surface.matrixWorld.toArray(),
      earthMatrix,
      'World geometry is independent of screen dimensions',
    );
    assert.deepEqual(
      env.camera.matrixWorld.toArray(),
      cameraMatrix,
      'Resizing does not reset shared camera travel',
    );
    assert.deepEqual(
      surface.material.map.offset.toArray(),
      offset,
      'Resizing does not seek or reorient the geography',
    );
    const { screen } = projectGeography(env);
    const focal = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const unscaled = [
      ((screen.x * width) / height) * focal,
      screen.y * focal,
      screen.z,
    ];
    referenceProjection ??= unscaled;
    unscaled.forEach((value, index) =>
      close(
        value,
        referenceProjection[index],
        'Identical world ray; only lens and framing change',
      ),
    );
  }
  const independent = createOrbitalWorldReference(THREE);
  assert.deepEqual(
    independent.matrixWorld.toArray(),
    reference.matrixWorld.toArray(),
    'Registration never depends on the first visitor viewport',
  );
});

void test('Night lighting stays photographic and resizing reuses every loaded resource', async (t) => {
  let decoded = 0,
    closed = 0,
    invalidations = 0;
  mockBitmap(t, async () => {
    decoded++;
    return {
      width: 2560,
      height: 1536,
      close() {
        closed++;
      },
    };
  });
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(new Uint8Array(4)),
  );
  const env = createOrbitalEnvironment(THREE, () => invalidations++, {});
  t.after(() => env.dispose());
  await env.ready;
  const surface = surfaceOf(env);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(
    fetch.mock.calls[0].arguments[0],
    '/textures/earth-europe-loop.webp',
  );
  assert.equal(surface.material.isMeshBasicMaterial, true);
  assert.equal(
    surface.material.toneMapped,
    false,
    'Night lights bypass daytime illumination/tone mapping',
  );
  assert.equal(
    surface.material.color.getHex(),
    0xffffff,
    'No blanket color tint on the photograph',
  );
  const resources = resourcesOf(env.scene);
  let disposals = 0;
  for (const resource of resources)
    resource.addEventListener('dispose', () => disposals++);
  const textureVersion = surface.material.map.version;
  const geometry = surface.geometry;
  const material = surface.material;
  for (let repeat = 0; repeat < 3; repeat++) {
    for (const [width, height] of [
      [390, 844],
      [1280, 720],
      [2560, 600],
    ]) {
      env.resize(width, height, 2);
      env.update(20 + repeat, true, 0, 0);
      assert.deepEqual(resourcesOf(env.scene), resources);
    }
  }
  assert.equal(
    fetch.mock.callCount(),
    1,
    'Resizing never downloads another map',
  );
  assert.equal(decoded, 1, 'Resizing never decodes another map');
  assert.equal(disposals, 0, 'Resizing does not dispose live resources');
  assert.equal(surface.geometry, geometry);
  assert.equal(surface.material, material);
  assert.equal(
    material.map.version,
    textureVersion,
    'Resizing does not request another texture upload',
  );
  assert.equal(closed, 0);
  assert.ok(invalidations > 1);
  env.dispose();
  assert.equal(closed, 1);
  assert.equal(
    disposals,
    resources.size,
    'Every owned resource is released exactly once',
  );
  const final = env.getDiagnostics();
  const finalInvalidations = invalidations;
  env.update(50, true, 0, 0);
  env.dispose();
  assert.deepEqual(env.getDiagnostics(), final);
  assert.equal(
    invalidations,
    finalInvalidations,
    'Disposed environments ignore updates',
  );
  assert.equal(disposals, resources.size);
});

void test('The opening waits for image readiness and respects the global active clock', async (t) => {
  let releaseBitmap;
  let notifyDecode;
  const decoding = new Promise((resolve) => {
    notifyDecode = resolve;
  });
  mockBitmap(t, () => {
    notifyDecode();
    return new Promise((resolve) => {
      releaseBitmap = resolve;
    });
  });
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(new Uint8Array(4)),
  );
  const env = createOrbitalEnvironment(THREE, () => {}, {});
  t.after(() => env.dispose());
  await decoding;
  env.resize(1280, 720, 2);
  env.update(10, true, 0, 0);
  assert.equal(env.getDiagnostics().earthReady, false);
  assert.equal(
    env.getDiagnostics().earthOpeningElapsed,
    0,
    'A slow image load must not skip the opening',
  );
  assert.equal(starClock(env), 10, 'The stars still follow the global clock');
  releaseBitmap({ width: 2560, height: 1536, close() {} });
  await env.ready;
  env.update(10, true, 0, 0);
  assert.equal(env.getDiagnostics().earthOpeningElapsed, 0);
  env.update(15, true, 0, 0);
  close(
    env.getDiagnostics().earthOpeningElapsed,
    5,
    'Five visible seconds after image readiness',
  );
  close(
    env.getDiagnostics().earthRotation,
    0.0225,
    'Earth rotates from its approved opening',
  );
  assert.equal(starClock(env), 15);
  const paused = env.getDiagnostics();
  env.update(90, false, 0, 0);
  assert.deepEqual(
    env.getDiagnostics(),
    paused,
    'Global motion pause also stops Earth',
  );
  env.update(16, true, 0, 0);
  close(
    env.getDiagnostics().earthOpeningElapsed,
    6,
    'Resume uses the caller’s active clock without a jump',
  );
  assert.equal(starClock(env), 16);
});

void test('Portrait composition stays fixed while both directions of camera navigation move Earth on screen', async (t) => {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    earthTexture: textureFixture(),
  });
  t.after(() => env.dispose());
  await env.ready;
  const reference = createOrbitalWorldReference(THREE);
  const camera = reference.clone();
  const surface = surfaceOf(env);
  const atmosphere = env.scene.getObjectByName('night-earth-atmosphere');
  const resources = resourcesOf(env.scene);
  const textureVersion = surface.material.map.version;
  const axis = new THREE.Vector3(0, 0, 1);
  env.setEarthPlayback({ type: 'seek', time: 73 });
  const phase = surface.material.map.offset.toArray();
  let clock = 0;
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [768, 1024],
    [1080, 1920],
  ]) {
    const portrait = height > width;
    camera.aspect = width / height;
    camera.fov = responsiveCameraFov(camera.aspect);
    camera.updateProjectionMatrix();
    env.resize(width, height, 2, camera.fov);
    env.setViewportComposition(portrait, reference, true);
    env.scene.updateMatrixWorld(true);
    const earthMatrix = surface.matrixWorld.toArray();
    const atmosphereMatrix = atmosphere.matrixWorld.toArray();
    const latitude = THREE.MathUtils.degToRad(48),
      longitude = THREE.MathUtils.degToRad(12);
    const landmark = new THREE.Vector3(
      Math.cos(latitude) * Math.cos(longitude),
      Math.sin(latitude),
      -Math.cos(latitude) * Math.sin(longitude),
    ).applyMatrix4(surface.matrixWorld);
    const projections = [];
    const rolls = portrait
      ? [Math.PI / 2, 1.2, 0.8, 0.4, 0, 0.4, 0.8, 1.2, Math.PI / 2]
      : [0, 0.4, 0];
    for (const [index, roll] of rolls.entries()) {
      const rotation = new THREE.Quaternion().setFromAxisAngle(axis, -roll);
      camera.position.copy(reference.position).applyQuaternion(rotation);
      camera.quaternion.copy(reference.quaternion).premultiply(rotation);
      camera.updateMatrixWorld(true);
      env.followCamera(camera, reference);
      env.update(++clock, true, 0, 0);
      // Same-orientation observer notifications cannot restart or retarget Earth.
      env.setViewportComposition(portrait, reference);
      env.scene.updateMatrixWorld(true);
      assert.deepEqual(
        surface.matrixWorld.toArray(),
        earthMatrix,
        'Navigation leaves Earth fixed in world space',
      );
      assert.deepEqual(
        atmosphere.matrixWorld.toArray(),
        atmosphereMatrix,
        'Atmosphere shares fixed placement',
      );
      const expectedView = reference.matrixWorld
        .clone()
        .invert()
        .multiply(camera.matrixWorld);
      const expectedPosition = new THREE.Vector3(),
        expectedQuaternion = new THREE.Quaternion();
      expectedView.decompose(
        expectedPosition,
        expectedQuaternion,
        new THREE.Vector3(),
      );
      expectedPosition.multiplyScalar(1 / 32);
      assert.ok(env.camera.position.distanceTo(expectedPosition) < 1e-8);
      assert.ok(
        env.camera.quaternion.angleTo(expectedQuaternion) < 1e-7,
        'Earth and sky use the same physical camera',
      );
      const screen = landmark.clone().project(env.camera);
      projections.push(screen);
      if (index === 0)
        assert.ok(
          screen.x > -1 && screen.x < 0 && screen.y > -1 && screen.y < 0,
          'Approved opening remains below-left in overview',
        );
      assert.deepEqual(
        surface.material.map.offset.toArray(),
        phase,
        'Navigation never seeks the texture',
      );
    }
    assert.ok(
      projections[0].distanceTo(projections[Math.floor(rolls.length / 2)]) >
        0.1,
      'Earth must visibly respond to camera rotation, not stay pinned',
    );
    assert.ok(
      projections[0].distanceTo(projections.at(-1)) < 1e-8,
      'Round trip returns to the original view',
    );
    assert.deepEqual(resourcesOf(env.scene), resources);
    assert.equal(surface.material.map.version, textureVersion);
  }
});

void test('Only viewport orientation retargets Earth; resizing eases independently and reduced motion settles immediately', async (t) => {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    earthTexture: textureFixture(),
  });
  t.after(() => env.dispose());
  await env.ready;
  const reference = createOrbitalWorldReference(THREE);
  const surface = surfaceOf(env);
  env.scene.updateMatrixWorld(true);
  const landscape = surface.matrixWorld.toArray();
  env.setViewportComposition(true, reference, true);
  env.scene.updateMatrixWorld(true);
  const portrait = surface.matrixWorld.toArray();
  assert.equal(
    env.getDiagnostics().earthCompositionRoll,
    Math.PI / 2,
    'Deep-link opening can start in portrait before its flight',
  );
  env.setViewportComposition(false, reference);
  assert.equal(
    env.getDiagnostics().earthCompositionRoll,
    Math.PI / 2,
    'Resize does not jump immediately',
  );
  env.update(0.05, true, 0, 0);
  const intermediate = env.getDiagnostics().earthCompositionRoll;
  assert.ok(intermediate > 0 && intermediate < Math.PI / 2);
  env.setViewportComposition(false, reference);
  assert.equal(
    env.getDiagnostics().earthCompositionRoll,
    intermediate,
    'Same layout does not restart easing',
  );
  env.update(2, true, 0, 0);
  assert.equal(env.getDiagnostics().earthCompositionRoll, 0);
  env.scene.updateMatrixWorld(true);
  surface.matrixWorld
    .toArray()
    .forEach((value, index) =>
      close(value, landscape[index], 'Landscape restored without drift'),
    );
  env.setViewportComposition(true, reference);
  env.update(2, false, 0, 0);
  assert.equal(
    env.getDiagnostics().earthCompositionRoll,
    Math.PI / 2,
    'Reduced motion snaps to the requested composition',
  );
  env.scene.updateMatrixWorld(true);
  assert.deepEqual(surface.matrixWorld.toArray(), portrait);
});
