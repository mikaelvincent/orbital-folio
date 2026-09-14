/** Isolated cloud data/delivery audit. Defaults to dry-run: no generation/timing.
 * node scripts/benchmark-cloud-delivery.mjs --verify --out=/absolute/report.json
 * node --expose-gc scripts/benchmark-cloud-delivery.mjs --run \
 *   --telemetry-argv='["/tmp/orbital-folio-mac-thermal-snapshot","--pmset"]' \
 *   --assets='{"2048x1024":"/absolute/desktop.cfd.gz"}' --out=/absolute/report.json
 * Actual HTTP transfer, browser decode/upload, shader cost, and appearance need
 * a separate production-browser comparison. This script never edits the app.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import {
  gzipSync,
  gunzipSync,
  brotliCompressSync,
  brotliDecompressSync,
  constants as zlibConstants,
} from 'node:zlib';
import * as os from 'node:os';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const at = arg.indexOf('=');
    return at < 0
      ? [arg.slice(2), true]
      : [arg.slice(2, at), arg.slice(at + 1)];
  }),
);
const allowed = new Set([
  'run',
  'verify',
  'dry-run',
  'sizes',
  'assets',
  'seed',
  'pairs',
  'rest-ms',
  'initial-rest-ms',
  'recovery-ms',
  'max-recovery-attempts',
  'telemetry-argv',
  'out',
  'notes',
]);
for (const key of args.keys()) assert.ok(allowed.has(key), `Unknown --${key}`);
assert.ok(
  ['run', 'verify', 'dry-run'].filter((key) => args.has(key)).length <= 1,
  'Choose one of --run, --verify, or --dry-run.',
);
const numberArg = (key, fallback, min, max) => {
  const value = Number(args.get(key) ?? fallback);
  assert.ok(
    Number.isInteger(value) && value >= min && value <= max,
    `Invalid --${key}`,
  );
  return value;
};
const sizes = String(args.get('sizes') ?? '2048x1024')
  .split(',')
  .map((key) => {
    const [width, height, ...extra] = key.split('x').map(Number);
    assert.ok(
      !extra.length &&
        Number.isInteger(width) &&
        Number.isInteger(height) &&
        width >= 8 &&
        width <= 4096 &&
        height >= 4 &&
        height <= 2048 &&
        width === height * 2 &&
        !(width & (width - 1)),
      `Invalid field size: ${key}`,
    );
    return { key, width, height };
  });
const assets = args.has('assets') ? JSON.parse(args.get('assets')) : {};
assert.ok(assets && typeof assets === 'object' && !Array.isArray(assets));
for (const [key, value] of Object.entries(assets)) {
  assert.ok(
    sizes.some((size) => size.key === key) && typeof value === 'string',
    'Invalid --assets mapping.',
  );
}
const telemetryArgv = args.has('telemetry-argv')
  ? JSON.parse(args.get('telemetry-argv'))
  : null;
assert.ok(
  !telemetryArgv ||
    (Array.isArray(telemetryArgv) &&
      telemetryArgv.length &&
      telemetryArgv.every((value) => typeof value === 'string')),
  'Invalid --telemetry-argv.',
);
const config = {
  mode: args.has('run') ? 'run' : args.has('verify') ? 'verify' : 'dry-run',
  sizes,
  assets,
  seed: args.has('seed') ? numberArg('seed', 0, 0, 0xffffffff) : null,
  pairs: numberArg('pairs', 4, 2, 8),
  initialRestMs: numberArg('initial-rest-ms', 60_000, 0, 600_000),
  restMs: numberArg('rest-ms', 10_000, 0, 60_000),
  recoveryMs: numberArg('recovery-ms', 60_000, 1000, 60_000),
  maxRecoveryAttempts: numberArg('max-recovery-attempts', 3, 1, 10),
  telemetryArgv,
  notes: String(args.get('notes') ?? ''),
};
assert.equal(
  config.pairs % 2,
  0,
  '--pairs must be even for balanced BC/CB order.',
);
if (config.mode === 'dry-run') {
  console.log(
    JSON.stringify(
      {
        config,
        action: 'No imports of cloud code, generation, compression, or timing.',
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const output = resolve(
  String(
    args.get('out') ?? 'docs/evidence/performance/cloud-delivery/report.json',
  ),
);
await mkdir(dirname(output), { recursive: true });
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const execFileAsync = promisify(execFile);
const abort = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => abort.abort(signal));
const report = {
  schemaVersion: 1,
  status: 'preparing',
  startedAt: new Date().toISOString(),
  config,
  machine: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpu: os.cpus()[0]?.model,
    osRelease: os.release(),
    totalMemoryBytes: os.totalmem(),
  },
  sources: {},
  limitations: [
    'A is the original complete environment factory; its proceduralGenerationMs includes clouds and nebula. It is not an isolated cloud field cost.',
    'B generates the new field. C reads an already-built local raw/gzip asset, decodes it if necessary, and prepares a byte view. Both represent the same field payload.',
    'Local reads use a warmed filesystem cache. They do not predict HTTP latency, bandwidth, browser cache, browser decompression, or first correct cloud frame.',
    'Node gzip/Brotli inflate figures are supplemental delivery costs, not browser timings. Compression is developer work, outside client timings.',
    'No WebGL texture upload, mip generation, shader compilation, GPU/FPS/energy or visual-quality conclusion is measured here.',
    'Nominal pressure and matching boundary settings do not prove thermal equilibrium. Timings are descriptive; no candidate is automatically selected.',
    'The prebuilt and startup fields must match exactly. That equality does not imply the redesigned field matches the original animated 3D representation.',
    'Determinism checks use this Node runtime. They do not establish identical floating-point generator output in every browser/architecture; the downloaded asset itself fixes the bytes.',
  ],
  tiers: [],
};
async function save() {
  await writeFile(`${output}.tmp`, JSON.stringify(report, null, 2) + '\n');
  await rename(`${output}.tmp`, output);
}
async function rest(ms) {
  if (ms) await delay(ms, undefined, { signal: abort.signal });
}
async function snapshot() {
  if (!telemetryArgv)
    return {
      thermalState: 'unavailable',
      reason: 'No sampler configured',
      timestamp: new Date().toISOString(),
    };
  try {
    const result = await execFileAsync(
      telemetryArgv[0],
      telemetryArgv.slice(1),
      {
        timeout: 8000,
        maxBuffer: 65536,
        signal: abort.signal,
      },
    );
    return JSON.parse(result.stdout);
  } catch (error) {
    return {
      thermalState: 'unavailable',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}
async function ready() {
  const observations = [];
  for (let attempt = 0; attempt < config.maxRecoveryAttempts; attempt++) {
    const state = await snapshot();
    observations.push(state);
    if (!telemetryArgv || state.thermalState === 'nominal')
      return { qualified: true, observations };
    if (attempt + 1 < config.maxRecoveryAttempts) await rest(config.recoveryMs);
  }
  return { qualified: false, observations };
}
function measure(action) {
  const cpuStart = process.cpuUsage();
  const started = process.hrtime.bigint();
  const value = action();
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  const cpu = process.cpuUsage(cpuStart);
  return { value, elapsedMs, cpuMs: (cpu.user + cpu.system) / 1000 };
}
function fieldPayload(field, size) {
  assert.equal(field.width, size.width);
  assert.equal(field.height, size.height);
  assert.equal(field.channels, 4);
  assert.ok(typeof field.version === 'string' && field.version.length);
  assert.ok(field.data instanceof Uint8Array);
  assert.equal(field.data.length, size.width * size.height * 4);
  return Buffer.from(
    field.data.buffer,
    field.data.byteOffset,
    field.data.byteLength,
  );
}
function mipBytes(width, height) {
  let total = 0;
  for (;;) {
    total += width * height * 4;
    if (width === 1 && height === 1) return total;
    width = Math.max(1, width >> 1);
    height = Math.max(1, height >> 1);
  }
}
function powerSource(state) {
  return state.pmset?.battery?.stdout?.split('\n')[0] ?? null;
}
function contextIssues(before, after) {
  const issues = [];
  if (
    telemetryArgv &&
    [before, after].some((s) => s.thermalState !== 'nominal')
  )
    issues.push('thermal-pressure-not-nominal-or-unavailable');
  if (
    typeof before.lowPowerMode === 'boolean' &&
    typeof after.lowPowerMode === 'boolean' &&
    before.lowPowerMode !== after.lowPowerMode
  )
    issues.push('low-power-mode-changed');
  if (
    powerSource(before) &&
    powerSource(after) &&
    powerSource(before) !== powerSource(after)
  )
    issues.push('power-source-changed');
  return issues;
}

try {
  const { createCloudFieldData } = await import('../lib/cloud-field.ts');
  const { decodeCloudField } = await import('../lib/cloud-field-codec.ts');
  const { createOrbitalEnvironment } =
    await import('./benchmarks/cloud-reference.ts');
  const THREE = await import('three');
  for (const path of [
    'lib/cloud-field.ts',
    'lib/cloud-field-codec.ts',
    'scripts/benchmarks/cloud-reference.ts',
    'scripts/benchmark-cloud-delivery.mjs',
  ]) {
    report.sources[path] = sha256(await readFile(resolve(path)));
  }
  const prepared = [];
  for (const size of sizes) {
    const options = {
      width: size.width,
      height: size.height,
      ...(config.seed === null ? {} : { seed: config.seed }),
    };
    const field = createCloudFieldData(options);
    const payload = fieldPayload(field, size);
    const repeated = createCloudFieldData(options);
    assert.equal(repeated.version, field.version);
    assert.ok(
      payload.equals(fieldPayload(repeated, size)),
      `${size.key}: generator is not byte-deterministic`,
    );
    const assetPath = assets[size.key]
      ? resolve(assets[size.key])
      : resolve(dirname(output), `${size.key}.rgba.bin`);
    if (!assets[size.key]) await writeFile(assetPath, payload);
    const asset = await readFile(assetPath);
    const assetEncoding =
      asset[0] === 0x1f && asset[1] === 0x8b ? 'gzip' : 'raw';
    const transportBody = assetEncoding === 'gzip' ? gunzipSync(asset) : asset;
    const assetCodec =
      transportBody.subarray(0, 4).toString() === 'CFD1' ? 'CFD1' : 'raw-rgba';
    const unpacked =
      assetCodec === 'CFD1' ? decodeCloudField(transportBody) : null;
    if (unpacked) {
      assert.equal(unpacked.width, size.width);
      assert.equal(unpacked.height, size.height);
    }
    const decodedAsset = unpacked?.data ?? transportBody;
    assert.ok(
      payload.equals(decodedAsset),
      `${size.key}: decoded asset differs from generator payload`,
    );
    const gzip = gzipSync(transportBody, { level: 9 });
    const brotli = brotliCompressSync(transportBody, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 },
    });
    assert.ok(gunzipSync(gzip).equals(transportBody));
    assert.ok(brotliDecompressSync(brotli).equals(transportBody));
    const tier = {
      size: size.key,
      width: size.width,
      height: size.height,
      channels: 4,
      version: field.version,
      payloadSha256: sha256(payload),
      decodedAssetSha256: sha256(decodedAsset),
      transportBodySha256: sha256(transportBody),
      assetFileSha256: sha256(asset),
      assetEncoding,
      assetCodec,
      assetPath,
      verification: {
        deterministicGeneration: true,
        assetByteEquality: true,
        gzipRoundtrip: true,
        brotliRoundtrip: true,
      },
      bytes: {
        raw: payload.byteLength,
        transportBody: transportBody.byteLength,
        actualAssetFile: asset.byteLength,
        gzipLevel9: gzip.byteLength,
        brotliQuality5: brotli.byteLength,
        estimatedRgba8GpuMipChain: mipBytes(size.width, size.height),
      },
      runs: [],
    };
    report.tiers.push(tier);
    prepared.push({
      size,
      options,
      tier,
      gzip,
      brotli,
      assetPath,
      assetEncoding,
      assetCodec,
    });
    await save();
  }
  if (config.mode === 'verify') {
    report.status = 'verified-no-startup-timings';
  } else {
    report.status = 'running';
    await save();
    await rest(config.initialRestMs);
    for (const item of prepared) {
      const {
        size,
        options,
        tier,
        gzip,
        brotli,
        assetPath,
        assetEncoding,
        assetCodec,
      } = item;
      // Separate A scope is deliberate: comparing its complete factory with B's
      // field generator as if they were equivalent would overstate any saving.
      const jobs = [
        'A',
        ...Array.from({ length: config.pairs }, (_, i) =>
          i % 2 ? ['C', 'B'] : ['B', 'C'],
        ).flat(),
        'A',
      ];
      for (const variant of jobs) {
        await rest(config.restMs);
        const gate = await ready();
        if (!gate.qualified) {
          tier.runs.push({ variant, skipped: true, gate });
          await save();
          continue;
        }
        globalThis.gc?.();
        const before = await snapshot();
        const sample = { variant, before, gate };
        if (variant === 'A') {
          const measured = measure(() =>
            createOrbitalEnvironment(THREE, () => {}, {
              mobile: size.width <= 1024,
            }),
          );
          sample.factoryMs = measured.elapsedMs;
          sample.cpuMs = measured.cpuMs;
          sample.diagnostics = measured.value.getDiagnostics();
          measured.value.dispose();
        } else if (variant === 'B') {
          const measured = measure(() => createCloudFieldData(options));
          sample.generationMs = measured.elapsedMs;
          sample.cpuMs = measured.cpuMs;
          assert.equal(
            sha256(fieldPayload(measured.value, size)),
            tier.payloadSha256,
          );
        } else {
          const readStarted = process.hrtime.bigint();
          const loaded = await readFile(assetPath);
          sample.localWarmFileReadMs =
            Number(process.hrtime.bigint() - readStarted) / 1e6;
          const decoded =
            assetEncoding === 'gzip' ? measure(() => gunzipSync(loaded)) : null;
          const compressedBody = decoded?.value ?? loaded;
          const unpacked =
            assetCodec === 'CFD1'
              ? measure(() => decodeCloudField(compressedBody))
              : null;
          const body = unpacked?.value.data ?? compressedBody;
          sample.assetEncoding = assetEncoding;
          sample.assetCodec = assetCodec;
          sample.nodeAssetDecodeMs = decoded?.elapsedMs ?? 0;
          sample.codecDecodeMs = unpacked?.elapsedMs ?? 0;
          const viewed = measure(
            () => new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
          );
          sample.rawViewMs = viewed.elapsedMs;
          sample.rawViewCpuMs = viewed.cpuMs;
          assert.equal(sha256(viewed.value), tier.payloadSha256);
          const gunzipped = decoded ?? measure(() => gunzipSync(gzip));
          const unbrotlied = measure(() => brotliDecompressSync(brotli));
          sample.nodeGzipInflateMs = gunzipped.elapsedMs;
          sample.nodeBrotliInflateMs = unbrotlied.elapsedMs;
          sample.localReadDecodeAndViewMs =
            sample.localWarmFileReadMs +
            sample.nodeAssetDecodeMs +
            sample.codecDecodeMs +
            sample.rawViewMs;
          assert.equal(sha256(gunzipped.value), tier.transportBodySha256);
          assert.equal(sha256(unbrotlied.value), tier.transportBodySha256);
        }
        sample.after = await snapshot();
        sample.contextIssues = contextIssues(before, sample.after);
        tier.runs.push(sample);
        await save();
        console.log(
          JSON.stringify({
            size: size.key,
            variant,
            contextIssues: sample.contextIssues,
            factoryMs: sample.factoryMs,
            generationMs: sample.generationMs,
            localWarmFileReadMs: sample.localWarmFileReadMs,
            rawViewMs: sample.rawViewMs,
            nodeGzipInflateMs: sample.nodeGzipInflateMs,
            localReadDecodeAndViewMs: sample.localReadDecodeAndViewMs,
          }),
        );
      }
    }
    report.status = report.tiers.some((tier) =>
      tier.runs.some((run) => run.skipped || run.contextIssues?.length),
    )
      ? 'complete-with-skipped-or-flagged-samples'
      : 'complete-descriptive-startup-samples';
  }
  report.completedAt = new Date().toISOString();
  await save();
  console.log(
    JSON.stringify({
      status: report.status,
      output,
      tiers: report.tiers.map((t) => ({
        size: t.size,
        version: t.version,
        bytes: t.bytes,
      })),
    }),
  );
} catch (error) {
  report.status = abort.signal.aborted ? 'interrupted' : 'failed';
  report.error = error.message;
  await save();
  console.error(error.message);
  process.exitCode = abort.signal.aborted ? 130 : 1;
}
