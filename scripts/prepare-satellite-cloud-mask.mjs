/** Developer-only source conversion. The portfolio never downloads the source TIFF.
 * node scripts/prepare-satellite-cloud-mask.mjs /path/to/cloud_combined_8192.tif
 */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';

if (!process.argv[2]) throw new Error('Pass the NASA cloud_combined_8192.tif source file. See scripts/assets/README.md.');
const input = await fs.readFile(process.argv[2]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const metadata = await sharp(input).metadata();
if (metadata.width !== 8192 || metadata.height !== 4096) throw new Error('Expected the original 8192×4096 cloud-only map.');
const mask = await sharp(input)
  .resize(2048, 1024, { kernel: 'lanczos3' }).greyscale().flip().raw().toBuffer();
if (mask.length !== 2048 * 1024) throw new Error('Expected a single unsigned-byte coverage channel.');
await fs.mkdir('scripts/assets', { recursive: true });
await fs.writeFile('scripts/assets/nasa-cloud-mask-2048.gray.gz', gzipSync(mask, { level: 9 }));
const source = {
  title: 'NASA Blue Marble: Clouds (2002)',
  url: 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif',
  sourceBytes: input.length, sourceSha256: hash(input),
  sourceWidth: metadata.width, sourceHeight: metadata.height,
  maskWidth: 2048, maskHeight: 1024, maskSha256: hash(mask),
  maskOrientation: 'south-to-north rows, -180 to +180 longitude columns',
  processing: `sharp ${sharp.versions.sharp}, Lanczos3 resize, greyscale, vertical flip; unsigned 8-bit raw data, gzip level 9`,
  credit: 'NASA Goddard Space Flight Center; Reto Stöckli; enhancements by Robert Simmon; MODIS science teams',
  note: 'Historical satellite composite; derived relief is artistic, not measured altitude.',
};
await fs.writeFile('scripts/assets/nasa-cloud-source.json', JSON.stringify(source, null, 2) + '\n');
console.log(JSON.stringify(source, null, 2));
