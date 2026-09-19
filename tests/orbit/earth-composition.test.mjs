import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';

async function bundle(entryPoint) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  );
}

const [{ createOrbitalEnvironment }, composition] = await Promise.all([
  bundle('features/orbit/orbital-environment.ts'),
  bundle('features/orbit/earth-composition.ts'),
]);
const {
  EARTH_COMPOSITION_PRESETS,
  EARTH_ROTATION_RADIANS_PER_SECOND,
  MAX_EARTH_ROTATION_RADIANS_PER_SECOND,
  validateEarthRotationRate,
  parseEarthCompositionSettings,
  serializeEarthCompositionSettings,
  earthOpeningAtElapsed,
} = composition;
const opening = { longitude: 12, latitude: 48, roll: -10 };
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

function environment(t) {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    earthAppearance: 'night',
    cameraFov: 38,
    earthTexture: new THREE.Texture({ width: 8192, height: 4096 }),
  });
  env.resize(1280, 720, 2);
  t.after(() => env.dispose());
  return env;
}

function visibleMatrix(env) {
  env.scene.updateMatrixWorld(true);
  return env.scene
    .getObjectByName('satellite-earth-surface')
    .matrixWorld.clone();
}

function resources(env) {
  const objects = new Set();
  env.scene.traverse((object) => {
    if (object.geometry) objects.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      objects.add(material);
      if (material.map) objects.add(material.map);
    }
  });
  return objects;
}

function skyState(env) {
  const diagnostic = env.getDiagnostics();
  let starClock;
  env.scene.traverse((object) => {
    if (object.isPoints) starClock = object.material.uniforms.time.value;
  });
  return {
    activeTime: diagnostic.activeTime,
    starClock,
    meteors: diagnostic.meteorStreams,
    cameraPosition: diagnostic.cameraPosition,
    cameraQuaternion: diagnostic.cameraQuaternion,
  };
}

void test('Settings are versioned, exact round trips and strictly reject invalid imports', () => {
  for (const preset of EARTH_COMPOSITION_PRESETS) {
    const json = serializeEarthCompositionSettings(preset.opening);
    assert.deepEqual(parseEarthCompositionSettings(json), {
      version: 1,
      earthOpening: preset.opening,
      rotationRadiansPerSecond: 0.003,
    });
    assert.doesNotMatch(
      json,
      /speed|elapsed|paused/,
      'Fast-forward never becomes the production speed',
    );
  }
  const valid = JSON.parse(serializeEarthCompositionSettings(opening));
  for (const bad of [
    '',
    '{',
    'null',
    '[]',
    JSON.stringify({ ...valid, version: 2 }),
    JSON.stringify({ ...valid, elapsed: 60 }),
    JSON.stringify({ ...valid, rotationRadiansPerSecond: 0.18 }),
    JSON.stringify({ ...valid, rotationRadiansPerSecond: '0.003' }),
    JSON.stringify({ ...valid, earthOpening: { ...opening, longitude: 181 } }),
    JSON.stringify({ ...valid, earthOpening: { ...opening, latitude: -86 } }),
    JSON.stringify({ ...valid, earthOpening: { ...opening, roll: 181 } }),
    JSON.stringify({ ...valid, earthOpening: { ...opening, latitude: null } }),
    JSON.stringify({ ...valid, earthOpening: { longitude: 12, latitude: 48 } }),
    JSON.stringify({ ...valid, earthOpening: { ...opening, extra: true } }),
    JSON.stringify(valid).replace('"longitude":12', '"longitude":1e309'),
  ])
    assert.throws(() => parseEarthCompositionSettings(bad), Error, bad);
  assert.throws(() =>
    serializeEarthCompositionSettings({ ...opening, roll: NaN }),
  );
  assert.throws(() => earthOpeningAtElapsed(opening, Infinity));
  assert.throws(() => earthOpeningAtElapsed(opening, -1));
  for (const rate of [0, 0.00075, 0.0015, 0.003, 0.015]) {
    assert.deepEqual(
      parseEarthCompositionSettings(
        serializeEarthCompositionSettings(opening, rate),
      ),
      { version: 1, earthOpening: opening, rotationRadiansPerSecond: rate },
    );
    assert.equal(validateEarthRotationRate(rate), rate);
  }
  for (const rate of [
    -0.001,
    MAX_EARTH_ROTATION_RADIANS_PER_SECOND + 0.0001,
    NaN,
    Infinity,
    '0.003',
    null,
  ]) {
    assert.throws(() => validateEarthRotationRate(rate));
    assert.throws(() => serializeEarthCompositionSettings(opening, rate));
    assert.throws(() => earthOpeningAtElapsed(opening, 10, rate));
    assert.throws(() =>
      parseEarthCompositionSettings(
        JSON.stringify({ ...valid, rotationRadiansPerSecond: rate }),
      ),
    );
  }
});

