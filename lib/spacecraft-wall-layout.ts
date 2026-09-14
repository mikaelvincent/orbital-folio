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
// Hatches are centered in the exposed wall itself. The caption uses the
// remaining space above the guide, rather than pushing the door toward the deck.
export const PASSAGE_RADIUS = 0.87;
export const PASSAGE_GUIDE_WIDTH = 0.065;
export const PASSAGE_WALL_RADIUS = PASSAGE_RADIUS + 0.05;
export const PORTAL_SIGN_HEIGHT = 0.25;
export const PORTAL_SIGN_STANDOFF = 0.032;
export const PASSAGE_CENTER_Y = (CABIN_FLOOR + CABIN_CEILING) / 2;
export const PORTAL_SIGN_CENTER_Y =
  (PASSAGE_CENTER_Y + PASSAGE_RADIUS + PASSAGE_GUIDE_WIDTH + CABIN_CEILING) / 2;
// Return edges, rather than the concealed pressure stock, bound the visible
// side wall. A common shallow rear return makes both shared hatch faces agree.
export const CABIN_RETURN_RADIUS = 0.08;
export const CABIN_VISIBLE_REAR_Z = -1.1 + CABIN_RETURN_RADIUS;
export const LADDER_VISIBLE_REAR_Z = -0.975;
export const PASSAGE_CABIN_Z =
  (PRESSURE_THROAT_START + CABIN_VISIBLE_REAR_Z) / 2;
export const PASSAGE_LADDER_Z =
  (PRESSURE_THROAT_START + LADDER_VISIBLE_REAR_Z) / 2;
// A door caption is always directly above that door, even when the rear cove
// narrows the available wall near the ceiling.
export const PORTAL_SIGN_CABIN_Z = PASSAGE_CABIN_Z;
export const DECK_HALF_PITCH =
  (CABIN_CEILING - CABIN_FLOOR + PRESSURE_WALL) / 2;

// The ladder bay shares the combined cabin envelope; its bow is symmetric
// around the center of the two usable decks instead of adding separate humps.
export const LADDER_CENTER_Y = (CABIN_CEILING + CABIN_FLOOR) / 2;
export const LADDER_HEIGHT = 2 * DECK_HALF_PITCH + CABIN_CEILING - CABIN_FLOOR;
export const LADDER_HALF_STRAIGHT = 1.05;
export const LADDER_SHOULDER_RISE = LADDER_HEIGHT / 2 - LADDER_HALF_STRAIGHT;
// Leave a short tangent run between the elliptical bow and the rounded jamb.
export const LADDER_SHOULDER_RUN = 1.03;
export const LADDER_RIGHT_RADIUS = 0.25;
export const LADDER_CONTENT_SCALE = 0.9;
export const LADDER_CONTENT_OFFSET =
  LADDER_CENTER_Y - 0.01 * LADDER_CONTENT_SCALE;

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
    upperPassageY: DECK_HALF_PITCH + PASSAGE_CENTER_Y,
    lowerPassageY: -DECK_HALF_PITCH + PASSAGE_CENTER_Y,
  };
}
