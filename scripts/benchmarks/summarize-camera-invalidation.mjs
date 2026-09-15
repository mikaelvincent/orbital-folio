/** Summarize saved camera-lab evidence without rerunning or changing its gates.
 * node scripts/benchmarks/summarize-camera-invalidation.mjs REPORT.json[.gz]
 *   [MORE_REPORTS...] [--weighted-gpu] [--out /path/to/summary.json]
 * Inputs stay separate: different sessions are not silently pooled together.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function statistics(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return { samples: 0, mean: null, p50: null, p95: null, min: null, max: null };
  return {
    samples: sorted.length,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    p50: sorted[Math.ceil(sorted.length * .5) - 1],
    p95: sorted[Math.ceil(sorted.length * .95) - 1],
    min: sorted[0],
    max: sorted.at(-1),
  };
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function property(value, path) {
  for (const key of path.split('.')) {
    if (!value || !Object.hasOwn(value, key)) return { missing: true };
    value = value[key];
  }
  return value;
}
const settingsFields = [
  'build', 'threeRevision', 'userAgent', 'hardwareConcurrency', 'renderer',
  'vendor', 'unmaskedRenderer', 'viewport', 'drawingBuffer', 'pixelRatio',
  'nativePixelRatio', 'aoEnabled', 'aoBuffer', 'aoSamples', 'denoiseSamples',
  'shadowMap', 'shadowsEnabled', 'experiment', 'filter', 'visible',
  'contactShading', 'reducedMotion', 'orbitalCamera.activeTime',
  'orbitalCamera.earthMode', 'orbitalCamera.earthAppearance',
  'orbitalCamera.earthOpening', 'orbitalCamera.earthTextureDimensions',
];
const transformFields = [
  'cameraPosition', 'cameraQuaternion', 'cameraMatrix', 'projectionMatrix',
  'lightRigQuaternion', 'keyPosition', 'shadowMatrix', 'shadowCameraUp',
  'vesselMatrix', 'pointer', 'drag',
];
function settingsParity(rows) {
  const differences = [];
  const unavailableFields = [];
  for (const key of settingsFields) {
    const variants = new Map();
    for (const { row, id } of rows) {
      const value = property(row.report?.settings, key);
      const identity = JSON.stringify(stable(value));
      const variant = variants.get(identity) ?? { value, rows: [] };
      variant.rows.push(id);
      variants.set(identity, variant);
    }
    if ([...variants.values()].some((variant) => variant.value?.missing === true)) unavailableFields.push(key);
    if (variants.size > 1) differences.push({ key, variants: [...variants.values()] });
  }
  const startTransforms = {};
  for (const key of transformFields) {
    const available = rows.filter(({ row }) => Array.isArray(row.stateBefore?.[key]) && row.stateBefore[key].every(Number.isFinite));
    const reference = available[0]?.row.stateBefore[key];
    const sameShape = available.every(({ row }) => row.stateBefore[key].length === reference?.length);
    const maxAbsoluteDifference = !reference || !sameShape ? null : Math.max(0, ...available.flatMap(({ row }) => row.stateBefore[key].map((value, index) => Math.abs(value - reference[index]))));
    startTransforms[key] = { availableRows: available.length, totalRows: rows.length, sameShape, maxAbsoluteDifference, exactlyEqual: maxAbsoluteDifference === 0 && available.length === rows.length };
  }
  return { checkedFields: settingsFields, availableFieldsMatch: differences.length === 0, complete: unavailableFields.length === 0, unavailableFields, differences, startTransforms, note: 'Policy and monotonic geometry revision are intentionally not equality settings. Start-pose differences are reported exactly without an inferred visual tolerance.' };
}
function cohort(frame) {
  const refresh = (frame.counters?.['ao-refresh'] ?? 0) > 0;
  const cached = (frame.counters?.['ao-cached'] ?? 0) > 0;
  if (refresh && !cached) return 'refresh';
  if (cached && !refresh) return 'cached';
  return 'unclassified';
}
function groupRows(rows, weighted) {
  const groups = new Map();
  for (const entry of rows) {
    const key = `${entry.row.scenario}\0${entry.row.policy}`;
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return [...groups.values()].map((entries) => {
    const frameValues = [];
    const intervals = [];
    const counters = {};
    const cohorts = Object.fromEntries(['refresh', 'cached', 'unclassified'].map((name) => [name, { renderedFrames: 0, gpuValues: [] }]));
    const gpuValues = [];
    const gpuPhases = new Map();
    const gpuOmissions = [];
    const missingRawRows = [];
    const frameScopes = new Set();
    const sampleEvery = new Set();
    let recordedFrames = 0, requestedFrames = 0, rawFrames = 0, unmatchedGpuSamples = 0;
    for (const { row, id } of entries) {
      const scene = row.report?.scene ?? {};
      const frames = scene.frames ?? [];
      const gpu = scene.gpu ?? {};
      frameScopes.add(gpu.scope ?? 'unavailable');
      sampleEvery.add(gpu.sampleEvery ?? null);
      requestedFrames += row.requestedFrames ?? 0;
      recordedFrames += row.measuredFrames ?? scene.window?.frames ?? 0;
      rawFrames += frames.length;
      if (!Array.isArray(scene.frames)) missingRawRows.push(id);
      const byId = new Map();
      for (const frame of frames) {
        byId.set(frame.id, frame);
        if (Number.isFinite(frame.cpuTotalMs)) frameValues.push(frame.cpuTotalMs);
        if (Number.isFinite(frame.intervalMs)) intervals.push(frame.intervalMs);
        cohorts[cohort(frame)].renderedFrames++;
      }
      // Aggregate the original retained-window counters, even if an older report
      // omitted raw frames. Such a report cannot supply pooled percentiles.
      for (const [name, count] of Object.entries(scene.counters ?? {})) {
        if (Number.isFinite(count)) counters[name] = (counters[name] ?? 0) + count;
      }
      if (!Array.isArray(gpu.samples)) {
        gpuOmissions.push({ row: id, reason: 'No raw GPU samples; per-row percentiles cannot reconstruct a pooled percentile.' });
        continue;
      }
      if (['disjoint', 'context-lost'].includes(gpu.status)) {
        gpuOmissions.push({ row: id, reason: `GPU status ${gpu.status}; raw samples not promoted into a valid timing cohort.` });
        continue;
      }
      for (const sample of gpu.samples) {
        if (!Number.isFinite(sample.ms) || sample.ms < 0) continue;
        const values = gpuPhases.get(sample.name) ?? [];
        values.push(sample.ms);
        gpuPhases.set(sample.name, values);
        if (sample.name !== 'frame') continue;
        gpuValues.push(sample.ms);
        // Frame IDs restart for every row. Join within the source row, never
        // against a combined frame map from other rows or comparison blocks.
        const frame = byId.get(sample.frameId);
        if (!frame) { unmatchedGpuSamples++; continue; }
        cohorts[cohort(frame)].gpuValues.push(sample.ms);
      }
      if (gpu.pending || gpu.skippedSamples || gpu.discardedSamples)
        gpuOmissions.push({ row: id, pending: gpu.pending ?? 0, skippedSamples: gpu.skippedSamples ?? 0, discardedSamples: gpu.discardedSamples ?? 0, reason: 'Unresolved/skipped/discarded queries are not zero-duration samples.' });
    }
    const aoFrames = cohorts.refresh.renderedFrames + cohorts.cached.renderedFrames;
    const sampledAoFrames = cohorts.refresh.gpuValues.length + cohorts.cached.gpuValues.length;
    const refreshFraction = aoFrames ? cohorts.refresh.renderedFrames / aoFrames : null;
    const sampledRefreshFraction = sampledAoFrames ? cohorts.refresh.gpuValues.length / sampledAoFrames : null;
    const group = {
      scenario: entries[0].row.scenario,
      policy: entries[0].row.policy,
      sourceRows: entries.map(({ id }) => id),
      rows: entries.length,
      requestedFrames, recordedFrames, rawFrames, missingRawRows,
      cpuMs: statistics(frameValues),
      intervalMs: statistics(intervals),
      counters,
      ao: {
        refreshFrames: cohorts.refresh.renderedFrames,
        cachedFrames: cohorts.cached.renderedFrames,
        unclassifiedFrames: cohorts.unclassified.renderedFrames,
        refreshFraction,
      },
      frameGpuSampledMs: statistics(gpuValues),
      gpu: {
        scopes: [...frameScopes],
        sampleEvery: [...sampleEvery],
        rawPhaseSamplesMs: Object.fromEntries([...gpuPhases].map(([name, values]) => [name, statistics(values)])),
        cohorts: Object.fromEntries(Object.entries(cohorts).map(([name, value]) => [name, { renderedFrames: value.renderedFrames, sampledGpuMs: statistics(value.gpuValues) }])),
        sampledRefreshFraction,
        unmatchedFrameSamples: unmatchedGpuSamples,
        omissions: gpuOmissions,
      },
    };
    if (weighted) {
      const totalFrames = Object.values(cohorts).reduce((sum, item) => sum + item.renderedFrames, 0);
      const reasons = [];
      if (!totalFrames) reasons.push('No raw frames.');
      if (missingRawRows.length) reasons.push('At least one included row lacks raw frames.');
      if (unmatchedGpuSamples) reasons.push('GPU samples without matching source-row frames.');
      for (const [name, value] of Object.entries(cohorts)) {
        if (value.renderedFrames > 0 && !value.gpuValues.length) reasons.push(`No valid frame GPU samples for the ${name} cohort.`);
      }
      group.estimatedCohortWeightedFrameGpuMs = {
        kind: 'estimate-not-measured',
        mean: reasons.length ? null : Object.values(cohorts).reduce((sum, value) => sum + (value.renderedFrames ? statistics(value.gpuValues).mean * value.renderedFrames / totalFrames : 0), 0),
        p95: null,
        method: 'Sum of each AO refresh/cached/unclassified cohort sampled mean × its actual raw-rendered-frame fraction. This reweights fixed-cadence samples; it is not an independently measured frame-GPU mean or percentile.',
        unavailableReasons: reasons,
        warning: 'Assumes sampled frames represent unsampled frames within each cohort. Time/scene correlations inside a cohort remain; no bias correction or uncertainty guarantee is established.',
      };
    }
    return group;
  });
}

/** Exported so aggregation can be checked against deliberate small fixtures. */
export function summarizeCameraReport(report, { weightedGpu = false } = {}) {
  const acceptedRows = [];
  const blocks = (report.blocks ?? []).map((block, blockIndex) => {
    const accepted = block.accepted === true;
    if (accepted) for (const [rowIndex, row] of (block.rows ?? []).entries()) acceptedRows.push({ row, id: `block-${blockIndex}/row-${rowIndex}` });
    return { scenario: block.scenario, index: block.index ?? blockIndex, order: block.order, accepted, reasons: block.reasons ?? [], referenceSpread: block.referenceSpread ?? null, recordedRows: block.rows?.length ?? 0, before: block.before, after: block.after };
  });
  const scenarios = [...new Set(acceptedRows.map(({ row }) => row.scenario))];
  const standalone = (report.rows ?? []).map((row, index) => ({ row, id: `standalone-${index}` }));
  return {
    schemaVersion: 1,
    runId: report.runId,
    mode: report.mode,
    overallStatus: report.status,
    startedAt: report.startedAt,
    endedAt: report.endedAt,
    settings: report.settings,
    notes: report.notes,
    sourceSnapshotId: report.manifest?.snapshotId ?? null,
    errors: report.errors ?? [],
    acceptedBlockCount: blocks.filter((block) => block.accepted).length,
    rejectedOrUnacceptedBlockCount: blocks.filter((block) => !block.accepted).length,
    acceptedOrderCounts: blocks.filter((block) => block.accepted).reduce((counts, block) => {
      const key = `${block.scenario}: ${(block.order ?? []).join('/')}`;
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
    blocks,
    acceptedGroups: groupRows(acceptedRows, weightedGpu),
    acceptedScenarioSettingsParity: Object.fromEntries(scenarios.map((scenario) => [scenario, settingsParity(acceptedRows.filter(({ row }) => row.scenario === scenario))])),
    standaloneGroups: groupRows(standalone, weightedGpu),
    standaloneInterpretation: report.mode === 'verify' ? 'Image-verification runs include synchronous readbacks. These rows are NOT performance comparisons.' : 'Standalone survey/partial rows have no accepted paired-block status; do not combine them with accepted comparison rows.',
    readiness: (report.controls ?? []).map((control) => ({ attempt: control.attempt, accepted: control.accepted, controlSpread: control.controlSpread, directionalDrift: control.directionalDrift, before: control.before, after: control.after })),
    limitations: [
      'Original overall status, exclusions and acceptance decisions are preserved; accepted subsets do not make an incomplete run complete.',
      'CPU/interval pooled percentiles use retained raw frames; GPU pooled percentiles use valid raw samples. Means and percentiles are not averages of per-row percentiles.',
      'Fixed GPU sampling cadence can overrepresent AO-refresh frames. The optional cohort-weighted mean is explicitly an estimate, not a measured or bias-corrected result.',
      'No cross-input pooling occurs. Review matching sources, quality, power cohorts, baseline variation and recorded conditions before interpreting differences.',
      'Missing GPU samples and percentiles stay unavailable; CPU and GPU overlap and are not additive. Timing does not establish heat, battery or energy gains.',
    ],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const inputs = [];
  let out, weightedGpu = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--weighted-gpu') weightedGpu = true;
    else if (arg === '--out') {
      out = args[++index];
      if (!out || out.startsWith('--')) throw new Error('--out requires a filename.');
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/benchmarks/summarize-camera-invalidation.mjs REPORT.json[.gz] [MORE_REPORTS...] [--weighted-gpu] [--out FILE]');
      return;
    } else if (arg.startsWith('--')) throw new Error(`Unknown argument: ${arg}`);
    else inputs.push(arg);
  }
  if (!inputs.length) throw new Error('Supply at least one saved camera-lab JSON or JSON.gz report.');
  const reports = [];
  for (const path of inputs) {
    const bytes = await readFile(path);
    const decoded = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes;
    const report = JSON.parse(decoded.toString('utf8'));
    if (!report || typeof report !== 'object' || !report.runId || !report.status) throw new Error(`Not a camera-lab report: ${path}`);
    reports.push({ input: path, inputBytes: bytes.byteLength, inputSha256: createHash('sha256').update(bytes).digest('hex'), ...summarizeCameraReport(report, { weightedGpu }) });
  }
  const result = JSON.stringify({ schemaVersion: 1, summarizedAt: new Date().toISOString(), reports }, null, 2) + '\n';
  if (out) {
    if (inputs.some((input) => resolve(input) === resolve(out))) throw new Error('Refusing to overwrite an input report.');
    await mkdir(dirname(resolve(out)), { recursive: true });
    await writeFile(out, result);
  } else process.stdout.write(result);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(String(error)); process.exitCode = 1; });
}
