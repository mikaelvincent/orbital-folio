/** Native ink stays laid out even when hidden by real scene geometry. SVG's
 * black silhouettes form a union: overlapping blockers never punch holes into
 * each other, and a mask does not disturb the page-turn clip on the child. */
export function createNotebookOcclusionMask(
  layer: HTMLElement,
  element: HTMLElement,
  width: number,
  height: number,
) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.pointerEvents = 'none';
  const definitions = document.createElementNS(namespace, 'defs');
  const mask = document.createElementNS(namespace, 'mask');
  const id = `notebook-occlusion-${crypto.randomUUID()}`;
  mask.id = id;
  mask.setAttribute('maskUnits', 'userSpaceOnUse');
  mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
  mask.setAttribute('x', '0');
  mask.setAttribute('y', '0');
  mask.setAttribute('width', String(width));
  mask.setAttribute('height', String(height));
  mask.style.maskType = 'luminance';
  const paper = document.createElementNS(namespace, 'rect');
  paper.setAttribute('width', String(width));
  paper.setAttribute('height', String(height));
  paper.setAttribute('fill', 'white');
  const blockers = document.createElementNS(namespace, 'path');
  blockers.setAttribute('fill', 'black');
  blockers.setAttribute('fill-rule', 'nonzero');
  // Cover numerical/antialias seams between adjacent triangles without a
  // visible change to the silhouette at the notebook's logical pixel scale.
  blockers.setAttribute('stroke', 'black');
  blockers.setAttribute('stroke-width', '0.15');
  mask.appendChild(paper);
  mask.appendChild(blockers);
  definitions.appendChild(mask);
  svg.appendChild(definitions);
  layer.appendChild(svg);
  let previousPath = '';
  let previousVisible = true;
  return {
    update(visible: boolean, path: string) {
      if (visible !== previousVisible) {
        element.style.opacity = visible ? '' : '0';
        previousVisible = visible;
      }
      if (path !== previousPath) {
        blockers.setAttribute('d', path);
        element.style.maskImage = path ? `url("#${id}")` : '';
        previousPath = path;
      }
      element.dataset.notebookOcclusion = !visible
        ? 'back-facing'
        : path
          ? 'masked'
          : 'clear';
    },
    dispose() {
      element.style.maskImage = '';
      element.style.opacity = '';
      delete element.dataset.notebookOcclusion;
      svg.remove();
    },
  };
}