void test('Preview speed changes preserve phase, pause and seek without accelerating sky or camera', async (t) => {
  const env = environment(t);
  const baseline = environment(t);
  await Promise.all([env.ready, baseline.ready]);
  assert.equal(env.getDiagnostics().earthPreview, null);
  env.update(7, true, 0, 0);
  baseline.update(7, true, 0, 0);
  env.setEarthComposition(opening);
  assert.deepEqual(env.getEarthPreview(), {
    active: true,
    opening,
    elapsed: 0,
    paused: true,
    speed: 1,
    rotationRadiansPerSecond: EARTH_ROTATION_RADIANS_PER_SECOND,
  });
  for (const time of [8, 9]) {
    env.update(time, true, 0, 0);
    baseline.update(time, true, 0, 0);
  }
  close(env.getEarthPreview().elapsed, 0);
  env.setEarthPreview({ paused: false, speed: 10 });
  env.update(10, true, 0, 0);
  baseline.update(10, true, 0, 0);
  close(env.getEarthPreview().elapsed, 10);
  const beforeSpeedChange = visibleMatrix(env);
  env.setEarthPreview({ paused: false, speed: 60 });
  assert.deepEqual(env.getDiagnostics().earthPreview, {
    paused: false,
    speed: 60,
  });
  assert.deepEqual(visibleMatrix(env), beforeSpeedChange);
  env.update(10.5, true, 0, 0);
  baseline.update(10.5, true, 0, 0);
  close(env.getEarthPreview().elapsed, 40);
  env.setEarthPreview({ paused: true, speed: 60, elapsed: 300 });
  assert.deepEqual(env.getDiagnostics().earthPreview, {
    paused: true,
    speed: 60,
  });
  env.update(11, true, 0, 0);
  baseline.update(11, true, 0, 0);
  close(env.getDiagnostics().earthRotation, 0.9);
  assert.deepEqual(skyState(env), skyState(baseline));
  const paused = env.getEarthPreview();
  env.update(500, false, 0, 0);
  assert.deepEqual(env.getEarthPreview(), paused);
  env.setEarthPreview({ paused: false, speed: 1, elapsed: 0 });
  for (let frame = 1; frame <= 1000; frame++)
    env.update(11 + frame / 60, true, 0, 0);
  close(env.getEarthPreview().elapsed, 1000 / 60);
  env.setEarthComposition(null);
  assert.equal(env.getDiagnostics().earthPreview, null);
  assert.equal(env.getEarthPreview().active, false);
  close(env.getEarthPreview().elapsed, 11 + 1000 / 60);
  close(env.getDiagnostics().earthRotation, (11 + 1000 / 60) * 0.003);
  const snapshot = env.getEarthPreview();
  env.setEarthPreview({ paused: false, speed: 60, elapsed: 500 });
  assert.deepEqual(
    env.getEarthPreview(),
    snapshot,
    'Inactive controls do not unexpectedly activate preview',
  );
});

