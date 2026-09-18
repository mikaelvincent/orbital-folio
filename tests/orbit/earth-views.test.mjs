import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import sharp from 'sharp';
import * as THREE from 'three';
import { NIGHT_EARTH_OPENING } from '../../features/orbit/earth-view-transform.ts';

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

const textureFixture = () => new THREE.Texture({ width: 8192, height: 4096 });
const surfaceOf = (env) => env.scene.getObjectByName('satellite-earth-surface');

void test('Night Earth shares one geometry with one atmosphere and has no unused daylight rig', async (t) => {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    earthAppearance: 'night',
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
function projectGeography(env, longitude = 110, latitude = 30) {
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
  const point = normal.clone().applyMatrix4(surface.matrixWorld);
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

for (const [width, height, mobile] of [
  [1280, 720, false],
  [2560, 600, false],
  [390, 844, true],
  [768, 4096, true],
]) {
  void test(`Inland East Asia stays visible for the first ten seconds at ${width}×${height}`, async (t) => {
    const env = createOrbitalEnvironment(THREE, () => {}, {
      mobile,
      cameraFov: 38,
      earthAppearance: 'night',
      earthTexture: textureFixture(),
    });
    t.after(() => env.dispose());
    await env.ready;
    assert.deepEqual(NIGHT_EARTH_OPENING, {
      longitude: 110,
      latitude: 30,
      roll: -12,
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

// These visual proxies intentionally use the unchanged photograph, not an
// authoritative land mask. Coarse decoding once keeps this regression lightweight.
// The separate audit retains full-resolution comparisons and rejected openings.
void test('The early rotation retains terrain and city detail instead of reaching the Atlantic', async (t) => {
  const { data, info } = await sharp(
    new URL('../../public/textures/earth-black-marble-8k.jpg', import.meta.url)
      .pathname,
  )
    .resize(1024)
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (const [width, height] of [
    [1280, 720],
    [2560, 600],
    [390, 844],
  ]) {
    const env = createOrbitalEnvironment(THREE, () => {}, {
      cameraFov: 38,
      earthAppearance: 'night',
      earthTexture: textureFixture(),
    });
    t.after(() => env.dispose());
    await env.ready;
    env.resize(width, height, 1);
    const surface = surfaceOf(env);
    const center = surface.parent.position;
    const sphere = new THREE.Sphere(center, 180);
    for (const elapsed of [0, 60, 180, 300, 600]) {
      env.update(elapsed, true, 0, 0);
      env.scene.updateMatrixWorld(true);
      const inverse = surface.matrixWorld.clone().invert();
      let samples = 0,
        terrain = 0,
        warmDetail = 0;
      for (let row = 0; row < 20; row++) {
        for (let column = 0; column < 64; column++) {
          const direction = new THREE.Vector3(
            -1 + (column + 0.5) / 32,
            -1 + ((row + 0.5) * 0.65) / 20,
            0.5,
          )
            .unproject(env.camera)
            .normalize();
          const point = new THREE.Ray(
            new THREE.Vector3(),
            direction,
          ).intersectSphere(sphere, new THREE.Vector3());
          if (!point) continue;
          const normal = point.applyMatrix4(inverse).normalize();
          const u = Math.atan2(-normal.z, normal.x) / (2 * Math.PI) + 0.5;
          const v = 0.5 - Math.asin(normal.y) / Math.PI;
          const x = Math.min(
            info.width - 1,
            Math.max(0, Math.floor(u * info.width)),
          );
          const y = Math.min(
            info.height - 1,
            Math.max(0, Math.floor(v * info.height)),
          );
          const index = (y * info.width + x) * info.channels;
          const red = data[index],
            blue = data[index + 2];
          samples++;
          if (blue > 22 || red > 28) terrain++;
          if (red > 50 && red > 1.08 * blue) warmDetail++;
        }
      }
      const context = `${width}×${height}, ${elapsed}s: ${terrain / samples} terrain, ${warmDetail / samples} warm detail`;
      assert.ok(samples > 300, `Enough visible Earth samples: ${context}`);
      assert.ok(
        terrain / samples > 0.6,
        `Terrain stays dominant through ten minutes: ${context}`,
      );
      if (elapsed <= 300)
        assert.ok(
          warmDetail / samples > 0.003,
          `Early terrain has city detail: ${context}`,
        );
      // Independently selected city locations follow the westward pass through
      // the actual scene and active clock, without using the placement helper.
      const landmark = [
        ['Wuhan', 0, 114.3, 30.6],
        ['Lahore', 180, 74.34, 31.55],
        ['Shiraz', 300, 52.6, 29.6],
      ].find(([, time]) => time === elapsed);
      if (landmark) {
        const [name, , longitude, latitude] = landmark;
        const { screen, front } = projectGeography(env, longitude, latitude);
        assert.ok(front > 0, `${name} faces the viewer at ${width}×${height}`);
        assert.ok(
          screen.x >= -1 &&
            screen.x <= 1 &&
            screen.y >= -1 &&
            screen.y <= -0.35,
          `${name} remains in the visible Earth foreground: ${JSON.stringify(screen.toArray())}`,
        );
      }
    }
    env.dispose();
  }
});

void test('Night lighting stays photographic and resizing reuses every loaded resource', async (t) => {
  let decoded = 0,
    closed = 0,
    invalidations = 0;
  mockBitmap(t, async () => {
    decoded++;
    return {
      width: 8192,
      height: 4096,
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
  const env = createOrbitalEnvironment(THREE, () => invalidations++, {
    earthAppearance: 'night',
  });
  t.after(() => env.dispose());
  await env.ready;
  const surface = surfaceOf(env);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(
    fetch.mock.calls[0].arguments[0],
    '/textures/earth-black-marble-8k.jpg',
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
  const env = createOrbitalEnvironment(THREE, () => {}, {
    earthAppearance: 'night',
  });
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
  releaseBitmap({ width: 8192, height: 4096, close() {} });
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
    0.015,
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

void test('The shipped night asset matches its manifest, real 8K dimensions and source provenance', async () => {
  const manifest = JSON.parse(
    await fs.readFile(
      new URL(
        '../../public/textures/earth-black-marble-8k.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const bytes = await fs.readFile(
    new URL('../../public/textures/earth-black-marble-8k.jpg', import.meta.url),
  );
  const metadata = await sharp(bytes).metadata();
  assert.deepEqual([metadata.width, metadata.height], [8192, 4096]);
  assert.deepEqual(
    [manifest.width, manifest.height],
    [metadata.width, metadata.height],
  );
  assert.equal(manifest.encodedBytes, bytes.length);
  assert.equal(bytes.length, 2329878);
  assert.equal(
    manifest.sha256,
    createHash('sha256').update(bytes).digest('hex'),
  );
  assert.equal(metadata.space, 'srgb');
  assert.equal(metadata.hasAlpha, false);
  assert.equal(manifest.estimatedRgba8WithMipmapsBytes, 178956972);
  assert.deepEqual(
    [manifest.source.width, manifest.source.height],
    [13500, 6750],
  );
  assert.ok(
    manifest.source.width > manifest.width,
    'The map is downsampled from a larger original',
  );
  assert.equal(
    new URL(manifest.source.url).hostname,
    'assets.science.nasa.gov',
  );
  assert.match(manifest.source.note, /cloud-free/i);
});
