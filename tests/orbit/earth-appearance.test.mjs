import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';

const bundle = await build({
  entryPoints: ['features/orbit/orbital-environment.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const { createOrbitalEnvironment } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const bitmap = () => ({
  width: 8192,
  height: 4096,
  closes: 0,
  close() {
    this.closes++;
  },
});
function trackDisposal(resource) {
  let count = 0;
  resource.addEventListener('dispose', () => count++);
  return () => count;
}
function textureNetwork(t) {
  const requests = [];
  const decoded = [];
  let decodeOverride;
  const previous = Object.getOwnPropertyDescriptor(
    globalThis,
    'createImageBitmap',
  );
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    writable: true,
    value: () => {
      if (decodeOverride) return decodeOverride();
      const image = bitmap();
      decoded.push(image);
      return Promise.resolve(image);
    },
  });
  t.after(() => {
    if (previous)
      Object.defineProperty(globalThis, 'createImageBitmap', previous);
    else delete globalThis.createImageBitmap;
  });
  t.mock.method(globalThis, 'fetch', (url, options) => {
    const response = deferred();
    requests.push({
      url,
      signal: options.signal,
      complete(status = 200) {
        response.resolve(new Response(new Uint8Array(4), { status }));
      },
    });
    return response.promise;
  });
  return {
    requests,
    decoded,
    holdDecode() {
      const started = deferred(),
        result = deferred();
      decodeOverride = () => {
        started.resolve();
        return result.promise;
      };
      return { started: started.promise, result };
    },
  };
}
function environment(t, extra = {}) {
  const image = bitmap();
  const injected = new THREE.Texture(image);
  let invalidations = 0;
  const env = createOrbitalEnvironment(THREE, () => invalidations++, {
    cameraFov: 38,
    earthAppearance: 'night',
    earthTexture: injected,
    ...extra,
  });
  env.resize(1280, 720, 2);
  t.after(() => env.dispose());
  return { env, image, injected, invalidations: () => invalidations };
}
const surfaceOf = (env) => env.scene.getObjectByName('satellite-earth-surface');
function visibleMatrix(env) {
  env.scene.updateMatrixWorld(true);
  return surfaceOf(env).matrixWorld.clone();
}
function skyState(env) {
  const d = env.getDiagnostics();
  return {
    activeTime: d.activeTime,
    stars: d.starCount,
    meteors: d.meteorStreams,
    cameraPosition: d.cameraPosition,
    cameraQuaternion: d.cameraQuaternion,
  };
}
const playback = (env) => {
  const {
    appearance: _appearance,
    requestedAppearance: _requestedAppearance,
    appearanceLoading: _appearanceLoading,
    appearanceError: _appearanceError,
    ...state
  } = env.getEarthPreview();
  return state;
};

