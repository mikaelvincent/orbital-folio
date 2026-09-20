import type * as Three from 'three';

export const EARTH_TEXTURE_WIDTH = 2560;
export const EARTH_TEXTURE_HEIGHT = 1536;
export const EARTH_TEXTURE_ASSET = '/textures/earth-europe-loop.webp';
// The regional artwork keeps the source map's texel density, rather than
// stretching a smaller map around the whole planet. Its authored bridge joins
// the retained European region to its next repetition at the same resolution.
export const EARTH_SOURCE_WIDTH = 8192;
export const EARTH_SOURCE_HEIGHT = 4096;
export const EARTH_REGION_START_X = 3712;
export const EARTH_REGION_START_Y = 384;

const ownedBitmaps = new WeakMap<Three.Texture, ImageBitmap>();
const disposedTextures = new WeakSet<Three.Texture>();

export function configureEarthTexture(
  THREE: typeof Three,
  texture: Three.Texture,
): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(
    EARTH_SOURCE_WIDTH / EARTH_TEXTURE_WIDTH,
    EARTH_SOURCE_HEIGHT / EARTH_TEXTURE_HEIGHT,
  );
  texture.offset.set(
    -EARTH_REGION_START_X / EARTH_TEXTURE_WIDTH,
    // Bitmap decode flips the rows, so V measures from the cropped bottom.
    -(EARTH_SOURCE_HEIGHT - EARTH_REGION_START_Y - EARTH_TEXTURE_HEIGHT) /
      EARTH_TEXTURE_HEIGHT,
  );
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  // ImageBitmap ignores Texture.flipY; orientation is applied during decode.
  texture.flipY = false;
  texture.premultiplyAlpha = false;
  texture.needsUpdate = true;
}

/** Advance longitude without moving the mesh's hidden nonperiodic seam.
 * Updating a texture transform changes one uniform, never the decoded bitmap.
 */
export function advanceEarthTexture(
  texture: Three.Texture,
  radians: number,
): void {
  const phase =
    (((radians / (Math.PI * 2)) * EARTH_SOURCE_WIDTH) / EARTH_TEXTURE_WIDTH) %
    1;
  texture.offset.x = -EARTH_REGION_START_X / EARTH_TEXTURE_WIDTH - phase;
}

/** Release an owned bitmap and GPU texture once, including injected test assets. */
export function disposeEarthTexture(texture: Three.Texture): void {
  if (disposedTextures.has(texture)) return;
  disposedTextures.add(texture);
  const image = texture.image as ImageBitmap | undefined;
  const bitmap =
    ownedBitmaps.get(texture) ??
    (typeof image?.close === 'function' ? image : undefined);
  ownedBitmaps.delete(texture);
  bitmap?.close();
  texture.dispose();
}

function abortError(): DOMException {
  return new DOMException('Earth texture loading was aborted', 'AbortError');
}

function checkAbort(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

/** Browser bitmap decode cannot be canceled, so close results that arrive late. */
function decodeBitmap(blob: Blob, signal: AbortSignal): Promise<ImageBitmap> {
  checkAbort(signal);
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    let pending: Promise<ImageBitmap>;
    try {
      pending = createImageBitmap(blob, {
        imageOrientation: 'flipY',
        colorSpaceConversion: 'none',
        premultiplyAlpha: 'none',
      });
    } catch (error) {
      signal.removeEventListener('abort', onAbort);
      reject(error);
      return;
    }
    pending.then(
      (bitmap) => {
        signal.removeEventListener('abort', onAbort);
        if (signal.aborted) {
          bitmap.close();
          reject(abortError());
        } else resolve(bitmap);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

export type EarthTextureLoad = {
  texture: Three.Texture;
  /** HTTP Content-Length, when available; it may differ from decoded body bytes. */
  encodedBytes: number | null;
  responseBytes: number;
  fetchMs: number;
  decodeMs: number;
};

/** The successful caller owns texture until disposeEarthTexture is called. */
export async function loadEarthTexture(
  THREE: typeof Three,
  signal: AbortSignal,
): Promise<EarthTextureLoad> {
  checkAbort(signal);
  const fetchStart = performance.now();
  const response = await fetch(EARTH_TEXTURE_ASSET, {
    signal,
    mode: 'same-origin',
    credentials: 'same-origin',
  });
  checkAbort(signal);
  if (!response.ok)
    throw new Error(`Earth texture request failed (${response.status})`);
  const bytes = await response.arrayBuffer();
  checkAbort(signal);
  const fetchMs = performance.now() - fetchStart;
  const lengthHeader = response.headers.get('content-length');
  const contentLength =
    lengthHeader !== null && /^\d+$/.test(lengthHeader)
      ? Number(lengthHeader)
      : NaN;
  const encodedBytes = Number.isSafeInteger(contentLength)
    ? contentLength
    : null;
  const decodeStart = performance.now();
  let bitmap: ImageBitmap | undefined;
  let texture: Three.Texture | undefined;
  try {
    bitmap = await decodeBitmap(
      new Blob([bytes], { type: 'image/webp' }),
      signal,
    );
    checkAbort(signal);
    if (
      bitmap.width !== EARTH_TEXTURE_WIDTH ||
      bitmap.height !== EARTH_TEXTURE_HEIGHT
    ) {
      throw new Error(
        `Earth texture must be ${EARTH_TEXTURE_WIDTH}×${EARTH_TEXTURE_HEIGHT}; received ${bitmap.width}×${bitmap.height}`,
      );
    }
    const decodeMs = performance.now() - decodeStart;
    texture = new THREE.Texture(bitmap);
    ownedBitmaps.set(texture, bitmap);
    configureEarthTexture(THREE, texture);
    return {
      texture,
      encodedBytes,
      responseBytes: bytes.byteLength,
      fetchMs,
      decodeMs,
    };
  } catch (error) {
    if (texture) disposeEarthTexture(texture);
    else bitmap?.close();
    throw error;
  }
}
