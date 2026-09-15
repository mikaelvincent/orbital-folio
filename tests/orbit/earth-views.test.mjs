import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import sharp from 'sharp';
import * as THREE from 'three';
import { MEDITERRANEAN_OPENING } from '../../features/orbit/earth-view-transform.ts';

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
function projectMediterranean(env) {
  const phi = THREE.MathUtils.degToRad(38);
  const theta = THREE.MathUtils.degToRad(18);
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
  void test(`Mediterranean stays visible for the first ten seconds at ${width}×${height}`, async (t) => {
    const env = createOrbitalEnvironment(THREE, () => {}, {
      mobile,
      earthAppearance: 'night',
      earthTexture: textureFixture(),
    });
    t.after(() => env.dispose());
    await env.ready;
    assert.deepEqual(MEDITERRANEAN_OPENING, {
      longitude: 18,
      latitude: 38,
      roll: -12,
    });
    assert.deepEqual(env.getDiagnostics().earthOpening, MEDITERRANEAN_OPENING);
    env.resize(width, height, mobile ? 1 : 2);
    for (const elapsed of [0, 5, 10]) {
      env.update(elapsed, true, 0, 0);
      const { screen, front, matrices } = projectMediterranean(env);
      const context = JSON.stringify({
        width,
        height,
        elapsed,
        projected: screen.toArray(),
      });
      assert.ok(matrices.every(Number.isFinite), context);
      assert.ok(
        front > 0,
        `The Mediterranean must face the viewer: ${context}`,
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
      new URL('../../public/textures/earth-black-marble-8k.json', import.meta.url),
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
