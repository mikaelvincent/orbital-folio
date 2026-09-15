type Portal = { id: string; from: string; to: string; via?: string | null };

/** A visible room may not have a direct door (the two right-hand cabins, for
 * example). Preview the first doorway but retain the selected final room.
 * The ladder opening selects the cabin beyond the first reachable ladder
 * crossing; the connector itself is never a destination. */
export function roomNavigationIntent(
  portals: readonly Portal[],
  from: string,
  destination: string,
  insideLadderRoom = false,
): { section: string; portalId?: string; roomTarget: true } | null {
  const throughLadder = destination === 'walkway';
  if (throughLadder && (from === 'home' || insideLadderRoom)) return null;
  if (
    from === destination ||
    (!throughLadder &&
      !portals.some((p) => p.from === destination || p.to === destination))
  )
    return null;
  if (from === 'home') return { section: destination, roomTarget: true };
  const queue: { room: string; first?: string }[] = [{ room: from }];
  const seen = new Set([from]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    for (const portal of portals) {
      if (portal.from !== current.room || seen.has(portal.to)) continue;
      const first = current.first || portal.id;
      if (throughLadder ? portal.via === 'walkway' : portal.to === destination)
        return { section: portal.to, portalId: first, roomTarget: true };
      seen.add(portal.to);
      queue.push({ room: portal.to, first });
    }
  }
  return null;
}

/** A room and its door share feedback, but distinct room destinations must not
 * become the same press/release target just because their first door matches. */
export function sceneNavigationKey(selection: {
  section: string;
  portalId?: string;
  roomTarget?: boolean;
}) {
  if (selection.roomTarget) return `${selection.section}:room`;
  if (selection.portalId) return `portal:${selection.portalId}`;
  return selection.section ? `${selection.section}:room` : '';
}
