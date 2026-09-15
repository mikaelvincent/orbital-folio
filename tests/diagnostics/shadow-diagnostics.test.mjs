/* oxlint-disable typescript/unbound-method -- These tests deliberately inspect saved method identity and verify that instrumentation forwards the original this. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { instrumentShadowUpdates } from '../../features/diagnostics/shadow-diagnostics.ts';
import { createScenePerformance } from '../../features/diagnostics/scene-performance.ts';

function fixture() {
  let time = 0;
  let pendingReasons = ['startup'];
  let reasonReads = 0;
  const collector = createScenePerformance(null, { now: () => time });
  const calls = [];
  const renderer = {
    info: { render: { calls: 0, triangles: 0, points: 0, lines: 0 } },
    shadowMap: {
      enabled: true,
      autoUpdate: false,
      needsUpdate: true,
      render(...args) {
        calls.push({ owner: this, args });
        const lights = args[0];
        if (
          !this.enabled ||
          (!this.autoUpdate && !this.needsUpdate) ||
          !lights.length
        )
          return 'delegated';
        for (const light of lights) {
          if (
            !light.shadow ||
            (!light.shadow.autoUpdate && !light.shadow.needsUpdate)
          )
            continue;
          time += 3;
          if (renderer.info) {
            renderer.info.render.calls += 7;
            renderer.info.render.triangles += 120;
          }
          light.shadow.needsUpdate = false;
        }
        this.needsUpdate = false;
        return 'delegated';
      },
    },
  };
  const original = renderer.shadowMap.render;
  const cleanup = instrumentShadowUpdates(
    renderer,
    () => collector,
    () => {
      reasonReads++;
      const reasons = pendingReasons;
      pendingReasons = [];
      return reasons;
    },
    { now: () => time },
  );
  const light = () => ({ shadow: { autoUpdate: true, needsUpdate: false } });
  const draw = (lights = [light()]) =>
    renderer.shadowMap.render(lights, {}, {});
  return {
    renderer,
    collector,
    original,
    cleanup,
    calls,
    light,
    draw,
    reasonReads: () => reasonReads,
  };
}

void test('Actual shadow generation records a nested CPU scope without changing render delegation', () => {
  const f = fixture();
  const lights = [f.light()];
  const scene = {},
    camera = {};
  f.collector.beginFrame(0, { room: 'home' });
  f.collector.beginPass('spacecraft', { ...f.renderer.info.render });
  assert.equal(f.renderer.shadowMap.render(lights, scene, camera), 'delegated');
  // The following AO/background call reuses the now-current map.
  f.draw(lights);
  f.collector.endPass('spacecraft', f.renderer.info.render);
  f.collector.endFrame();
  const report = f.collector.snapshot(true);
  const context = report.frames[0].context;
  assert.equal(report.counters['shadow-refresh'], 1);
  assert.equal(context.shadowGenerationCpuMs, 3);
  assert.equal(context.shadowMapsGenerated, 1);
  assert.deepEqual(context.shadowGenerationCounts, {
    calls: 7,
    triangles: 120,
    points: 0,
    lines: 0,
  });
  assert.deepEqual(context.shadowReasons, ['startup']);
  assert.equal(f.reasonReads(), 1);
  assert.equal(report.cpuPhases.spacecraft.mean, 3);
  assert.equal(
    report.cpuPhases['shadow-generation'],
    undefined,
    'Shadow CPU is already included in the spacecraft pass',
  );
  assert.equal(report.cpuTotal.mean, 3);
  assert.equal(report.passes.spacecraft.calls.mean, 7);
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0].owner, f.renderer.shadowMap);
  assert.equal(f.calls[0].args[0], lights);
  assert.equal(f.calls[0].args[1], scene);
  assert.equal(f.calls[0].args[2], camera);
  f.cleanup();
  assert.equal(f.renderer.shadowMap.render, f.original);
  f.cleanup();
  assert.equal(
    f.renderer.shadowMap.render,
    f.original,
    'Cleanup is idempotent',
  );
});

void test('Disabled, unrequested and lightless draws neither count nor consume invalidation reasons', () => {
  for (const scenario of [
    'disabled',
    'unrequested',
    'lightless',
    'missing-shadow',
    'shadow-unrequested',
  ]) {
    const f = fixture();
    let lights = [f.light()];
    if (scenario === 'disabled') f.renderer.shadowMap.enabled = false;
    if (scenario === 'unrequested') f.renderer.shadowMap.needsUpdate = false;
    if (scenario === 'lightless') lights = [];
    if (scenario === 'missing-shadow') lights = [{}];
    if (scenario === 'shadow-unrequested')
      lights = [{ shadow: { autoUpdate: false, needsUpdate: false } }];
    f.collector.beginFrame(0, {});
    assert.equal(f.draw(lights), 'delegated');
    f.collector.endFrame();
    const report = f.collector.snapshot(true);
    assert.equal(report.counters['shadow-refresh'], undefined, scenario);
    assert.equal(
      report.frames[0].context.shadowGenerationCpuMs,
      undefined,
      scenario,
    );
    assert.equal(f.reasonReads(), 0, scenario);
    assert.equal(
      f.calls.length,
      1,
      'Instrumentation never suppresses the original draw',
    );
    f.cleanup();
  }
});

void test('Automatic or per-light requests record generated maps; unavailable counters stay null', () => {
  const f = fixture();
  f.renderer.shadowMap.autoUpdate = true;
  f.renderer.shadowMap.needsUpdate = false;
  delete f.renderer.info;
  const lights = [
    { shadow: { autoUpdate: false, needsUpdate: true } },
    { shadow: { autoUpdate: false, needsUpdate: false } },
    f.light(),
  ];
  f.collector.beginFrame(0, {});
  f.draw(lights);
  f.collector.endFrame();
  const report = f.collector.snapshot(true);
  assert.equal(report.counters['shadow-refresh'], 1);
  assert.equal(report.context.shadowMapsGenerated, 2);
  assert.equal(report.context.shadowGenerationCpuMs, 6);
  assert.equal(report.context.shadowGenerationCounts, null);
  f.cleanup();
});

void test('Missing collectors and interrupted draws preserve the original behavior and pending reasons', () => {
  const f = fixture();
  f.cleanup();
  const cleanup = instrumentShadowUpdates(
    f.renderer,
    () => null,
    () => {
      assert.fail('No collector means no diagnostic work');
    },
  );
  assert.equal(f.draw(), 'delegated');
  cleanup();

  const failure = new Error('draw interrupted');
  f.renderer.shadowMap.needsUpdate = true;
  f.renderer.shadowMap.render = function () {
    throw failure;
  };
  const restore = f.renderer.shadowMap.render;
  let reasonsRead = false;
  const cleanupFailure = instrumentShadowUpdates(
    f.renderer,
    () => f.collector,
    () => {
      reasonsRead = true;
      return [];
    },
  );
  f.collector.beginFrame(0, {});
  assert.throws(
    () => f.draw(),
    (error) => error === failure,
  );
  f.collector.endFrame();
  assert.equal(f.collector.snapshot().counters['shadow-refresh'], undefined);
  assert.equal(reasonsRead, false);
  cleanupFailure();
  assert.equal(f.renderer.shadowMap.render, restore);
});

void test('Cleanup preserves a wrapper installed by a later owner', () => {
  const f = fixture();
  const replacement = () => 'replacement';
  f.renderer.shadowMap.render = replacement;
  f.cleanup();
  assert.equal(f.renderer.shadowMap.render, replacement);
});
