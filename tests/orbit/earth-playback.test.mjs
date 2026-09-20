import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';

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
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);
function fixture(t, invalidate = () => {}) {
  const texture = new THREE.Texture({ width: 2560, height: 1536 });
  const environment = createOrbitalEnvironment(THREE, invalidate, {
    earthTexture: texture,
  });
  environment.resize(1280, 720, 2);
  t.after(() => environment.dispose());
  return { environment, texture };
}
function skyState(environment) {
  const d = environment.getDiagnostics();
  const starTimes = [];
  environment.scene.traverse((object) => {
    if (object.isPoints && object.material.uniforms?.time)
      starTimes.push(object.material.uniforms.time.value);
  });
  return {
    activeTime: d.activeTime,
    starTimes,
    meteors: d.meteorStreams,
    cameraPosition: d.cameraPosition,
    cameraQuaternion: d.cameraQuaternion,
  };
}

void test('Unopened Earth playback preserves normal timing and exposes ready state', async (t) => {
  const { environment } = fixture(t);
  const initial = environment.getEarthPlayback();
  assert.deepEqual(initial, {
    time: 0,
    duration: (Math.PI * 2 * 2560) / (0.0045 * 8192),
    speed: 1,
    playing: true,
    ready: false,
  });
  await environment.ready;
  environment.update(10, true, 0, 0);
  close(environment.getEarthPlayback().time, 10);
  close(environment.getDiagnostics().earthRotation, 0.045);
  assert.equal(environment.getEarthPlayback().ready, true);
  const stopped = environment.getEarthPlayback();
  environment.update(100, false, 0, 0);
  assert.deepEqual(
    environment.getEarthPlayback(),
    stopped,
    'Global motion pause gates ordinary playback',
  );
  environment.update(11, true, 0, 0);
  close(environment.getEarthPlayback().time, 11);
});

void test('Seeking is immediate, reversible and Earth-only even when global motion is stopped', async (t) => {
  let invalidations = 0;
  const { environment, texture } = fixture(t, () => invalidations++);
  await environment.ready;
  environment.update(30, true, 0.5, -0.4);
  const previousSky = skyState(environment);
  const surface = environment.scene.getObjectByName('satellite-earth-surface');
  const resources = [surface.geometry, surface.material, surface.material.map];
  const version = texture.version;
  const beforeCommands = invalidations;
  for (const time of [400, 80, 0, 240]) {
    environment.setEarthPlayback({ type: 'seek', time });
    close(environment.getEarthPlayback().time, time);
    assert.equal(environment.getEarthPlayback().playing, false);
    close(environment.getDiagnostics().earthRotation, time * 0.0045);
    close(surface.rotation.y, 0);
    close(
      texture.offset.x,
      -3712 / 2560 - ((((time * 0.0045) / (Math.PI * 2)) * 3.2) % 1),
    );
    assert.deepEqual(
      skyState(environment),
      previousSky,
      'Commands never seek the stars, meteors or camera',
    );
    environment.update(500, false, 0.5, -0.4);
    close(environment.getEarthPlayback().time, time);
    assert.deepEqual(
      [surface.geometry, surface.material, surface.material.map],
      resources,
    );
    assert.equal(texture.version, version);
  }
  assert.equal(
    invalidations,
    beforeCommands + 4,
    'Each command requests the newly selected frame',
  );
});

void test('Speed and manual pause affect only Earth, without accumulating skipped time', async (t) => {
  const { environment } = fixture(t);
  const { environment: control } = fixture(t);
  await Promise.all([environment.ready, control.ready]);
  environment.setEarthPlayback({ type: 'seek', time: 50 });
  environment.setEarthPlayback({ type: 'speed', speed: 60 });
  for (const env of [environment, control]) env.update(2, true, 0.25, -0.3);
  close(
    environment.getEarthPlayback().time,
    50,
    'Changing speed does not resume a paused seek',
  );
  environment.setEarthPlayback({ type: 'playing', playing: true });
  for (const env of [environment, control]) env.update(3, true, 0.25, -0.3);
  close(environment.getEarthPlayback().time, 110);
  assert.deepEqual(skyState(environment), skyState(control));
  environment.setEarthPlayback({ type: 'playing', playing: false });
  for (const env of [environment, control]) env.update(100, true, 0.25, -0.3);
  close(environment.getEarthPlayback().time, 110);
  environment.setEarthPlayback({ type: 'playing', playing: true });
  for (const env of [environment, control]) env.update(101, true, 0.25, -0.3);
  close(environment.getEarthPlayback().time, 170);
  assert.deepEqual(skyState(environment), skyState(control));
  environment.update(9999, false, 0.25, -0.3);
  close(
    environment.getEarthPlayback().time,
    170,
    'Inspection speed cannot override reduced motion/global pause',
  );
});

