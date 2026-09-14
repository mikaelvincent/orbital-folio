/** Offline only: build the shipped volume data from the checked-in satellite mask. */
import fs from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createSatelliteCloudField } from '../lib/satellite-cloud-field.ts';
import { encodeCloudField } from '../lib/cloud-field-codec.ts';

const source = JSON.parse(await fs.readFile('scripts/assets/nasa-cloud-source.json', 'utf8'));
const mask = new Uint8Array(gunzipSync(await fs.readFile('scripts/assets/nasa-cloud-mask-2048.gray.gz')));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
if (hash(mask) !== source.maskSha256) throw new Error('Satellite source mask hash mismatch.');
const field = createSatelliteCloudField({ mask, width: 2048, height: 1024 });
const asset = gzipSync(encodeCloudField(field), { level: 9 });
await fs.mkdir('public/textures', { recursive: true });
await fs.writeFile('public/textures/cloud-satellite-v2.cfd.gz', asset);
const manifest = {
  version: field.version, width: field.width, height: field.height, channels: field.channels,
  rawBytes: field.data.length, gzipBytes: asset.length, sha256: hash(field.data),
  generator: 'lib/satellite-cloud-field.ts', source,
  note: 'Coverage derives from a historical NASA satellite composite. Height and lighting are an artistic shallow-volume approximation.',
};
await fs.writeFile('public/textures/cloud-satellite-v2.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ rawBytes: field.data.length, gzipBytes: asset.length, sha256: manifest.sha256 }, null, 2));
