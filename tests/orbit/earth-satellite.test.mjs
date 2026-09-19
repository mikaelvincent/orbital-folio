import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import sharp from 'sharp';
import {
  EARTH_TEXTURE_ASSET,
  EARTH_TEXTURE_WIDTH,
  EARTH_TEXTURE_HEIGHT,
  configureEarthTexture,
  loadEarthTexture,
  disposeEarthTexture,
} from '../../features/orbit/earth-satellite.ts';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const bitmapFixture = (width = 8192, height = 4096) => ({
  width,
  height,
  closes: 0,
  close() {
    this.closes++;
  },
});
const bitmapStubs = new WeakSet();
const stubBitmap = (t, implementation) => {
  if (!bitmapStubs.has(t)) {
    bitmapStubs.add(t);
    const previous = Object.getOwnPropertyDescriptor(
      globalThis,
      'createImageBitmap',
    );
    t.after(() => {
      if (previous)
        Object.defineProperty(globalThis, 'createImageBitmap', previous);
      else delete globalThis.createImageBitmap;
    });
  }
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    writable: true,
    value: implementation,
  });
};
const stubResponse = (t, headers = { 'content-length': '4' }) =>
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(new Uint8Array([1, 2, 3, 4]), { headers }),
  );

void test('Earth texture decodes once with explicit orientation/color settings and transfers ownership', async (t) => {
  const bitmap = bitmapFixture();
  const controller = new AbortController();
  const fetch = stubResponse(t);
  let decodeCalls = 0;
  stubBitmap(t, async (blob, options) => {
    decodeCalls++;
    assert.equal(blob.type, 'image/jpeg');
    assert.equal(blob.size, 4);
    assert.deepEqual(options, {
      imageOrientation: 'flipY',
      colorSpaceConversion: 'none',
      premultiplyAlpha: 'none',
    });
    return bitmap;
  });
  const result = await loadEarthTexture(THREE, controller.signal);
  assert.equal(EARTH_TEXTURE_WIDTH, 8192);
  assert.equal(EARTH_TEXTURE_HEIGHT, 4096);
  assert.equal(fetch.mock.callCount(), 1);
  assert.deepEqual(fetch.mock.calls[0].arguments, [
    EARTH_TEXTURE_ASSET,
    {
      signal: controller.signal,
      mode: 'same-origin',
      credentials: 'same-origin',
    },
  ]);
  assert.equal(decodeCalls, 1);
  assert.equal(result.texture.image, bitmap);
  assert.equal(result.encodedBytes, 4);
  assert.equal(result.responseBytes, 4);
  assert.ok(result.fetchMs >= 0 && result.decodeMs >= 0);
  const texture = result.texture;
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
  assert.equal(texture.wrapS, THREE.RepeatWrapping);
  assert.equal(texture.wrapT, THREE.ClampToEdgeWrapping);
  assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter);
  assert.equal(texture.magFilter, THREE.LinearFilter);
  assert.equal(texture.generateMipmaps, true);
  assert.equal(texture.anisotropy, 4);
  assert.equal(texture.flipY, false);
  assert.equal(texture.premultiplyAlpha, false);
  assert.ok(texture.version > 0);
  let disposals = 0;
  texture.addEventListener('dispose', () => disposals++);
  controller.abort();
  assert.equal(
    bitmap.closes,
    0,
    'Aborting after ownership transfers does not invalidate the texture',
  );
  disposeEarthTexture(texture);
  disposeEarthTexture(texture);
  assert.equal(bitmap.closes, 1);
  assert.equal(disposals, 1);
});

void test('Earth loader reports missing/invalid transfer size without inventing zero', async (t) => {
  for (const value of [null, '', '-1', 'wrong', '9007199254740992']) {
    const bitmap = bitmapFixture();
    t.mock.method(
      globalThis,
      'fetch',
      async () =>
        new Response(new Uint8Array(4), {
          headers: value === null ? {} : { 'content-length': value },
        }),
    );
    stubBitmap(t, async () => bitmap);
    const result = await loadEarthTexture(THREE, new AbortController().signal);
    assert.equal(result.encodedBytes, null);
    assert.equal(result.responseBytes, 4);
    disposeEarthTexture(result.texture);
    assert.equal(bitmap.closes, 1);
  }
});

void test('Earth loader rejects wrong dimensions and closes its rejected bitmap', async (t) => {
  stubResponse(t);
  const bitmap = bitmapFixture(4096, 512);
  stubBitmap(t, async () => bitmap);
  await assert.rejects(
    loadEarthTexture(THREE, new AbortController().signal),
    /must be 8192×4096/,
  );
  assert.equal(bitmap.closes, 1);
});