void test('Saved rotation rate stays separate from fast-forward, zero stays still, and reset restores production time', async (t) => {
  const env = environment(t);
  const baseline = environment(t);
  await Promise.all([env.ready, baseline.ready]);
  env.update(7, true, 0, 0);
  baseline.update(7, true, 0, 0);
  env.setEarthComposition(opening, 0.0015);
  assert.equal(env.getEarthPreview().rotationRadiansPerSecond, 0.0015);
  assert.equal(env.getDiagnostics().earthRotationRate, 0.0015);
  env.setEarthPreview({ paused: false, speed: 10 });
  env.update(8, true, 0, 0);
  baseline.update(8, true, 0, 0);
  close(env.getEarthPreview().elapsed, 10);
  close(env.getDiagnostics().earthRotation, 0.015);
  const beforeFastForward = visibleMatrix(env);
  env.setEarthPreview({ paused: false, speed: 60 });
  assert.deepEqual(visibleMatrix(env), beforeFastForward);
  env.update(8.5, true, 0, 0);
  baseline.update(8.5, true, 0, 0);
  close(env.getEarthPreview().elapsed, 40);
  close(env.getDiagnostics().earthRotation, 0.06);
  assert.equal(env.getEarthPreview().rotationRadiansPerSecond, 0.0015);
  assert.deepEqual(skyState(env), skyState(baseline));
  const beforeInvalid = env.getEarthPreview();
  const matrixBeforeInvalid = visibleMatrix(env);
  for (const rate of [-1, 0.0151, NaN, Infinity, '0.003']) {
    assert.throws(() =>
      env.setEarthComposition({ ...opening, longitude: 70 }, rate),
    );
    assert.deepEqual(env.getEarthPreview(), beforeInvalid);
    assert.deepEqual(visibleMatrix(env), matrixBeforeInvalid);
  }
  env.setEarthComposition(opening, 0.015);
  close(env.getEarthPreview().elapsed, 0);
  close(env.getDiagnostics().earthRotation, 0);
  env.setEarthPreview({ paused: false, speed: 1 });
  env.update(9, true, 0, 0);
  baseline.update(9, true, 0, 0);
  close(env.getDiagnostics().earthRotation, 0.0075);
  env.setEarthComposition(opening, 0);
  assert.equal(env.getEarthPreview().paused, true);
  const stationary = visibleMatrix(env);
  env.setEarthPreview({ paused: false, speed: 60 });
  assert.equal(
    env.getEarthPreview().paused,
    true,
    'Zero rate never requests an idle render loop',
  );
  env.update(10, true, 0, 0);
  baseline.update(10, true, 0, 0);
  close(env.getEarthPreview().elapsed, 0);
  assert.deepEqual(visibleMatrix(env), stationary);
  assert.deepEqual(skyState(env), skyState(baseline));
  env.setEarthComposition(null);
  assert.equal(
    env.getEarthPreview().rotationRadiansPerSecond,
    EARTH_ROTATION_RADIANS_PER_SECOND,
  );
  assert.equal(
    env.getDiagnostics().earthRotationRate,
    EARTH_ROTATION_RADIANS_PER_SECOND,
  );
  close(
    env.getDiagnostics().earthRotation,
    baseline.getDiagnostics().earthRotation,
  );
  env.setEarthComposition(opening);
  assert.equal(
    env.getEarthPreview().rotationRadiansPerSecond,
    EARTH_ROTATION_RADIANS_PER_SECOND,
  );
});

void test('Explicit preview Play can run under reduced motion, waits for readiness, and never double counts time', async (t) => {
  const env = environment(t);
  env.setEarthComposition(opening);
  env.setEarthPreview({ paused: false, speed: 30 });
  env.update(0, false, 0, 0, 10);
  close(env.getEarthPreview().elapsed, 0);
  await env.ready;
  env.update(0, false, 0, 0, 0.5);
  close(env.getEarthPreview().elapsed, 15);
  close(env.getDiagnostics().activeTime, 0);
  const normalSky = skyState(env);
  env.update(0, false, 0, 0, 0.25);
  close(env.getEarthPreview().elapsed, 22.5);
  assert.deepEqual(skyState(env), normalSky);
  env.update(10, true, 0, 0, 0.5);
  close(env.getEarthPreview().elapsed, 37.5);
  env.setEarthPreview({ paused: true, speed: 30 });
  env.update(10, false, 0, 0, 50);
  close(env.getEarthPreview().elapsed, 37.5);
  env.setEarthPreview({ paused: false, speed: 30 });
  env.update(10, false, 0, 0, 0);
  close(env.getEarthPreview().elapsed, 37.5);
  env.update(10, false, 0, 0, 0.1);
  close(env.getEarthPreview().elapsed, 40.5);
  env.setEarthComposition(null);
  close(env.getEarthPreview().elapsed, 10);
});

