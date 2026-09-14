import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { createCloudFieldData } from '../lib/cloud-field.ts';
import { encodeCloudField } from '../lib/cloud-field-codec.ts';
const started = performance.now();
const field = createCloudFieldData({ width: 2048, height: 1024 });
const asset = gzipSync(encodeCloudField(field), { level: 9 });
await fs.mkdir('public/textures', { recursive: true });
await fs.writeFile('public/textures/cloud-banks-v1.cfd.gz', asset);
await fs.writeFile(
  'public/textures/cloud-banks-v1.json',
  JSON.stringify(
    {
      version: field.version,
      width: field.width,
      height: field.height,
      channels: field.channels,
      seed: 803719,
      rawBytes: field.data.length,
      gzipBytes: asset.length,
      sha256: createHash('sha256').update(field.data).digest('hex'),
      generator: 'lib/cloud-field.ts',
      source:
        'Original procedural weather; NASA photographs used only as visual references.',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    generationMs: performance.now() - started,
    raw: field.data.length,
    gzip: asset.length,
  }),
);
