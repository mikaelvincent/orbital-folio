import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import * as THREE from 'three';

const source =
  process.env.ORBITAL_SKY_AUDIT_ARTIFACT ??
  'features/orbit/orbital-environment.ts';
const bundled = await build({
  stdin: {
    contents: await readFile(source, 'utf8'),
    loader: 'ts',
    resolveDir: resolve('features/orbit'),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const { createOrbitalEnvironment } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);
async function environment(t, options = {}) {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    earthTexture: new THREE.Texture({ width: 2560, height: 1536 }),
    ...options,
  });
  t.after(() => env.dispose());
  await env.ready;
  env.resize(1440, 900, 2);
  return env;
}
const starObject = (env) =>
  env.scene.children.find((object) => object.isPoints);

void test('Stars cover the edges through wide, portrait and rotated camera views', async (t) => {
  const point = new THREE.Vector3();
  const reference = new THREE.PerspectiveCamera(38, 1, 0.1, 1200);
  reference.updateMatrixWorld(true);
  const moving = reference.clone();
  // Include the actual overview drag envelope, portrait roll, and additional
  // world directions so this cannot regress to an oversized rectangular patch.
  for (const [width, height] of [
    [1440, 900],
    [2560, 1080],
    [390, 844],
  ]) {
    const env = await environment(t, { mobile: width < 700, cameraFov: 38 });
    const points = starObject(env).geometry.getAttribute('position');
    env.resize(width, height, 2);
    const densities = [];
    for (const [pitch, yaw, roll] of [
      [0, 0, 0],
      [-0.18, -0.32, 0],
      [0.18, 0.32, 0],
      [-0.18, 0.32, 0],
      [0.18, -0.32, 0],
      [0.18, 0.32, Math.PI / 2],
      [0, Math.PI / 2, 0],
      [0, Math.PI, 0],
      [0, -Math.PI / 2, 0],
    ]) {
      moving.rotation.set(pitch, yaw, roll);
      moving.updateMatrixWorld(true);
      env.followCamera(moving, reference);
      const edges = { left: 0, right: 0, top: 0, bottom: 0 };
      let visible = 0;
      for (let i = 0; i < points.count; i++) {
        point.fromBufferAttribute(points, i).project(env.camera);
        if (
          Math.abs(point.x) > 1 ||
          Math.abs(point.y) > 1 ||
          Math.abs(point.z) > 1
        )
          continue;
        visible++;
        if (point.x < -0.8) edges.left++;
        if (point.x > 0.8) edges.right++;
        if (point.y < -0.8) edges.bottom++;
        if (point.y > 0.8) edges.top++;
      }
      const context = JSON.stringify({
        width,
        height,
        pitch,
        yaw,
        roll,
        visible,
        edges,
      });
      assert.ok(visible > 100, context);
      for (const count of Object.values(edges)) assert.ok(count >= 6, context);
      densities.push(visible);
    }
    assert.ok(
      Math.max(...densities) / Math.min(...densities) < 1.5,
      `Angular density stays comparable: ${densities.join(', ')}`,
    );
  }
});

void test('Star sizes form a readable hierarchy and remain CSS-sized across DPR changes', async (t) => {
  const env = await environment(t);
  const stars = starObject(env);
  const size = stars.geometry.getAttribute('size');
  const values = [...size.array];
  const prominent = values.filter((value) => value >= 6).length;
  const medium = values.filter((value) => value >= 3.5 && value < 6).length;
  assert.ok(Math.min(...values) >= 2, 'No dust-sized base stars');
  assert.ok(prominent / size.count > 0.035 && prominent / size.count < 0.07);
  assert.ok(medium / size.count > 0.2 && medium / size.count < 0.3);
  const original = size.array.slice();
  for (const ratio of [1, 1.5, 2]) {
    env.resize(1440, 900, ratio);
    assert.equal(stars.material.uniforms.pixelRatio.value, ratio);
    assert.deepEqual(
      size.array,
      original,
      'DPR changes the shader scale, not the authored sizes',
    );
  }
});

void test('Seeded stars have visible independent modulation without a synchronized field pulse', async (t) => {
  const env = await environment(t);
  const a = starObject(env).geometry.getAttribute('twinkle');
  const aggregate = Array.from({ length: 8 * 30 }, () => 0);
  let noticeable = 0;
  // Sample the two-frequency shader inputs over a normal opening. This checks
  // the authored distribution, not pixels or display brightness; browser QA
  // covers how the resulting stars read against Earth and the spacecraft.
  for (let star = 0; star < a.count; star++) {
    let min = Infinity,
      max = -Infinity;
    for (let step = 0; step < aggregate.length; step++) {
      const time = step / 30;
      const pulse =
        Math.sin(time * a.getY(star) + a.getX(star)) * 0.68 +
        Math.sin(time * a.getW(star) + a.getX(star) * 1.618) * 0.32;
      const brightness = 1 + pulse * a.getZ(star);
      min = Math.min(min, brightness);
      max = Math.max(max, brightness);
      aggregate[step] += brightness;
      assert.ok(brightness > 0, 'A star dims without an on/off blink');
    }
    if (max - min >= 0.4) noticeable++;
  }
  assert.ok(
    noticeable / a.count > 0.9,
    'Most stars visibly change within eight seconds',
  );
  assert.ok(
    (Math.max(...aggregate) - Math.min(...aggregate)) / a.count < 0.06,
    'Independent phases avoid the entire field pulsing together',
  );
  assert.deepEqual(env.getDiagnostics().earthTextureDimensions, [2560, 1536]);
});