void test('Earth loader propagates fetch and decode failures', async (t) => {
  stubBitmap(t, () => {
    throw new Error('Should not decode HTTP error');
  });
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(null, { status: 404 }),
  );
  await assert.rejects(
    loadEarthTexture(THREE, new AbortController().signal),
    /failed \(404\)/,
  );
  fetch.mock.mockImplementation(async () => {
    throw new Error('Network failure');
  });
  await assert.rejects(
    loadEarthTexture(THREE, new AbortController().signal),
    /Network failure/,
  );
  fetch.mock.mockImplementation(async () => new Response(new Uint8Array(4)));
  stubBitmap(t, async () => {
    throw new Error('Image decode failure');
  });
  await assert.rejects(
    loadEarthTexture(THREE, new AbortController().signal),
    /Image decode failure/,
  );
  stubBitmap(t, () => {
    throw new Error('Image decode synchronous failure');
  });
  await assert.rejects(
    loadEarthTexture(THREE, new AbortController().signal),
    /synchronous failure/,
  );
});

void test('Earth loader does not fetch when already aborted, or decode an aborted body', async (t) => {
  const controller = new AbortController();
  controller.abort();
  const fetch = stubResponse(t);
  stubBitmap(t, () => {
    throw new Error('Should not decode aborted loads');
  });
  await assert.rejects(loadEarthTexture(THREE, controller.signal), {
    name: 'AbortError',
  });
  assert.equal(fetch.mock.callCount(), 0);
  const bodyController = new AbortController();
  fetch.mock.mockImplementation(async () => ({
    ok: true,
    arrayBuffer: async () => {
      bodyController.abort();
      return new ArrayBuffer(4);
    },
  }));
  await assert.rejects(loadEarthTexture(THREE, bodyController.signal), {
    name: 'AbortError',
  });
});

void test('Aborting in-flight decode rejects promptly and releases a bitmap delivered later', async (t) => {
  stubResponse(t);
  const decode = deferred(),
    started = deferred();
  const bitmap = bitmapFixture();
  const controller = new AbortController();
  stubBitmap(t, () => {
    started.resolve();
    return decode.promise;
  });
  const result = loadEarthTexture(THREE, controller.signal);
  await started.promise;
  const rejection = assert.rejects(result, { name: 'AbortError' });
  controller.abort();
  await rejection;
  assert.equal(bitmap.closes, 0);
  decode.resolve(bitmap);
  await decode.promise;
  await Promise.resolve();
  assert.equal(bitmap.closes, 1);
});

void test('Aborting after bitmap resolves but before ownership transfer closes it once', async (t) => {
  stubResponse(t);
  const bitmap = bitmapFixture();
  const controller = new AbortController();
  stubBitmap(t, async () => {
    queueMicrotask(() => controller.abort());
    return bitmap;
  });
  await assert.rejects(loadEarthTexture(THREE, controller.signal), {
    name: 'AbortError',
  });
  assert.equal(bitmap.closes, 1);
});

void test('Texture construction/configuration failure releases owned resources', async (t) => {
  stubResponse(t);
  const bitmap = bitmapFixture();
  stubBitmap(t, async () => bitmap);
  await assert.rejects(
    loadEarthTexture(
      {
        ...THREE,
        Texture: class {
          constructor() {
            throw new Error('Texture failed');
          }
        },
      },
      new AbortController().signal,
    ),
    /Texture failed/,
  );
  assert.equal(bitmap.closes, 1);
  const second = bitmapFixture();
  let disposals = 0;
  stubBitmap(t, async () => second);
  await assert.rejects(
    loadEarthTexture(
      {
        ...THREE,
        Texture: class {
          set colorSpace(_) {
            throw new Error('Texture configuration failed');
          }
          dispose() {
            disposals++;
          }
        },
      },
      new AbortController().signal,
    ),
    /configuration failed/,
  );
  assert.equal(second.closes, 1);
  assert.equal(disposals, 1);
});

void test('Texture configuration also supports a caller-owned injected texture', () => {
  const bitmap = bitmapFixture();
  const texture = new THREE.Texture(bitmap);
  configureEarthTexture(THREE, texture);
  let disposals = 0;
  texture.addEventListener('dispose', () => disposals++);
  disposeEarthTexture(texture);
  disposeEarthTexture(texture);
  assert.equal(bitmap.closes, 1);
  assert.equal(disposals, 1);
});

void test('The shipped 8K night map matches its source manifest and texture memory estimate', async () => {
  const asset = await fs.readFile(
    new URL('../../public/textures/earth-black-marble-8k.jpg', import.meta.url),
  );
  const manifest = JSON.parse(
    await fs.readFile(
      new URL(
        '../../public/textures/earth-black-marble-8k.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const metadata = await sharp(asset).metadata();
  assert.equal(metadata.width, 8192);
  assert.equal(metadata.height, 4096);
  assert.equal(manifest.width, metadata.width);
  assert.equal(manifest.height, metadata.height);
  assert.equal(manifest.encodedBytes, asset.length);
  assert.equal(asset.length, 2329878);
  assert.equal(
    manifest.sha256,
    createHash('sha256').update(asset).digest('hex'),
  );
  assert.equal(manifest.asset, EARTH_TEXTURE_ASSET);
  assert.equal(manifest.source.width, 13500);
  assert.equal(manifest.source.height, 6750);
  assert.equal(
    manifest.source.sha256,
    'e915ef2a20d84e2a59e1547d3ad564463ad4bcf22bfa02e0e0b8ed1cd722e9c0',
  );
  assert.equal(manifest.estimatedRgba8WithMipmapsBytes, 178956972);
});
