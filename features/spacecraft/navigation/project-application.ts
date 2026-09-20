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
  // The display's inset hover rim has a 0.04-smaller opening. Keep another
  // 0.01 per edge clear of its rounded corners and the recessed bezel shadow.
  // Fit this same physical rectangle in both the camera and CSS3D surface.
  const usableWidth = glassWidth - 0.06;
  const height = glassHeight - 0.06;
  const pixelsWidth = Math.max(
    240,
    Math.min(portrait ? 560 : 960, viewportWidth - (portrait ? 32 : 64)),
  );
  const pixelsHeight = portrait
    ? Math.max(260, viewportHeight - bottomInset - 80)
    : (pixelsWidth * height) / usableWidth;
  const width = portrait
    ? Math.min(usableWidth, (height * pixelsWidth) / pixelsHeight)
    : usableWidth;
  return {
    portrait,
    width,
    height,
    pixelsWidth,
    pixelsHeight: (pixelsWidth * height) / width,
  };
}
