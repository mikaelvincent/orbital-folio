import type * as Three from 'three';
import { createNotebookPageImage } from './notebook-page-image.ts';
import { ABOUT_NOTEBOOK_LAYOUT } from './rooms/about-notebook-layout.ts';

export const NOTEBOOK_TEXTURE_WIDTH = 512;
export const NOTEBOOK_TEXTURE_HEIGHT = 596;

/** One resident spread on the existing opaque page materials. Camera movement
 * and hover reuse it. Content changes release it; close reading uses native ink.
 * Material identity and scene topology stay fixed for the spacecraft pixel cache.
 */
export function createNotebookPageCache(
  THREE: typeof Three,
  root: Three.Object3D,
  reader: HTMLElement,
  changed: () => void,
  capture = createNotebookPageImage,
) {
  const pages = new Map<
    string,
    { material: Three.MeshStandardMaterial; blank: Three.Texture }
  >();
  root.traverse((object: any) => {
    for (const material of [object.material].flat()) {
      const side = material?.userData?.notebookPage;
      if ((side === 'left' || side === 'right') && material.map)
        pages.set(side, { material, blank: material.map });
    }
  });
  let textures: Three.CanvasTexture[] = [];
  let dirty = true,
    enabled = false,
    active = false,
    disposed = false;
  let revision = 0,
    pending = false;
  let abort: AbortController | null = null;
  let idle: number | undefined;
  const stats = {
    builds: 0,
    failures: 0,
    preparationMs: 0,
    totalMs: 0,
    bytes: 0,
  };
  const setActive = (next: boolean) => {
    if (active === next) return;
    active = next;
    ['left', 'right'].forEach((side, index) => {
      const page = pages.get(side);
      if (page) page.material.map = next ? textures[index] : page.blank;
    });
    reader.dataset.notebookTexture = String(next);
    if (!disposed) changed();
  };
  const release = () => {
    setActive(false);
    textures.forEach((texture) => texture.dispose());
    textures = [];
    stats.bytes = 0;
  };
  const invalidate = () => {
    if (disposed) return;
    revision++;
    dirty = true;
    abort?.abort();
    release();
    changed();
  };
  const observer = new MutationObserver((records) => {
    const source = reader.querySelector('.about-notebook > .notebook-spread');
    if (
      records.some(
        (record) =>
          source?.contains(record.target) ||
          record.target === reader ||
          record.target === source?.parentElement,
      )
    )
      invalidate();
  });
  observer.observe(reader, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      'data-page',
      'data-page-count',
      'data-section',
      'data-notebook-ready',
      'src',
      'srcset',
      'poster',
    ],
  });
  reader.addEventListener('load', invalidate, true);
  reader.addEventListener('error', invalidate, true);
  document.fonts.addEventListener('loadingdone', invalidate);

  const build = async () => {
    idle = undefined;
    if (disposed || !enabled) {
      pending = false;
      return;
    }
    const source = reader.querySelector<HTMLElement>(
      '.about-notebook > .notebook-spread',
    );
    if (!source || source.parentElement?.dataset.notebookReady !== 'true') {
      pending = false;
      return;
    }
    const version = revision;
    const controller = new AbortController();
    abort = controller;
    dirty = false;
    const started = performance.now();
    const maps: Three.CanvasTexture[] = [];
    try {
      const result = await capture(source, controller.signal);
      if (disposed || version !== revision) return;
      for (const [index, side] of ['left', 'right'].entries()) {
        const canvas = document.createElement('canvas');
        canvas.width = NOTEBOOK_TEXTURE_WIDTH;
        canvas.height = NOTEBOOK_TEXTURE_HEIGHT;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        context.drawImage(
          pages.get(side)!.blank.image as CanvasImageSource,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        context.drawImage(
          result.canvas,
          index *
            (ABOUT_NOTEBOOK_LAYOUT.page.x - ABOUT_NOTEBOOK_LAYOUT.leftPage.x),
          0,
          ABOUT_NOTEBOOK_LAYOUT.page.width,
          ABOUT_NOTEBOOK_LAYOUT.pixelsHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const texture = new THREE.CanvasTexture(canvas);
        texture.name = `notebook-cached-${side}-page`;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 4;
        maps.push(texture);
      }
      release();
      textures = maps;
      stats.builds++;
      stats.preparationMs = result.preparationMs;
      stats.totalMs = performance.now() - started;
      stats.bytes =
        (NOTEBOOK_TEXTURE_WIDTH * NOTEBOOK_TEXTURE_HEIGHT * 4 * 2 * 4) / 3;
      reader.dataset.notebookTextureStatus = 'ready';
      reader.dataset.notebookTextureBuilds = String(stats.builds);
      reader.dataset.notebookTextureBuildMs = stats.totalMs.toFixed(1);
      if (enabled) setActive(true);
    } catch {
      maps.forEach((texture) => texture.dispose());
      if (!disposed && version === revision) {
        stats.failures++;
        reader.dataset.notebookTextureStatus = 'html-fallback';
      }
    } finally {
      pending = false;
      if (abort === controller) abort = null;
      if (!disposed) changed();
    }
  };
  return {
    update(preview: boolean) {
      enabled = preview && pages.size === 2;
      setActive(enabled && textures.length === 2);
      if (enabled && dirty && !pending) {
        pending = true;
        reader.dataset.notebookTextureStatus = 'pending';
        idle = window.requestIdleCallback
          ? window.requestIdleCallback(
              () => {
                void build();
              },
              { timeout: 1000 },
            )
          : window.setTimeout(() => {
              void build();
            }, 0);
      }
      return active;
    },
    stats: () => ({ ...stats, active, pending }),
    dispose() {
      disposed = true;
      observer.disconnect();
      reader.removeEventListener('load', invalidate, true);
      reader.removeEventListener('error', invalidate, true);
      document.fonts.removeEventListener('loadingdone', invalidate);
      if (idle !== undefined) {
        if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
        else window.clearTimeout(idle);
      }
      abort?.abort();
      release();
    },
  };
}
