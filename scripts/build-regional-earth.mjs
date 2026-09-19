/** Build the authored Europe loop from unchanged native-resolution night pixels.
 * No resizing, neural enhancement or runtime synthesis. Rebuild with:
 *   node scripts/build-regional-earth.mjs
 * The fixed source revision also reproduces the previous full-globe baseline.
 */
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const revision = 'c645c839fc638be005038eb3d039c4daac1f098d';
const sourcePath = 'public/textures/earth-black-marble-8k.jpg';
const sourceHash = '48270283df64bcf5c892a15c2efcbaf2a468fb292c1e534b67d47b6ac2c707cd';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
let encodedSource;
try {
  encodedSource = await readFile(resolve(root, sourcePath));
} catch {
  encodedSource = execFileSync('git', ['show', `${revision}:${sourcePath}`], {
    cwd: root, maxBuffer: 16 * 1024 * 1024,
  });
}
if (digest(encodedSource) !== sourceHash) throw new Error('Night source identity changed');
const { data: source, info } = await sharp(encodedSource).removeAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.width !== 8192 || info.height !== 4096 || info.channels !== 3)
  throw new Error('Expected the original RGB 8192×4096 night image');

const width = 4096, height = 3072, sourceX = 3712, sourceY = 128;
const coreWidth = 1536, patchSize = 256, overlap = 80, step = patchSize - overlap;
const pixels = Buffer.alloc(width * height * 3);
const sourceIndex = (x, y) => (y * info.width + x) * 3;
const outputIndex = (x, y) => (y * width + x) * 3;
for (let y = 0; y < height; y++) {
  const start = sourceIndex(sourceX, sourceY + y);
  source.copy(pixels, outputIndex(0, y), start, start + coreWidth * 3);
}
const positions = (start, end) => {
  const result = [start];
  while (result.at(-1) + patchSize < end)
    result.push(Math.min(result.at(-1) + step, end - patchSize));
  return result;
};
const columns = positions(coreWidth - overlap, width);
const rows = positions(0, height);
let seed = 0x4555524f;
const random = () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
};
const patches = [];
const sampleIndex = (patch, x, y) => sourceIndex(
  patch.sourceX + (patch.mirror ? patchSize - 1 - x : x), patch.sourceY + y,
);
const energy = (ox, oy, patch, x, y) => {
  const a = outputIndex(ox + x, oy + y), b = sampleIndex(patch, x, y);
  let difference = 0;
  for (let c = 0; c < 3; c++) difference += (pixels[a + c] - source[b + c]) ** 2;
  const peak = Math.max(pixels[a], pixels[a + 1], pixels[a + 2], source[b], source[b + 1], source[b + 2]);
  return difference + Math.max(0, peak - 55) ** 2 * 0.18;
};
/** Minimum-error joins route around city cores and contrasting shorelines.
 * Cutting original pixels instead of dissolving them preserves fine detail.
 * Small, independently selected patches avoid repeating whole countries.
 */