void test('Shooting stars have quiet event spacing, small coherent groups and varied restrained peaks', async (t) => {
  const env = await environment(t);
  const events = new Map();
  const groups = new Map();
  let maxVisible = 0,
    quietFrames = 0,
    quietRun = 0,
    sawEvent = false;
  const completeQuietIntervals = [];
  // Observe three complete minutes, including events spanning bank boundaries.
  for (let frame = 0; frame < 180 * 30; frame++) {
    env.update(frame / 30, true, 0, 0);
    const d = env.getDiagnostics();
    maxVisible = Math.max(maxVisible, d.meteorCount);
    if (d.meteorCount === 0) {
      quietFrames++;
      if (sawEvent) quietRun++;
    } else {
      if (quietRun) completeQuietIntervals.push(quietRun / 30);
      quietRun = 0;
      sawEvent = true;
    }
    for (const stream of d.meteorStreams) {
      if (!stream.visible) continue;
      const key = `${stream.cycle}:${stream.bank}:${stream.member}`;
      if (events.has(key)) continue;
      events.set(key, stream);
      assert.ok(stream.duration >= 2.15 && stream.duration <= 2.65);
      assert.ok(stream.peakOpacity >= 0.168 && stream.peakOpacity <= 0.35);
      assert.ok(stream.tailLength >= 0.055 && stream.tailLength <= 0.105);
      assert.ok(
        stream.nextAt >= frame / 30,
        'Next start remains in the future',
      );
      if (stream.member === 0) groups.set(stream.groupId, stream);
      else {
        const lead = groups.get(stream.groupId);
        assert.ok(lead, 'A group follows its leading star');
        assert.deepEqual(
          stream.direction,
          lead.direction,
          'A group shares a sky trajectory',
        );
        assert.ok(
          stream.startAt > lead.startAt,
          'Group members arrive successively',
        );
      }
    }
  }
  assert.ok(
    events.size >= 45 && events.size <= 56,
    'Occasional singles and small groups produce about 17 starts per minute',
  );
  assert.equal(groups.size, 30, 'Ten separately timed groups per minute');
  assert.ok(
    maxVisible <= 3,
    'Independent groups do not accumulate into a shower',
  );
  const activeFraction = 1 - quietFrames / (180 * 30);
  assert.ok(
    activeFraction >= 0.25 && activeFraction <= 0.5,
    'Most sky time is calm, while occasional meteor motion remains present',
  );
  assert.ok(
    completeQuietIntervals.length >= 25 &&
      Math.min(...completeQuietIntervals) >= 1 &&
      Math.max(...completeQuietIntervals) >= 4,
    'Groups leave perceptible quiet intervals, including longer pauses',
  );
  const starts = [...groups.values()]
    .map((group) => group.startAt)
    .sort((a, b) => a - b);
  for (let i = 1; i < starts.length; i++) {
    const gap = starts[i] - starts[i - 1];
    assert.ok(gap >= 4.2 && gap <= 8.7);
  }
  assert.deepEqual(
    new Set([...groups.values()].map((group) => group.groupSize)),
    new Set([1, 2, 3]),
  );
  assert.ok(
    new Set([...events.values()].map((event) => event.peakOpacity.toFixed(3)))
      .size >
      events.size * 0.75,
    'Brightness varies per star, beyond a repeating bright/dim alternation',
  );
});

void test('Sky animation stays deterministic across seeks and pauses, with no resource replacement', async (t) => {
  const env = await environment(t);
  const comparison = await environment(t);
  const geometry = starObject(env).geometry;
  const stars = starObject(env).material;
  assert.deepEqual(
    geometry.getAttribute('twinkle').array,
    starObject(comparison).geometry.getAttribute('twinkle').array,
  );
  const clockState = (environment) => {
    const d = environment.getDiagnostics();
    return {
      activeTime: d.activeTime,
      streams: d.meteorStreams,
      phases: d.meteorPhases,
      starTime: starObject(environment).material.uniforms.time.value,
    };
  };
  for (const time of [
    0, 8.98, 9.02, 17.98, 18.02, 22.7, 54.1, 126.5, 900.8, 1.6, 100000.25,
  ]) {
    env.update(time, true, 0, 0);
    comparison.update(0, true, 0, 0);
    comparison.update(time, true, 0, 0);
    assert.deepEqual(
      clockState(env),
      clockState(comparison),
      `Direct seek at ${time} s`,
    );
    const snapshot = clockState(env);
    env.update(time + 10, false, 0, 0);
    assert.deepEqual(
      clockState(env),
      snapshot,
      'Pause holds both stars and meteors',
    );
    env.update(NaN, true, 0, 0);
    assert.deepEqual(
      clockState(env),
      snapshot,
      'Invalid timestamps cannot advance the sky',
    );
  }
  assert.equal(starObject(env).geometry, geometry);
  assert.equal(starObject(env).material, stars);
  assert.equal(env.getDiagnostics().meteorCapacity, 9);
});
