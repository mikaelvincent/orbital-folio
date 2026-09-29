import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createNotebookPageCache } from '../../features/spacecraft/notebook-page-cache.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

function fixture(t, production = false) {
  const original = Object.fromEntries(
    ['document', 'window', 'MutationObserver'].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  t.after(() => {
    for (const [key, descriptor] of Object.entries(original)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const idle = new Map();
  let nextId = 0,
    observer;
  globalThis.MutationObserver = class {
    constructor(callback) {
      observer = this;
      this.callback = callback;
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  };
  const fonts = new EventTarget();
  const canvasDocument = {
    fonts,
    createElement() {
      const canvas = { width: 0, height: 0 };
      const context = new Proxy(
        {
          canvas,
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
          measureText: (text) => ({ width: text.length * 12 }),
        },
        { get: (target, key) => target[key] ?? (() => {}) },
      );
      canvas.getContext = () => context;
      return canvas;
    },
  };
  globalThis.document = canvasDocument;
  globalThis.window = {
    requestIdleCallback(callback) {
      idle.set(++nextId, callback);
      return nextId;
    },
    cancelIdleCallback(id) {
      idle.delete(id);
    },
  };
  const source = {
    parentElement: { dataset: { notebookReady: 'true' } },
    contains: (node) => node === source,
  };
  const reader = new EventTarget();
  reader.dataset = {};
  reader.querySelector = () => source;
  const root = production
    ? createSpacecraft(THREE).group.userData.aboutNotebook.root
    : new THREE.Group();
  if (!production) {
    for (const side of ['left', 'right']) {
      const material = new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(document.createElement('canvas')),
      });
      material.userData.notebookPage = side;
      root.add(new THREE.Mesh(new THREE.PlaneGeometry(), material));
    }
  }
  const materials = [];
  root.traverse((object) => {
    for (const material of [object.material].flat())
      if (material?.userData.notebookPage) materials.push(material);
  });
  const blank = materials.map((material) => material.map);
  const captures = [];
  let changes = 0;
  const cache = createNotebookPageCache(
    THREE,
    root,
    reader,
    () => changes++,
    (_, signal) =>
      new Promise((resolve, reject) => {
        captures.push({ signal, resolve, reject });
      }),
  );
  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };
  const resolve = async (index = captures.length - 1) => {
    captures[index].resolve({
      canvas: document.createElement('canvas'),
      preparationMs: 2,
      totalMs: 5,
    });
    await flush();
  };
  return {
    cache,
    reader,
    root,
    materials,
    blank,
    captures,
    fonts,
    observer: () => observer,
    changes: () => changes,
    invalidate: () => observer.callback([{ target: source }]),
    runIdle() {
      const callbacks = [...idle.values()];
      idle.clear();
      callbacks.forEach((callback) => callback());
    },
    idle,
    resolve,
    flush,
  };
}

test('batched notebook reuses one opaque texture pair through previews and close reading', async (t) => {
  const f = fixture(t, true);
  const topology = [];
  f.root.traverse((object) => topology.push(object));
  assert.equal(f.materials.length, 2);
  assert.equal(f.cache.update(true), false);
  f.runIdle();
  await f.resolve();
  const textures = f.materials.map((material) => material.map);
  assert.equal(f.cache.stats().builds, 1);
  assert.ok(f.cache.stats().bytes < 3.2 * 1024 * 1024);
  for (let frame = 0; frame < 120; frame++)
    assert.equal(f.cache.update(true), true);
  assert.equal(f.cache.update(false), false);
  assert.deepEqual(
    f.materials.map((material) => material.map),
    f.blank,
  );
  assert.equal(f.reader.dataset.notebookTexture, 'false');
  assert.equal(f.cache.update(true), true);
  assert.deepEqual(
    f.materials.map((material) => material.map),
    textures,
  );
  assert.equal(f.idle.size, 0, 'camera/reader changes do not rebake');
  const after = [];
  f.root.traverse((object) => after.push(object));
  assert.deepEqual(
    after,
    topology,
    'preserve the stationary pixel cache topology',
  );
  assert.ok(f.materials.every((material) => !material.transparent));
  let disposed = 0;
  textures.forEach((texture) =>
    texture.addEventListener('dispose', () => disposed++),
  );
  f.invalidate();
  assert.equal(disposed, 2);
  assert.equal(f.cache.stats().bytes, 0);
  assert.deepEqual(
    f.materials.map((material) => material.map),
    f.blank,
  );
  f.cache.update(true);
  f.runIdle();
  await f.resolve();
  assert.equal(f.cache.stats().builds, 2);
  f.cache.dispose();
});

test('content changes and teardown cannot install stale asynchronous ink', async (t) => {
  const f = fixture(t);
  f.cache.update(true);
  f.runIdle();
  f.invalidate();
  assert.equal(f.captures[0].signal.aborted, true);
  await f.resolve(0);
  assert.equal(f.cache.stats().builds, 0);
  assert.deepEqual(
    f.materials.map((material) => material.map),
    f.blank,
  );
  f.cache.update(true);
  f.runIdle();
  f.cache.update(false);
  await f.resolve();
  assert.equal(
    f.cache.stats().active,
    false,
    'completion cannot cover the native close reader',
  );
  assert.equal(f.cache.update(true), true);
  f.invalidate();
  f.cache.update(true);
  f.runIdle();
  const changes = f.changes();
  f.cache.dispose();
  assert.equal(f.captures.at(-1).signal.aborted, true);
  await f.resolve();
  assert.equal(
    f.changes(),
    changes,
    'disposal and late completion do not wake the scene',
  );
  assert.equal(f.observer().disconnected, true);
  assert.deepEqual(
    f.materials.map((material) => material.map),
    f.blank,
  );
});

test('native fallback stays stable after a failed capture and retries only changed content', async (t) => {
  const f = fixture(t);
  f.cache.update(true);
  f.runIdle();
  f.captures[0].reject(new Error('unsupported media or capture budget'));
  await f.flush();
  assert.equal(f.reader.dataset.notebookTextureStatus, 'html-fallback');
  for (let frame = 0; frame < 120; frame++) f.cache.update(true);
  assert.equal(f.idle.size, 0, 'a failed spread must not retry every frame');
  assert.deepEqual(
    f.materials.map((material) => material.map),
    f.blank,
  );
  f.fonts.dispatchEvent(new Event('loadingdone'));
  f.cache.update(true);
  f.runIdle();
  await f.resolve();
  assert.equal(f.cache.stats().active, true);
  f.reader.dispatchEvent(new Event('load'));
  assert.equal(
    f.cache.stats().active,
    false,
    'loaded media invalidates the captured spread',
  );
  f.cache.update(true);
  assert.equal(f.idle.size, 1);
  f.cache.dispose();
  assert.equal(f.idle.size, 0, 'teardown cancels idle work');
});
