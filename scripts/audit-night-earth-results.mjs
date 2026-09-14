/** Audit saved night-Earth resolution reports; starts no renderer or benchmark.
 * node scripts/audit-night-earth-results.mjs [--input-dir PATH] [--partial]
 * Reads raw/*.json. Optional exclusions.json is an array of {file, reason} for
 * known interruptions; originals remain unchanged, even if they say complete.
 * conditions.json maps each raw basename to
 * {displayState: locked|unlocked|unobserved, note}.
 * Distinct display states are always analyzed as separate cohorts.
 * Complete runs write audit-summary.json and audit-summary.md.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input-dir');
if (inputIndex >= 0 && !args[inputIndex + 1]) throw new Error('--input-dir requires a path.');
const input = inputIndex < 0 ? join(root, 'docs/evidence/performance/night-earth-resolution') : resolve(args[inputIndex + 1]);
const partial = args.includes('--partial');
const ORDERS = ['ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA'];
const LETTERS = { A: '2k', B: '4k', C: '8k' };
const WIDTHS = { '2k': 2048, '4k': 4096, '8k': 8192 };
const VERSIONS = Object.keys(WIDTHS);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const unique = values => [...new Set(values)];
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const statistics = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: sorted.length, mean: mean(sorted), min: sorted[0] ?? null, max: sorted.at(-1) ?? null,
    median: sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2 : null,
    p95: sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : null };
};
const errors = [], warnings = [], observations = [], reports = [], excluded = [];
const check = (value, message) => { if (!value) errors.push(message); };
let explicitExclusions = [], exclusionSha256 = null;
try {
  const bytes = await readFile(join(input, 'exclusions.json'));
  explicitExclusions = JSON.parse(bytes);
  if (!Array.isArray(explicitExclusions) || explicitExclusions.some(row => typeof row?.file !== 'string' || !row.file.endsWith('.json') || row.file.includes('/') || typeof row.reason !== 'string' || !row.reason.trim())) throw new Error('exclusions.json must contain an array of {file: raw basename, reason: nonempty explanation}.');
  exclusionSha256 = hash(bytes);
} catch (error) { if (error.code !== 'ENOENT') throw error; }
check(unique(explicitExclusions.map(row => row.file)).length === explicitExclusions.length, 'Duplicate explicit exclusion filenames.');
const seenExclusions = new Set();
let conditions = {}, conditionsSha256 = null;
try {
  const bytes = await readFile(join(input, 'conditions.json'));
  conditions = JSON.parse(bytes);
  if (!conditions || typeof conditions !== 'object' || Array.isArray(conditions) || Object.entries(conditions).some(([name, value]) => !name.endsWith('.json') || name.includes('/') || !['locked', 'unlocked', 'unobserved'].includes(value?.displayState) || typeof value?.note !== 'string' || !value.note.trim())) throw new Error('conditions.json must map raw basenames to {displayState: locked|unlocked|unobserved, note: nonempty explanation}.');
  conditionsSha256 = hash(bytes);
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const assets = {};
for (const [version, width] of Object.entries(WIDTHS)) {
  const path = `textures/earth-black-marble-${version}.jpg`;
  const bytes = await readFile(join(root, 'public', path));
  const metadata = await sharp(bytes).metadata();
  const declared = JSON.parse(await readFile(join(root, 'public', path.replace('.jpg', '.json')), 'utf8'));
  let w = width, h = width / 2, mipBytes = 0;
  for (;;) { mipBytes += w * h * 4; if (w === 1 && h === 1) break; w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); }
  assets[version] = { path, width: metadata.width, height: metadata.height, bytes: bytes.length, sha256: hash(bytes), nominalRgba8MipBytes: mipBytes, nominalDecodedRgbaBytes: width * width * 2 };
  check(metadata.width === width && metadata.height === width / 2, `${version}: actual JPEG dimensions mismatch.`);
  check(declared.sha256 === assets[version].sha256 && declared.encodedBytes === bytes.length && declared.estimatedRgba8WithMipmapsBytes === mipBytes, `${version}: manifest disagrees with actual JPEG/storage calculation.`);
}
for (const name of (await readdir(join(input, 'raw'))).filter(name => name.endsWith('.json')).sort()) {
  const bytes = await readFile(join(input, 'raw', name));
  const data = JSON.parse(bytes);
  if (!data.configuration || !Array.isArray(data.blocks)) continue;
  const row = { name, sha256: hash(bytes), data, condition: conditions[name] ?? { displayState: 'unknown', note: 'No recorded display-state condition.' } };
  const exclusion = explicitExclusions.find(value => value.file === name);
  if (exclusion) seenExclusions.add(name);
  if (data.status !== 'complete' || exclusion) excluded.push({ name, sha256: row.sha256, condition: row.condition, status: data.status, reason: exclusion?.reason ?? data.reason ?? null, rawReason: data.reason ?? null, decisionSource: exclusion ? 'exclusions.json' : 'raw report status', frames: data.blocks.reduce((count, block) => count + (block.frames?.length ?? 0), 0), contextFlags: data.contextFlags ?? [] });
  else reports.push(row);
}
for (const row of explicitExclusions) check(seenExclusions.has(row.file), `Explicit exclusion ${row.file} has no retained raw report.`);
if (!reports.length) throw new Error('No complete raw reports available. No summary written.');
const manifest = reports[0].data.buildManifest;
const manifestHash = hash(JSON.stringify(manifest));
check(manifest.mode === 'night', 'Frozen build is not the night-Earth lab.');
check(manifest.sourceFiles?.some(file => file.path === 'components/orbital-environment.ts'), 'Frozen manifest lacks the production environment source.');
check(manifest.sourceFiles?.some(file => file.path === 'scripts/benchmarks/earth-resolution-lab.ts'), 'Frozen manifest lacks the measurement implementation.');
for (const asset of Object.values(assets)) {
  const recorded = manifest.publicFiles?.find(file => file.path === asset.path);
  check(recorded?.bytes === asset.bytes && recorded?.sha256 === asset.sha256, `${asset.path}: frozen manifest differs from audited asset.`);
}
const sourceChecks = [];
for (const file of manifest.sourceFiles ?? []) {
  if (file.path.startsWith('node_modules/')) continue;
  try {
    const bytes = await readFile(join(root, file.path));
    const matched = bytes.length === file.bytes && hash(bytes) === file.sha256;
    sourceChecks.push({ path: file.path, frozenSha256: file.sha256, matchesCurrentWorktree: matched });
    if (!matched) warnings.push(`${file.path}: current worktree differs from frozen source; recorded results apply to the frozen build.`);
  } catch { warnings.push(`${file.path}: frozen source cannot be compared with current worktree.`); }
}
function context(value, label) {
  const native = value?.native;
  check(value?.availability === 'available' && native?.thermalState === 'nominal', `${label}: native thermal pressure unavailable/non-nominal.`);
  check(native?.lowPowerMode === false, `${label}: Low Power Mode is enabled or unknown.`);
  const battery = native?.pmset?.battery;
  const therm = native?.pmset?.therm;
  for (const [kind, sample] of [['battery', battery], ['therm', therm]]) check(sample?.exitCode === 0 && sample?.timedOut === false, `${label}: native ${kind} query failed.`);
  const power = /Now drawing from '([^']+)'/.exec(battery?.stdout ?? '')?.[1] ?? null;
  check(power !== null, `${label}: power source unavailable.`);
  for (const match of (therm?.stdout ?? '').matchAll(/(?:CPU_Speed_Limit|GPU_Speed_Limit|Scheduler_Limit)\s*=\s*(\d+)/g)) check(Number(match[1]) >= 100, `${label}: restricted performance limit ${match[0]}.`);
  observations.push({ label, capturedAt: value?.capturedAt ?? null, thermalState: native?.thermalState ?? null, lowPowerMode: native?.lowPowerMode ?? null, powerSource: power });
}
function diagnostics(value, version, config, label) {
  const asset = assets[version];
  check(value?.ready === true && value?.earthReady === true && value?.earthLoadError === null, `${label}: Earth not ready or texture failed.`);
  check(value?.earthAppearance === 'night' && value?.earthMode === 'satellite-night-lights' && value?.earthSource === 'local-satellite-image' && value?.cloudWeatherModel === 'cloud-free-night-composite', `${label}: night source mismatch.`);
  check(equal(value?.earthTextureDimensions, [asset.width, asset.height]) && value?.earthResponseBytes === asset.bytes && value?.earthEncodedBytes === asset.bytes, `${label}: delivered night asset/dimensions mismatch.`);
  check(value?.earthTextureGpuBytes === asset.nominalRgba8MipBytes && value?.earthTextureBytes === asset.nominalDecodedRgbaBytes && value?.earthTextureSamples === 1, `${label}: texture storage/sample configuration mismatch.`);
  check(value?.activeTime === config.frozenTime && value?.earthOpeningElapsed === config.frozenTime && Math.abs(value?.earthRotation - config.frozenTime * 0.003) < 1e-9, `${label}: frozen time/rotation mismatch.`);
  check(value?.earthOpening?.longitude === 18 && value?.earthOpening?.latitude === 38 && value?.earthOpening?.roll === -12, `${label}: Mediterranean opening mismatch.`);
  check(value?.starCount === (config.mobile ? 2300 : 3100), `${label}: star workload mismatch.`);
}
const cohorts = new Map(), runIds = new Set();
for (const report of reports) {
  const { name, data, condition } = report, config = data.configuration, gpu = data.device?.gpuTimerAvailable === true;
  const browser = /(?:Chrome|Chromium)\//.test(data.device?.userAgent ?? '') ? 'Chromium' : /Safari\//.test(data.device?.userAgent ?? '') ? 'Safari' : 'Other';
  if (!partial) check(condition.displayState !== 'unknown', `${name}: declared display condition missing.`);
  const key = `${browser} ${config.width}x${config.height} DPR${config.dpr} (${condition.displayState} display)`;
  const cohort = cohorts.get(key) ?? { browser, displayState: condition.displayState, configuration: { width: config.width, height: config.height, dpr: config.dpr, mobile: config.mobile, frozenTime: config.frozenTime }, device: data.device, reports: [], blocks: [], preparations: new Map() };
  cohorts.set(key, cohort); cohort.reports.push(report);
  check(!runIds.has(data.runId), `${name}: duplicate run ID.`); runIds.add(data.runId);
  check(hash(JSON.stringify(data.buildManifest)) === manifestHash, `${name}: frozen build changed.`);
  check(data.contextStatus === 'nominal-observed' && data.contextFlags?.length === 0, `${name}: native qualification/context flags mismatch.`);
  check(config.mode === 'night' && ORDERS.includes(config.order) && equal(config.letters, LETTERS) && equal([...(config.permutationRounds ?? [])].sort((a, b) => a.localeCompare(b)), ORDERS), `${name}: night permutation metadata mismatch.`);
  check(config.framesPerBlock === 120 && config.warmupFramesPerBlock === 10 && config.idleRestMs === 20000 && config.blocks === 3 && config.frozenTime === 0 && equal(config.frozenView, { x: 0, y: 0 }), `${name}: declared protocol changed.`);
  check(config.queryScope === 'renderer.render(environment.scene, environment.camera)', `${name}: query scope changed.`);
  check(data.device?.visibility === 'visible' && data.device?.maxTextureSize >= 8192 && equal(data.device?.drawingBuffer, { width: config.width * config.dpr, height: config.height * config.dpr }), `${name}: device/viewport prerequisites invalid.`);
  check(data.device?.userAgent === cohort.device.userAgent && data.device?.unmaskedRenderer === cohort.device.unmaskedRenderer && data.device?.threeRevision === cohort.device.threeRevision, `${name}: browser/GPU changed inside cohort.`);
  check(equal(data.blocks.map(block => block.version), [...config.order].map(letter => LETTERS[letter])), `${name}: actual sequence differs from declared order.`);
  context(data.nativeContextInitial, `${name}/initial`);
  check(data.preparation?.residentEnvironmentCount === 3, `${name}: expected all three Earth environments resident.`);
  for (const phase of data.preparation?.phases ?? []) {
    const phaseKey = `${phase.version}/${phase.startedAt}`;
    if (cohort.preparations.has(phaseKey)) check(equal(cohort.preparations.get(phaseKey), phase), `${name}: reused preparation changed.`);
    cohort.preparations.set(phaseKey, phase);
    for (const field of ['moduleImportWallMs', 'factoryCpuMs', 'readyWaitWallMs', 'compileAsyncWallMs', 'firstRenderCpuMs', 'firstSubmittedFrameWallMs']) check(finite(phase[field]), `${name}/${phase.version}: missing preparation ${field}.`);
    diagnostics(phase.environmentDiagnostics, phase.version, config, `${name}/preparation/${phase.version}`);
  }
  for (const [index, block] of data.blocks.entries()) {
    const label = `${name}/${block.version}`, previous = data.blocks[index - 1];
    check(block.index === index && block.warmupFrames === 10 && block.measuredFramesTarget === 120 && block.frames.length === 120 && block.contextFlags?.length === 0 && block.disjointEvents?.length === 0, `${label}: measured block/protocol mismatch.`);
    if (previous) check(Date.parse(block.startedAt) - Date.parse(previous.finishedAt) >= 19990, `${label}: recorded inter-block idle gap too short.`);
    context(block.nativeContextBefore, `${label}/before`); context(block.nativeContextAfter, `${label}/after`);
    diagnostics(block.environmentDiagnostics, block.version, config, label);
    for (const [frameIndex, row] of block.frames.entries()) {
      check(row.index === frameIndex && ['updateCpuMs', 'renderCpuMs', 'totalCpuMs', 'rafTimestamp'].every(field => finite(row[field])), `${label}/frame${frameIndex}: invalid CPU/timestamp values.`);
      check(gpu ? row.gpuStatus === 'valid' && finite(row.gpuMs) && finite(row.gpuNs) && Math.abs(row.gpuMs - row.gpuNs / 1e6) < 1e-9 : row.gpuStatus === 'unsupported' && row.gpuMs === null && row.gpuNs === null, `${label}/frame${frameIndex}: invalid GPU measurement; unsupported must remain null.`);
      const previousRow = block.frames[frameIndex - 1];
      check(previousRow ? finite(row.frameIntervalMs) && row.rafTimestamp > previousRow.rafTimestamp && Math.abs(row.frameIntervalMs - row.rafTimestamp + previousRow.rafTimestamp) < 1e-6 : row.frameIntervalMs === null, `${label}/frame${frameIndex}: inconsistent frame interval.`);
      check(row.points === block.environmentDiagnostics.starCount && Number.isInteger(row.calls) && row.calls > 0 && Number.isInteger(row.triangles) && row.triangles > 0, `${label}/frame${frameIndex}: invalid scene counters.`);
    }
    cohort.blocks.push({ ...block, order: config.order, report: name });
  }
}
const outputCohorts = {};
for (const [name, cohort] of cohorts) {
  const orders = cohort.reports.map(report => report.data.configuration.order);
  const complete = ORDERS.every(order => orders.includes(order));
  check(unique(orders).length === orders.length, `${name}: duplicated permutation round.`);
  if (cohort.device?.gpuTimerAvailable === true && !complete && !partial) errors.push(`${name}: GPU comparison lacks all six permutation orders.`);
  if (!complete) warnings.push(`${name}: supplemental/incomplete order set; no balanced performance conclusion.`);
  const counts = new Map(), predecessorCounts = new Map();
  for (const order of orders) for (const [index, letter] of [...order].entries()) {
    const key = `${letter}:${index}`; counts.set(key, (counts.get(key) ?? 0) + 1);
    if (index) { const pair = order[index - 1] + letter; predecessorCounts.set(pair, (predecessorCounts.get(pair) ?? 0) + 1); }
  }
  if (complete) check(counts.size === 9 && [...counts.values()].every(count => count === 2), `${name}: serial positions not balanced.`);
  if (complete) check(predecessorCounts.size === 6 && [...predecessorCounts.values()].every(count => count === 2), `${name}: predecessor/successor pairs not balanced.`);
  const reportNames = new Set(cohort.reports.map(report => report.name));
  const cohortPowerSources = unique(observations.filter(row => reportNames.has(row.label.split('/')[0])).map(row => row.powerSource));
  check(cohortPowerSources.length === 1, `${name}: power source changed within the cohort; split or repeat the comparison.`);
  const counters = unique(cohort.blocks.flatMap(block => block.frames.map(row => `${row.calls}/${row.triangles}/${row.points}`)));
  check(counters.length === 1, `${name}: scene draw/triangle/point workload differs across resolutions.`);
  const allCpuSamplesWholeMilliseconds = cohort.blocks.every(block => block.frames.every(row => ['updateCpuMs', 'renderCpuMs', 'totalCpuMs'].every(field => Math.abs(row[field] - Math.round(row[field])) < 1e-6)));
  if (allCpuSamplesWholeMilliseconds) warnings.push(`${name}: all recorded CPU wall durations are whole milliseconds; coarse timing limits interpretation of small submission differences.`);
  const variants = {};
  for (const version of VERSIONS) {
    const blocks = cohort.blocks.filter(block => block.version === version), frames = blocks.flatMap(block => block.frames);
    const blockMeans = blocks.map(block => ({ order: block.order, position: block.index + 1, gpuMs: mean(block.frames.flatMap(row => row.gpuStatus === 'valid' ? [row.gpuMs] : [])), cpuSubmissionWallMs: mean(block.frames.map(row => row.totalCpuMs)), report: block.report }));
    variants[version] = { measuredFrames: frames.length, blocks: blocks.length, gpuMs: statistics(frames.flatMap(row => row.gpuStatus === 'valid' ? [row.gpuMs] : [])), cpuSubmissionWallMs: statistics(frames.map(row => row.totalCpuMs)), frameIntervalMs: statistics(frames.flatMap(row => row.frameIntervalMs === null ? [] : [row.frameIntervalMs])), blockMeans, gpuBlockMeanRange: statistics(blockMeans.flatMap(row => row.gpuMs === null ? [] : [row.gpuMs])), cpuBlockMeanRange: statistics(blockMeans.map(row => row.cpuSubmissionWallMs)), preparations: [...cohort.preparations.values()].filter(phase => phase.version === version).map(({ environmentDiagnostics: diag, ...phase }) => ({ ...phase, textureFetchMs: diag.earthTextureFetchMs, textureDecodeMs: diag.earthTextureDecodeMs })) };
  }
  const ratios = {};
  for (const [lower, higher] of [['2k', '4k'], ['4k', '8k']]) ratios[`${higher} / ${lower}`] = ORDERS.flatMap(order => {
    const a = variants[lower].blockMeans.find(block => block.order === order), b = variants[higher].blockMeans.find(block => block.order === order);
    return a && b ? [{ order, gpuRatio: a.gpuMs > 0 && b.gpuMs !== null ? b.gpuMs / a.gpuMs : null, cpuSubmissionWallRatio: a.cpuSubmissionWallMs > 0 ? b.cpuSubmissionWallMs / a.cpuSubmissionWallMs : null }] : [];
  });
  if (cohort.displayState === 'locked') warnings.push(`${name}: display was locked; compare only within this condition, and do not claim ordinary foreground website performance.`);
  if (cohort.displayState === 'unobserved') warnings.push(`${name}: native display state was not continuously observed and may have changed. Order balance does not establish a controlled display condition; timings are descriptive and cannot establish ordinary foreground website performance.`);
  outputCohorts[name] = { browser: cohort.browser, displayState: cohort.displayState, configuration: cohort.configuration, device: cohort.device, orders, completeBalancedDesign: complete, powerSources: cohortPowerSources, drawTrianglePointCounters: counters, allCpuSamplesWholeMilliseconds, uniquePreparations: cohort.preparations.size, variants, sameRoundRatios: ratios };
}
if (!partial) check(Object.values(outputCohorts).some(cohort => cohort.device?.gpuTimerAvailable === true && cohort.completeBalancedDesign), 'A complete six-order GPU comparison is absent.');
const powerSources = unique(observations.map(row => row.powerSource));
if (powerSources.length !== 1) warnings.push('Power source differs across observations; do not describe the session as constant power.');
if (excluded.length) warnings.push(`${excluded.length} raw reports retained but excluded by status or an explicit interruption record; no timing-based trimming performed.`);
const result = { schemaVersion: 1, generatedAt: new Date().toISOString(), status: errors.length ? 'failed' : partial ? 'partial' : 'passed', rawFiles: reports.map(({ name, sha256, condition }) => ({ name, sha256, condition })), excludedReports: excluded, explicitExclusions: { sha256: exclusionSha256, entries: explicitExclusions }, displayConditions: { sha256: conditionsSha256, entries: conditions }, validation: { errors, warnings, frozenManifestSha256: manifestHash, snapshotId: manifest.snapshotId, sourceChecks, nominalNativeSnapshots: observations.filter(row => row.thermalState === 'nominal').length, powerSources }, assets, cohorts: outputCohorts, nativeObservations: observations,
  limits: [
    'Per-frame observations within a block are correlated; six order-balanced blocks per resolution are the relevant repeated observations. Pooled frame p95 is descriptive, not a confidence interval.',
    'Measurements cover the orbital background only, including the same stars, frozen initial Mediterranean view and cinematic atmosphere. They exclude the spacecraft, app UI, camera travel and whole-site FPS.',
    'GPU timer queries measure elapsed rendering work. CPU fields are elapsed JavaScript/update/render-submission wall durations, not native CPU utilization, power or temperature. Display-paced intervals are not maximum attainable FPS.',
    'Safari without GPU timer support supplies CPU/frame measurements only. Unsupported GPU values remain null and are never replaced by CPU measurements or zero.',
    'Recorded native-display lock states are separate experimental conditions. A visible in-app browser can submit real GPU work while the native display is locked; such timings are not established ordinary foreground website or display performance. Never pool locked and unlocked observations.',
    'An explicitly unobserved display-state cohort retains valid timing records without pretending that its native display state stayed fixed. Possible changes remain an uncontrolled environmental factor; balanced order alone cannot remove that uncertainty.',
    'All three Earth environments and their images remain resident during this lab. The nominal combined Earth texture mip payload is 234,881,028 bytes. Production retains one Earth; driver overhead, decoded images, framebuffers and geometry are additional.',
    'Nominal RGBA8 mip storage and illustrative decoded-RGBA storage are calculations, not measured physical GPU allocation/process memory. File bytes represent the Earth image payload, not total website download.',
    'Preparations are deduplicated by version/start timestamp. Shared module/shader/driver caches and fixed preparation order limit comparison; these local submission milestones are neither cold-network page load times nor replicated startup benchmarks.',
    'Twenty-second blank rests and observed nominal thermal pressure do not prove complete cooling, identical clocks or absence of throttling. Native snapshots outside timed frames can miss transient changes.',
    'Compact viewports, if present, use the same desktop machine and do not establish performance on physical mobile hardware. Small inconsistent timing differences should remain inconclusive.'
  ] };
const fmt = value => typeof value === 'number' ? value.toFixed(3) : 'Unavailable';
const lines = ['# Night Earth resolution audit', '', `Status: **${result.status}**. ${reports.length} complete reports, ${excluded.length} excluded raw reports, ${observations.length} native snapshots.`, '', '| Map | Image download MB | Nominal texture + mips MB | Illustrative decoded RGBA MB |', '|---|---:|---:|---:|'];
for (const [version, asset] of Object.entries(assets)) lines.push(`| ${version.toUpperCase()} | ${fmt(asset.bytes / 1e6)} | ${fmt(asset.nominalRgba8MipBytes / 1e6)} | ${fmt(asset.nominalDecodedRgbaBytes / 1e6)} |`);
for (const [name, cohort] of Object.entries(outputCohorts)) {
  lines.push('', `## ${name}`, '', `Orders: ${cohort.orders.join(', ')}. ${cohort.completeBalancedDesign ? 'Complete six-order design.' : 'Supplemental; order design incomplete.'} ${cohort.uniquePreparations} unique preparations.`, '', '| Map | GPU mean ms | GPU block mean min–max ms | CPU submission mean ms | CPU block mean min–max ms | Frame interval mean ms | Frames |', '|---|---:|---|---:|---|---:|---:|');
  for (const [version, value] of Object.entries(cohort.variants)) lines.push(`| ${version} | ${fmt(value.gpuMs.mean)} | ${fmt(value.gpuBlockMeanRange.min)}–${fmt(value.gpuBlockMeanRange.max)} | ${fmt(value.cpuSubmissionWallMs.mean)} | ${fmt(value.cpuBlockMeanRange.min)}–${fmt(value.cpuBlockMeanRange.max)} | ${fmt(value.frameIntervalMs.mean)} | ${value.measuredFrames} |`);
  lines.push('', '### Unique local preparation observations', '', 'One first preparation per version is retained by its timestamp, even when later rounds reuse the same values. Preparations share caches and run in the fixed 2K → 4K → 8K order. These are local submission milestones, not Internet page-load measurements or replicated startup comparisons.', '', '| Map | Image decode ms | First render submission ms | First render GPU ms | First submitted frame wall ms |', '|---|---:|---:|---:|---:|');
  for (const [version, value] of Object.entries(cohort.variants)) for (const phase of value.preparations) lines.push(`| ${version} | ${fmt(phase.textureDecodeMs)} | ${fmt(phase.firstRenderCpuMs)} | ${fmt(phase.firstRenderGpuMs)} | ${fmt(phase.firstSubmittedFrameWallMs)} |`);
}
lines.push('', '## Qualifications', '', ...result.limits.map(text => `- ${text}`), '', '## Validation', '', ...(errors.length ? errors.map(text => `- ERROR: ${text}`) : ['- Declared checks passed.']), ...warnings.map(text => `- NOTE: ${text}`), '');
if (!partial) { await writeFile(join(input, 'audit-summary.json'), JSON.stringify(result, null, 2) + '\n'); await writeFile(join(input, 'audit-summary.md'), lines.join('\n')); }
console.log(JSON.stringify({ status: result.status, errors, warnings, reports: reports.length, excluded: excluded.length, snapshots: observations.length, cohorts: Object.fromEntries(Object.entries(outputCohorts).map(([name, cohort]) => [name, Object.fromEntries(Object.entries(cohort.variants).map(([version, value]) => [version, { gpuMeanMs: value.gpuMs.mean, gpuBlockRange: [value.gpuBlockMeanRange.min, value.gpuBlockMeanRange.max], cpuMeanMs: value.cpuSubmissionWallMs.mean }]))])) }, null, 2));
if (errors.length) process.exitCode = 1;
