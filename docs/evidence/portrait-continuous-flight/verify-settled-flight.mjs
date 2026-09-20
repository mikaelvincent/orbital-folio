/** Evidence for the source change after the full crop audit started. This is a
 * direct old-versus-final algorithm comparison, not a new application test. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import {
  createOverviewFlight,
  sampleOverviewFlight,
} from '../../../features/spacecraft/navigation/overview-flight.ts';
import { flightEase } from '../../../features/spacecraft/navigation/flight.ts';
const priorSample = (controls, progress) => {
  const t = flightEase(progress),
    s = 1 - t;
  const weights = [s ** 3, 3 * s * s * t, 3 * s * t * t, t ** 3];
  const scalar = (get) =>
    controls.reduce((sum, pose, i) => sum + weights[i] * get(pose), 0);
  const vector = (key) =>
    [0, 1, 2].map((axis) => scalar((pose) => pose[key][axis]));
  const direction = vector('direction');
  const length = Math.hypot(...direction);
  return {
    target: vector('target'),
    direction: direction.map((v) => v / length),
    distance: scalar((pose) => pose.distance),
    roll: scalar((pose) => pose.roll),
  };
};
let comparedPoses = 0;
for (const clearanceDistance of [18, 35, 80, 150])
  for (const roomX of [-4, 4])
    for (const roomY of [-2, 3])
      for (const returning of [false, true]) {
        const home = {
          target: [0, 0, 0],
          direction: [-0.22, 0.22, 1],
          distance: clearanceDistance * 0.7,
          roll: Math.PI / 2,
        };
        const room = {
          target: [roomX, roomY, 0],
          direction: [0, 0, 1],
          distance: 10,
          roll: 0,
        };
        const outwardHome = { ...home, distance: clearanceDistance };
        const outwardRoom = { ...outwardHome, roll: 0 };
        const start = returning ? room : home,
          end = returning ? home : room;
        const outwardStart = returning ? outwardRoom : outwardHome,
          outwardEnd = returning ? outwardHome : outwardRoom;
        const flight = createOverviewFlight(
          start,
          end,
          outwardStart,
          outwardEnd,
        );
        const oldClearance =
          Math.max(outwardStart.distance, outwardEnd.distance) * 1.02;
        const oldControls = [
          start,
          { ...outwardStart, distance: oldClearance, roll: start.roll },
          { ...outwardEnd, distance: oldClearance, roll: end.roll },
          end,
        ];
        assert.deepEqual(flight.controls, oldControls);
        assert.equal(
          flight.duration,
          Math.max(3.2, Math.min(4.6, 2.8 + oldClearance / 35)),
        );
        for (let i = 0; i <= 1000; i++) {
          assert.deepEqual(
            sampleOverviewFlight(flight, i / 1000),
            priorSample(oldControls, i / 1000),
          );
          comparedPoses++;
        }
      }
const hash = (path) =>
  createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const result = {
  createdAt: new Date().toISOString(),
  comparedPoses,
  exactNumericMatches: comparedPoses,
  scope:
    'Final helper with omitted incoming velocity versus the pre-tangent cubic formula. Covers both directions, four clearance scales, four room anchors, and 1001 time samples each. Runtime interruption states with incoming velocity are deliberately outside this coverage audit; parent-task tests own those.',
  sourceSha256: Object.fromEntries(
    [
      'features/spacecraft/navigation/overview-flight.ts',
      'features/spacecraft/navigation/flight.ts',
    ].map((path) => [path, hash(path)]),
  ),
  generatorSha256: hash(new URL(import.meta.url)),
};
fs.writeFileSync(
  new URL('coverage-settled-equivalence.json', import.meta.url),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(JSON.stringify(result, null, 2));
