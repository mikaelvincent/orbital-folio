import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completeFrameGpuCoverage,
  sameKnownPower,
  matchesRenderProfile,
} from './comparison-coverage.mjs';

function cycle() {
  return {
    status: 'available',
    scope: 'frame',
    pending: 0,
    discardedSamples: 0,
    skippedSamples: 0,
    sampleEvery: 15,
    phases: { frame: { samples: 72 } },
    samples: Array.from({ length: 72 }, (_, i) => ({
      name: 'frame',
      frameId: 1 + i * 15,
      ms: 8,
    })),
  };
}
test('whole-cycle GPU coverage rejects missing phases even when enough samples remain', () => {
  const gpu = cycle();
  assert.equal(completeFrameGpuCoverage(gpu, 1080), true);
  gpu.samples = gpu.samples.slice(0, 20);
  gpu.phases.frame.samples = 20;
  assert.equal(completeFrameGpuCoverage(gpu, 1080), false);
});
test('duplicate phases and disjoint query state cannot qualify as whole-cycle GPU timing', () => {
  const gpu = cycle();
  gpu.samples[50].frameId = gpu.samples[49].frameId;
  assert.equal(completeFrameGpuCoverage(gpu, 1080), false);
  assert.equal(
    completeFrameGpuCoverage({ ...cycle(), status: 'disjoint' }, 1080),
    false,
  );
});
test('unknown telemetry permits a limited comparison but never masks a known power change', () => {
  const known = (power) => ({ availability: 'available', power });
  const unknown = { availability: 'unknown' };
  assert.equal(sameKnownPower([unknown, unknown]), true);
  assert.equal(
    sameKnownPower([known('battery'), unknown, known('battery')]),
    true,
  );
  assert.equal(sameKnownPower([known('battery'), unknown, known('AC')]), false);
});

test('decision comparisons match the declared phone or desktop profile without assuming AO', () => {
  for (const profile of [
    { viewport: [390, 844], drawingBuffer: [682, 1477], aoEnabled: false },
    { viewport: [1280, 720], drawingBuffer: [2560, 1440], aoEnabled: true },
  ]) {
    assert.equal(matchesRenderProfile(structuredClone(profile), profile), true);
    for (const changes of [
      { aoEnabled: !profile.aoEnabled },
      { viewport: [844, 390] },
      { drawingBuffer: [390, 844] },
    ])
      assert.equal(
        matchesRenderProfile({ ...profile, ...changes }, profile),
        false,
      );
  }
  assert.equal(matchesRenderProfile({}, undefined), false);
  assert.equal(matchesRenderProfile({}, {}), false);
});
