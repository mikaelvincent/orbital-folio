type Sample = { mean: number; p95: number; samples: number } | null;
type Frame = { rafNow: number; cpuTotalMs: number; intervalMs: number | null };

export type ReviewCapture = {
  kind?: 'baseline' | 'comparison' | 'confirmation' | 'custom';
  actualDurationMs: number;
  requestedDurationMs: number;
  settings: Record<string, unknown>;
  report: {
    window: { frames: number; durationMs: number; renderedFps: number | null };
    cpuTotal: Sample;
    frameInterval: Sample;
    gpu: { status: string; phases: Record<string, Sample> };
    activity?: Record<string, unknown>;
    frames?: Frame[];
  };
};

/** First and last windows are disjoint, including for a ten-second capture. */
export function captureTrend(capture: ReviewCapture) {
  const frames = capture.report.frames || [];
  if (frames.length < 4) return null;
  const start = frames[0].rafNow;
  const end = frames[frames.length - 1].rafNow;
  const span = Math.min(5_000, (end - start) / 2);
  if (span < 1_000) return null;
  const average = (values: Array<number | null>) => {
    const valid = values.filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );
    return valid.length
      ? valid.reduce((sum, value) => sum + value, 0) / valid.length
      : null;
  };
  const early = frames.filter((frame) => frame.rafNow < start + span);
  const late = frames.filter((frame) => frame.rafNow >= end - span);
  return {
    windowMs: span,
    earlyCpuMs: average(early.map((frame) => frame.cpuTotalMs)),
    lateCpuMs: average(late.map((frame) => frame.cpuTotalMs)),
    earlyFrameMs: average(early.map((frame) => frame.intervalMs)),
    lateFrameMs: average(late.map((frame) => frame.intervalMs)),
  };
}

function sameValue(a: unknown, b: unknown, tolerance = 0) {
  if (Array.isArray(a) && Array.isArray(b))
    return (
      a.length === b.length &&
      a.every((value, index) =>
        typeof value === 'number' && typeof b[index] === 'number'
          ? Math.abs(value - b[index]) <= tolerance
          : value === b[index],
      )
    );
  return a === b;
}

