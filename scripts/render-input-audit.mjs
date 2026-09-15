import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAMERA_RANGES,
  boundedCameraAngles,
  cursorViewSamples,
  beginBoundedDrag,
  updateBoundedDrag,
  endBoundedDrag,
  fitPerspectiveDistance,
} from '../features/spacecraft/navigation/scene-controls.ts';
import { moveCameraAxis } from '../features/spacecraft/navigation/flight.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = {
  scope:
    'Pure render/input helpers only; no UI, browser, reader, model, DB or network tests',
  sourceHashes: Object.fromEntries(
    ['features/spacecraft/navigation/scene-controls.ts', 'features/spacecraft/spacecraft-runtime.ts'].map((p) => [
      p,
      createHash('sha256')
        .update(readFileSync(root + '/' + p))
        .digest('hex'),
    ]),
  ),
  checks: [],
  observations: [],
};
let comparisons = 0,
  maxError = 0;
for (const limits of Object.values(CAMERA_RANGES))
  for (const direction of [
    [0, 0, 1],
    [-0.18, 0.14, 1],
    [-0.45, 0.32, 1],
  ]) {
    const samples = cursorViewSamples(
      { target: [0, 0, 0], direction },
      4,
      limits,
    );
    for (let iy = 0; iy <= 4; iy++)
      for (let ix = 0; ix <= 4; ix++) {
        const p = (iy / 2 - 1) * limits.pitch,
          y = (ix / 2 - 1) * limits.yaw;
        const actual = new THREE.Vector3(...direction).applyEuler(
          new THREE.Euler(p, y, 0),
        );
        const expected = new THREE.Vector3(...samples[iy * 5 + ix].direction);
        maxError = Math.max(maxError, actual.distanceTo(expected));
        comparisons++;
      }
  }
assert.ok(maxError < 1e-12);
out.checks.push({
  name: 'Sampled orientation matches real Three Euler XYZ',
  comparisons,
  maxError,
  pass: true,
});
let boundsChecks = 0;
for (const home of [false, true])
  for (const px of [-3, -1, -0.2, 0, 0.7, 1, 3, NaN, Infinity])
    for (const py of [-1, 0, 1, NaN])
      for (const dx of [-4, -1, -0.1, 0, 1, 4])
        for (const dy of [-4, -1, 0, 1, 4]) {
          const a = boundedCameraAngles([px, py], [dx, dy], home),
            l = home ? CAMERA_RANGES.overview : CAMERA_RANGES.room;
          assert.ok(a.every(Number.isFinite));
          assert.ok(Math.abs(a[0]) <= l.pitch && Math.abs(a[1]) <= l.yaw);
          boundsChecks++;
        }
out.checks.push({
  name: 'Camera angle outputs finite and bounded',
  cases: boundsChecks,
  pass: true,
});
let dragChecks = 0;
for (const width of [320, 390, 768, 1440])
  for (const height of [600, 844, 1000]) {
    let d = beginBoundedDrag({
      pointerId: 7,
      x: 100,
      y: 100,
      response: [0.2, -0.1],
      width,
      height,
      sensitivity: 4,
      targetKey: 'room',
    });
    assert.strictEqual(updateBoundedDrag(d, 8, 500, 500), d);
    d = updateBoundedDrag(d, 7, 100 + width / 4, 100 - height / 4);
    assert.deepEqual(d.response, [1, 0.9]);
    assert.equal(d.dragging, true);
    d = updateBoundedDrag(d, 7, 100, 100);
    assert.equal(d.dragging, true);
    assert.equal(endBoundedDrag(d, 7, 100, 100, 'room').activate, false);
    const tap = beginBoundedDrag({
      pointerId: 7,
      x: 100,
      y: 100,
      response: [0, 0],
      width,
      height,
      sensitivity: 4,
      targetKey: 'room',
    });
    assert.equal(endBoundedDrag(tap, 7, 103, 104, 'room').activate, true);
    assert.equal(
      endBoundedDrag(tap, 7, 103, 104, 'different-room').activate,
      false,
    );
    dragChecks++;
  }
