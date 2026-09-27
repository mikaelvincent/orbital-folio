/** Matched cycle timings must sample the same authored phases in both variants. */
export function completeFrameGpuCoverage(gpu, frames) {
  if (
    gpu.status !== 'available' ||
    gpu.scope !== 'frame' ||
    gpu.pending !== 0 ||
    gpu.discardedSamples !== 0 ||
    gpu.skippedSamples !== 0 ||
    !Number.isInteger(gpu.sampleEvery) ||
    gpu.sampleEvery < 1
  )
    return false;
  const expected = Math.ceil(frames / gpu.sampleEvery);
  return (
    expected >= 10 &&
    gpu.phases.frame?.samples === expected &&
    gpu.samples.length === expected &&
    gpu.samples.every(
      (sample, i) =>
        sample.name === 'frame' &&
        sample.frameId === 1 + i * gpu.sampleEvery &&
        Number.isFinite(sample.ms) &&
        sample.ms > 0,
    )
  );
}

/** Unknown telemetry cannot erase a mismatch among the known observations. */
export function sameKnownPower(contexts) {
  const known = contexts.filter((c) => c.availability === 'available');
  return known.every((c) => c.power === known[0].power);
}
