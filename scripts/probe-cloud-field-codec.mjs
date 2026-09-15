/** Untimed, lossless cloud-layout comparison. No generator/browser work.
 * node scripts/probe-cloud-field-codec.mjs --input=path.cfd.gz --out=report.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  gzipSync,
  gunzipSync,
  brotliCompressSync,
  brotliDecompressSync,
  constants,
} from 'node:zlib';
import {
  encodeCloudField,
  decodeCloudField,
} from './benchmarks/clouds/cloud-field-codec.ts';
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const at = arg.indexOf('=');
    return [arg.slice(2, at), arg.slice(at + 1)];
  }),
);
for (const key of args.keys())
  assert.ok(
    ['input', 'out', 'width', 'height'].includes(key),
    `Unknown --${key}`,
  );
const inputPath = path.resolve(
  args.get('input') ?? 'public/textures/cloud-banks-v1.cfd.gz',
);
const outputPath = path.resolve(
  args.get('out') ??
    'docs/evidence/performance/cloud-delivery/codec-comparison.json',
);
const input = await fs.readFile(inputPath);
const body = input[0] === 31 && input[1] === 139 ? gunzipSync(input) : input;
const alreadyPacked = body.subarray(0, 4).toString() === 'CFD1';
const field = alreadyPacked
  ? decodeCloudField(body)
  : {
      data: body,
      width: Number(args.get('width') ?? 2048),
      height: Number(args.get('height') ?? 1024),
    };
const packed = encodeCloudField(field);
const restored = decodeCloudField(packed);
assert.ok(
  Buffer.from(restored.data).equals(field.data),
  'Actual field did not round-trip exactly',
);
const width = field.width,
  height = field.height;
const raw = Buffer.from(
  field.data.buffer,
  field.data.byteOffset,
  field.data.byteLength,
);
const interleaved = Buffer.allocUnsafe(raw.length);
for (let channel = 0; channel < 4; channel++)
  for (let row = 0; row < height; row++) {
    let previous = 0;
    for (let x = 0; x < width; x++) {
      const index = (row * width + x) * 4 + channel,
        value = raw[index];
      interleaved[index] = (value - previous) & 255;
      previous = value;
    }
  }
const layouts = [];
for (const [name, data] of [
  ['raw-rgba', raw],
  ['interleaved-row-delta', interleaved],
  ['CFD1-planar-row-delta', packed],
]) {
  const gzip = gzipSync(data, { level: 9 });
  const brotli = brotliCompressSync(data, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
  });
  assert.ok(gunzipSync(gzip).equals(data));
  assert.ok(brotliDecompressSync(brotli).equals(data));
  layouts.push({
    name,
    unpackedBytes: data.length,
    gzipLevel9: gzip.length,
    brotliQuality5: brotli.length,
  });
}
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const report = {
  recordedAt: new Date().toISOString(),
  inputPath,
  inputBytes: input.length,
  inputSha256: sha256(input),
  inputFormat: alreadyPacked ? 'CFD1' : 'raw-rgba',
  width,
  height,
  channels: 4,
  payloadSha256: sha256(raw),
  decodedSha256: sha256(restored.data),
  codecSourceSha256: sha256(
    await fs.readFile(new URL('./benchmarks/clouds/cloud-field-codec.ts', import.meta.url)),
  ),
  exactActualFieldRoundtrip: true,
  compressedRoundtrips: true,
  layouts,
  scope:
    'Untimed lossless byte-layout/compression comparison. No CPU speed, browser decode, GPU, or appearance change claim.',
};
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