void test('The timeline retains an explicit end seek, wraps during playback, and restores normal speed on close', async (t) => {
  const { environment } = fixture(t);
  await environment.ready;
  const { duration } = environment.getEarthPlayback();
  environment.setEarthPlayback({ type: 'seek', time: duration });
  assert.equal(environment.getEarthPlayback().time, duration);
  environment.update(100, true, 0, 0);
  assert.equal(
    environment.getEarthPlayback().time,
    duration,
    'The end handle stays at the end while paused',
  );
  environment.setEarthPlayback({ type: 'speed', speed: 60 });
  environment.setEarthPlayback({ type: 'playing', playing: true });
  environment.update(101, true, 0, 0);
  close(environment.getEarthPlayback().time, 60);
  environment.setEarthPlayback({ type: 'playing', playing: false });
  environment.setEarthPlayback({ type: 'close' });
  const closed = environment.getEarthPlayback();
  close(closed.time, 60);
  assert.equal(closed.speed, 1);
  assert.equal(closed.playing, true);
  environment.update(102, true, 0, 0);
  close(environment.getEarthPlayback().time, 61);
  environment.setEarthPlayback({ type: 'reset' });
  assert.deepEqual(environment.getEarthPlayback(), {
    time: 0,
    duration,
    speed: 1,
    playing: true,
    ready: true,
  });
  environment.update(103, true, 0, 0);
  close(
    environment.getEarthPlayback().time,
    1,
    'Reset does not reset the shared active clock',
  );
});

void test('Playback input normalization keeps time and speed finite within supported bounds', async (t) => {
  const { environment } = fixture(t);
  await environment.ready;
  for (const [input, expected] of [
    [-5, 1],
    [0, 1],
    [2.5, 2.5],
    [90, 60],
    [NaN, 1],
    [Infinity, 1],
  ]) {
    environment.setEarthPlayback({ type: 'speed', speed: input });
    assert.equal(environment.getEarthPlayback().speed, expected);
  }
  const { duration } = environment.getEarthPlayback();
  for (const [input, expected] of [
    [-2, 0],
    [duration + 10, duration],
    [NaN, 0],
    [Infinity, 0],
  ]) {
    environment.setEarthPlayback({ type: 'seek', time: input });
    assert.equal(environment.getEarthPlayback().time, expected);
    assert.equal(environment.getEarthPlayback().playing, false);
  }
});

void test('Slow image readiness and disposal remain authoritative during preview playback', async (t) => {
  let releaseBitmap, signalDecode;
  const decoding = new Promise((resolve) => {
    signalDecode = resolve;
  });
  const previous = Object.getOwnPropertyDescriptor(
    globalThis,
    'createImageBitmap',
  );
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: () => {
      signalDecode();
      return new Promise((resolve) => {
        releaseBitmap = resolve;
      });
    },
  });
  t.after(() => {
    if (previous)
      Object.defineProperty(globalThis, 'createImageBitmap', previous);
    else delete globalThis.createImageBitmap;
  });
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(new Uint8Array(4)),
  );
  let invalidations = 0,
    closed = 0;
  const environment = createOrbitalEnvironment(THREE, () => invalidations++);
  t.after(() => environment.dispose());
  await decoding;
  environment.update(10, true, 0, 0);
  environment.setEarthPlayback({ type: 'seek', time: 75 });
  environment.setEarthPlayback({ type: 'speed', speed: 60 });
  environment.setEarthPlayback({ type: 'playing', playing: true });
  environment.update(20, true, 0, 0);
  assert.equal(environment.getEarthPlayback().time, 75);
  assert.equal(environment.getEarthPlayback().ready, false);
  releaseBitmap({
    width: 2560,
    height: 1536,
    close() {
      closed++;
    },
  });
  await environment.ready;
  environment.update(20, true, 0, 0);
  assert.equal(
    environment.getEarthPlayback().time,
    75,
    'Loading time is never multiplied into the opening',
  );
  environment.update(21, true, 0, 0);
  close(environment.getEarthPlayback().time, 135);
  environment.dispose();
  const state = environment.getEarthPlayback(),
    count = invalidations;
  assert.equal(state.ready, false);
  for (const command of [
    { type: 'reset' },
    { type: 'seek', time: 0 },
    { type: 'speed', speed: 1 },
    { type: 'playing', playing: false },
    { type: 'close' },
  ])
    environment.setEarthPlayback(command);
  environment.update(22, true, 0, 0);
  assert.deepEqual(environment.getEarthPlayback(), state);
  assert.equal(invalidations, count);
  assert.equal(closed, 1);
});