void test('Using the visible frame as the opening survives export/import, resize and full revolutions exactly', async (t) => {
  const env = environment(t);
  await env.ready;
  for (const [width, height] of [
    [1280, 720],
    [2560, 600],
    [390, 844],
  ]) {
    env.resize(width, height, 1);
    for (const start of [
      ...EARTH_COMPOSITION_PRESETS.map((preset) => preset.opening),
      { longitude: -179, latitude: 80, roll: -170 },
    ]) {
      for (const rotationRate of [0, 0.0015, 0.003, 0.015]) {
        for (const elapsed of [0, 120, 600, 3000, 9000]) {
          env.setEarthComposition(start, rotationRate);
          env.setEarthPreview({ paused: true, speed: 60, elapsed });
          const before = visibleMatrix(env);
          const framed = earthOpeningAtElapsed(start, elapsed, rotationRate);
          const imported = parseEarthCompositionSettings(
            serializeEarthCompositionSettings(framed, rotationRate),
          );
          env.setEarthComposition(
            imported.earthOpening,
            imported.rotationRadiansPerSecond,
          );
          const after = visibleMatrix(env);
          for (let element = 0; element < 16; element++)
            close(after.elements[element], before.elements[element]);
          close(env.getEarthPreview().elapsed, 0);
          close(imported.rotationRadiansPerSecond, rotationRate);
        }
      }
    }
  }
});

void test('Preview reuses the loaded scene resources through edits, navigation, resizing and disposal', async (t) => {
  const env = environment(t);
  env.setEarthComposition(opening);
  env.setEarthPreview({ paused: true, speed: 10, elapsed: 120 });
  await env.ready;
  const owned = resources(env);
  const surface = env.scene.getObjectByName('satellite-earth-surface');
  const textureVersion = surface.material.map.version;
  const reference = new THREE.PerspectiveCamera(38, 1280 / 720, 0.1, 1200);
  reference.updateMatrixWorld(true);
  const navigating = reference.clone();
  for (const [width, height] of [
    [390, 844],
    [1280, 720],
    [2560, 600],
  ]) {
    env.resize(width, height, 2);
    close(env.getEarthPreview().elapsed, 120);
    navigating.position.set(6, -4, 10);
    navigating.rotation.set(0.1, 0.2, -0.05);
    navigating.updateMatrixWorld(true);
    env.followCamera(navigating, reference);
    const before = env.camera.matrixWorld.clone();
    env.setEarthComposition(opening, 0.0015);
    env.setEarthPreview({ paused: true, speed: 10, elapsed: 120 });
    assert.deepEqual(
      env.camera.matrixWorld,
      before,
      'The helper does not reset the navigation camera',
    );
    assert.deepEqual(resources(env), owned);
    assert.equal(surface.material.map.version, textureVersion);
  }
  const state = env.getEarthPreview();
  assert.throws(() =>
    env.setEarthComposition({ ...opening, latitude: Infinity }),
  );
  assert.throws(() => env.setEarthPreview({ paused: false, speed: 2 }));
  assert.throws(() =>
    env.setEarthPreview({ paused: false, speed: 10, elapsed: NaN }),
  );
  assert.deepEqual(env.getEarthPreview(), state, 'Invalid changes are atomic');
  state.opening.longitude = 99;
  assert.equal(
    env.getEarthPreview().opening.longitude,
    opening.longitude,
    'Snapshots cannot mutate engine state',
  );
  const final = env.getEarthPreview();
  env.dispose();
  env.setEarthComposition(null);
  env.setEarthPreview({ paused: false, speed: 60 });
  env.update(50, true, 0, 0, 1);
  assert.deepEqual(env.getEarthPreview(), final);
});
