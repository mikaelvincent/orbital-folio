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
  const pixelsWidth = Math.max(
    240,
    Math.min(portrait ? 560 : 960, viewportWidth - (portrait ? 32 : 64)),
  );
  const rectangle = (inset: number) => {
    const height = glassHeight - inset;
    const usableWidth = glassWidth - inset;
    const width = portrait
      ? Math.min(
          usableWidth,
          (height * pixelsWidth) /
            Math.max(260, viewportHeight - bottomInset - 80),
        )
      : usableWidth;
    return { width, height };
  };
  // Landscape has room for a slimmer wallpaper margin: 0.01 per glass edge.
  // Portrait already fills the readable viewport. The selected rim is hidden.
  const { width, height } = rectangle(portrait ? 0.06 : 0.02);
  // Window decoration must not change the established camera destination.
  const framing = rectangle(0.06);
  return {
    portrait,
    width,
    height,
    pixelsWidth,
    pixelsHeight: (pixelsWidth * height) / width,
    framing,
  };
}
