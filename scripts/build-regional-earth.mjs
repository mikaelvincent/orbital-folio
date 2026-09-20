/** Rebuild the compact Europe loop from a protected satellite core + authored AI bridge.
 * Image generation is offline; this deterministic assembly does not resize either source.
 * Run: node scripts/build-regional-earth.mjs
 */
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'public/textures/earth-black-marble-8k.jpg';
const bridgePath = 'scripts/assets/earth-europe-ai-bridge.png';
const sourceHash = '48270283df64bcf5c892a15c2efcbaf2a468fb292c1e534b67d47b6ac2c707cd';
const bridgeHash = '3c916200f9ed7975d34281f5216ff1ba196526fd1a4b723338ae670065a02a92';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const [sourceFile, bridgeFile] = await Promise.all([
  readFile(resolve(root, sourcePath)), readFile(resolve(root, bridgePath)),
]);
if (digest(sourceFile) !== sourceHash || digest(bridgeFile) !== bridgeHash)
  throw new Error('Authored Earth input identity changed');
const source = await sharp(sourceFile).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const bridge = await sharp(bridgeFile).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const width = 2560, height = 1536, sourceX = 3712, sourceY = 384, coreWidth = 1536;
const bridgeWidth = width - coreWidth;
if (source.info.width !== 8192 || source.info.height !== 4096 ||
    bridge.info.width !== bridgeWidth || bridge.info.height !== height ||
    source.info.channels !== 3 || bridge.info.channels !== 3)
  throw new Error('Inputs must retain their original native dimensions');
const sourceIndex = (x, y) => ((sourceY + y) * source.info.width + x) * 3;
// The AI bridge and original source use the same latitude window. No scaling
// or extrapolated padding is needed, including the guarded camera footprint.
const bridgeIndex = (x, y) => (y * bridgeWidth + x) * 3;
const outputIndex = (x, y) => (y * width + x) * 3;

// Minimum-error cuts in the overlap preserve small city lights without a dissolve.
// A full 128px of source geography on each side protects the desktop opening and
// gives wrap filtering adjacent original columns. Never blend or resample the core.
function seam(left, right, sourceColumn) {
  const breadth = right - left + 1;
  const parent = new Int8Array(height * breadth);
  let previous = new Float64Array(breadth), current = new Float64Array(breadth);
  const cost = (x, y) => {
    const a = sourceIndex(sourceColumn(x), y), b = bridgeIndex(x, y);
    let error = 0, peak = 0;
    for (let c = 0; c < 3; c++) {
      error += (source.data[a + c] - bridge.data[b + c]) ** 2;
      peak = Math.max(peak, source.data[a + c], bridge.data[b + c]);
    }
    return error + Math.max(0, peak - 55) ** 2 * 0.25;
  };
  for (let x = 0; x < breadth; x++) previous[x] = cost(left + x, 0);
  for (let y = 1; y < height; y++) {
    for (let x = 0; x < breadth; x++) {
      let best = previous[x], direction = 0;
      if (x && previous[x - 1] < best) { best = previous[x - 1]; direction = -1; }
      if (x + 1 < breadth && previous[x + 1] < best) { best = previous[x + 1]; direction = 1; }
      current[x] = best + cost(left + x, y);
      parent[y * breadth + x] = direction;
    }
    [previous, current] = [current, previous];
  }
  let x = 0;
  for (let i = 1; i < breadth; i++) if (previous[i] < previous[x]) x = i;
  const result = new Uint16Array(height);
  for (let y = height - 1; y >= 0; y--) {
    result[y] = left + x;
    x += parent[y * breadth + x];
  }
  return result;
}
const leftSeam = seam(128, 192, (x) => sourceX + coreWidth + x);
const rightSeam = seam(bridgeWidth - 192, bridgeWidth - 128, (x) => sourceX - bridgeWidth + x);
const pixels = Buffer.alloc(width * height * 3);
let generatedPixels = 0;
for (let y = 0; y < height; y++) {
  source.data.copy(pixels, outputIndex(0, y), sourceIndex(sourceX, y), sourceIndex(sourceX + coreWidth, y));
  for (let x = 0; x < bridgeWidth; x++) {
    let input, index;
    if (x < leftSeam[y]) {
      input = source.data; index = sourceIndex(sourceX + coreWidth + x, y);
    } else if (x >= rightSeam[y]) {
      input = source.data; index = sourceIndex(sourceX - bridgeWidth + x, y);
    } else {
      input = bridge.data; index = bridgeIndex(x, y); generatedPixels++;
    }
    input.copy(pixels, outputIndex(coreWidth + x, y), index, index + 3);
  }
}
const output = await sharp(pixels, { raw: { width, height, channels: 3 } })
  .webp({ lossless: true, effort: 6 }).toBuffer();
