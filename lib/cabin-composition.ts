/** Shared furniture datums before each room's uniform scale is applied.
 * Secondary fittings follow these rows and columns instead of drifting when
 * the primary furniture is adjusted. Y is measured from the cabin floor.
 */
export const PROJECTS_GRID = {
  columnX: 0.635,
  topY: 1.81,
  bottomY: 1.09,
  lowering: 0.7345 - 0.731,
};

export const ARCHIVE_GRID = {
  centerY: 1.392,
  rowPitch: 0.274,
};

export const CONTACT_GRID = {
  mainY: 1.605,
  sideY: 1.49,
  lowering: 0.24,
};
