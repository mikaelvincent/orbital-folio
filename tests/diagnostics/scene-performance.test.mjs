import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenePerformance } from '../../features/diagnostics/scene-performance.ts';

const zeroCounts = () => ({ calls: 0, triangles: 0, points: 0, lines: 0 });

function fixture(options = {}, gl = null) {
  let time = 0;
  const collector = createScenePerformance(gl, { now: () => time, ...options });
  return {
    collector,
    advance(ms) {
      time += ms;
    },
  };
}

function gpuFixture() {
  let disjoint = false;
  let lost = false;
  let active = null;
  const queries = [];
  const reads = [];
  const gl = {
    QUERY_RESULT_AVAILABLE: 1,
    QUERY_RESULT: 2,
    getExtension: () => ({ TIME_ELAPSED_EXT: 3, GPU_DISJOINT_EXT: 4 }),
    isContextLost: () => lost,
    getParameter: () => disjoint,
    createQuery() {
      const query = { ready: false, result: 2_000_000, deleted: false };
      queries.push(query);
      return query;
    },
    beginQuery(_target, query) {
      assert.equal(active, null, 'elapsed queries cannot overlap');
      active = query;
    },
    endQuery() {
      assert.notEqual(active, null);
      active = null;
    },
    getQueryParameter(query, parameter) {
      reads.push(parameter);
      if (parameter === this.QUERY_RESULT_AVAILABLE) return query.ready;
      assert.equal(
        query.ready,
        true,
        'result reads must not block for readiness',
      );
      assert.equal(query.deleted, false);
      return query.result;
    },
    deleteQuery(query) {
      query.deleted = true;
    },
  };
  return {
    gl,
    queries,
    reads,
    disjoint(value) {
      disjoint = value;
    },
    loseContext() {
      lost = true;
    },
  };
}

function renderPass(collector, name = 'spacecraft') {
  collector.beginPass(name, zeroCounts());
  collector.endPass(name, { calls: 4, triangles: 200, points: 0, lines: 8 });
}

test('Long recordings retain their complete window, then shrink without resetting capture identity', () => {
  const { collector, advance } = fixture();
  collector.reset('sustained capture');
  collector.setWindowSize(14400);
  for (let i = 0; i < 4000; i++) {
    collector.beginFrame(i * 16, { activity: 'idle' });
    advance(1);
    collector.endFrame();
  }
  const full = collector.snapshot(true);
  assert.equal(full.window.frames, 4000);
  assert.equal(full.window.durationMs, 3999 * 16);
  collector.setWindowSize(1800);
  const live = collector.snapshot(true);
  assert.equal(live.window.frames, 1800);
  assert.equal(live.frames.at(-1).id, full.frames.at(-1).id);
  assert.equal(live.resetReason, full.resetReason);
  assert.equal(
    full.frames.length,
    4000,
    'saved recording is independent of live retention',
  );
});

test('CPU phases partition callback time and counters report cumulative pass deltas', () => {
  const { collector, advance } = fixture();
  collector.beginFrame(0, { activity: 'idle', pixelRatio: 2 });
  advance(2);
  collector.mark('camera');
  advance(3);
  collector.mark('annotations');
  collector.beginPass('spacecraft', {
    calls: 3,
    triangles: 9,
    points: 2,
    lines: 4,
  });
  advance(4);
  collector.endPass('spacecraft', {
    calls: 8,
    triangles: 100,
    points: 5,
    lines: 8,
  });
  advance(1);
  collector.mark('legacy-diagnostics');
  collector.count('ao-camera');
  collector.count('ao-camera');
  collector.endFrame();
  const report = collector.snapshot(true);
  assert.equal(report.cpuTotal.mean, 10);
  assert.equal(report.cpuPhases.camera.mean, 2);
  assert.equal(report.cpuPhases.spacecraft.mean, 4);
  assert.equal(report.cpuPhases['legacy-diagnostics'].mean, 1);
  assert.equal(
    Object.values(report.frames[0].cpuPhases).reduce((sum, ms) => sum + ms, 0),
    10,
  );
  assert.equal(report.passes.spacecraft.calls.mean, 5);
  assert.equal(report.passes.spacecraft.triangles.mean, 91);
  assert.equal(report.passes.spacecraft.points.mean, 3);
  assert.equal(report.passes.spacecraft.lines.mean, 4);
  assert.equal(report.counters['ao-camera'], 2);
  assert.deepEqual(report.activity.idle, { frames: 1, cpuMeanMs: 10 });
  assert.equal(report.context.pixelRatio, 2);
  assert.equal(report.frames[0].context.pixelRatio, 2);
  assert.equal(report.gpu.status, 'unavailable');
  assert.equal(report.gpu.phases.spacecraft, null);
  assert.equal(report.frameInterval, null);
  assert.equal(report.window.renderedFps, null);
});

