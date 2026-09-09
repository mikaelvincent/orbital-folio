export type RoutePoint = readonly [number, number, number];
export type CabinRouteNode = { room?: string; position: RoutePoint };

/** Retarget from the camera's actual location on the ordered C corridor.
 * This only plans targets: the caller keeps its existing spring velocities.
 * Include the final destination node; the returned points include that endpoint.
 * Use room camera targets (aperture center Y), and align walkway endpoint Y to
 * the corresponding room row. Do not use the last requested room as the origin.
 */
export function planCabinItinerary(
  nodes: readonly CabinRouteNode[],
  current: RoutePoint,
  destination: string,
) {
  const end = nodes.findIndex((node) => node.room === destination);
  if (nodes.length < 2 || end < 0) return null;
  if (
    ![...current, ...nodes.flatMap((node) => node.position)].every(
      Number.isFinite,
    )
  )
    return null;
  let station = 0;
  let projection: RoutePoint = nodes[0].position;
  let distanceSquared = Infinity;
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i].position,
      b = nodes[i + 1].position;
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      dz = b[2] - a[2];
    const lengthSquared = dx * dx + dy * dy + dz * dz;
    if (lengthSquared < 1e-16) continue;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((current[0] - a[0]) * dx +
          (current[1] - a[1]) * dy +
          (current[2] - a[2]) * dz) /
          lengthSquared,
      ),
    );
    const point: RoutePoint = [a[0] + dx * t, a[1] + dy * t, a[2] + dz * t];
    const squared =
      (point[0] - current[0]) ** 2 +
      (point[1] - current[1]) ** 2 +
      (point[2] - current[2]) ** 2;
    if (squared < distanceSquared) {
      station = i + t;
      projection = point;
      distanceSquared = squared;
    }
  }
  if (!Number.isFinite(distanceSquared)) return null;
  const points: RoutePoint[] = [];
  // Correct an off-corridor spring position before visiting the remaining bends.
  if (distanceSquared > 1e-8) points.push([...projection]);
  if (end > station + 1e-9) {
    for (let i = Math.floor(station + 1e-9) + 1; i <= end; i++)
      points.push([...nodes[i].position]);
  } else if (end < station - 1e-9) {
    for (let i = Math.ceil(station - 1e-9) - 1; i >= end; i--)
      points.push([...nodes[i].position]);
  }
  // Always include the precise final pose, including a same-room retarget.
  const final = nodes[end].position;
  const last = points.at(-1);
  if (!last || last.some((value, i) => value !== final[i]))
    points.push([...final]);
  return {
    points,
    projection: [...projection] as RoutePoint,
    station,
    destinationStation: end,
  };
}
