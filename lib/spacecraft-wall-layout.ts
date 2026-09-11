/** Finished pressure-wall thickness: twice the former docking wall, per review.
 * Room dimensions are interior datums; changing walls never scales furnishings.
 */
export const PRESSURE_WALL = 0.17;
export const PRESSURE_FACE_FRONT = 1.285;
export const PRESSURE_FACE_BEVEL = 0.006;
export const PRESSURE_THROAT_START =
  PRESSURE_FACE_FRONT - PRESSURE_WALL + PRESSURE_FACE_BEVEL;
export const CABIN_FLOOR = -1.32;
export const CABIN_CEILING = 1.455;
export const CABIN_HALF_WIDTH = 1.43;
export const DECK_HALF_PITCH =
  (CABIN_CEILING - CABIN_FLOOR + PRESSURE_WALL) / 2;

export function wallLayout(scale: number) {
  const halfWidth = CABIN_HALF_WIDTH * scale;
  const halfPitch = halfWidth + PRESSURE_WALL / 2;
  const leftCabinWall = -halfPitch - halfWidth;
  const ladderX = leftCabinWall - PRESSURE_WALL - 0.69 * scale;
  return {
    halfWidth,
    halfPitch,
    ladderX,
    rightX: halfPitch + halfWidth + PRESSURE_WALL,
    leftCabinWall,
    ladderRightWall: leftCabinWall - PRESSURE_WALL,
    dockingInnerWall: ladderX - 0.665 * scale,
    dockingOuterWall: ladderX - 0.665 * scale - PRESSURE_WALL,
    roof: DECK_HALF_PITCH + CABIN_CEILING + PRESSURE_WALL,
    keel: -DECK_HALF_PITCH + CABIN_FLOOR - PRESSURE_WALL,
    upperPassageY: DECK_HALF_PITCH - 0.06,
    lowerPassageY: -DECK_HALF_PITCH - 0.06,
  };
}