test('Nearest-rank percentiles, observed frame rate and activity are derived from samples', () => {
  const { collector, advance } = fixture();
  for (let index = 0; index < 20; index += 1) {
    collector.beginFrame(index * 20, {
      activity: index < 10 ? 'idle' : 'travel',
    });
    advance(index + 1);
    collector.mark('model');
    collector.endFrame();
  }
  const report = collector.snapshot();
  assert.deepEqual(report.cpuTotal, {
    samples: 20,
    mean: 10.5,
    p50: 10,
    p95: 19,
    max: 20,
  });
  assert.deepEqual(report.frameInterval, {
    samples: 19,
    mean: 20,
    p50: 20,
    p95: 20,
    max: 20,
  });
  assert.equal(report.window.renderedFps, 50);
  assert.deepEqual(report.activity.travel, { frames: 10, cpuMeanMs: 15.5 });
  assert.equal(report.frames, undefined, 'raw frames are opt-in');
});

test('Rolling frame bounds also bound counters and exported frames cannot alter measurements', () => {
  const { collector, advance } = fixture({ maxFrames: 3 });
  for (let index = 0; index < 10; index += 1) {
    collector.beginFrame(index * 16, { activity: 'idle' });
    collector.count(index < 7 ? 'expired' : 'recent');
    advance(index);
    renderPass(collector);
    collector.endFrame();
  }
  const report = collector.snapshot(true);
  assert.equal(report.window.frames, 3);
  assert.equal(report.cpuTotal.mean, 8);
  assert.equal(report.counters.expired, undefined);
  assert.equal(report.counters.recent, 3);
  report.frames[0].cpuPhases.unattributed = 999;
  report.frames[0].passes.spacecraft.calls = 999;
  report.frames[0].counters.recent = 999;
  const fresh = collector.snapshot(true);
  assert.equal(fresh.frames[0].cpuPhases.unattributed, 7);
  assert.equal(fresh.frames[0].passes.spacecraft.calls, 4);
  assert.equal(fresh.frames[0].counters.recent, 1);
});

test('GPU queries are sampled every 15 frames and only read asynchronously when available', () => {
  const gpu = gpuFixture();
  const { collector } = fixture({}, gpu.gl);
  collector.beginFrame(0, { activity: 'idle' });
  renderPass(collector, 'background');
  renderPass(collector, 'spacecraft');
  collector.endFrame();
  assert.equal(gpu.queries.length, 2);
  assert.deepEqual(gpu.reads, [], 'submission frame cannot poll its own query');
  assert.equal(collector.snapshot().gpu.phases.background, null);
  collector.beginFrame(16, { activity: 'idle' });
  renderPass(collector);
  collector.endFrame();
  assert.equal(
    gpu.reads.filter((value) => value === gpu.gl.QUERY_RESULT).length,
    0,
  );
  for (const query of gpu.queries) query.ready = true;
  for (let index = 2; index < 16; index += 1) {
    collector.beginFrame(index * 16, { activity: 'idle' });
    renderPass(collector);
    collector.endFrame();
  }
  const report = collector.snapshot();
  assert.equal(gpu.queries.length, 3, 'next sampled frame is frame 16');
  assert.equal(report.gpu.phases.background.mean, 2);
  assert.equal(report.gpu.phases.spacecraft.samples, 1);
  assert.equal(report.gpu.pending, 1);
  assert.equal(gpu.queries[0].deleted, true);
  assert.equal(gpu.queries[1].deleted, true);
});

