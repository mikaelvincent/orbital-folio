/** Native pixels map 1:1000 to the retained right page and its paper flags.
 * The camera fits the complete physical spread on every viewport. */
export const ABOUT_NOTEBOOK_LAYOUT = {
  width: 0.62,
  height: 0.566,
  pixelsWidth: 620,
  pixelsHeight: 566,
  anchorPosition: [0.312, 0, 0.032],
  page: { x: 2, y: 0, width: 454, height: 566 },
  flags: [
    { slot: 0, x: 455, y: 80, width: 155, height: 62 },
    { slot: 1, x: 459, y: 245, width: 155, height: 62 },
    { slot: 2, x: 463, y: 410, width: 155, height: 62 },
  ],
  openingWidth: 1.18,
  openingHeight: 0.65,
  framingWidth: 1.18,
  framingHeight: 0.65,
  framingAnchorPosition: [0.045, 0, 0.052],
} as const;

/** A moving three-marker window keeps every authored chapter reachable. */
export function notebookWindowStart(index: number) {
  return Math.floor(Math.max(0, Number.isFinite(index) ? index : 0) / 3) * 3;
}
