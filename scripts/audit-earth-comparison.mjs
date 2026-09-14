/** Recompute the saved 2K Earth comparison; reads evidence only, never renders.
 * node scripts/audit-earth-comparison.mjs [evidence-directory]
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(root, process.argv[2] ?? 'docs/evidence/performance/satellite-earth-2k');
const names = ['desktop-abba', 'desktop-baab', 'compact-abba', 'compact-baab'];
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const stats = (values) => {
  if (!values.length) return { count: 0, mean: null, median: null, p95: null, min: null, max: null };
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, mean: mean(values), median: (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2, p95: sorted[Math.ceil(sorted.length * 0.95) - 1], min: sorted[0], max: sorted.at(-1) };
};
const unique = (values) => [...new Set(values)];
const percentLower = (before, after) => (1 - after / before) * 100;
const raw = [];
for (const name of names) {
  const bytes = await readFile(resolve(directory, `${name}.json`));
  raw.push({ name, sha256: sha256(bytes), value: JSON.parse(bytes) });
}
const manifest = raw[0].value.buildManifest;
for (const { value } of raw) assert.deepEqual(value.buildManifest, manifest, 'Every run must use the same frozen build');
const verifyFile = async (file, expected) => {
  try {
    const data = await readFile(file);
    const actual = { bytes: data.byteLength, sha256: sha256(data) };
    return { path: expected.path, expectedBytes: expected.bytes, expectedSha256: expected.sha256, ...actual, matches: actual.bytes === expected.bytes && actual.sha256 === expected.sha256 };
  } catch (error) { return { path: expected.path, matches: false, error: error.message }; }
};
const sourceChecks = [];
for (const entry of manifest.sourceFiles) sourceChecks.push(await verifyFile(resolve(root, entry.path), entry));
const assetChecks = [];
for (const entry of manifest.publicFiles.filter((entry) => /^textures\/(cloud-satellite-v2\.(cfd\.gz|json)|earth-blue-marble-2k\.(jpg|json))$/.test(entry.path)))
  assetChecks.push(await verifyFile(resolve(root, 'public', entry.path), entry));
const metrics = ['gpuMs', 'updateCpuMs', 'renderCpuMs', 'totalCpuMs', 'frameIntervalMs'];
const preparations = new Map();
const runs = [];
let validGpuQueries = 0, disjointEvents = 0;
for (const { name, value: report } of raw) {
  assert.equal(report.status, 'complete');
  const config = report.configuration;
  assert.equal(config.frozenTime, 180);
  assert.equal(config.width, name.startsWith('desktop') ? 1280 : 390);
  assert.equal(config.height, name.startsWith('desktop') ? 720 : 844);
  assert.equal(config.dpr, name.startsWith('desktop') ? 2 : 1);
  assert.equal(config.mobile, !name.startsWith('desktop'));
  assert.deepEqual(config.frozenView, { x: 0, y: 0 });
  assert.equal(config.idleRestMs, 20000);
  assert.equal(report.device.drawingBuffer.width, config.width * config.dpr);
  assert.equal(report.device.drawingBuffer.height, config.height * config.dpr);
  assert.equal(report.blocks.length, 4);
  const blocks = report.blocks.map((block, index) => {
    assert.equal(block.index, index);
    assert.equal(block.version, config.order[index] === 'A' ? 'reference' : 'current');
    assert.equal(block.warmupFrames, 10);
    assert.equal(block.frames.length, 60);
    disjointEvents += block.disjointEvents.length;
    const diagnostics = block.environmentDiagnostics;
    assert.equal(diagnostics.ready, true);
    if (block.version === 'reference') {
      assert.equal(diagnostics.cloudReady, true);
      assert.equal(diagnostics.cloudSource, 'developer-baked-atlas');
      assert.equal(diagnostics.cloudLoadError, null);
      assert.equal(diagnostics.cloudFieldGenerationMs, 0);
    } else {
      assert.equal(diagnostics.earthReady, true);
      assert.equal(diagnostics.earthSource, 'local-satellite-image');
      assert.equal(diagnostics.earthLoadError, null);
      assert.equal(diagnostics.dayTextureSize, 2048);
    }
    for (const frame of block.frames) {
      assert.equal(frame.gpuStatus, 'valid');
      assert.ok(Number.isFinite(frame.gpuMs) && frame.gpuMs >= 0);
      assert.ok(Math.abs(frame.gpuNs / 1e6 - frame.gpuMs) < 1e-10);
      validGpuQueries++;
    }
    return { index, version: block.version, startedAt: block.startedAt, finishedAt: block.finishedAt, gpuMs: stats(block.frames.map((frame) => frame.gpuMs)), counts: Object.fromEntries(['calls', 'triangles', 'points'].map((key) => [key, unique(block.frames.map((frame) => frame[key]))])) };
  });
  const summary = {};
  for (const version of ['reference', 'current']) {
    const frames = report.blocks.filter((block) => block.version === version).flatMap((block) => block.frames);
    summary[version] = Object.fromEntries(metrics.map((metric) => [metric, stats(frames.map((frame) => frame[metric]).filter((value) => value !== null))]));
    for (const metric of metrics)
      for (const [stat, value] of Object.entries(summary[version][metric]))
        assert.ok(Math.abs(value - report.summary[version][metric][stat]) < 1e-8, `${name}/${version}/${metric}/${stat} must match raw frames`);
  }
  const adjacentPairs = [0, 2].map((index) => {
    const pair = blocks.slice(index, index + 2);
    const before = pair.find((block) => block.version === 'reference');
    const after = pair.find((block) => block.version === 'current');
    return { chronologicalBlocks: [index, index + 1], beforeBlock: before.index, afterBlock: after.index, beforeGpuMeanMs: before.gpuMs.mean, afterGpuMeanMs: after.gpuMs.mean, afterLower: after.gpuMs.mean < before.gpuMs.mean, reductionPercent: percentLower(before.gpuMs.mean, after.gpuMs.mean) };
  });
  const beforeMeans = blocks.filter((block) => block.version === 'reference').map((block) => block.gpuMs.mean);
  const afterMeans = blocks.filter((block) => block.version === 'current').map((block) => block.gpuMs.mean);
  for (const preparation of report.preparation.phases) {
    const key = `${preparation.version}:${preparation.startedAt}`;
    if (preparations.has(key)) assert.deepEqual(preparations.get(key).record, preparation, 'Reused preparation records must be identical');
    else preparations.set(key, { firstSeenIn: name, record: preparation });
  }
  runs.push({ name, runId: report.runId, startedAt: report.startedAt, finishedAt: report.finishedAt, configuration: config, device: report.device, blocks, summary, adjacentPairs, referenceChronologicalDriftPercent: (beforeMeans[1] / beforeMeans[0] - 1) * 100, referenceSpreadOverMeanPercent: (Math.max(...beforeMeans) - Math.min(...beforeMeans)) / mean(beforeMeans) * 100, currentChronologicalDriftPercent: (afterMeans[1] / afterMeans[0] - 1) * 100, gpuMeanReductionPercent: percentLower(summary.reference.gpuMs.mean, summary.current.gpuMs.mean), totalCpuMeanChangeMs: summary.current.totalCpuMs.mean - summary.reference.totalCpuMs.mean, preparationReusedVersions: report.preparation.reusedVersions });
}
assert.equal(disjointEvents, 0);
assert.equal(validGpuQueries, 960);
assert.equal(preparations.size, 4);
const thermalBytes = await readFile(resolve(directory, 'thermal-context.jsonl'));
const thermal = thermalBytes.toString().trim().split('\n').map((line) => JSON.parse(line));
const thermalStates = Object.fromEntries(unique(thermal.map((entry) => entry.native.thermalState)).map((state) => [state, thermal.filter((entry) => entry.native.thermalState === state).length]));
const time = (date) => Date.parse(date);
const thermalBrackets = runs.map((run) => ({ name: run.name, beforeFirstMeasuredBlock: thermal.filter((entry) => time(entry.at) <= time(run.blocks[0].startedAt)).at(-1), afterRun: thermal.find((entry) => time(entry.at) >= time(run.finishedAt)) }));
const beforeAsset = assetChecks.find((entry) => entry.path.endsWith('.cfd.gz'));
const afterAsset = assetChecks.find((entry) => entry.path.endsWith('.jpg'));
const mipBytes = (width, height) => { let total = 0; for (;;) { total += width * height * 4; if (width === 1 && height === 1) return total; width = Math.max(1, width >> 1); height = Math.max(1, height >> 1); } };
const report = {
  schemaVersion: 1,
  auditedAt: new Date().toISOString(),
  method: 'Read and recompute every saved frame; no new rendering, timing, or sample exclusions.',
  proof: { allRunsComplete: true, validGpuQueries, measuredFramesPerVersionPerViewport: 240, blocks: 16, disjointEvents, missingGpuQueries: 0, summaryMatchesRawFrames: true, sameBuildManifestAcrossRuns: true, snapshotId: manifest.snapshotId, builtAt: manifest.builtAt, allSourceHashesMatchCurrent: sourceChecks.every((entry) => entry.matches), allUsedAssetHashesMatchCurrent: assetChecks.every((entry) => entry.matches), sourceChecks, assetChecks, bundleNote: 'All exports record identical bundle hashes; this audit does not independently reread frozen server bundle files.' },
  inputs: raw.map(({ name, sha256 }) => ({ file: `${name}.json`, sha256 })).concat([{ file: 'thermal-context.jsonl', sha256: sha256(thermalBytes) }]),
  runs,
  preparations: [...preparations.values()],
  storage: { beforeAssetBytes: beforeAsset.bytes, afterAssetBytes: afterAsset.bytes, transferBytesSaved: beforeAsset.bytes - afterAsset.bytes, transferReductionPercent: percentLower(beforeAsset.bytes, afterAsset.bytes), beforeEstimatedRgba8Bytes: 2048 * 1024 * 4, afterEstimatedRgba8Bytes: 2048 * 1024 * 4, beforeEstimatedRgba8MipBytes: mipBytes(2048, 1024), afterEstimatedRgba8MipBytes: mipBytes(2048, 1024), totalBackgroundTextureMipBytes: { desktop: 11359576, compact: 11228504 }, note: 'Both designs use one 2048×1024 RGBA8-sized Earth/cloud texture payload. Storage estimates include mip levels, not driver padding or decoded CPU image allocation. Asset bytes are file/HTTP payload, not a bandwidth timing.' },
  thermal: { records: thermal.length, states: thermalStates, allLowPowerModeOff: thermal.every((entry) => entry.native.lowPowerMode === false), allACCharging: thermal.every((entry) => entry.power.includes("'AC Power'") && /\t\d+%; charging;/.test(entry.power)), setupReading: thermal[0], firstNominalReading: thermal.find((entry) => entry.native.thermalState === 'nominal'), runBrackets: thermalBrackets, note: 'Ten intermittent snapshots: one fair during setup, nine nominal afterward. No continuous temperature or GPU-clock observation; several before readings occur during initial blank rest rather than before preparation.' },
  interpretation: { allFourRunGpuMeansLower: runs.every((run) => run.gpuMeanReductionPercent > 0), allEightAdjacentPairGpuMeansLower: runs.every((run) => run.adjacentPairs.every((pair) => pair.afterLower)), stableUniversalPercentEstablished: false, siteFpsOrEnergyImprovementMeasured: false, notes: ['This is the final visible redesign cost comparison: new combined image, Lambert surface and geographic tilt (-1.2,-1.05,.18), replacing separate ocean and volume with prior tilt (-.6,1.3,.18). Same globe position/radius, camera and surface rotation rate; clouds now share surface rotation. It is not an identical-pixel shader-only test.', 'Reference chronological drift spans about 12–27% in magnitude. Counterbalanced orders and all eight local pairs favor the candidate, but frames are correlated and two orders per viewport do not establish a precise universal saving.', 'CPU submission has coarse browser timer granularity. Compact ABBA has a higher current mean; no consistent CPU or full-site FPS conclusion is claimed.', 'Background-only measurements exclude spacecraft, UI, camera travel, sustained heat, power and battery. Compact is the same Mac with a small viewport, not a physical phone. The browser is Chromium, not Safari.', 'Startup records are four unique first constructions reused in BAAB exports. Fixed reference-then-current order and local caches prevent cold-load claims. factoryCpuMs is synchronous wall time, and first submitted frame is not a presentation timestamp.', 'Nominal pressure plus fixed idle periods does not prove a fully cooled device or fixed clock speed; all raw observations are retained.'] },
};
await writeFile(resolve(directory, 'audit-summary.json'), JSON.stringify(report, null, 2) + '\n');
const f = (value, places = 3) => value.toFixed(places);
const rows = runs.map((run) => `| [${run.name}](${run.name}.json) | ${f(run.summary.reference.gpuMs.mean)} | ${f(run.summary.current.gpuMs.mean)} | ${f(run.gpuMeanReductionPercent, 1)}% | ${run.blocks.filter((block) => block.version === 'reference').map((block) => f(block.gpuMs.mean)).join(', ')} | ${run.blocks.filter((block) => block.version === 'current').map((block) => f(block.gpuMs.mean)).join(', ')} | ${run.referenceChronologicalDriftPercent >= 0 ? '+' : ''}${f(run.referenceChronologicalDriftPercent, 1)}% |`).join('\n');
const cpuRows = runs.map((run) => `| ${run.name} | ${f(run.summary.reference.totalCpuMs.mean)} | ${f(run.summary.current.totalCpuMs.mean)} | ${f(run.summary.reference.frameIntervalMs.mean)} | ${f(run.summary.current.frameIntervalMs.mean)} |`).join('\n');
const prepRows = [...preparations.values()].map(({ firstSeenIn, record: p }) => `| ${firstSeenIn.startsWith('desktop') ? 'Desktop' : 'Compact'} ${p.version === 'reference' ? 'before' : 'after'} | ${f(p.factoryCpuMs, 1)} | ${f(p.readyWaitWallMs, 1)} | ${f(p.compileAsyncWallMs, 1)} | ${f(p.firstRenderCpuMs, 1)} | ${f(p.firstSubmittedFrameWallMs, 1)} | ${f(p.firstRenderGpuMs)} |`).join('\n');
const content = `# 2K satellite Earth: measured before/after audit

The new Earth background used less measured GPU time in all four complete runs and all eight adjacent before/after block pairs. This supports a reduction for the tested configurations. Reference-block variability prevents assigning one stable or universal percentage. No raw samples were excluded or trimmed.

This audit recomputes the four saved reports and their summaries, verifies source/asset hashes, and reads native context. It performs no rendering or benchmarks. Reproduce with \`node scripts/audit-earth-comparison.mjs\`; [machine-readable summary](audit-summary.json), [declared protocol](protocol.md), and raw reports remain alongside it.

## Scope and validity

The comparison used Chrome 152 / Three r185 / ANGLE Metal on Apple M4. Desktop was **1280×720 at drawing DPR 2**, a **2560×1440 buffer**; compact was **390×844 at drawing DPR 1**, a **390×844 buffer**. Both report native DPR 1, so distinguish configured drawing DPR from native DPR. Compact uses the mobile geometry setting on this same Mac, not a physical phone. These are not Safari measurements. Actual context attributes report antialiasing enabled, alpha enabled and high-performance preference.

All runs froze time at 180 seconds with zero pointer displacement. Both assets loaded successfully without recovery; each run had four blocks, ten warmup frames and sixty measured frames per block, with twenty seconds of blank rest before every block. **All 960 measured GPU queries were valid**, with **zero disjoint events or missing results**. There are 240 measured frames per design per viewport, grouped into four blocks. GPU queries cover the entire background render; they exclude the spacecraft, app UI and camera travel.

The new design includes the combined satellite image, a Lambert surface and an initial geographic tilt of \`(-1.2, -1.05, 0.18)\`, versus \`(-0.6, 1.3, 0.18)\` before. Position, radius, camera framing and surface rotation rate are unchanged. Clouds now rotate with the land. This measures the final visible redesign, not a pixel-identical shader substitution.

## GPU results

| Run | Before mean ms | After mean ms | Lower mean in this run | Before block means ms | After block means ms | Before drift |
| --- | ---: | ---: | ---: | --- | --- | ---: |
${rows}

Before drift means the second chronological before block divided by the first, minus one. Its 12–27% magnitude shows meaningful variability even under nominal recorded pressure. No drift-based exclusion threshold was declared, so these results remain descriptive and no blocks were discarded after seeing their values. All eight adjacent pairs (blocks 0/1 and 2/3 in each export) favor the new design; all four new desktop block means are below all four old desktop block means, and the same holds for compact. This repeated direction supports the reduction, while the amount remains uncertain. The JSON includes every pair and distribution. Frames within a block are correlated, so 960 queries are not 960 independent experiments; no confidence interval or significance claim is made.

## Submitted work, transfer and storage

At this frozen time, one meteor is visible in both designs. Background draws fell **7 → 6**. Desktop triangles fell **97,284 → 72,964** (24,320 fewer); compact fell **48,388 → 36,292** (12,096 fewer). Point counts stayed 3,100 desktop / 2,300 compact. These are repeated submitted counts, not unique geometry allocations. Removing the cloud draw does not imply the shared sphere geometry buffer shrank by the same triangle count.

The satellite cloud atlas was **2,781,463 bytes**; the replacement JPEG is **526,263 bytes**. That saves **2,255,200 bytes / ${f(report.storage.transferReductionPercent, 2)}%** of asset payload. Both are one request, and the satellite JPEG replaces the cloud asset. The decoded RGBA8-sized base payload remains **8,388,608 bytes**; its complete mip chain remains **11,184,812 bytes**, so this change does **not** claim a texture-memory reduction. Including the unchanged nebula, estimated background texture storage remains 11,359,576 bytes desktop / 11,228,504 bytes compact. These are format/dimension estimates, not measured driver memory or browser heap usage.

The old cloud shader had twelve logical atlas lookups plus volume calculations, separately from its ocean surface. The new globe has one diffuse map lookup. Texture filtering can perform several internal memory accesses, so these logical counts are not literal hardware fetch counts or a predicted 12× frame-rate multiplier.

## CPU and frame cadence

| Run | Before total CPU submission ms | After total CPU submission ms | Before frame interval ms | After frame interval ms |
| --- | ---: | ---: | ---: | ---: |
${cpuRows}

The compact ABBA run has a higher current mean CPU submission time; the other three are lower. These small timings use a coarse browser clock, so no consistent CPU gain is claimed. The JSON separates update and render submission. Frame intervals remain approximately 16.67 ms for both designs; these measurements do not demonstrate higher displayed FPS, lower temperature, longer battery life or a full-site speedup.

## Initial preparation is separate

There are **four unique preparation records**, one per design/viewport. Each later BAAB export reuses its earlier records verbatim; they are not additional startup trials. The fixed load order is before then after. These are local first constructions in the page with unknown browser/driver cache state, not proven cold-cache or real-network measurements.

| Configuration | Factory wall ms | Ready wait wall ms | Compile wall ms | First render CPU ms | First submitted frame wall ms | First render GPU ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${prepRows}

The field called \`factoryCpuMs\` measures synchronous wall duration, not native process CPU time. First submitted frame is the CPU-side submission milestone, not presentation. Desktop after preparation has a longer factory duration and slightly greater first-render GPU time, despite lower steady render cost. Consequently, these single observations should not be promoted to a general startup improvement claim.

The before atlas fetch/decode observations were 13.8/65.3 ms desktop and 21.5/27.1 ms compact. JPEG fetch/decode observations were 2.4/58.2 ms desktop and 3.5/16.2 ms compact. Ready-from-factory-start was 79.6 → 96.7 ms desktop and 49.0 → 24.9 ms compact. Do not add these subphases to the top-level preparation times: loading overlaps factory work, and the field-ready metric starts earlier than the post-factory readiness wait. All exact records are retained in the JSON.

## Native pressure and power context

The [native log](thermal-context.jsonl) has **ten snapshots**: one **fair** at setup completion (07:38:24 UTC), then **nine nominal** from 07:40:17 through 07:52:38. All ten record **Low Power Mode off**, **AC power**, and a charging battery. No recorded sample reports a power-source or mode change. The first run began after two nominal observations; the other runs have observations during their initial blank rest and after completion. Several after observations occur roughly a minute or more after the last measured frame, so these are intermittent contextual brackets, not frame-adjacent or continuous telemetry.

Twenty-second rests and nominal OS pressure do not prove complete cooling, constant clocks or absence of a transient event. The initial fair state was observed during setup, before the measured runs. The log cannot attribute the observed reference drift to heat or rule out other shared load, scheduling and power-management effects. See the [earlier thermal research](../rested-retests/research.md) for the external-source rationale and API limitations. No sustained thermal or energy test was performed here.

## Provenance

All four exports share snapshot **${manifest.snapshotId}**, built **${manifest.builtAt}**. **${sourceChecks.filter((entry) => entry.matches).length}/${sourceChecks.length} imported source hashes match the current files** at audit time, including the cloud shader/reference and the new Earth modules. **${assetChecks.filter((entry) => entry.matches).length}/${assetChecks.length} used cloud/Earth asset and metadata hashes match current files**. ${sourceChecks.every((entry) => entry.matches) && assetChecks.every((entry) => entry.matches) ? "No measured runtime source or asset differs from the audited current files." : "One or more measured sources/assets differ from current files; inspect the JSON before applying these historical results to the current runtime."} Exported bundle inventories are identical; this audit did not independently reopen the frozen server's emitted bundles.

Before atlas SHA-256: \`${beforeAsset.sha256}\`. After JPEG SHA-256: \`${afterAsset.sha256}\`. The machine-readable summary records hashes of all four input reports and the thermal log, every file verification, all block summaries and the preserved preparation records. Future source edits may make a rerun's current-source verification fail without changing this historical measurement.
`;
await writeFile(resolve(directory, 'audit-summary.md'), content);
console.log(JSON.stringify({ output: directory, validGpuQueries, sourcesMatch: report.proof.allSourceHashesMatchCurrent, assetsMatch: report.proof.allUsedAssetHashesMatchCurrent, results: runs.map((run) => ({ name: run.name, beforeGpuMs: run.summary.reference.gpuMs.mean, afterGpuMs: run.summary.current.gpuMs.mean, lowerPercent: run.gpuMeanReductionPercent })), transferReductionPercent: report.storage.transferReductionPercent }));
