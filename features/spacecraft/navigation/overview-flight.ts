import { flightEase } from './flight.ts';
import type { Vec3 } from './scene-controls';

export type OverviewFlightPose = {
  target: Vec3;
  direction: Vec3;
  distance: number;
  roll: number;
};
type WorldPose = { eye: Vec3; focus: Vec3; roll: number };
export type OverviewFlight = {
  start: WorldPose;
  end: WorldPose;
  duration: number;
  velocity?: WorldPose;
};
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (v: Vec3, s: number): Vec3 => [v[0] * s, v[1] * s, v[2] * s];
const rotate = (v: Vec3, r: number): Vec3 => [
  Math.cos(r) * v[0] - Math.sin(r) * v[1],
  Math.sin(r) * v[0] + Math.cos(r) * v[1],
  v[2],
];
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 =>
  add(scale(a, 1 - t), scale(b, t));

/** Convert the annotation-oriented frame into the actual stationary vessel world. */
function worldPose(p: OverviewFlightPose): WorldPose {
  return {
    focus: rotate(p.target, -p.roll),
    eye: rotate(add(p.target, scale(p.direction, p.distance)), -p.roll),
    roll: p.roll,
  };
}
function worldVelocity(
  p: OverviewFlightPose,
  v: OverviewFlightPose,
): WorldPose {
  // d(R(-roll) * point)/dt includes the moving coordinate frame's derivative.
  const derivative = (point: Vec3, velocity: Vec3) =>
    rotate(add(velocity, [v.roll * point[1], -v.roll * point[0], 0]), -p.roll);
  return {
    focus: derivative(p.target, v.target),
    eye: derivative(
      add(p.target, scale(p.direction, p.distance)),
      add(
        v.target,
        add(scale(v.direction, p.distance), scale(p.direction, v.distance)),
      ),
    ),
    roll: v.roll,
  };
}

/** One direct eye/focus flight, without a whole-vessel clearance detour.
 * World-space interpolation avoids orbiting the target around the ship origin as
 * roll unwinds. Settled room entry advances in depth throughout; hull cropping while
 * turning is intentional. The fixed lens and endpoint room fit are unchanged.
 */
export function createOverviewFlight(
  start: OverviewFlightPose,
  end: OverviewFlightPose,
  velocity?: OverviewFlightPose,
): OverviewFlight {
  const a = worldPose(start),
    b = worldPose(end);
  return {
    start: a,
    end: b,
    duration: Math.max(
      3.2,
      Math.min(4, 2.8 + Math.hypot(...add(b.eye, scale(a.eye, -1))) / 30),
    ),
    velocity: velocity ? worldVelocity(start, velocity) : undefined,
  };
}

export function sampleOverviewFlight(
  flight: OverviewFlight,
  progress: number,
): OverviewFlightPose {
  const p = Math.max(0, Math.min(1, progress));
  const t = flightEase(p),
    seconds = p * flight.duration;
  // Preserve momentum on interrupted travel; ordinary entry starts at rest.
  // This term is zero at both endpoints and has incoming velocity at departure.
  const tangent = seconds * Math.exp(-seconds / 0.18) * (1 - p) ** 3;
  const vector = (key: 'eye' | 'focus') =>
    add(
      lerp(flight.start[key], flight.end[key], t),
      scale(flight.velocity?.[key] ?? [0, 0, 0], tangent),
    );
  const roll =
    flight.start.roll * (1 - t) +
    flight.end.roll * t +
    (flight.velocity?.roll ?? 0) * tangent;
  const focus = vector('focus');
  const back = add(vector('eye'), scale(focus, -1));
  const distance = Math.hypot(...back);
  return {
    target: rotate(focus, roll),
    direction: rotate(scale(back, 1 / distance), roll),
    distance,
    roll,
  };
}
