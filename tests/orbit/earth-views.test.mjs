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

void test('Layout roll keeps Earth below-left without cancelling physical sky or camera motion', async (t) => {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    earthTexture: textureFixture(),
  });
  t.after(() => env.dispose());
  await env.ready;
  const reference = createOrbitalWorldReference(THREE);
  const camera = reference.clone();
  const resources = resourcesOf(env.scene);
  const surface = surfaceOf(env);
  const textureVersion = surface.material.map.version;
  env.setEarthPlayback({ type: 'seek', time: 73 });
  const phase = surface.material.map.offset.toArray();
  // Geography projections below inspect the mesh, independent of elapsed UV time.
  const geography = () => {
    env.scene.updateMatrixWorld(true);
    return [
      [12, 48],
      [-5, 38],
      [35, 55],
    ].map(([longitude, latitude]) => {
      const phi = THREE.MathUtils.degToRad(latitude);
      const theta = THREE.MathUtils.degToRad(longitude);
      return new THREE.Vector3(
        Math.cos(phi) * Math.cos(theta),
        Math.sin(phi),
        -Math.cos(phi) * Math.sin(theta),
      )
        .applyMatrix4(surface.matrixWorld)
        .project(env.camera);
    });
  };
  const originalPosition = camera.position.clone();
  const originalQuaternion = camera.quaternion.clone();
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [768, 1024],
    [1080, 1920],
  ]) {
    camera.aspect = width / height;
    camera.fov = responsiveCameraFov(camera.aspect);
    camera.updateProjectionMatrix();
    env.resize(width, height, 2, camera.fov);
    let stationaryProjection;
    for (const moved of [false, true]) {
      camera.position.copy(originalPosition);
      camera.quaternion.copy(originalQuaternion);
      if (moved) {
        camera.position.add(new THREE.Vector3(3, -2, 4));
        camera.rotateY(0.08);
      }
      camera.updateMatrixWorld(true);
      const unrolledPosition = camera.position.clone();
      const unrolledQuaternion = camera.quaternion.clone();
      env.followCamera(camera, reference, 0);
      const unrolled = geography();
      const physicalCamera = env.camera.matrixWorld.clone();
      if (!moved) {
        stationaryProjection = unrolled[0].clone();
        assert.ok(unrolled[0].x < 0 && unrolled[0].x > -1);
        assert.ok(unrolled[0].y < 0 && unrolled[0].y > -1);
      }
      for (const roll of [0.01, Math.PI / 4, Math.PI / 2, Math.PI / 3, 0]) {
        const rotation = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          -roll,
        );
        camera.position.copy(unrolledPosition).applyQuaternion(rotation);
        camera.quaternion.copy(unrolledQuaternion).premultiply(rotation);
        camera.updateMatrixWorld(true);
        env.followCamera(camera, reference, roll);
        const rolled = geography();
        rolled.forEach((point, i) =>
          assert.ok(
            point.distanceTo(unrolled[i]) < 1e-8,
            `Layout roll ${roll} preserves Earth projection at ${width}×${height}`,
          ),
        );
        assert.deepEqual(
          surface.material.map.offset.toArray(),
          phase,
          'No texture phase reset',
        );
        assert.deepEqual(
          resourcesOf(env.scene),
          resources,
          'No new render resources',
        );
        assert.equal(
          surface.material.map.version,
          textureVersion,
          'No texture upload',
        );
        if (roll > 0)
          assert.notDeepEqual(
            env.camera.matrixWorld.toArray(),
            physicalCamera.toArray(),
            'Stars and meteors still see the real rolled camera',
          );
      }
      if (moved)
        assert.ok(
          unrolled[0].distanceTo(stationaryProjection) > 0.05,
          'Actual camera translation and yaw still change the Earth view',
        );
    }
  }
});
