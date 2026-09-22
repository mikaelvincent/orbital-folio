import { createProjectedSurface } from './projected-surface.ts';
import { NOTEBOOK_COLUMN_STRIDE } from '../../lib/content/notebook-pages.ts';

/** The lower numbered right page is the front of a leaf in either direction. */
export function notebookTurnPages(settled: number, direction: number) {
  const adjacent = settled + direction;
  return {
    front: Math.min(settled, adjacent),
    under: Math.max(settled, adjacent),
  };
}

export function notebookPageLocation(
  chapters: ReadonlyArray<{ pageCount?: number }>,
  absolute: number,
) {
  let page = Math.max(0, absolute);
  for (let section = 0; section < chapters.length; section++) {
    const count = Math.max(1, chapters[section].pageCount || 1);
    if (page < count) return { section, page, count };
    page -= count;
  }
  return { section: 0, page: 0, count: 1 };
}

/** Native ink and WebGL paper share the same anchors and camera. Two bounded,
 * inert copies are refreshed only when a physical leaf changes, never per frame.
 * The semantic React reader remains the sole interactive/accessibility surface.
 */
export function createNotebookTurnInk(
  THREE: any,
  layer: HTMLElement,
  reader: HTMLElement,
  notebook: any,
  occlude?: (
    element: HTMLElement,
    anchor: any,
    width: number,
    height: number,
  ) => void,
) {
  const makeSurface = (face: string, width: number) => {
    const element = document.createElement('div');
    element.className = 'about-notebook notebook-turn-ink';
    element.dataset.face = face;
    element.style.width = `${width}px`;
    element.style.height = `${notebook.pixelsHeight}px`;
    element.inert = true;
    element.setAttribute('aria-hidden', 'true');
    layer.appendChild(element);
    return { element, projection: createProjectedSurface(THREE, element) };
  };
  const under = makeSurface('under', notebook.pixelsWidth);
  const front = makeSurface('front', notebook.page.width);
  const back = makeSurface('back', notebook.page.width);
  const surfaces = [under, front, back];
  const scaled = new THREE.Matrix4();
  const scale = new THREE.Matrix4().makeScale(0.001, 0.001, 0.001);
  const inverse = new THREE.Matrix4();
  const eye = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const center = new THREE.Vector3();
  const point = new THREE.Vector3();
  const halfWidth = notebook.pixelsWidth / 2;
  const halfHeight = notebook.pixelsHeight / 2;
  const left = (notebook.page.x - halfWidth) / 1000;
  const right = left + notebook.page.width / 1000;
  const top = halfHeight / 1000;
  const corners = [
    [left, top],
    [right, top],
    [right, -top],
    [left, -top],
  ];
  let lastLeaf = '';
  let clipped: HTMLElement | null = null;

  const inertCopy = (source: HTMLElement) => {
    const copy = source.cloneNode(true) as HTMLElement;
    // Duplicate IDs must not intercept real Markdown anchors or focus recovery.
    for (const node of [copy, ...copy.querySelectorAll<HTMLElement>('*')]) {
      node.removeAttribute('id');
      node.removeAttribute('aria-live');
      node.removeAttribute('autoplay');
      node.removeAttribute('data-notebook-section');
      if (node.matches('a,button,input,video,[tabindex]')) node.tabIndex = -1;
    }
    return copy;
  };
  const copyPage = (
    absolute: number,
    element: HTMLElement,
    moving: boolean,
  ) => {
    const { section, page, count } = notebookPageLocation(
      notebook.chapters,
      absolute,
    );
    const source = reader.querySelector<HTMLElement>(
      `[data-notebook-section="${section}"]`,
    );
    if (!source) return false;
    let copy = element.firstElementChild as HTMLElement | null;
    if (!copy || element.dataset.section !== String(section)) {
      copy = inertCopy(source);
      element.replaceChildren(copy);
      element.dataset.section = String(section);
    }
    copy.style.left = `${moving ? 0 : notebook.page.x}px`;
    const columns = copy.querySelector<HTMLElement>('.notebook-columns');
    if (columns)
      columns.style.transform = `translateX(${-page * NOTEBOOK_COLUMN_STRIDE}px)`;
    const ink = copy.querySelector<HTMLElement>('.notebook-section-pages');
    if (ink) ink.dataset.page = String(page);
    const footer = copy.querySelector('.notebook-page-footer');
    const label = footer?.querySelector('span');
    if (label) label.textContent = `Page ${page + 1} of ${count}`;
    const buttons = footer?.querySelectorAll('button');
    if (buttons?.length === 2) {
      buttons[0].disabled = page === 0;
      buttons[1].disabled = page === count - 1;
    }
    element.dataset.absolutePage = String(absolute);
    return true;
  };

  return {
    update(camera: any, width: number, height: number, visible: boolean) {
      let turning = visible && notebook.turning;
      const root = reader.querySelector<HTMLElement>('.about-notebook');
      if (turning && root) {
        const pages = notebookTurnPages(
          notebook.settledChapter,
          notebook.turnDirection,
        );
        const key = `${pages.front}:${pages.under}`;
        if (key !== lastLeaf) {
          const copied =
            copyPage(pages.front, front.element, true) &&
            copyPage(pages.under, under.element, false);
          const links = root.querySelector<HTMLElement>(
            '.notebook-connections',
          );
          if (!back.element.firstElementChild && links)
            back.element.replaceChildren(inertCopy(links));
          if (copied) lastLeaf = key;
          else turning = false;
        }
      } else turning = false;
      reader.dataset.turning = String(turning);
      if (clipped && (!turning || clipped !== root)) {
        clipped.style.clipPath = '';
        clipped = null;
      }
      if (turning && root) {
        // Project the sheet's silhouette back onto the stationary paper plane.
        // WebGL cannot occlude HTML; this cutout prevents underlying text and
        // links from showing through the moving sheet without repainting fonts.
        inverse.copy(notebook.anchor.matrixWorld).invert();
        eye.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
        const polygon = corners.map(([x, y]) => {
          point
            .set(x, y, 0)
            .applyMatrix4(notebook.turningLeaf.matrixWorld)
            .applyMatrix4(inverse);
          const t = -eye.z / (point.z - eye.z);
          return `${(halfWidth + (eye.x + (point.x - eye.x) * t) * 1000).toFixed(3)} ${(halfHeight - (eye.y + (point.y - eye.y) * t) * 1000).toFixed(3)}`;
        });
        const clip = `path(evenodd, "M -10000 -10000 H 10000 V 10000 H -10000 Z M ${polygon.join(' L ')} Z")`;
        root.style.clipPath = under.element.style.clipPath = clip;
        clipped = root;
      } else if (lastLeaf) {
        lastLeaf = '';
        // Release full Markdown sections and media once the turn has settled.
        surfaces.forEach(({ element }) => element.replaceChildren());
      }
      const anchors = [notebook.anchor, ...notebook.turnAnchors];
      surfaces.forEach((surface, index) => {
        const anchor = anchors[index];
        let facing = true;
        if (index) {
          normal.set(0, 0, 1).transformDirection(anchor.matrixWorld);
          center.setFromMatrixPosition(anchor.matrixWorld);
          eye.setFromMatrixPosition(camera.matrixWorld).sub(center);
          facing = normal.dot(eye) > 0.00001;
        }
        scaled.copy(anchor.matrixWorld).multiply(scale);
        surface.projection.update(
          camera,
          scaled,
          index ? notebook.page.width : notebook.pixelsWidth,
          notebook.pixelsHeight,
          width,
          height,
          turning && facing,
        );
        if (turning && facing)
          occlude?.(
            surface.element,
            anchor,
            index ? notebook.page.width : notebook.pixelsWidth,
            notebook.pixelsHeight,
          );
      });
    },
    dispose() {
      if (clipped) clipped.style.clipPath = '';
      surfaces.forEach(({ element }) => element.remove());
    },
  };
}