void test('Live surfaces swap lazily without moving geographic pose, preview clock, camera or sky', async (t) => {
  const network = textureNetwork(t);
  const { env, image, injected } = environment(t);
  await env.ready;
  assert.equal(network.requests.length, 0);
  env.setEarthComposition({ longitude: 18, latitude: 38, roll: -12 }, 0.006);
  env.setEarthPreview({ paused: false, speed: 10, elapsed: 120 });
  env.update(5, true, 0, 0, 0.5);
  const baseline = playback(env),
    before = visibleMatrix(env),
    sky = skyState(env);
  const surface = surfaceOf(env),
    geometry = surface.geometry;
  const materialDisposed = trackDisposal(surface.material);
  const textureDisposed = trackDisposal(injected);
  const atmosphere = env.scene.getObjectByName('night-earth-atmosphere');
  const atmosphereDisposed = trackDisposal(atmosphere.material);
  const pending = env.setEarthAppearance('day');
  assert.equal(network.requests[0].url, '/textures/earth-blue-marble-8k.jpg');
  assert.deepEqual(env.getEarthPreview(), {
    ...baseline,
    appearance: 'night',
    requestedAppearance: 'day',
    appearanceLoading: true,
    appearanceError: null,
  });
  assert.equal(
    surface.material.map,
    injected,
    'Keep the visible texture until the replacement is decoded',
  );
  assert.equal(
    env.setEarthAppearance('day'),
    pending,
    'Repeated selection shares one in-flight request',
  );
  network.requests[0].complete();
  await pending;
  assert.equal(surface.material.isMeshLambertMaterial, true);
  assert.equal(env.getEarthPreview().appearance, 'day');
  assert.equal(surface.geometry, geometry);
  assert.deepEqual(visibleMatrix(env), before);
  assert.deepEqual(playback(env), baseline);
  assert.deepEqual(skyState(env), sky);
  assert.equal(image.closes, 1);
  assert.equal(textureDisposed(), 1);
  assert.equal(materialDisposed(), 1);
  assert.equal(atmosphereDisposed(), 1);
  assert.equal(surface.parent.children.length, 3);
  assert.equal(env.scene.children.filter((object) => object.isLight).length, 2);
  const dayTexture = surface.material.map,
    dayDisposed = trackDisposal(dayTexture);
  const back = env.setEarthAppearance('night');
  network.requests[1].complete();
  await back;
  assert.equal(surface.material.isMeshBasicMaterial, true);
  assert.equal(surface.material.toneMapped, false);
  assert.deepEqual(visibleMatrix(env), before);
  assert.deepEqual(playback(env), baseline);
  assert.deepEqual(skyState(env), sky);
  assert.equal(dayDisposed(), 1);
  assert.equal(network.decoded[0].closes, 1);
  assert.equal(surface.parent.children.length, 2);
  assert.equal(env.scene.children.filter((object) => object.isLight).length, 0);
  assert.equal(env.getDiagnostics().externalTextureRequests, 2);
  assert.equal(env.getDiagnostics().earthTextureGpuBytes, 178956972);
  assert.equal(network.decoded[1].closes, 0);
});

void test('Day selection keeps rotation running while loading and supports geographic controls after installation', async (t) => {
  const network = textureNetwork(t);
  const { env } = environment(t);
  await env.ready;
  env.setEarthComposition({ longitude: 18, latitude: 38, roll: -12 }, 0.009);
  env.setEarthPreview({ paused: false, speed: 30, elapsed: 20 });
  const pending = env.setEarthAppearance('day');
  env.update(0, false, 0, 0, 0.5);
  assert.equal(env.getEarthPreview().elapsed, 35);
  network.requests[0].complete();
  await pending;
  assert.equal(env.getEarthPreview().elapsed, 35);
  env.update(0, false, 0, 0, 0.5);
  assert.equal(env.getEarthPreview().elapsed, 50);
  env.setEarthComposition({ longitude: 32, latitude: 30, roll: 20 }, 0.006);
  env.setEarthPreview({ paused: true, speed: 60, elapsed: 42 });
  assert.equal(env.getEarthPreview().elapsed, 42);
  assert.equal(env.getDiagnostics().earthRotation, 42 * 0.006);
  for (const [width, height] of [
    [390, 844],
    [2560, 600],
  ]) {
    env.resize(width, height, 1);
    assert.deepEqual(env.getEarthPreview().opening, {
      longitude: 32,
      latitude: 30,
      roll: 20,
    });
    assert.equal(env.getEarthPreview().elapsed, 42);
  }
});

