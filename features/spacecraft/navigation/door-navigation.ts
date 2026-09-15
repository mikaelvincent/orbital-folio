type Portal = {
  id: string;
  from: string;
  to: string;
  via?: string | null;
};

/** Preview arrival-room doors, including ladder entries. Inside the bay,
 * ladder exits remain automatic. Route-owned ladder hatches take precedence
 * over a conflicting preview, even while the interlock is sealing a door. */
export function canUseDoorDuringTravel(
  portal: Portal | undefined,
  arrival: string,
  insideLadderRoom = false,
  routeLadderPortalIds: readonly string[] = [],
) {
  return (
    !!portal &&
    portal.from === arrival &&
    (portal.via !== 'walkway' ||
      (!insideLadderRoom &&
        !routeLadderPortalIds.some((id) => id !== portal.id)))
  );
}

/** A single next hop, scoped to the room the camera is currently approaching.
 * Only final arrival consumes it. Intermediate waypoints and resize never do. */
export function createDoorNavigationQueue() {
  let pending: { arrival: string; destination: string } | null = null;
  function requestDestination(
    destination: string,
    arrival: string,
    travelling: boolean,
  ): string | null {
    if (!travelling) return destination;
    // Door clicks, the room menu, and Home share exactly one pending slot.
    // Selecting the current arrival cancels an earlier choice without a detour.
    pending = destination === arrival ? null : { arrival, destination };
    return null;
  }
  return {
    get destination() {
      return pending?.destination || '';
    },
    requestDestination,
    request(
      portal: Portal,
      arrival: string,
      travelling: boolean,
      insideLadderRoom = false,
      routeLadderPortalIds: readonly string[] = [],
    ): string | null {
      if (
        !travelling ||
        canUseDoorDuringTravel(
          portal,
          arrival,
          insideLadderRoom,
          routeLadderPortalIds,
        )
      )
        return requestDestination(portal.to, arrival, travelling);
      return null;
    },
    arrive(room: string): string | null {
      const next = pending;
      pending = null;
      return next?.arrival === room && next.destination !== room
        ? next.destination
        : null;
    },
    clear() {
      pending = null;
    },
  };
}
