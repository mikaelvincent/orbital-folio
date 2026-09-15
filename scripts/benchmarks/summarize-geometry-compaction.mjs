/** Rebuild concise evidence from all raw geometry-lab runs; never delete exclusions. */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
const directory = 'docs/evidence/performance/offline-geometry-compaction';
const records = [];
for (const file of (await readdir(directory)).sort()) {
  if (!/^(verify|survey|paired|startup)-.*\.json(?:\.gz)?$/.test(file))
    continue;
  const buffer = await readFile(`${directory}/${file}`);
  records.push({
    file,
    report: JSON.parse(
      (file.endsWith('.gz') ? gunzipSync(buffer) : buffer).toString(),
    ),
  });
}
const stats = (values) => {
  const v = values
    .filter((x) => x != null && Number.isFinite(x))
    .sort((a, b) => a - b);
  return v.length
    ? {
        samples: v.length,
        mean: v.reduce((a, b) => a + b, 0) / v.length,
        p95: v[Math.ceil(v.length * 0.95) - 1],
        min: v[0],
        max: v.at(-1),
      }
    : null;
};
const summarizeRows = (rows) => {
  const scenes = rows.map((r) => r.report.scene),
    frames = scenes.flatMap((s) => s.frames);
  return {
    runs: rows.length,
    frames: frames.length,
    cpu: stats(frames.map((f) => f.cpuTotalMs)),
    frameInterval: stats(frames.map((f) => f.intervalMs)),
    gpu: stats(
      scenes.flatMap((s) =>
        s.gpu?.status === 'available'
          ? s.gpu.samples.filter((x) => x.name === 'frame').map((x) => x.ms)
          : [],
      ),
    ),
    runCpuMeans: rows.map((r) => r.report.scene.cpuTotal.mean),
    runGpuMeans: rows.map(
      (r) => r.report.scene.gpu?.phases.frame?.mean ?? null,
    ),
    counters: frames.reduce((a, f) => {
      for (const [k, v] of Object.entries(f.counters)) a[k] = (a[k] ?? 0) + v;
      return a;
    }, {}),
  };
};
const result = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  visual: [],
  surveys: [],
  paired: [],
  startup: [],
  limitations: [
    'Survey timings are descriptive and ungated; only qualified balanced blocks are pooled. Image-verification timings are excluded entirely.',
    'Acceptance is a protocol gate, not proof of a speedup, equal clocks or measured heat/battery improvement. Missing GPU data stays null.',
  ],
};
for (const { file, report: r } of records) {
  if (r.runId.startsWith('verify-')) {
    result.visual.push({
      file,
      status: r.status,
      checks: r.verifications.length,
      changed: r.verifications.filter((v) => v.changedPixels).length,
      maxDifference: Math.max(
        0,
        ...r.verifications.map((v) => v.maxChannelDifference),
      ),
      viewport: r.rows[0]?.report.settings.viewport,
      drawingBuffer: r.rows[0]?.report.settings.drawingBuffer,
      images: r.verifications
        .filter((v) => v.before)
        .map((v) => ({
          scenario: v.scenario,
          frame: v.frame,
          before: v.before,
          after: v.after,
        })),
    });
  } else if (r.runId.startsWith('survey-')) {
    result.surveys.push({
      file,
      status: r.status,
      rows: r.rows.map((row) => ({
        scenario: row.scenario,
        variant: row.policy === 'legacy' ? 'baseline' : 'indexed',
        cpu: row.report.scene.cpuTotal,
        frameInterval: row.report.scene.frameInterval,
        cpuPasses: row.report.scene.cpuPhases,
        gpuPasses: row.report.scene.gpu.phases,
        counters: row.report.scene.counters,
        passes: row.report.scene.passes,
        viewport: row.report.settings.viewport,
        drawingBuffer: row.report.settings.drawingBuffer,
      })),
    });
  } else if (r.runId.startsWith('paired-')) {
    const scenarios = [...new Set(r.blocks.map((b) => b.scenario))];
    result.paired.push({
      file,
      status: r.status,
      errors: r.errors,
      blocks: r.blocks.map((b) => ({
        scenario: b.scenario,
        index: b.index,
        accepted: b.accepted,
        reasons: b.reasons,
        referenceSpread: b.referenceSpread,
        baseline: summarizeRows(b.rows.filter((x) => x.policy === 'legacy')),
        indexed: summarizeRows(b.rows.filter((x) => x.policy === 'geometry')),
      })),
      accepted: scenarios.map((scenario) => ({
        scenario,
        ...Object.fromEntries(
          ['legacy', 'geometry'].map((policy) => [
            policy === 'legacy' ? 'baseline' : 'indexed',
            summarizeRows(
              r.blocks
                .filter((b) => b.scenario === scenario && b.accepted)
                .flatMap((b) => b.rows)
                .filter((row) => row.policy === policy),
            ),
          ]),
        ),
      })),
    });
  } else {
    result.startup.push({
      file,
      status: r.status,
      errors: r.errors,
      readiness: r.readiness,
      controls: r.controls.map((c) => ({
        attempt: c.attempt,
        constructionMs: c.sample.constructionMs,
        firstFrameMs: c.sample.firstFrame.mountToSubmissionMs,
        earthReadyMs: c.sample.earthReadyFrame.mountToSubmissionMs,
        validity: c.sample.validity,
      })),
      blocks: r.blocks.map((b) => ({
        index: b.index,
        acceptedMetrics: b.acceptedMetrics,
        stability: b.stability,
        contextStable: b.contextStable,
        comparable: b.comparable,
        ...Object.fromEntries(
          ['baseline', 'indexed'].map((variant) => [
            variant,
            {
              construction: stats(
                b.samples
                  .filter((s) => s.variant === variant)
                  .map((s) => s.constructionMs),
              ),
              firstFrame: stats(
                b.samples
                  .filter((s) => s.variant === variant)
                  .map((s) => s.firstFrame.mountToSubmissionMs),
              ),
              earthReady: stats(
                b.samples
                  .filter((s) => s.variant === variant)
                  .map((s) => s.earthReadyFrame.mountToSubmissionMs),
              ),
            },
          ]),
        ),
      })),
    });
  }
}
await writeFile(
  `${directory}/summary.json`,
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      visual: result.visual.map((v) => ({
        checks: v.checks,
        changed: v.changed,
      })),
      surveys: result.surveys.length,
      paired: result.paired.map((p) => ({
        status: p.status,
        accepted: p.accepted,
      })),
      startup: result.startup,
    },
    null,
    2,
  ),
);
