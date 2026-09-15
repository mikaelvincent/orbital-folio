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
  /** The ladder bay has separate upper and lower physical hatches. */
  via?: string | null;
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
    // Adjacent cabins expose two faces of one physical hatch. The reciprocal
    // ladder entrance is in the other row, so it is a separate door.
    for (const reciprocal of portals)
      if (
        reciprocal.from === portal.to &&
        reciprocal.to === portal.from &&
        Math.abs(reciprocal.position[0] - x) < 0.65 &&
        Math.hypot(reciprocal.position[1] - y, reciprocal.position[2] - z) <
          0.05
      )
        selected.add(reciprocal.id);
  }

  return [
    ...new Set(portals.filter((p) => selected.has(p.id)).map((p) => p.id)),
  ];
}

export type IrisPortalState = {
  id: string;
  via?: string | null;
  openProgress?: number;
};

/** Only the two ladder hatches share an interlock. Adjacent cabin doors open
 * independently and never delay the camera. If both ladder hatches are
 * requested, keep the requested hatch already in use, otherwise choose the
 * first request; close the other completely before opening the chosen one.
 * The caller decides whether this door readiness should hold the camera.
 */
export function interlockLadderPortals(
  portals: readonly IrisPortalState[],
  requestedIds: readonly string[],
) {
  const byId = new Map(portals.map((portal) => [portal.id, portal]));
  const requested = [...new Set(requestedIds)].filter((id) => byId.has(id));
  const ladderRequests = requested.filter(
    (id) => byId.get(id)!.via === 'walkway',
  );
  const selectedId =
    ladderRequests.find((id) => (byId.get(id)!.openProgress ?? 0) > 0.001) ||
    ladderRequests[0];
  const closingPrevious =
    !!selectedId &&
    portals.some(
      (portal) =>
        portal.via === 'walkway' &&
        portal.id !== selectedId &&
        (portal.openProgress ?? 0) > 0.001,
    );
  const openPortalIds = requested.filter(
    (id) =>
      byId.get(id)!.via !== 'walkway' ||
      (id === selectedId && !closingPrevious),
  );
  const waiting =
    !!selectedId &&
    (closingPrevious || (byId.get(selectedId)!.openProgress ?? 0) < 0.999);
  return { openPortalIds, waiting };
}

/** A ladder exit travels rightward through the bay's wall into a cabin. Entry
 * and vertical bay travel retain the ordinary camera spring, including a
 * same-threshold reversal. requiredPortalIds supplies the near-start clearance
 * so reversing just inside a hatch still observes that hatch's readiness.
 */
export function isLadderExitLeg(
  portals: readonly IrisNavigationPortal[],
  requiredIds: readonly string[],
  start: IrisRoutePoint,
  end: IrisRoutePoint,
): boolean {
  if (
    ![...start, ...end].every(Number.isFinite) ||
    end[0] <= start[0] + EPSILON
  )
    return false;
  const required = new Set(requiredIds);
  return portals.some(
    (portal) =>
      portal.via === 'walkway' &&
      required.has(portal.id) &&
      start[0] <= portal.position[0] + START_CLEARANCE + EPSILON &&
      end[0] > portal.position[0] + EPSILON,
  );
}

/** Pre-open the next ladder exit while travelling from the bay's center toward
 * its landing. Look ahead exactly one leg, so the approach to the center and
 * distant cabin doors retain their existing timing. The normal ladder
 * interlock still seals the entry hatch before this request can take effect.
 */
export function approachingLadderPortalIds(
  portals: readonly IrisNavigationPortal[],
  current: IrisRoutePoint,
  landing: IrisRoutePoint,
  exit?: IrisRoutePoint,
): string[] {
  if (!exit || !current.every(Number.isFinite)) return [];
  const upcoming = new Set(requiredPortalIds(portals, [landing, exit]));
  return portals
    .filter(
      (portal) =>
        portal.via === 'walkway' &&
        upcoming.has(portal.id) &&
        current[0] < portal.position[0] - START_CLEARANCE &&
        landing[0] < portal.position[0] - START_CLEARANCE &&
        exit[0] > portal.position[0] + EPSILON,
    )
    .map((portal) => portal.id);
}

/** Let an exit approach continue while the iris opens, but reserve the same
 * threshold clearance used when releasing a crossed hatch. A retarget already
 * inside that clearance holds in place instead of backing the camera up.
 */
export function ladderExitHoldPoint(
  portals: readonly IrisNavigationPortal[],
  requiredIds: readonly string[],
  start: IrisRoutePoint,
  end: IrisRoutePoint,
): IrisRoutePoint | null {
  if (!isLadderExitLeg(portals, requiredIds, start, end)) return null;
  const planes = portals
    .filter(
      (portal) => portal.via === 'walkway' && requiredIds.includes(portal.id),
    )
    .map((portal) => portal.position[0]);
  return [
    Math.max(start[0], Math.min(...planes) - START_CLEARANCE),
    end[1],
    end[2],
  ];
}
