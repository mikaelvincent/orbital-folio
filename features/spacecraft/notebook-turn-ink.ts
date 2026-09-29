import { createProjectedSurface } from './projected-surface.ts';
import {
  NOTEBOOK_COLUMN_STRIDE,
  notebookPageLabel,
} from '../../lib/content/notebook-pages.ts';

/** The lower spread supplies the front; the higher one supplies the reverse. */
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

/** Native ink and WebGL paper share the same anchors and camera. Four bounded,
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
  let restoreFocus = false;

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
  const stationary = [notebook.leftPage, notebook.page].map((page) => {
    const slot = document.createElement('div');
    slot.style.cssText = `position:absolute;left:${page.x}px;top:0;width:${page.width}px;height:${notebook.pixelsHeight}px;overflow:clip`;
    return slot;
  });
  const copyPage = (absolute: number, side: number, element: HTMLElement) => {
    const { section, page } = notebookPageLocation(notebook.chapters, absolute);
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
    copy.style.position = 'absolute';
    copy.style.left = `${-side * NOTEBOOK_COLUMN_STRIDE}px`;
    copy.style.top = '0';
    const columns = copy.querySelector<HTMLElement>('.notebook-columns');
    if (columns)
      columns.style.transform = `translateX(${-page * 2 * NOTEBOOK_COLUMN_STRIDE}px)`;
    const ink = copy.querySelector<HTMLElement>('.notebook-section-pages');
    if (ink) ink.dataset.page = String(page * 2);
    const count = Number(ink?.dataset.pageCount || 1);
    copy
      .querySelectorAll<HTMLElement>('.notebook-page')
      .forEach((paper, index) => {
        const label = paper.querySelector('.notebook-page-footer span');
        const number = page * 2 + index + 1;
        paper.dataset.empty = String(number > count);
        if (label) label.textContent = notebookPageLabel(number, count);
        paper.querySelectorAll('button').forEach((button) => {
          button.disabled = index === 0 ? page === 0 : (page + 1) * 2 >= count;
        });
      });
    element.dataset.absolutePage = String(absolute);
    element.dataset.side = side ? 'right' : 'left';
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
          under.element.replaceChildren(...stationary);
          const copied = [
            copyPage(pages.front, 1, front.element),
            copyPage(pages.under, 0, back.element),
            copyPage(pages.front, 0, stationary[0]),
            copyPage(pages.under, 1, stationary[1]),
          ].every(Boolean);
          if (copied) lastLeaf = key;
          else turning = false;
        }
      } else turning = false;
      if (turning && reader.dataset.turning !== 'true') {
        restoreFocus = !!root
          ?.querySelector('.notebook-spread')
          ?.contains(document.activeElement);
      }
      reader.dataset.turning = String(turning);
      // Hidden live pages cannot receive input while their inert copies turn.
      // Return keyboard reading to the settled ink unless focus moved elsewhere.
      if (!turning && restoreFocus) {
        if (
          visible &&
          !reader.inert &&
          document.activeElement === document.body
        )
          root
            ?.querySelector<HTMLElement>('.notebook-section-pages')
            ?.focus({ preventScroll: true });
        restoreFocus = false;
      }
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
        stationary.forEach((element) => element.replaceChildren());
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
