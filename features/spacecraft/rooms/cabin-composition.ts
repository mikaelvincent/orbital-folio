/** Functional furniture grids retain their own proportions. Secondary props
 * are justified within the available gaps, rather than sharing these rows.
 * Furniture dimensions are measured before uniform room scaling.
 */
export const CABIN_WAYFINDING = {
  textHeight: 0.18,
  textWidth: 0.96,
  inkWidthRatio: 940 / 1024,
  fontRatio: 0.7,
  plateHeight: 0.25,
  enamelHeight: 0.22,
  centerY: 1.11,
  roomSignWidth: 1.76,
  roomSignFaceZ: -0.996,
};

// Two equal-width drawers are justified between the bench's inner leg faces.
const drawerWidth = 0.601; // Includes the slightly proud corner guards.
const drawerGap = (2 * 1.165 - 2 * drawerWidth) / 3;
export const PROJECTS_UNDERBENCH = {
  columnX: (drawerGap + drawerWidth) / 2,
  // Center the retained drawers between the floor and the apron underside.
  lift: (0.4985 - 0.345 - 0.096) / 2,
};
export const PROJECTS_GRID = {
  columnX: 0.61,
  topY: 1.845,
  bottomY: 1.125,
  lowering: 0.7345 - 0.731,
};

export const ARCHIVE_GRID = {
  topY: 1.94,
  rowPitch: 0.274,
};

export const CONTACT_GRID = {
  mainY: 1.605,
  sideY: 1.585,
  lowering: 0.24,
};