test('Long captures accept 1800 frames, remain bounded, and preserve changing room context', () => {
  const { collector } = fixture({ maxFrames: 1800 });
  for (let index = 0; index < 1805; index += 1) {
    collector.beginFrame(index * 8.33, {
      activity: 'travel',
      room: `room-${index}`,
    });
    collector.endFrame();
  }
  const report = collector.snapshot(true);
  assert.equal(report.window.frames, 1800);
  assert.equal(report.frames[0].context.room, 'room-5');
  assert.equal(report.frames.at(-1).context.room, 'room-1804');
  assert.equal(report.context.room, 'room-1804');
  report.frames[0].context.room = 'mutated';
  assert.equal(collector.snapshot(true).frames[0].context.room, 'room-5');
});

test('A disjoint interval discards pending samples and resumes with valid measurements', () => {
  const gpu = gpuFixture();
  const { collector } = fixture({ gpuSampleEvery: 1 }, gpu.gl);
  collector.beginFrame(0, {});
  renderPass(collector);
  collector.endFrame();
  gpu.queries[0].ready = true;
  gpu.disjoint(true);
  collector.beginFrame(16, {});
  renderPass(collector);
  collector.endFrame();
  let report = collector.snapshot();
  assert.equal(report.gpu.status, 'disjoint');
  assert.equal(report.gpu.phases.spacecraft, null);
  assert.equal(report.gpu.discardedSamples, 1);
  assert.equal(gpu.queries[0].deleted, true);
  assert.equal(gpu.queries.length, 1, 'do not submit while disjoint');
  gpu.disjoint(false);
  collector.beginFrame(32, {});
  renderPass(collector);
  collector.endFrame();
  gpu.queries[1].ready = true;
  collector.beginFrame(48, {});
  collector.endFrame();
  report = collector.snapshot();
  assert.equal(report.gpu.status, 'available');
  assert.equal(report.gpu.phases.spacecraft.samples, 1);
});

test('Pending queries are bounded, reset drops late results, and disposal releases active queries', () => {
  const gpu = gpuFixture();
  const { collector } = fixture(
    { gpuSampleEvery: 1, maxPendingQueries: 2 },
    gpu.gl,
  );
  for (let index = 0; index < 5; index += 1) {
    collector.beginFrame(index * 16, {});
    renderPass(collector);
    collector.endFrame();
  }
  assert.equal(gpu.queries.length, 2);
  assert.equal(collector.snapshot().gpu.pending, 2);
  assert.equal(collector.snapshot().gpu.skippedSamples, 3);
  collector.reset('visibility-change');
  assert.equal(
    gpu.queries.every((query) => query.deleted),
    true,
  );
  for (const query of gpu.queries) query.ready = true;
  let report = collector.snapshot();
  assert.equal(report.cpuTotal, null);
  assert.equal(report.window.frames, 0);
  assert.equal(report.resetReason, 'visibility-change');
  collector.beginFrame(1_000, {});
  collector.endFrame();
  report = collector.snapshot();
  assert.deepEqual(Object.keys(report.gpu.phases), []);
  assert.equal(
    report.frameInterval,
    null,
    'time before reset does not contaminate new session',
  );
  collector.beginFrame(1_016, {});
  collector.beginPass('active', zeroCounts());
  collector.dispose();
  assert.equal(gpu.queries.at(-1).deleted, true);
  collector.beginFrame(1_032, {});
  collector.endFrame();
  assert.equal(collector.snapshot().window.frames, 1);
  assert.equal(collector.snapshot().gpu.status, 'disposed');
});

test('GPU samples expire with their source frames and context loss keeps CPU timing usable', () => {
  const gpu = gpuFixture();
  const { collector, advance } = fixture({ maxFrames: 2 }, gpu.gl);
  collector.beginFrame(0, {});
  renderPass(collector);
  collector.endFrame();
  gpu.queries[0].ready = true;
  collector.beginFrame(16, {});
  collector.endFrame();
  assert.equal(collector.snapshot().gpu.phases.spacecraft.mean, 2);
  collector.beginFrame(32, {});
  renderPass(collector);
  collector.endFrame();
  assert.equal(collector.snapshot().gpu.phases.spacecraft, null);
  gpu.loseContext();
  collector.beginFrame(48, {});
  advance(3);
  collector.mark('camera');
  collector.endFrame();
  assert.equal(collector.snapshot().gpu.status, 'context-lost');
  assert.equal(collector.snapshot().cpuPhases.camera.mean, 3);
});
