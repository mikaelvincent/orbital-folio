export type IrisRoutePoint = readonly [number, number, number];

export type IrisNavigationPortal = {
  id: string;
  from: string;
  to: string;
  /** Vessel-space center of the side-wall aperture. Its normal is the X axis. */
  position: IrisRoutePoint;
  size: IrisRoutePoint;
  /** Optional clear aperture height and width; pick bounds may be larger. */
  openingSize?: readonly [number, number];
};

const EPSILON = 1e-8;
const START_CLEARANCE = 0.35;

/** Find the doors a cabin route actually crosses, including both visible faces.
 * Pass the camera's current vessel-space focus first, followed by the remaining
 * itinerary points. Overview/reading flights should pass an empty route.
 * A near-start door remains open during an in-threshold reversal even when the
 * new route no longer crosses its center plane.
 */
export function requiredPortalIds(
  portals: readonly IrisNavigationPortal[],
  polylinePoints: readonly IrisRoutePoint[],
): string[] {
  if (
    polylinePoints.length < 2 ||
    !polylinePoints.every((point) => point.every(Number.isFinite))
  )
    return [];

  const selected = new Set<string>();
  const start = polylinePoints[0];
  for (const portal of portals) {
    const opening = portal.openingSize || [portal.size[1], portal.size[2]];
    const radius = Math.min(...opening) / 2;
    if (
      !portal.position.every(Number.isFinite) ||
      !Number.isFinite(radius) ||
      radius <= 0
    )
      continue;

    const [x, y, z] = portal.position;
    const withinAperture = (point: IrisRoutePoint) =>
      (point[1] - y) ** 2 + (point[2] - z) ** 2 <= radius ** 2 + EPSILON;
    let crossed =
      Math.abs(start[0] - x) <= START_CLEARANCE + EPSILON &&
      withinAperture(start);

    for (let index = 1; index < polylinePoints.length && !crossed; index++) {
      const a = polylinePoints[index - 1];
      const b = polylinePoints[index];
      const dx = b[0] - a[0];
      if (Math.abs(dx) <= EPSILON) {
        if (Math.abs(a[0] - x) > EPSILON) continue;
        // A reversal can continue along a doorway plane. Test the closest YZ
        // point, not only endpoints, so that a segment through it stays clear.
        const dy = b[1] - a[1];
        const dz = b[2] - a[2];
        const lengthSquared = dy * dy + dz * dz;
        const t =
          lengthSquared > EPSILON
            ? Math.max(
                0,
                Math.min(
                  1,
                  ((y - a[1]) * dy + (z - a[2]) * dz) / lengthSquared,
                ),
              )
            : 0;
        crossed = withinAperture([x, a[1] + t * dy, a[2] + t * dz]);
      } else {
        const t = (x - a[0]) / dx;
        if (t < -EPSILON || t > 1 + EPSILON) continue;
        crossed = withinAperture([
          x,
          a[1] + t * (b[1] - a[1]),
          a[2] + t * (b[2] - a[2]),
        ]);
      }
    }

    if (!crossed) continue;
    selected.add(portal.id);
    // Adjacent cabins expose opposite faces of one hatch. The ladder route has
    // an entrance at each end. In both cases the complete connection must open.
    for (const reciprocal of portals)
      if (reciprocal.from === portal.to && reciprocal.to === portal.from)
        selected.add(reciprocal.id);
  }

  return [
    ...new Set(portals.filter((p) => selected.has(p.id)).map((p) => p.id)),
  ];
}