void test('Failed replacements retain the working image and allow retry without losing form state', async (t) => {
  const network = textureNetwork(t);
  const { env, injected, image } = environment(t);
  await env.ready;
  env.setEarthComposition({ longitude: 18, latitude: 38, roll: -12 }, 0.006);
  env.setEarthPreview({ paused: true, speed: 60, elapsed: 120 });
  const before = visibleMatrix(env),
    state = playback(env);
  const failed = env.setEarthAppearance('day');
  network.requests[0].complete(404);
  await failed;
  assert.equal(surfaceOf(env).material.map, injected);
  assert.equal(image.closes, 0);
  assert.deepEqual(playback(env), state);
  assert.deepEqual(visibleMatrix(env), before);
  assert.equal(env.getEarthPreview().appearance, 'night');
  assert.equal(env.getEarthPreview().requestedAppearance, 'day');
  assert.equal(env.getEarthPreview().appearanceLoading, false);
  assert.match(env.getEarthPreview().appearanceError, /404/);
  assert.equal(env.getDiagnostics().earthReady, true);
  const retry = env.setEarthAppearance('day');
  assert.equal(env.getEarthPreview().appearanceError, null);
  network.requests[1].complete();
  await retry;
  assert.equal(env.getEarthPreview().appearance, 'day');
  assert.equal(env.getEarthPreview().appearanceError, null);
  assert.equal(image.closes, 1);
});

void test('Canceling an alternative aborts stale decoding, closes its late bitmap and keeps the displayed surface', async (t) => {
  const network = textureNetwork(t);
  const { env, injected, image } = environment(t);
  await env.ready;
  const decoding = network.holdDecode();
  const pending = env.setEarthAppearance('day');
  network.requests[0].complete();
  await decoding.started;
  await env.setEarthAppearance('night');
  await pending;
  assert.equal(network.requests[0].signal.aborted, true);
  assert.equal(
    network.requests.length,
    1,
    'Returning to the visible map needs no new fetch',
  );
  assert.equal(env.getEarthPreview().appearanceLoading, false);
  assert.equal(env.getEarthPreview().appearanceError, null);
  const late = bitmap();
  decoding.result.resolve(late);
  await decoding.result.promise;
  await Promise.resolve();
  assert.equal(late.closes, 1);
  assert.equal(image.closes, 0);
  assert.equal(surfaceOf(env).material.map, injected);
});

void test('A switch during startup discards the initial injected result and the latest requested asset wins', async (t) => {
  const network = textureNetwork(t);
  const { env, image } = environment(t);
  const pending = env.setEarthAppearance('day');
  await env.ready;
  assert.equal(image.closes, 1);
  assert.equal(env.getDiagnostics().earthReady, false);
  assert.equal(env.getEarthPreview().appearanceLoading, true);
  network.requests[0].complete();
  await pending;
  assert.equal(env.getDiagnostics().earthReady, true);
  assert.equal(env.getEarthPreview().appearance, 'day');
});

void test('Disposal while replacing releases current and late resources exactly once without later invalidations', async (t) => {
  const network = textureNetwork(t);
  const { env, image, invalidations } = environment(t);
  await env.ready;
  const decoding = network.holdDecode();
  const pending = env.setEarthAppearance('day');
  network.requests[0].complete();
  await decoding.started;
  env.dispose();
  env.dispose();
  const last = invalidations();
  await pending;
  const late = bitmap();
  decoding.result.resolve(late);
  await decoding.result.promise;
  await Promise.resolve();
  assert.equal(image.closes, 1);
  assert.equal(late.closes, 1);
  assert.equal(invalidations(), last);
  assert.equal(env.scene.children.length, 0);
  await env.setEarthAppearance('day');
  assert.equal(network.requests.length, 1);
});

void test('Historical day defaults preserve their authored Euler orientation and absolute active clock', async (t) => {
  textureNetwork(t);
  const { env } = environment(t, { earthAppearance: 'day' });
  await env.ready;
  assert.equal(env.getDiagnostics().earthOpening, null);
  assert.deepEqual(surfaceOf(env).parent.rotation.toArray(), [
    -1.2,
    -1.05,
    0.18,
    'XYZ',
  ]);
  env.update(180, true, 0, 0);
  assert.equal(env.getDiagnostics().earthRotation, 0.54);
  env.resize(390, 844, 1);
  assert.deepEqual(surfaceOf(env).parent.rotation.toArray(), [
    -1.2,
    -1.05,
    0.18,
    'XYZ',
  ]);
});
