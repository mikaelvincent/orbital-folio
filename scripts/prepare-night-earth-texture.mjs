/** Offline preparation; the browser only requests the checked-in night JPEG.
 * node scripts/prepare-night-earth-texture.mjs /path/to/BlackMarble_2016_3km_geo.tif [2048|4096|8192]
 */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const sourceUrl =
  'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km_geo.tif';
const sourceSha256 =
  'e915ef2a20d84e2a59e1547d3ad564463ad4bcf22bfa02e0e0b8ed1cd722e9c0';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourcePath = process.argv[2];
if (!sourcePath)
  throw new Error(
    'Pass the original NASA Black Marble 2016 color 13500×6750 GeoTIFF. See scripts/assets/README.md.',
  );
if (process.argv.length > 4)
  throw new Error(
    'Pass only a source path and optional output width (2048, 4096 or 8192).',
  );

const width = process.argv[3] === undefined ? 8192 : Number(process.argv[3]);
if (![2048, 4096, 8192].includes(width))
  throw new Error('Night map output width must be 2048, 4096 or 8192.');
const height = width / 2;
const assetName = `earth-black-marble-${width / 1024}k`;
let mipBytes = 0;
for (
  let w = width, h = height;
  ;
  w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)
) {
  mipBytes += w * h * 4;
  if (w === 1 && h === 1) break;
}

sharp.concurrency(1);
const source = await fs.readFile(sourcePath);
if (hash(source) !== sourceSha256)
  throw new Error(
    'Source hash does not match the documented NASA Black Marble 2016 color map.',
  );
const metadata = await sharp(source).metadata();
if (metadata.width !== 13500 || metadata.height !== 6750)
  throw new Error(
    'Expected a 13500×6750 source; do not upscale a smaller image.',
  );

const texture = await sharp(source)
  .resize(width, height, { kernel: 'lanczos3' })
  .toColourspace('srgb')
  .removeAlpha()
  .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
  .toBuffer();
const manifest = {
  title: 'NASA Black Marble (2016): Earth at night, color composite',
  asset: `/textures/${assetName}.jpg`,
  width,
  height,
  format: 'jpeg',
  quality: 90,
  chromaSubsampling: '4:4:4',
  encodedBytes: texture.length,
  sha256: hash(texture),
  colorSpace: 'sRGB',
  projection: 'equirectangular',
  orientation:
    'north-to-south rows; -180 to +180 longitude columns; antimeridian at the seam',
  textureLoaderFlipY: true,
  estimatedRgba8WithMipmapsBytes: mipBytes,
  memoryNote:
    'Nominal RGBA8 full mip chain; excludes driver padding and decoded CPU image memory.',
  source: {
    url: sourceUrl,
    page: 'https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/',
    processingPage:
      'https://science.nasa.gov/earth/earth-observatory/night-light-maps-open-up-new-applications-90008/',
    width: metadata.width,
    height: metadata.height,
    bytes: source.length,
    sha256: sourceSha256,
    credit:
      'NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS data from Miguel Román, NASA GSFC',
    usageGuidelines: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    note: 'Historical 2016 night-light composite selected from cloud-free nights. Not live weather or one simultaneous full-globe photograph. No added clouds, glow, sharpening or color adjustments.',
  },
  preparation: {
    command: `node scripts/prepare-night-earth-texture.mjs /path/to/BlackMarble_2016_3km_geo.tif ${width}`,
    processing:
      'Lanczos3 downsample from verified 13500×6750 GeoTIFF; sRGB; remove alpha; JPEG quality 90, mozjpeg, 4:4:4 chroma; strip metadata; no geographic flip or crop; no upscaling or artistic enhancement.',
    sharp: sharp.versions.sharp,
    vips: sharp.versions.vips,
    mozjpeg: sharp.versions.mozjpeg,
  },
};
const outputDirectory = new URL('../public/textures/', import.meta.url);
await fs.mkdir(outputDirectory, { recursive: true });
await fs.writeFile(new URL(`${assetName}.jpg`, outputDirectory), texture);
await fs.writeFile(
  new URL(`${assetName}.json`, outputDirectory),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  JSON.stringify(
    { asset: manifest.asset, bytes: texture.length, sha256: manifest.sha256 },
    null,
    2,
  ),
);
