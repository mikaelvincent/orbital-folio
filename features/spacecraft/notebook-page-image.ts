import { ABOUT_NOTEBOOK_LAYOUT } from './rooms/about-notebook-layout.ts';

const width =
  ABOUT_NOTEBOOK_LAYOUT.page.x -
  ABOUT_NOTEBOOK_LAYOUT.leftPage.x +
  ABOUT_NOTEBOOK_LAYOUT.page.width;
const height = ABOUT_NOTEBOOK_LAYOUT.pixelsHeight;
// Copy the notebook's visual layout, without animation, browser controls or
// hundreds of unrelated computed properties. Fonts are local system faces.
const properties =
  `display position left top right bottom box-sizing width height min-width min-height max-width max-height
margin-top margin-right margin-bottom margin-left padding-top padding-right padding-bottom padding-left
border-top border-right border-bottom border-left border-radius border-collapse border-spacing
color background-color background-image opacity visibility overflow overflow-x overflow-y
font-family font-size font-style font-weight font-variant line-height letter-spacing word-spacing
text-align text-transform text-indent text-decoration text-underline-offset white-space overflow-wrap word-break
list-style-type list-style-position columns column-width column-count column-gap column-fill
break-before break-after break-inside orphans widows table-layout vertical-align
flex flex-direction align-items justify-content gap transform transform-origin object-fit object-position
fill stroke stroke-width stroke-linecap stroke-linejoin`.split(/\s+/);

function decodeSnapshot(svg: string, signal: AbortSignal) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      image.onload = image.onerror = null;
      if (error) {
        image.removeAttribute('src');
        reject(error);
      } else resolve(image);
    };
    const abort = () =>
      finish(new DOMException('Snapshot cancelled', 'AbortError'));
    const timeout = setTimeout(
      () => finish(new Error('Snapshot timed out')),
      3000,
    );
    image.onload = () => finish();
    image.onerror = () => finish(new Error('Snapshot unavailable'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) return abort();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** Rasterize the existing fixed paper layout once. Unsupported or costly
 * content fails back to the live reader, never a partial/blank approximation.
 * No network fetches: images must already be loaded and canvas-readable.
 */
export async function createNotebookPageImage(
  source: HTMLElement,
  signal: AbortSignal,
) {
  const started = performance.now();
  const nodes = [
    source,
    ...source.querySelectorAll<HTMLElement | SVGElement>('*'),
  ];
  if (
    nodes.length > 256 ||
    source.querySelector('video,audio,canvas,input,iframe,object,embed')
  )
    throw new Error('This spread requires native content');
  if (document.fonts.status !== 'loaded' || !source.offsetWidth)
    throw new Error('Paper layout is not ready');
  signal.throwIfAborted();
  const copy = source.cloneNode(true) as HTMLElement;
  const copies = [
    copy,
    ...copy.querySelectorAll<HTMLElement | SVGElement>('*'),
  ];
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index],
      clone = copies[index];
    const style = getComputedStyle(node);
    clone.style.cssText = properties
      .map((property) => `${property}:${style.getPropertyValue(property)};`)
      .join('');
    clone.removeAttribute('id');
    if (node instanceof HTMLImageElement) {
      if (!node.complete || !node.naturalWidth)
        throw new Error('Image is not ready');
      const image = document.createElement('canvas');
      const scale = Math.min(
        1,
        1024 / Math.max(node.naturalWidth, node.naturalHeight),
      );
      image.width = Math.max(1, Math.round(node.naturalWidth * scale));
      image.height = Math.max(1, Math.round(node.naturalHeight * scale));
      const context = image.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(node, 0, 0, image.width, image.height);
      clone.removeAttribute('srcset');
      clone.removeAttribute('loading');
      clone.setAttribute('src', image.toDataURL('image/png'));
    }
    // Bound synchronous work on unusually complex pages or slower devices.
    if (performance.now() - started > 80)
      throw new Error('Snapshot budget exceeded');
  }
  Object.assign(copy.style, {
    position: 'relative',
    left: '0',
    top: '0',
    transform: 'none',
  });
  copy.querySelectorAll('.sr-only').forEach((element) => element.remove());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="${width}" height="${height}">${new XMLSerializer().serializeToString(copy)}</foreignObject></svg>`;
  if (svg.length > 2_000_000) throw new Error('Snapshot budget exceeded');
  const preparationMs = performance.now() - started;
  const image = await decodeSnapshot(svg, signal);
  signal.throwIfAborted();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  context.drawImage(image, 0, 0);
  // SVG foreignObject readback/upload is restricted in some engines. Keep the
  // HTML fallback if the browser cannot provide an origin-clean snapshot.
  const pixels = context.getImageData(0, 0, width, height).data;
  let hasInk = false;
  for (let alpha = 3; alpha < pixels.length; alpha += 4) {
    if (pixels[alpha]) {
      hasInk = true;
      break;
    }
  }
  // An engine may decode the SVG successfully but omit foreignObject. Every
  // spread has a title/footer, so an empty bitmap is always a failed capture.
  if (!hasInk) throw new Error('Snapshot has no ink');
  return { canvas, preparationMs, totalMs: performance.now() - started };
}
