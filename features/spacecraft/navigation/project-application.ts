/** Fit a readable application into the physical monitor, cropping the bezel in
 * portrait instead of shrinking a two-column desktop to phone dimensions. */
export function projectApplicationLayout(
  viewportWidth: number,
  viewportHeight: number,
  glassWidth: number,
  glassHeight: number,
  bottomInset = 80,
) {
  const portrait = viewportHeight > viewportWidth;
  const height = glassHeight - 0.025;
  const pixelsWidth = Math.max(
    240,
    Math.min(portrait ? 560 : 960, viewportWidth - (portrait ? 32 : 64)),
  );
  const pixelsHeight = portrait
    ? Math.max(260, viewportHeight - bottomInset - 80)
    : (pixelsWidth * height) / (glassWidth - 0.025);
  const width = portrait
    ? Math.min(glassWidth - 0.025, (height * pixelsWidth) / pixelsHeight)
    : glassWidth - 0.025;
  return {
    portrait,
    width,
    height,
    pixelsWidth,
    pixelsHeight: (pixelsWidth * height) / width,
  };
}