const pathFor = (length, breadth, costAt) => {
  const parent = new Int8Array(length * breadth);
  let previous = new Float64Array(breadth), current = new Float64Array(breadth);
  for (let x = 0; x < breadth; x++) previous[x] = costAt(0, x);
  for (let y = 1; y < length; y++) {
    for (let x = 0; x < breadth; x++) {
      let best = previous[x], direction = 0;
      if (x > 0 && previous[x - 1] < best) { best = previous[x - 1]; direction = -1; }
      if (x + 1 < breadth && previous[x + 1] < best) { best = previous[x + 1]; direction = 1; }
      current[x] = best + costAt(y, x);
      parent[y * breadth + x] = direction;
    }
    [previous, current] = [current, previous];
  }
  let x = 0;
  for (let i = 1; i < breadth; i++) if (previous[i] < previous[x]) x = i;
  const path = new Uint16Array(length);
  for (let y = length - 1; y >= 0; y--) {
    path[y] = x;
    x += parent[y * breadth + x];
  }
  return path;
};
for (let row = 0; row < rows.length; row++) {
  const oy = rows[row], top = row ? rows[row - 1] + patchSize - oy : 0;
  for (let column = 0; column < columns.length; column++) {
    const ox = columns[column];
    const left = column ? columns[column - 1] + patchSize - ox : overlap;
    const first = column === 0, last = column === columns.length - 1;
    let patch;
    if (first || last) {
      patch = { sourceX: first ? sourceX + ox : sourceX - patchSize, sourceY: sourceY + oy, mirror: false };
    } else {
      const candidates = [];
      for (let trial = 0; trial < 72; trial++) {
        const candidate = {
          sourceX: 3904 + Math.floor(random() * 928),
          sourceY: Math.max(0, Math.min(info.height - patchSize, sourceY + oy + Math.floor(random() * 321) - 160)),
          mirror: random() > 0.5,
        };
        const previous = patches.at(-1);
        // Do not reconstruct a second full Europe by marching across its map.
        if (previous && Math.abs(candidate.sourceX - previous.sourceX - step) < 96 && candidate.mirror === previous.mirror) continue;
        let cost = 0, count = 0;
        for (let y = 8; y < patchSize; y += 12) {
          let best = Infinity;
          for (let x = 4; x < left - 4; x += 8) best = Math.min(best, energy(ox, oy, candidate, x, y));
          cost += best; count++;
        }
        if (top) for (let x = left; x < patchSize; x += 12) {
          let best = Infinity;
          for (let y = 4; y < top - 4; y += 8) best = Math.min(best, energy(ox, oy, candidate, x, y));
          cost += best; count++;
        }
        candidates.push({ ...candidate, cost: cost / count });
      }
      candidates.sort((a, b) => a.cost - b.cost);
      patch = candidates[0];
    }
    const vertical = first ? new Uint16Array(patchSize).fill(left)
      : pathFor(patchSize, left, (y, x) => energy(ox, oy, patch, x, y));
    const horizontal = top ? pathFor(patchSize, top, (x, y) => energy(ox, oy, patch, x, y)) : null;
    for (let y = 0; y < patchSize; y++) for (let x = 0; x < patchSize; x++) {
      if (x < vertical[y] || (horizontal && y < horizontal[x])) continue;
      // Keep both the Europe core and the native wrap border exact.
      if (ox + x < coreWidth) continue;
      const a = outputIndex(ox + x, oy + y), b = sampleIndex(patch, x, y);
      pixels[a] = source[b]; pixels[a + 1] = source[b + 1]; pixels[a + 2] = source[b + 2];
    }
    patches.push({ outputX: ox, outputY: oy, width: patchSize, height: patchSize,
      sourceX: patch.sourceX, sourceY: patch.sourceY, mirror: patch.mirror });
  }
}
// At the periodic boundary retain adjacent native columns, not duplicated edge
// columns; bilinear and mip filtering then see a natural source neighbourhood.
for (let y = 0; y < height; y++) {
  const start = sourceIndex(sourceX - 64, sourceY + y);
  source.copy(pixels, outputIndex(width - 64, y), start, start + 64 * 3);
}

const output = await sharp(pixels, { raw: { width, height, channels: 3 } })
  .webp({ lossless: true, effort: 6 }).toBuffer();
const decoded = await sharp(output).removeAlpha().raw().toBuffer();
if (!decoded.equals(pixels)) throw new Error('Texture encoding did not preserve authored RGB pixels');
let coreErrors = 0;
for (let y = 0; y < height; y++) {
  const a = source.subarray(sourceIndex(sourceX, sourceY + y), sourceIndex(sourceX + coreWidth, sourceY + y));
  const b = decoded.subarray(outputIndex(0, y), outputIndex(coreWidth, y));
  if (!a.equals(b)) coreErrors++;
}
if (coreErrors) throw new Error('Protected Europe pixels changed');

let mipBytes = 0;
for (let w = width, h = height; ; w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)) {
  mipBytes += w * h * 4;
  if (w === 1 && h === 1) break;
}
const asset = '/textures/earth-europe-loop.webp';
const manifest = {
  title: 'Europe at Night — artistically repeated regional satellite texture',
  asset, width, height, format: 'webp', lossless: true, encodedBytes: output.length,
  sha256: digest(output), colorSpace: 'sRGB', estimatedRgba8WithMipmapsBytes: mipBytes,
  projection: 'equirectangular regional atlas; 180-degree horizontal period; north-to-south rows',
  mapping: { sourceWidth: info.width, sourceHeight: info.height, sourceX, sourceY, coreWidth, longitudePeriodDegrees: 180, latitudeNorth: 84.375, latitudeSouth: -50.625 },
  quality: { resampled: false, protectedCoreDecodedPixelDifferences: coreErrors, coreSha256: digest(await sharp(pixels, { raw: { width, height, channels: 3 } }).extract({ left: 0, top: 0, width: coreWidth, height }).raw().toBuffer()) },
  source: { revision, path: sourcePath, sha256: sourceHash, credit: 'NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS data from Miguel Román, NASA GSFC', page: 'https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/', note: '2016 composite. The original Europe core is preserved; the connecting geography is an authored collage and is not a factual world map.' },
  preparation: { command: 'node scripts/build-regional-earth.mjs', recipe: 'Native-scale satellite patches joined along minimum-error terrain paths; protected original Europe core and natural source adjacency at the periodic boundary; lossless WebP. No AI-generated pixels, blur, upscaling, relighting or runtime synthesis.', sharp: sharp.versions.sharp, vips: sharp.versions.vips, webp: sharp.versions.webp, patches },
};
await mkdir(resolve(root, 'public/textures'), { recursive: true });
await writeFile(resolve(root, `public${asset}`), output);
await writeFile(resolve(root, 'public/textures/earth-europe-loop.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ asset, width, height, encodedBytes: output.length, mipBytes, coreErrors, sha256: manifest.sha256, patches: patches.length }, null, 2));
