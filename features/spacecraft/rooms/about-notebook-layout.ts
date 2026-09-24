/** One logical pixel is one millimetre of the stationary paper spread. */
export const ABOUT_NOTEBOOK_LAYOUT = {
  width: 1.27,
  height: 0.566,
  pixelsWidth: 1270,
  pixelsHeight: 566,
  anchorPosition: [0, 0, 0.038],
  page: { x: 639, y: 0, width: 486, height: 566 },
  openingWidth: 1.18,
  openingHeight: 0.65,
  framingWidth: 1.27,
  framingHeight: 0.65,
  framingAnchorPosition: [0, 0, 0.052],
  cover: {
    width: 1.056,
    height: 0.617,
    depth: 0.023,
    z: -0.019,
    radius: 0.019,
  },
} as const;

export const NOTEBOOK_MARKER_LIMIT = 6;
/** Muted paper hues leave room for a restrained hover lift without whitening. */
export const NOTEBOOK_MARKER_COLORS = [
  0xc1a062, 0xa3ae86, 0x8da7b2, 0xb09390, 0x9b97af, 0x98af9e,
] as const;

/** Additional authored sections stay available through a separate marker bank. */
export function notebookWindowStart(index: number) {
  return (
    Math.floor(
      Math.max(0, Number.isFinite(index) ? index : 0) / NOTEBOOK_MARKER_LIMIT,
    ) * NOTEBOOK_MARKER_LIMIT
  );
}

export function notebookMarkers(count: number, section: number) {
  const start = notebookWindowStart(section);
  const visible = Math.min(NOTEBOOK_MARKER_LIMIT, Math.max(0, count - start));
  return Array.from({ length: visible }, (_, slot) => {
    const index = start + slot;
    // The divider sits behind the section's first page, so its tab is already
    // on the turned stack while that section is being read.
    const side = index <= section ? 'left' : 'right';
    const x = side === 'left' ? 20 : 1095;
    return {
      slot,
      index,
      side,
      x,
      exposedX: side === 'left' ? x : x + 30,
      exposedWidth: 125,
      y: 45 + slot * 84,
      width: 155,
      height: 56,
      color: NOTEBOOK_MARKER_COLORS[index % NOTEBOOK_MARKER_LIMIT],
    };
  });
}
