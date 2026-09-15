/** Audit saved four-variant Earth reports without starting a renderer or benchmark.
 * node scripts/audit-earth-fourway.mjs [--input-dir PATH] [--partial] [--verify-only]
 * Complete evidence writes audit-summary.json/.md in the input directory. Partial
 * mode prints available results only and never publishes final artifacts.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const inputAt = args.indexOf('--input-dir');
if (inputAt >= 0 && !args[inputAt + 1]) throw new Error('--input-dir requires a path');
const input = inputAt < 0 ? join(root, 'docs/evidence/performance/earth-fourway') : resolve(args[inputAt + 1]);
const partial = args.includes('--partial');
const verifyOnly = args.includes('--verify-only');
const ORDERS = ['ABDC', 'BCAD', 'CDBA', 'DACB'];
const VERSIONS = ['procedural', '2k', '4k', '8k'];
const LETTERS = { A: 'procedural', B: '2k', C: '4k', D: '8k' };
const WIDTHS = { '2k': 2048, '4k': 4096, '8k': 8192 };
const VIEWS = { desktop: { width: 1280, height: 720, dpr: 2, mobile: false }, compact: { width: 390, height: 844, dpr: 1, mobile: true } };
const BASELINE_SHA = 'ec83790e30c7559d17580076fbda53addc2aa67a1d1c9895dffb29bbb0de21c9';
const errors = [];
const warnings = [];
const check = (condition, message) => { if (!condition) errors.push(message); };
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const hash = value => createHash('sha256').update(value).digest('hex');
const unique = values => [...new Set(values)];
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const stats = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: sorted.length, mean: mean(sorted), median: sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2 : null, p95: sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] : null, min: sorted[0] ?? null, max: sorted.at(-1) ?? null };
};
const expectedNames = Object.keys(VIEWS).flatMap(view => ORDERS.map(order => `${view}-${order}.json`));
const names = await readdir(input);
const availableNames = expectedNames.filter(name => names.includes(name));
const missingNames = expectedNames.filter(name => !names.includes(name));
if (missingNames.length && !partial) {
  console.error(`Evidence incomplete; no summary written. Missing: ${missingNames.join(', ')}`);
  process.exit(2);
}
const reports = [];
for (const name of availableNames) {
  const bytes = await readFile(join(input, name));
  reports.push({ name, sha256: hash(bytes), data: JSON.parse(bytes), view: name.split('-')[0] });
}
if (!reports.length) throw new Error('No matching raw reports found.');
// Do not silently claim zero exclusions if an additional raw round was saved.
const extraReports = [];
for (const name of names.filter(name => name.endsWith('.json') && !expectedNames.includes(name) && !name.startsWith('audit-summary'))) {
  try {
    const value = JSON.parse(await readFile(join(input, name), 'utf8'));
    if (value.schemaVersion === 2 && value.configuration?.williamsRounds && Array.isArray(value.blocks)) extraReports.push({ name, status: value.status, reason: value.reason ?? null, measuredFrames: value.blocks.reduce((sum, block) => sum + block.frames.length, 0) });
  } catch (error) { warnings.push(`Additional file ${name} could not be inspected: ${String(error)}`); }
}
if (extraReports.length) warnings.push(`${extraReports.length} additional raw rounds exist; preserve and disclose them as exclusions/retries rather than claiming none.`);

const baseManifest = reports[0].data.buildManifest;
const manifestSha = hash(JSON.stringify(baseManifest));
const baseSource = baseManifest.sourceFiles.find(file => file.path === 'scripts/benchmarks/cloud-reference.ts');
check(baseSource?.sha256 === BASELINE_SHA, 'Retained procedural baseline does not match its known historical source SHA-256.');
const assets = Object.fromEntries(Object.keys(WIDTHS).map(version => [version, baseManifest.publicFiles.find(file => file.path === `textures/earth-blue-marble-${version}.jpg`)]));
for (const [version, asset] of Object.entries(assets)) check(asset && finite(asset.bytes) && asset.bytes > 0 && /^[a-f0-9]{64}$/.test(asset.sha256), `${version}: frozen asset identity missing/invalid.`);
for (const key of ['sourceFiles', 'bundleFiles', 'publicFiles']) {
  const files = baseManifest[key];
  check(Array.isArray(files) && files.length > 0, `Manifest ${key} missing.`);
  check(new Set(files.map(file => file.path)).size === files.length, `Duplicate manifest ${key} paths.`);
  for (const file of files) check(/^[a-f0-9]{64}$/.test(file.sha256) && finite(file.bytes), `Invalid manifest entry ${key}/${file.path}.`);
}

const nativeObservations = [];
function auditContext(context, label) {
  check(context?.availability === 'available', `${label}: native context unavailable.`);
  const native = context?.native;
  check(native?.thermalState === 'nominal' && native?.thermalStateRaw === 0, `${label}: non-nominal thermal pressure.`);
  check(native?.lowPowerMode === false, `${label}: low power mode unknown or enabled.`);
  check(native?.thermalSource === 'ProcessInfo.thermalState', `${label}: thermal source changed.`);
  for (const kind of ['therm', 'battery']) {
    const sample = native?.pmset?.[kind];
    check(sample?.exitCode === 0 && sample?.timedOut === false && typeof sample?.stdout === 'string', `${label}: ${kind} sample failed/timed out.`);
  }
  const therm = native?.pmset?.therm?.stdout ?? '';
  for (const match of therm.matchAll(/(?:CPU_Speed_Limit|GPU_Speed_Limit|Scheduler_Limit)\s*=\s*(\d+)/g)) check(Number(match[1]) >= 100, `${label}: restricted native performance limit ${match[0]}.`);
  const battery = native?.pmset?.battery?.stdout ?? '';
  const powerSource = /Now drawing from '([^']+)'/.exec(battery)?.[1] ?? null;
  check(powerSource !== null, `${label}: power source could not be read.`);
  nativeObservations.push({ label, timestamp: native?.timestamp ?? null, capturedAt: context?.capturedAt ?? null, thermalState: native?.thermalState ?? null, lowPowerMode: native?.lowPowerMode ?? null, powerSource, noRecordedCpuStatus: /No CPU power status has been recorded/.test(therm), noRecordedWarning: /No (?:thermal|performance) warning level has been recorded/.test(therm) });
}
function auditDiagnostics(diag, version, view, label) {
  check(diag?.ready === true && diag?.earthReady === true, `${label}: environment not ready.`);
  check(diag?.activeTime === 180 && diag?.earthRadius === 180, `${label}: frozen time/radius mismatch.`);
  check(diag?.starCount === (VIEWS[view].mobile ? 2300 : 3100), `${label}: star workload mismatch.`);
  if (version === 'procedural') {
    check(diag?.earthMode === 'procedural-water' && diag?.externalTextureRequests === 0 && diag?.cloudWeatherModel === 'authored-front-stratiform-cold-sector-cumulus-cirrus', `${label}: procedural source substituted.`);
    const side = VIEWS[view].mobile ? 32 : 64;
    check(same(diag?.proceduralNoiseDimensions, [side, side, side]) && diag?.cloudFieldSamples === (VIEWS[view].mobile ? 11 : 17), `${label}: procedural quality mismatch.`);
  } else {
    const width = WIDTHS[version];
    check(diag?.earthSource === 'local-satellite-image' && diag?.earthLoadError === null && diag?.earthMode === 'satellite-land-ocean-clouds' && diag?.cloudWeatherModel === 'combined-satellite-image', `${label}: invalid/fallback satellite source.`);
    check(same(diag?.earthTextureDimensions, [width, width / 2]) && diag?.dayTextureSize === width, `${label}: actual reported dimensions mismatch.`);
    check(diag?.earthResponseBytes === assets[version]?.bytes && diag?.earthEncodedBytes === assets[version]?.bytes, `${label}: asset bytes mismatch.`);
    check(diag?.earthTextureBytes === width * width * 2 && diag?.earthTextureSamples === 1, `${label}: texture allocation/shader mismatch.`);
  }
}
let measuredFrames = 0;
const cohortData = {};
const runIds = new Set();
for (const { name, data: report, view } of reports) {
  const config = report.configuration;
  const order = name.slice(view.length + 1, -5);
  check(report.schemaVersion === 2 && report.status === 'complete' && report.contextStatus === 'nominal-observed' && !report.reason, `${name}: report not fully qualified.`);
  check(Array.isArray(report.contextFlags) && report.contextFlags.length === 0, `${name}: report context flags present.`);
  check(!runIds.has(report.runId), `${name}: duplicate run ID.`); runIds.add(report.runId);
  check(hash(JSON.stringify(report.buildManifest)) === manifestSha, `${name}: frozen manifest/source/assets changed.`);
  check(same(config.williamsRounds, ORDERS) && same(config.letters, LETTERS) && config.order === order, `${name}: Williams order metadata mismatch.`);
  for (const [key, value] of Object.entries(VIEWS[view])) check(config[key] === value, `${name}: viewport ${key} mismatch.`);
  check(config.frozenTime === 180 && same(config.frozenView, { x: 0, y: 0 }) && config.framesPerBlock === 60 && config.measuredFramesPerVersion === 60 && config.warmupFramesPerBlock === 10 && config.idleRestMs === 20000 && config.blocks === 4, `${name}: declared protocol changed.`);
  check(config.queryScope === 'renderer.render(environment.scene, environment.camera)', `${name}: GPU query scope changed.`);
  check(report.device?.visibility === 'visible' && report.device?.gpuTimerAvailable === true && report.device?.maxTextureSize >= 8192, `${name}: GPU/device prerequisites invalid.`);
  check(same(report.device?.drawingBuffer, { width: config.width * config.dpr, height: config.height * config.dpr }), `${name}: drawing buffer mismatch.`);
  check(report.blocks.length === 4 && same(report.blocks.map(block => block.version), order.split('').map(letter => LETTERS[letter])), `${name}: actual block sequence mismatch.`);
  for (const version of VERSIONS) {
    const metadata = config.comparison?.[version];
    check((version === 'procedural' ? ['scripts/benchmarks/cloud-reference.ts'] : ['components/orbital-environment.ts', 'features/orbit/orbital-environment.ts']).includes(metadata?.source), `${name}/${version}: source metadata mismatch.`);
    check(same(metadata?.expectedTextureDimensions, version === 'procedural' ? null : [WIDTHS[version], WIDTHS[version] / 2]), `${name}/${version}: requested dimensions mismatch.`);
    check(metadata?.expectedAsset === (version === 'procedural' ? null : `/textures/earth-blue-marble-${version}.jpg`), `${name}/${version}: expected asset mismatch.`);
  }
  auditContext(report.nativeContextInitial, `${name}/initial`);
  const cohort = cohortData[view] ??= { reports: [], preparations: new Map(), blocks: [] };
  cohort.reports.push({ name, data: report });
  check(report.preparation?.residentEnvironmentCount === 4 && report.preparation?.residentRendererMemory?.textures === 9 && report.preparation?.residentRendererMemory?.geometries === 12, `${name}: four-environment residency mismatch.`);
  check(same(report.preparation?.reusedVersions, VERSIONS), `${name}: preparations were not all reused after previews.`);
  check(same(report.preparation?.phases?.map(phase => phase.version), VERSIONS), `${name}: preparation order mismatch.`);
  for (const phase of report.preparation?.phases ?? []) {
    const key = `${phase.version}/${phase.startedAt}`;
    const existing = cohort.preparations.get(key);
    if (existing) check(same(existing, phase), `${name}: reused preparation was mutated.`);
    else cohort.preparations.set(key, phase);
    check(phase.trigger === 'preview', `${name}: unexpected preparation trigger.`);
    for (const field of ['moduleImportWallMs', 'factoryCpuMs', 'readyWaitWallMs', 'compileAsyncWallMs', 'firstRenderCpuMs', 'firstSubmittedFrameWallMs']) check(finite(phase[field]), `${name}/${phase.version}: invalid preparation ${field}.`);
    check(phase.firstRenderGpuStatus === 'valid' && finite(phase.firstRenderGpuMs), `${name}/${phase.version}: first-render timing unavailable.`);
    auditDiagnostics(phase.environmentDiagnostics, phase.version, view, `${name}/preparation/${phase.version}`);
  }
  for (const [blockIndex, block] of report.blocks.entries()) {
    const label = `${name}/block-${blockIndex + 1}/${block.version}`;
    check(block.index === blockIndex && block.warmupFrames === 10 && block.measuredFramesTarget === 60 && block.frames.length === 60 && block.disjointEvents.length === 0 && block.contextFlags.length === 0, `${label}: frame/protocol/context mismatch.`);
    auditContext(block.nativeContextBefore, `${label}/before`);
    auditContext(block.nativeContextAfter, `${label}/after`);
    auditDiagnostics(block.environmentDiagnostics, block.version, view, label);
    const baseTriangles = VIEWS[view].mobile ? 12096 : 24320;
    const expectedCalls = block.version === 'procedural' ? 7 : 6;
    const expectedTriangles = baseTriangles * (block.version === 'procedural' ? 4 : 3) + 4;
    let lastTimestamp = null;
    for (const [index, row] of block.frames.entries()) {
      check(row.index === index && row.gpuStatus === 'valid' && finite(row.gpuNs) && finite(row.gpuMs) && Math.abs(row.gpuNs / 1e6 - row.gpuMs) < 1e-9, `${label}/frame-${index}: invalid GPU query.`);
      for (const field of ['updateCpuMs', 'renderCpuMs', 'totalCpuMs', 'rafTimestamp']) check(finite(row[field]), `${label}/frame-${index}: invalid ${field}.`);
      check(index === 0 ? row.frameIntervalMs === null : finite(row.frameIntervalMs), `${label}/frame-${index}: invalid frame interval.`);
      if (lastTimestamp !== null) check(row.rafTimestamp > lastTimestamp && Math.abs(row.frameIntervalMs - (row.rafTimestamp - lastTimestamp)) < 1e-6, `${label}/frame-${index}: inconsistent timestamp interval.`);
      lastTimestamp = row.rafTimestamp;
      check(row.calls === expectedCalls && row.triangles === expectedTriangles && row.points === block.environmentDiagnostics.starCount, `${label}/frame-${index}: draw/triangle/point workload changed.`);
      measuredFrames++;
    }
    cohort.blocks.push({ report: name, order, ...block });
  }
}
check(nativeObservations.length === reports.length * 9, 'Native snapshot count mismatch.');
check(unique(nativeObservations.map(row => row.powerSource)).length === 1, 'Power source changed between accepted rounds/cohorts.');
check(unique(reports.map(({ data }) => `${data.device.userAgent}/${data.device.unmaskedRenderer}/${data.device.threeRevision}`)).length === 1, 'Browser/GPU/Three implementation changed between rounds.');
if (!missingNames.length) check(measuredFrames === 1920 && reports.length === 8, 'Complete experiment must contain eight rounds and 1,920 measured GPU queries.');

const cohorts = {};
for (const [view, cohort] of Object.entries(cohortData)) {
  const cohortOrders = cohort.reports.map(({ data }) => data.configuration.order);
  const isComplete = ORDERS.every(order => cohortOrders.includes(order));
  check(new Set(cohortOrders).size === cohortOrders.length, `${view}: duplicate Williams rows.`);
  check(cohort.preparations.size === 4, `${view}: startup must be four unique preparations, not repeated cached copies.`);
  if (isComplete) {
    const positions = {};
    const predecessorPairs = [];
    for (const order of cohortOrders) for (const [index, letter] of [...order].entries()) {
      (positions[letter] ??= []).push(index);
      if (index) predecessorPairs.push(order[index - 1] + letter);
    }
    check(Object.values(positions).every(values => new Set(values).size === 4) && new Set(predecessorPairs).size === 12, `${view}: serial positions/predecessors not balanced.`);
  }
  const variants = {};
  for (const version of VERSIONS) {
    const blocks = cohort.blocks.filter(block => block.version === version);
    const frames = blocks.flatMap(block => block.frames);
    const blockMeans = blocks.map(block => ({ order: block.order, position: block.index + 1, meanGpuMs: mean(block.frames.map(row => row.gpuMs)), p95GpuMs: stats(block.frames.map(row => row.gpuMs)).p95, meanTotalCpuMs: mean(block.frames.map(row => row.totalCpuMs)), meanFrameIntervalMs: mean(block.frames.flatMap(row => row.frameIntervalMs === null ? [] : [row.frameIntervalMs])), rawReport: block.report }));
    const phase = [...cohort.preparations.values()].find(value => value.version === version);
    const diagnostic = phase?.environmentDiagnostics;
    variants[version] = {
      measuredFrames: frames.length, blockCount: blocks.length, gpuMs: stats(frames.map(row => row.gpuMs)), blockMeans,
      blockMeanRangeMs: blocks.length ? [Math.min(...blockMeans.map(row => row.meanGpuMs)), Math.max(...blockMeans.map(row => row.meanGpuMs))] : [],
      totalCpuMs: stats(frames.map(row => row.totalCpuMs)), updateCpuMs: stats(frames.map(row => row.updateCpuMs)), renderCpuMs: stats(frames.map(row => row.renderCpuMs)), frameIntervalMs: stats(frames.flatMap(row => row.frameIntervalMs === null ? [] : [row.frameIntervalMs])),
      drawCalls: unique(frames.map(row => row.calls)), triangles: unique(frames.map(row => row.triangles)), points: unique(frames.map(row => row.points)),
      earthDownloadBytes: assets[version]?.bytes ?? 0, earthTextureDimensions: diagnostic?.earthTextureDimensions ?? null, earthTextureGpuBytes: version === 'procedural' ? diagnostic?.proceduralNoiseMipBytes ?? 0 : diagnostic?.earthTextureGpuBytes ?? 0,
      environmentTextureGpuBytes: (diagnostic?.earthTextureGpuBytes ?? 0) + (diagnostic?.proceduralTextureGpuBytes ?? 0),
      preparation: phase ? Object.fromEntries(Object.entries(phase).filter(([key]) => key !== 'environmentDiagnostics')) : null,
      preparationTextureFetchMs: diagnostic?.earthTextureFetchMs ?? null, preparationTextureDecodeMs: diagnostic?.earthTextureDecodeMs ?? null,
    };
  }
  cohorts[view] = { configuration: VIEWS[view], completeWilliamsDesign: isComplete, order: cohortOrders, device: cohort.reports[0].data.device, uniquePreparationCount: cohort.preparations.size, preparationChronologicalOrder: [...cohort.preparations.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).map(phase => phase.version), residentRendererMemory: cohort.reports[0].data.preparation.residentRendererMemory, estimatedAggregateEnvironmentTextureGpuBytes: Object.values(variants).reduce((sum, variant) => sum + variant.environmentTextureGpuBytes, 0), variants };
}
const result = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), status: errors.length ? 'failed' : missingNames.length ? 'partial' : 'passed',
  inputFiles: reports.map(({ name, sha256 }) => ({ name, sha256 })), missingFiles: missingNames, extraRawReports: extraReports,
  validation: { acceptedRounds: reports.length, measuredGpuQueries: measuredFrames, nativeSnapshotCount: nativeObservations.length, allSourcesAndAssetsSameSnapshot: reports.every(({ data }) => hash(JSON.stringify(data.buildManifest)) === manifestSha), manifestSha256: manifestSha, snapshotId: baseManifest.snapshotId, proceduralSourceSha256: baseSource?.sha256, powerSources: unique(nativeObservations.map(row => row.powerSource)), errors, warnings },
  assets, cohorts, nativeObservations,
  limits: [
    'Per-frame samples within a block are correlated. The four balanced blocks per variant/viewport are the relevant repeated observations; 1,920 frames are not 1,920 independent trials. No inferential confidence interval or significance claim is made.',
    'GPU time covers the orbital background renderer only. It excludes spacecraft, app UI and camera motion and is not whole-site FPS, Safari, physical-phone, power, temperature or battery-life performance.',
    'Both viewport cohorts run on the same Apple M4 desktop browser. Compact means a 390×844 browser viewport, not mobile hardware.',
    'All four environments and their images remain resident. Aggregate texture/geometry/decoded-image memory exceeds single-Earth production memory. Texture storage figures are RGBA8/mipmap estimates, not measured physical VRAM or process RSS.',
    'Preparation is one fixed-order preview sequence per viewport, deduplicated across rounds. Shared browser/module/shader/driver caches and prior preparation affect timings. These are local startup observations, not cold-network tests or replicated startup benchmarks.',
    'OS nominal thermal pressure plus blank rests does not prove complete cooling or identical clocks. Native snapshots are outside measured frames. Historical pmset warnings are not current temperature or guaranteed frequency observations.',
    'Original procedural clouds retain their original appearance and geographic orientation. The comparison tests final design workloads, not identical rendered pixels. Satellite variants differ only in their requested image asset dimensions.',
    'Browser fields named CpuMs are performance.now elapsed wall durations around JavaScript/update/render submission, not native process CPU time or utilization. GPU query time measures different work. Display-paced frame intervals include browser scheduling and should not be converted to unconstrained FPS.'
  ]
};
const fixed = value => typeof value === 'number' ? value.toFixed(3) : '—';
const lines = ['# Earth four-variant performance audit', '', `Audit status: **${result.status}**. ${reports.length} rounds; ${measuredFrames.toLocaleString('en-US')} measured GPU queries; ${nativeObservations.length} native snapshots.`, '', `Snapshot: \`${baseManifest.snapshotId}\`. All reported imported sources, compiled files and public assets are checked for an identical frozen manifest.`, '', `Power source: ${result.validation.powerSources.join(', ')}. All qualified snapshots require nominal pressure, Low Power Mode off, successful native queries and no reported performance limit below 100%.`, '', `Additional raw rounds outside the accepted eight: **${extraReports.length}**. No timing-based trimming is performed.`, ''];
for (const [view, cohort] of Object.entries(cohorts)) {
  lines.push(`## ${view} — ${cohort.configuration.width}×${cohort.configuration.height}, drawing DPR ${cohort.configuration.dpr}`, '', '| Variant | GPU mean ms | GPU p95 ms | Four block means ms, Williams round order | Block mean range ms | CPU submission wall mean ms | Frame interval mean ms | Draws | Triangles |', '|---|---:|---:|---|---|---:|---:|---:|---:|');
  for (const [version, value] of Object.entries(cohort.variants)) lines.push(`| ${version} | ${fixed(value.gpuMs.mean)} | ${fixed(value.gpuMs.p95)} | ${value.blockMeans.map(block => `${block.order}: ${fixed(block.meanGpuMs)}`).join('; ')} | ${value.blockMeanRangeMs.map(fixed).join('–')} | ${fixed(value.totalCpuMs.mean)} | ${fixed(value.frameIntervalMs.mean)} | ${value.drawCalls.join(', ')} | ${value.triangles.join(', ')} |`);
  lines.push('', `Each variant has ${cohort.variants.procedural.measuredFrames} raw measured frames across ${cohort.variants.procedural.blockCount} blocks. P95 describes the pooled correlated frame distribution, not an uncertainty bound on the mean.`, '', '### Unique preparation observations', '', `Exactly ${cohort.uniquePreparationCount} preparations, ordered ${cohort.preparationChronologicalOrder.join(' → ')}. These came from previews before recovery and were reused across rounds. They are not four repeated cold startups.`, '', '| Variant | Import wall ms | Factory wall ms | Ready wait ms | Image fetch ms | Image decode ms | Compile wall ms | First render submission wall ms | First render GPU ms | First submitted frame wall ms |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const [version, value] of Object.entries(cohort.variants)) {
    const prep = value.preparation ?? {};
    lines.push(`| ${version} | ${[prep.moduleImportWallMs, prep.factoryCpuMs, prep.readyWaitWallMs, value.preparationTextureFetchMs, value.preparationTextureDecodeMs, prep.compileAsyncWallMs, prep.firstRenderCpuMs, prep.firstRenderGpuMs, prep.firstSubmittedFrameWallMs].map(fixed).join(' | ')} |`);
  }
  lines.push('', `Resident lab counts: ${cohort.residentRendererMemory.textures} textures and ${cohort.residentRendererMemory.geometries} geometries. Estimated aggregate environment texture storage: ${(cohort.estimatedAggregateEnvironmentTextureGpuBytes / 1e6).toFixed(3)} MB; this excludes decoded image backing memory, geometry, framebuffers and driver allocations. Production has one Earth, not all four.`, '');
}
lines.push('## Limits', '', ...result.limits.map(limit => `- ${limit}`), '', '## Validation findings', '', errors.length ? errors.map(error => `- ERROR: ${error}`).join('\n') : '- All declared checks passed.', ...warnings.map(warning => `- NOTE: ${warning}`), '', 'Reproduce with `node scripts/audit-earth-fourway.mjs`. This script only reads saved evidence and writes this summary; it starts no renderer, native sampler or benchmark.', '');
if (!missingNames.length && !verifyOnly && !partial) {
  await writeFile(join(input, 'audit-summary.json'), JSON.stringify(result, null, 2) + '\n');
  await writeFile(join(input, 'audit-summary.md'), lines.join('\n'));
}
console.log(JSON.stringify({ status: result.status, rounds: reports.length, queries: measuredFrames, nativeSnapshots: nativeObservations.length, missingFiles: missingNames, extraRawReports: extraReports.length, errors, warnings, cohorts: Object.fromEntries(Object.entries(cohorts).map(([view, cohort]) => [view, Object.fromEntries(Object.entries(cohort.variants).map(([version, value]) => [version, { gpuMeanMs: value.gpuMs.mean, gpuBlockRangeMs: value.blockMeanRangeMs, cpuMeanMs: value.totalCpuMs.mean }]))])) }, null, 2));
if (errors.length) process.exitCode = 1;