out.checks.push({
  name: '25%-viewport drag saturates; sticky excursion prevents out/back activation; pointer identity and tap target checks',
  viewports: dragChecks,
  pass: true,
});
let springChecks = 0;
for (const hz of [30, 60, 120]) {
  const s = { value: 0.7, velocity: 0.9 };
  const dt = 1 / hz;
  for (let i = 0; i < hz * 3; i++) {
    const before = { ...s };
    moveCameraAxis(s, Math.floor(i / (hz / 7)) % 2 ? -1 : 1, dt, {
      frequency: 10,
      speed: 4,
      acceleration: 18,
    });
    assert.ok(Math.abs(s.velocity) <= 4 + 1e-10);
    assert.ok(Math.abs(s.velocity - before.velocity) <= 18 * dt + 1e-10);
    springChecks++;
  }
}
out.checks.push({
  name: 'Normalized drag spring speed/acceleration under rapid reversals',
  frames: springChecks,
  pass: true,
});
// Match current live-limit spring wiring: target changes preserve angular state.
const transitions = [];
for (const hz of [30, 60, 120])
  for (const fromHome of [true, false]) {
    const from = fromHome ? CAMERA_RANGES.overview : CAMERA_RANGES.room;
    const to = fromHome ? CAMERA_RANGES.room : CAMERA_RANGES.overview;
    const d = { value: 1, velocity: 0 },
      pitch = { value: from.pitch, velocity: 0 },
      yaw = { value: from.yaw, velocity: 0 };
    const before = boundedCameraAngles([0, 0], [1, 1], from);
    const atRetarget = boundedCameraAngles([0, 0], [d.value, d.value], {
      pitch: pitch.value,
      yaw: yaw.value,
    });
    assert.deepEqual(atRetarget, before);
    moveCameraAxis(d, 0, 1 / hz, { frequency: 10, speed: 4, acceleration: 18 });
    for (const [state, target] of [
      [pitch, to.pitch],
      [yaw, to.yaw],
    ])
      moveCameraAxis(state, target, 1 / hz, {
        frequency: 8,
        speed: 0.4,
        acceleration: 1.5,
      });
    const after = boundedCameraAngles([0, 0], [d.value, d.value], {
      pitch: pitch.value,
      yaw: yaw.value,
    });
    assert.ok(after.every(Number.isFinite));
    assert.ok(Math.abs(after[1] - before[1]) < 0.01);
    transitions.push({
      hz,
      from: fromHome ? 'overview' : 'room',
      target: fromHome ? 'room' : 'overview',
      zeroTimeDelta: [0, 0],
      firstFrameDelta: after.map((v, i) => v - before[i]),
    });
  }
out.checks.push({
  name: 'Patched live-limit transition: exact zero-time continuity, bounded first frame in both directions',
  transitions,
  pass: true,
});
const toolbar = [];
for (const width of [320, 390, 699]) {
  const menu = Math.max(104, Math.min(184, width - 212));
  const leftEnd = 12 + 44 + 8 + menu,
    rightMax = width - 84 - menu,
    rightStart = width - 12 - rightMax;
  assert.ok(rightStart - leftEnd >= 8);
  toolbar.push({ width, menu, leftEnd, rightMax, gap: rightStart - leftEnd });
}
out.checks.push({
  name: 'Patched toolbar CSS width arithmetic, zero horizontal safe-area inset',
  toolbar,
  pass: true,
  note: 'Computed layout and long-label browser evidence still needed; nonzero horizontal safe-area inset is not covered by this arithmetic.',
});
// Observe the original boolean range-switch hazard independently of live component wiring.
const yawBefore = boundedCameraAngles([0, 0], [1, 0], true)[1];
const s = { value: 1, velocity: 0 };
moveCameraAxis(s, 0, 1 / 60, { frequency: 10, speed: 4, acceleration: 18 });
const yawAfter = boundedCameraAngles([0, 0], [s.value, 0], false)[1];
out.observations.push({
  name: 'Boolean static-limit switch after one decay frame',
  yawBefore,
  yawAfter,
  deltaRad: yawAfter - yawBefore,
  note: 'Historical hazard reproduced by the boolean helper overload; current renderer uses the patched continuous live-limit spring checked above. Not a current renderer failure.',
});
// A finite view grid is a numerical envelope, not an analytic guarantee between samples.
let worst = { relativeUnderfit: 0 };
const points = [];
for (const x of [-6, 6])
  for (const y of [-4, 4]) for (const z of [-1.5, 1.9]) points.push([x, y, z]);
for (const limits of [CAMERA_RANGES.overview, CAMERA_RANGES.room])
  for (const aspect of [320 / 844, 390 / 844, 768 / 1024, 1440 / 1000]) {
    const view = { target: [0, 0, 0.2], direction: [-0.18, 0.14, 1] };
    const safe = { left: -0.92, right: 0.92, bottom: -0.82, top: 0.95 };
    const coarse = Math.max(
      ...cursorViewSamples(view, 4, limits).map((v) =>
        fitPerspectiveDistance(points, v, 40, aspect, safe),
      ),
    );
    const fine = Math.max(
      ...cursorViewSamples(view, 80, limits).map((v) =>
        fitPerspectiveDistance(points, v, 40, aspect, safe),
      ),
    );
    const relativeUnderfit = (fine - coarse) / fine;
    if (relativeUnderfit > worst.relativeUnderfit)
      worst = { relativeUnderfit, coarse, fine, aspect, limits };
  }
out.observations.push({
  name: '25-view fitting against dense 6561-view generic-box probe',
  ...worst,
  note: 'Generic numerical probe only, not final model-framing approval; hover shift/dolly must also fit.',
});
if (process.argv[2])
  writeFileSync(process.argv[2], JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
