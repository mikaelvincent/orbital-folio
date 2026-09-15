import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captureTrend,
  comparisonWarnings,
  baselineDrift,
} from '../../features/diagnostics/performance-review.ts';

const sample = (mean) => ({ mean, p95: mean * 1.1, samples: 100 });
const capture = (overrides = {}) => ({
  kind: 'baseline',
  actualDurationMs: 10_000,
  requestedDurationMs: 10_000,
  settings: {
    viewport: [800, 600],
    experiment: 'normal',
    spacecraftFilter: { mode: 'all', id: '' },
    drawingBuffer: [1600, 1200],
    pixelRatio: 2,
    nativePixelRatio: 2,
    aoEnabled: true,
    aoBuffer: [520, 390],
    aoSamples: 32,
    denoiseSamples: 32,
    shadowsEnabled: true,
    shadowMap: [2048, 2048],
    room: 'home',
    cameraPosition: [0, 0, 5],
    cameraQuaternion: [0, 0, 0, 1],
  },
  report: {
    window: { frames: 600, durationMs: 9_980, renderedFps: 60 },
    cpuTotal: sample(3),
    frameInterval: sample(16.7),
    gpu: { status: 'available', phases: { spacecraft: sample(4) } },
    activity: { idle: {} },
  },
  ...overrides,
});

test('intentional rendering changes preserve a matched view; camera and viewport changes do not', () => {
  const baseline = capture();
  const comparison = capture({
    kind: 'comparison',
    settings: {
      ...baseline.settings,
      experiment: 'half-resolution',
      drawingBuffer: [800, 600],
      pixelRatio: 1,
    },
  });
  assert.deepEqual(comparisonWarnings(baseline, comparison), []);
  comparison.settings.cameraPosition = [1, 0, 5];
  comparison.settings.viewport = [400, 600];
  assert.equal(comparisonWarnings(baseline, comparison).length, 2);
});

test('drawing-buffer changes are allowed only for the intended half-resolution experiment', () => {
  const baseline = capture();
  const comparison = capture({ kind: 'comparison' });
  comparison.settings.drawingBuffer = [800, 600];
  comparison.settings.pixelRatio = 1;
  comparison.settings.experiment = 'no-background';
  assert.match(
    comparisonWarnings(baseline, comparison).join(' '),
    /drawing buffer size changed/,
  );
  assert.match(
    comparisonWarnings(baseline, comparison).join(' '),
    /render pixel ratio changed/,
  );
  comparison.settings.experiment = 'half-resolution';
  assert.deepEqual(comparisonWarnings(baseline, comparison), []);
  comparison.settings.drawingBuffer = [700, 600];
  assert.match(
    comparisonWarnings(baseline, comparison).join(' '),
    /drawing buffer size changed/,
  );
});

test('contact-shading changes are allowed only when the selected experiment disables it', () => {
  const baseline = capture();
  for (const experiment of ['no-ao', 'no-spacecraft']) {
    const comparison = capture({ kind: 'comparison' });
    comparison.settings.experiment = experiment;
    comparison.settings.aoEnabled = false;
    assert.deepEqual(comparisonWarnings(baseline, comparison), []);
  }
  const comparison = capture({ kind: 'comparison' });
  comparison.settings.experiment = 'no-background';
  comparison.settings.aoEnabled = false;
  assert.match(
    comparisonWarnings(baseline, comparison).join(' '),
    /contact shading setting changed/,
  );
});

test('AO resolution, samples, shadows and other quality changes remain comparison warnings', () => {
  const baseline = capture();
  /** @type {Array<[string, unknown, string]>} */
  const changes = [
    ['aoBuffer', [260, 195], 'contact shading resolution'],
    ['aoSamples', 16, 'contact shading sample count'],
    ['denoiseSamples', 16, 'denoising sample count'],
    ['shadowsEnabled', false, 'shadow setting'],
    ['shadowMap', [1024, 1024], 'shadow resolution'],
    ['quality', 'lower', 'render quality setting'],
  ];
  for (const [key, value, label] of changes) {
    const comparison = capture({ kind: 'comparison' });
    comparison.settings[key] = value;
    assert.ok(
      comparisonWarnings(baseline, comparison).includes(
        `The ${label} changed.`,
      ),
      key,
    );
  }
});

test('confirmation restores the full normal scene and gets no resolution or AO exceptions', () => {
  const baseline = capture();
  const confirmation = capture({ kind: 'confirmation' });
  assert.deepEqual(comparisonWarnings(baseline, confirmation), []);
  confirmation.settings.experiment = 'half-resolution';
  confirmation.settings.drawingBuffer = [800, 600];
  confirmation.settings.pixelRatio = 1;
  confirmation.settings.aoEnabled = false;
  confirmation.settings.spacecraftFilter = {
    mode: 'hide',
    id: 'room:projects',
  };
  const warnings = comparisonWarnings(baseline, confirmation).join(' ');
  assert.match(warnings, /not restored the full normal scene/);
  assert.match(warnings, /drawing buffer size changed/);
  assert.match(warnings, /render pixel ratio changed/);
  assert.match(warnings, /contact shading setting changed/);
});

test('truncated, empty and moving captures are explicitly inconclusive', () => {
  const baseline = capture();
  const comparison = capture();
  comparison.report.window = { frames: 0, durationMs: 0, renderedFps: null };
  comparison.report.activity = { travel: {} };
  const warnings = comparisonWarnings(baseline, comparison).join(' ');
  assert.match(warnings, /part of its recording/);
  assert.match(warnings, /Movement or interaction/);
  assert.match(warnings, /inconclusive/);
});

test('first/last trend windows do not overlap and use elapsed sample timestamps', () => {
  const value = capture();
  value.report.frames = Array.from({ length: 11 }, (_, i) => ({
    rafNow: i * 1000,
    cpuTotalMs: i < 5 ? 2 : 8,
    intervalMs: i === 0 ? null : 20,
  }));
  assert.deepEqual(captureTrend(value), {
    windowMs: 5000,
    earlyCpuMs: 2,
    lateCpuMs: 8,
    earlyFrameMs: 20,
    lateFrameMs: 20,
  });
});

test('baseline drift requires a meaningful timing change and unavailable GPU stays unknown', () => {
  const baseline = capture();
  const confirmation = capture();
  confirmation.report.gpu.phases.spacecraft = null;
  confirmation.report.cpuTotal = sample(3.05);
  assert.equal(baselineDrift(baseline, confirmation), false);
  confirmation.report.cpuTotal = sample(4.2);
  assert.equal(baselineDrift(baseline, confirmation), true);
});
