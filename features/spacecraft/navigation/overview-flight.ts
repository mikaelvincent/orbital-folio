import { flightEase } from './flight.ts';
import type { Vec3 } from './scene-controls';

export type OverviewFlightPose = {
  target: Vec3;
  direction: Vec3;
  distance: number;
  roll: number;
};
export type OverviewFlight = {
  controls: readonly [
    OverviewFlightPose,
    OverviewFlightPose,
    OverviewFlightPose,
    OverviewFlightPose,
  ];
  duration: number;
  /** Incoming units/second when browser history interrupts a moving flight. */
  velocity?: OverviewFlightPose;
};

/** Clearance poses shape one continuous curve; they are never arrival stops.
 * The same curve reversed gives the return flight. Room endpoints intentionally
 * crop the hull; all controls keep the eye in front of the vessel instead of
 * trying to fit the entire spacecraft while entering a cabin.
 */
export function createOverviewFlight(
  start: OverviewFlightPose,
  end: OverviewFlightPose,
  outwardStart: OverviewFlightPose,
  outwardEnd: OverviewFlightPose,
  velocity?: OverviewFlightPose,
): OverviewFlight {
  const clearance = Math.max(outwardStart.distance, outwardEnd.distance) * 1.02;
  return {
    controls: [
      start,
      { ...outwardStart, distance: clearance, roll: start.roll },
      { ...outwardEnd, distance: clearance, roll: end.roll },
      end,
    ],
    // A little more time for exceptionally narrow windows, without three
    // independent spring tails. Seconds are active animation time.
    duration: Math.max(3.2, Math.min(4.6, 2.8 + clearance / 35)),
    velocity,
  };
}

export function sampleOverviewFlight(
  flight: OverviewFlight,
  progress: number,
): OverviewFlightPose {
  const t = flightEase(progress),
    s = 1 - t;
  const weights = [s ** 3, 3 * s * s * t, 3 * s * t * t, t ** 3];
  const p = Math.max(0, Math.min(1, progress));
  const seconds = p * flight.duration;
  // A short decaying tangent preserves incoming velocity on interruption.
  // Its value is zero at both endpoints, its initial derivative is one, and
  // its final derivatives vanish. Settled departures use the reversible curve.
  const tangent = seconds * Math.exp(-seconds / 0.18) * (1 - p) ** 3;
  const scalar = (get: (pose: OverviewFlightPose) => number) =>
    flight.controls.reduce((sum, pose, i) => sum + weights[i] * get(pose), 0) +
    (flight.velocity ? get(flight.velocity) * tangent : 0);
  const vector = (key: 'target' | 'direction'): [number, number, number] =>
    [0, 1, 2].map((axis) => scalar((pose) => pose[key][axis])) as [
      number,
      number,
      number,
    ];
  const direction = vector('direction');
  const length = Math.hypot(...direction);
  return {
    target: vector('target'),
    direction: direction.map((v) => v / length) as [number, number, number],
    distance: scalar((pose) => pose.distance),
    roll: scalar((pose) => pose.roll),
  };
}
