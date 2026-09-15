import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeCameraReport } from '../../scripts/benchmarks/summarize-camera-invalidation.mjs';

function row(policy, frames, samples, extra = {}) {
  return {
    scenario: 'feedback', policy, measuredFrames: frames.length, requestedFrames: frames.length,
    stateBefore: { cameraPosition: [1, 2, 3] },
    report: {
      settings: { viewport: [1200, 800], drawingBuffer: [2400, 1600], policy, ...extra },
      scene: { frames, counters: {}, gpu: { scope: 'frame', status: 'available', sampleEvery: 15, samples } },
    },
  };
}
const frame = (id, cpuTotalMs, kind, intervalMs = 16) => ({ id, cpuTotalMs, intervalMs, counters: { [kind === 'refresh' ? 'ao-refresh' : 'ao-cached']: 1 } });
const gpu = (frameId, ms) => ({ frameId, ms, name: 'frame' });

void test('preserves incomplete status and rejected blocks; pools raw frames rather than row means or p95 values', () => {
  const summary = summarizeCameraReport({
    runId: 'fixture', mode: 'paired', status: 'inconclusive-recovery',
    blocks: [
      { accepted: true, scenario: 'feedback', order: ['legacy', 'geometry'], rows: [row('legacy', [frame(1, 1, 'cached', null), frame(2, 2, 'cached')], []), row('legacy', [frame(1, 10, 'cached')], [])] },
      { accepted: false, scenario: 'feedback', reasons: ['Control drift'], rows: [row('legacy', [frame(1, 1000, 'cached')], [])] },
    ],
  });
  assert.equal(summary.overallStatus, 'inconclusive-recovery');
  assert.equal(summary.acceptedBlockCount, 1);
  assert.equal(summary.rejectedOrUnacceptedBlockCount, 1);
  assert.deepEqual(summary.blocks[1].reasons, ['Control drift']);
  const group = summary.acceptedGroups[0];
  assert.equal(group.cpuMs.mean, 13 / 3);
  assert.equal(group.cpuMs.p95, 10);
  assert.equal(group.intervalMs.samples, 2);
  assert.equal(group.frameGpuSampledMs.mean, null);
});

void test('joins repeating frame IDs within each row and labels cohort weighting as an estimate', () => {
  const summary = summarizeCameraReport({
    runId: 'fixture', mode: 'paired', status: 'complete',
    blocks: [{ accepted: true, rows: [
      row('legacy', [frame(1, 1, 'refresh'), frame(2, 1, 'cached')], [gpu(1, 20)]),
      row('legacy', [frame(1, 1, 'cached'), frame(2, 1, 'cached')], [gpu(1, 10)]),
    ] }],
  }, { weightedGpu: true });
  const group = summary.acceptedGroups[0];
  assert.equal(group.frameGpuSampledMs.mean, 15);
  assert.equal(group.ao.refreshFraction, .25);
  assert.equal(group.gpu.sampledRefreshFraction, .5);
  assert.equal(group.gpu.cohorts.refresh.sampledGpuMs.mean, 20);
  assert.equal(group.gpu.cohorts.cached.sampledGpuMs.mean, 10);
  assert.equal(group.estimatedCohortWeightedFrameGpuMs.mean, 12.5);
  assert.equal(group.estimatedCohortWeightedFrameGpuMs.kind, 'estimate-not-measured');
  assert.equal(group.estimatedCohortWeightedFrameGpuMs.p95, null);
});

void test('does not fabricate weighted results when a rendered cohort has no GPU samples; reports settings differences', () => {
  const summary = summarizeCameraReport({
    runId: 'fixture', mode: 'paired', status: 'complete',
    blocks: [{ accepted: true, rows: [
      row('legacy', [frame(1, 1, 'refresh'), frame(2, 1, 'cached')], [gpu(1, 20)]),
      row('geometry', [frame(1, 1, 'cached')], [], { drawingBuffer: [1200, 800] }),
    ] }],
  }, { weightedGpu: true });
  assert.equal(summary.acceptedGroups[0].estimatedCohortWeightedFrameGpuMs.mean, null);
  assert.match(summary.acceptedGroups[0].estimatedCohortWeightedFrameGpuMs.unavailableReasons[0], /cached/);
  const parity = summary.acceptedScenarioSettingsParity.feedback;
  assert.equal(parity.availableFieldsMatch, false);
  assert.deepEqual(parity.differences.map((item) => item.key), ['drawingBuffer']);
  assert.equal(parity.startTransforms.cameraPosition.maxAbsoluteDifference, 0);
  assert.equal(parity.complete, false);
});
