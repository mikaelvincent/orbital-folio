/** Offline source preparation; the app only requests the checked-in satellite JPEG.
 * node scripts/prepare-earth-texture.mjs /path/to/land_ocean_ice_cloud_8192.tif [2048|4096|8192]
 */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const sourceUrl = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57735/land_ocean_ice_cloud_8192.tif';
const sourceSha256 = 'edd98f81cae53b4a4aceb65aa1dd41eaadf590149a8b41d21c1de51489b586a3';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Pass the original NASA combined 8192×4096 TIFF. See scripts/assets/README.md.');

const width = Number(process.argv[3] ?? 8192);
if (![2048, 4096, 8192].includes(width)) throw new Error('Choose width 2048, 4096 or 8192.');
const height = width / 2;
const assetName = `earth-blue-marble-${width / 1024}k`;
let mipBytes = 0;
for (let w = width, h = height;; w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)) {
  mipBytes += w * h * 4;
  if (w === 1 && h === 1) break;
}

sharp.concurrency(1);
const source = await fs.readFile(sourcePath);
if (hash(source) !== sourceSha256) throw new Error('Source hash does not match the documented NASA combined map.');
const metadata = await sharp(source).metadata();
if (metadata.width !== 8192 || metadata.height !== 4096) throw new Error('Expected an 8192×4096 source.');

const texture = await sharp(source)
  .resize(width, height, { kernel: 'lanczos3' })
  .toColourspace('srgb').removeAlpha()
  .jpeg({ quality: 85, mozjpeg: true, chromaSubsampling: '4:2:0' })
  .toBuffer();
const manifest = {
  title: 'NASA Blue Marble (2002): land, ocean color, sea ice and clouds',
  asset: `/textures/${assetName}.jpg`,
  width,
  height,
  format: 'jpeg',
  quality: 85,
  encodedBytes: texture.length,
  sha256: hash(texture),
  colorSpace: 'sRGB',
  projection: 'equirectangular',
  orientation: 'north-to-south rows; -180 to +180 longitude columns; antimeridian at the seam',
  textureLoaderFlipY: true,
  estimatedRgba8WithMipmapsBytes: mipBytes,
  memoryNote: 'Nominal RGBA8 full mip chain; excludes driver padding and decoded CPU image memory.',
  source: {
    url: sourceUrl,
    page: 'https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/',
    width: metadata.width,
    height: metadata.height,
    bytes: source.length,
    sha256: sourceSha256,
    credit: 'NASA Goddard Space Flight Center; Reto Stöckli; enhancements by Robert Simmon; MODIS science teams',
    note: 'Historical satellite composite, not live weather. Clouds and surface share one color map.',
  },
  preparation: {
    command: `node scripts/prepare-earth-texture.mjs /path/to/land_ocean_ice_cloud_8192.tif ${width}`,
    processing: 'Lanczos3 resize; sRGB; remove alpha; JPEG quality 85, mozjpeg, 4:2:0 chroma; strip metadata; no geographic flip or crop.',
    sharp: sharp.versions.sharp,
    vips: sharp.versions.vips,
    mozjpeg: sharp.versions.mozjpeg,
  },
};
const outputDirectory = new URL('../public/textures/', import.meta.url);
await fs.mkdir(outputDirectory, { recursive: true });
await fs.writeFile(new URL(`${assetName}.jpg`, outputDirectory), texture);
await fs.writeFile(new URL(`${assetName}.json`, outputDirectory), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ asset: manifest.asset, bytes: texture.length, sha256: manifest.sha256 }, null, 2));