const decoded = await sharp(output).removeAlpha().raw().toBuffer();
if (!decoded.equals(pixels)) throw new Error('Lossless encoding changed authored RGB pixels');
let coreErrors = 0;
for (let y = 0; y < height; y++) {
  if (!source.data.subarray(sourceIndex(sourceX, y), sourceIndex(sourceX + coreWidth, y))
    .equals(decoded.subarray(outputIndex(0, y), outputIndex(coreWidth, y)))) coreErrors++;
}
if (coreErrors) throw new Error('Protected Europe core changed');
let mipBytes = 0;
for (let w = width, h = height; ; w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)) {
  mipBytes += w * h * 4;
  if (w === 1 && h === 1) break;
}
const core = await sharp(pixels, { raw: { width, height, channels: 3 } })
  .extract({ left: 0, top: 0, width: coreWidth, height }).raw().toBuffer();
const manifest = {
  title: 'Europe at Night — compact AI-assisted coastal loop',
  asset: '/textures/earth-europe-loop.webp', width, height, format: 'webp', lossless: true,
  encodedBytes: output.length, sha256: digest(output), colorSpace: 'sRGB',
  estimatedRgba8WithMipmapsBytes: mipBytes,
  projection: 'Regional equirectangular atlas; fixed sphere with scrolling longitude UVs',
  mapping: { sourceWidth:8192, sourceHeight:4096, sourceX, sourceY, coreWidth,
    longitudePeriodDegrees: width / 8192 * 360,
    latitudeNorth: 90 - sourceY / 4096 * 180,
    latitudeSouth: 90 - (sourceY + height) / 4096 * 180 },
  quality: { resampled: false, protectedCoreDecodedPixelDifferences: coreErrors, coreSha256:digest(core) },
  source: { path:sourcePath, sha256:sourceHash,
    credit:'NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS data from Miguel Román, NASA GSFC',
    page:'https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/',
    note:'2016 night composite. The retained geographic strip is original; the generated continuation is fictional, not observed Earth.' },
  generated: { path:bridgePath, sha256:bridgeHash, tool:'Built-in image_gen', nativeDimensions:[1024,1536], sourceY, cropTop:0, bottomGuardRows:0,
    prompt:'docs/evidence/earth-consistent-loop/art/prompt-v3.txt',
    reference:'Europe core and original boundary strips from the source map',
    usedPixels:generatedPixels, percentOfAtlas:generatedPixels / (width * height) * 100 },
  preparation: { command:'node scripts/build-regional-earth.mjs',
    recipe:'Copy protected core and natural periodic boundary from NASA pixels; stitch a native-resolution AI bridge with minimum-error cuts. No resizing, blur, relighting or runtime synthesis.',
    sharp:sharp.versions.sharp, vips:sharp.versions.vips, webp:sharp.versions.webp,
    seamRange:[128,192], leftSeamSha256:digest(Buffer.from(leftSeam.buffer)),
    rightSeamSha256:digest(Buffer.from(rightSeam.buffer)) },
};
await writeFile(resolve(root, 'public/textures/earth-europe-loop.webp'), output);
await writeFile(resolve(root, 'public/textures/earth-europe-loop.json'), JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({width,height,encodedBytes:output.length,mipBytes,coreErrors,generatedPercent:manifest.generated.percentOfAtlas,sha256:manifest.sha256},null,2));