export function comparisonWarnings(
  baseline: ReviewCapture,
  comparison: ReviewCapture,
) {
  const warnings: string[] = [];
  const source = baseline.settings;
  const target = comparison.settings;
  const sourceExperiment = source.experiment ?? 'normal';
  const targetExperiment = target.experiment ?? 'normal';
  const filter = (settings: Record<string, unknown>) => {
    const value = settings.spacecraftFilter;
    if (!value || typeof value !== 'object') return { mode: 'all', id: '' };
    const result = value as Record<string, unknown>;
    return { mode: result.mode, id: result.mode === 'all' ? '' : result.id };
  };
  const sourceFilter = filter(source);
  const targetFilter = filter(target);
  const intendedChange =
    comparison.kind === 'comparison' &&
    sourceExperiment === 'normal' &&
    sourceFilter.mode === 'all';
  const halfResolution =
    intendedChange && targetExperiment === 'half-resolution';
  const expectedHalfBuffer =
    Array.isArray(source.drawingBuffer) &&
    Array.isArray(target.drawingBuffer) &&
    source.drawingBuffer.length === 2 &&
    target.drawingBuffer.length === 2 &&
    source.drawingBuffer.every(
      (value, index) =>
        typeof value === 'number' &&
        typeof (target.drawingBuffer as unknown[])[index] === 'number' &&
        Math.abs((target.drawingBuffer as number[])[index] - value / 2) <= 1,
    );
  const expectedHalfRatio =
    typeof source.pixelRatio === 'number' &&
    typeof target.pixelRatio === 'number' &&
    Math.abs(target.pixelRatio - source.pixelRatio / 2) <= 1e-6;
  const aoDisabledByExperiment =
    intendedChange &&
    (targetExperiment === 'no-ao' || targetExperiment === 'no-spacecraft') &&
    source.aoEnabled === true &&
    target.aoEnabled === false;
  if (sourceExperiment !== 'normal' || sourceFilter.mode !== 'all')
    warnings.push('The reference capture did not use the full normal scene.');
  if (
    comparison.kind === 'confirmation' &&
    (targetExperiment !== 'normal' || targetFilter.mode !== 'all')
  )
    warnings.push(
      'The repeated baseline has not restored the full normal scene.',
    );
  if (
    comparison.kind === 'comparison' &&
    targetExperiment !== 'normal' &&
    targetFilter.mode !== 'all'
  )
    warnings.push(
      'More than one rendering change is active. Compare one change at a time.',
    );
  for (const [key, label, tolerance] of [
    ['viewport', 'viewport size', 0],
    ['room', 'room', 0],
    ['cameraPosition', 'camera position', 0.002],
    ['cameraQuaternion', 'camera angle', 0.001],
    ['build', 'build', 0],
    ['threeRevision', 'renderer version', 0],
    ['userAgent', 'browser', 0],
    ['nativePixelRatio', 'display scaling', 0],
    ['reducedMotion', 'motion setting', 0],
    ['hardwareConcurrency', 'reported CPU thread count', 0],
    ['drawingBuffer', 'drawing buffer size', 0],
    ['pixelRatio', 'render pixel ratio', 1e-6],
    ['aoEnabled', 'contact shading setting', 0],
    ['aoBuffer', 'contact shading resolution', 0],
    ['aoSamples', 'contact shading sample count', 0],
    ['denoiseSamples', 'denoising sample count', 0],
    ['shadowsEnabled', 'shadow setting', 0],
    ['shadowMap', 'shadow resolution', 0],
    ['quality', 'render quality setting', 0],
  ] as const) {
    if (key === 'drawingBuffer' && halfResolution && expectedHalfBuffer)
      continue;
    if (key === 'pixelRatio' && halfResolution && expectedHalfRatio) continue;
    if (key === 'aoEnabled' && aoDisabledByExperiment) continue;
    if (!sameValue(source[key], target[key], tolerance))
      warnings.push(`The ${label} changed.`);
  }
  if (halfResolution && sameValue(source.drawingBuffer, target.drawingBuffer))
    warnings.push(
      'The half-resolution experiment did not change the drawing buffer.',
    );
  if (baseline.requestedDurationMs !== comparison.requestedDurationMs)
    warnings.push('Capture lengths differ. Use the same length for both runs.');
  for (const capture of [baseline, comparison]) {
    if (capture.report.window.durationMs < capture.actualDurationMs * 0.9) {
      warnings.push(
        'At least one result covers only part of its recording. Check the retained window.',
      );
      break;
    }
  }
  const active = (capture: ReviewCapture) =>
    Object.keys(capture.report.activity || {}).filter(
      (key) => !['idle', 'reduced-motion'].includes(key),
    );
  if (active(baseline).length || active(comparison).length)
    warnings.push(
      'Movement or interaction occurred. Repeat the same action, or compare two still views.',
    );
  if (!baseline.report.window.frames || !comparison.report.window.frames)
    warnings.push(
      'A capture has no rendered frames; the comparison is inconclusive.',
    );
  return warnings;
}

/** Drift is a reason to repeat the test, not evidence of a thermal cause. */
export function baselineDrift(
  baseline: ReviewCapture,
  confirmation: ReviewCapture,
) {
  const changed = (
    a: number | null | undefined,
    b: number | null | undefined,
    floor: number,
    ratio: number,
  ) =>
    typeof a === 'number' &&
    typeof b === 'number' &&
    Math.abs(b - a) > Math.max(floor, Math.abs(a) * ratio);
  return (
    changed(
      baseline.report.cpuTotal?.mean,
      confirmation.report.cpuTotal?.mean,
      0.3,
      0.15,
    ) ||
    changed(
      baseline.report.gpu.phases.spacecraft?.mean,
      confirmation.report.gpu.phases.spacecraft?.mean,
      0.3,
      0.15,
    ) ||
    changed(
      baseline.report.frameInterval?.p95,
      confirmation.report.frameInterval?.p95,
      2,
      0.2,
    )
  );
}
