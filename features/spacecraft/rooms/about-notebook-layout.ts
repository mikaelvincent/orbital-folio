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
export const NOTEBOOK_MARKER_COLORS = [
  0xd9ae61, 0xb6bf8a, 0x9ab6c3, 0xc5a2a0, 0xaca6c5, 0xa8c1ae,
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
    const side = index < section ? 'left' : 'right';
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
