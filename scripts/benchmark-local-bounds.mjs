/** CPU-only bounds comparison on the authored model; no server or private data.
 * Supply the two original modules as <baseline-dir>/{shadow-updates,
 * dish-influence-cache}-baseline.ts, extracted from the recorded Git revision.
 * node --expose-gc scripts/benchmark-local-bounds.mjs --baseline-dir=/tmp/...
 *   --out=/tmp/bounds.json [--verify-only] [--telemetry=/tmp/thermal-snapshot]
 * Preparation is measured separately: the pixel cache falls back while the
 * camera or model transitions, then prepares influence bounds on settling.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { setTimeout as rest } from 'node:timers/promises';
import os from 'node:os';
import * as T from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { createSpacecraft } from '../features/spacecraft/spacecraft-model.ts';
import { createShadowUpdates } from '../features/spacecraft/shadow-updates.ts';
import { createDishInfluenceCache } from '../features/spacecraft/dish-influence-cache.ts';
import {
  applyCabinLighting,
  createExteriorLight,
} from '../features/spacecraft/lighting.ts';

const args = new Map(
  process.argv.slice(2).map((a) => {
    const index = a.indexOf('=');
    return index < 0
      ? [a.slice(2), true]
      : [a.slice(2, index), a.slice(index + 1)];
  }),
);
assert.ok(
  args.get('baseline-dir') && args.get('out'),
  '--baseline-dir and --out required',
);
const baseline = resolve(args.get('baseline-dir'));
const originalShadow = await import(
  pathToFileURL(resolve(baseline, 'shadow-updates-baseline.ts'))
);
const originalInfluence = await import(
  pathToFileURL(resolve(baseline, 'dish-influence-cache-baseline.ts'))
);
const frames = 120;
const modes = ['doors', 'notebook', 'keyboard', 'dish', 'prepare'];
const report = {
  method:
    'Node CPU only; 120 matched simulation steps; two controls then ABBA, BAAB; 30s initial rest, 1s sample and 10s block rests; no retries; 10min total budget',
  node: process.version,
  platform: `${os.platform()} ${os.release()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model,
  measuredLayout: 'wide',
  frames,
  hashes: {},
  firstPreparation: [],
  verification: [],
  counts: {},
  captures: [],
  telemetry: [],
};
for (const file of [
  'package-lock.json',
  'features/spacecraft/local-bounds.ts',
  'features/spacecraft/shadow-updates.ts',
  'features/spacecraft/dish-influence-cache.ts',
  'features/spacecraft/spacecraft-model.ts',
  'scripts/benchmark-local-bounds.mjs',
  resolve(baseline, 'shadow-updates-baseline.ts'),
  resolve(baseline, 'dish-influence-cache-baseline.ts'),
]) {
  report.hashes[file] = createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
}
const save = () =>
  writeFile(resolve(args.get('out')), JSON.stringify(report, null, 2) + '\n');
const observe = () => {
  const observation = args.get('telemetry')
    ? JSON.parse(
        execFileSync(args.get('telemetry'), ['--pmset', '--settings'], {
          encoding: 'utf8',
        }),
      )
    : { thermalState: 'unavailable', power: 'unknown' };
  report.telemetry.push(observation);
  assert.ok(
    !['serious', 'critical'].includes(observation.thermalState),
    'Stop at serious/critical pressure',
  );
};
function fixture(variant, layout) {
  const model = createSpacecraft(T, {
    layout,
    journal: [{ title: 'One' }, { title: 'Two' }],
  });
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(45, 16 / 9, 0.1, 100);
  camera.position.z = 18;
  camera.updateMatrixWorld();
  const linked = applyCabinLighting(T, model.group),
    key = createExteriorLight(T);
  scene.add(model.group, key, key.target);
  const lights = [key, ...linked.lights];
  for (const light of lights) {
    light.shadow.radius = 4;
    light.shadow.mapSize.set(512, 512);
  }
  const renderer = { shadowMap: { type: T.PCFShadowMap, autoUpdate: false } };
  const shadows = (
    variant === 'A' ? originalShadow.createShadowUpdates : createShadowUpdates
  )({
    three: T,
    renderer,
    root: model.group,
    lights,
    receivers: linked.shadowReceivers,
  });
  const ao = new GTAOPass(scene, camera, 1280, 720);
  ao.updateGtaoMaterial({ radius: 0.32, thickness: 0.18 });
  const influence = (
    variant === 'A'
      ? originalInfluence.createDishInfluenceCache
      : createDishInfluenceCache
  )({ three: T, renderer, scene, camera, model, key, ao });
  const keyboard = model.group.userData.contactComputer.keyboard;
  const portal = model.group.userData.portals.find(
    (p) => p.from === 'about',
  ).id;
  const meshes = [];
  model.group.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  const consume = () => {
    const dirty = lights.map((l) => l.shadow.needsUpdate);
    lights.forEach((l) => {
      l.shadow.needsUpdate = false;
    });
    renderer.shadowMap.needsUpdate = false;
    return dirty;
  };
  scene.updateMatrixWorld(true);
  const initial = performance.now();
  shadows.update();
  influence.prepare();
  report.firstPreparation.push({
    variant,
    layout,
    ms: performance.now() - initial,
  });
  consume();
  function reset(mode) {
    keyboard.clear(true);
    model.update(
      0,
      '',
      true,
      {
        activeRoom: mode === 'keyboard' ? 'contact' : 'about',
        reading: mode === 'keyboard' || mode === 'notebook',
        notebookChapter: 0,
        openPortalIds: [],
        immediateDoors: true,
        reducedMotion: false,
        delta: 1 / 60,
      },
      true,
    );
    scene.updateMatrixWorld(true);
    shadows.invalidate();
    shadows.update();
    influence.prepare();
    consume();
  }
  function step(mode, i) {
    if (mode === 'prepare') {
      camera.position.x = Math.sin(i / 60);
      camera.updateMatrixWorld();
      const start = performance.now();
      influence.prepare();
      return { boundsMs: performance.now() - start, dirty: [] };
    }
    if (mode === 'keyboard')
      (i % 30 < 15 ? keyboard.press : keyboard.release)('KeyA');
    model.update(
      (i + 1) / 60,
      '',
      false,
      {
        delta: 1 / 60,
        immediateDoors: false,
        openPortalIds: mode === 'doors' && i % 60 < 30 ? [portal] : [],
        notebookChapter: mode === 'notebook' ? Math.floor(i / 60) % 2 : 0,
      },
      true,
    );
    scene.updateMatrixWorld(true);
    const start = performance.now();
    shadows.update();
    const boundsMs = performance.now() - start;
    return { boundsMs, dirty: consume() };
  }
  function snapshot() {
    return meshes.map((m) => ({
      name: m.name,
      geometry: [
        m.geometry.boundingBox?.min.toArray(),
        m.geometry.boundingBox?.max.toArray(),
      ],
      world: new T.Box3().setFromObject(m),
      live: influence.contains(m),
    }));
  }
  const inventory = {
    meshes: meshes.length,
    geometries: new Set(meshes.map((m) => m.geometry)).size,
    instances: meshes.filter((m) => m.isInstancedMesh).length,
  };
  return {
    reset,
    step,
    snapshot,
    inventory,
    prepare: () => influence.prepare(),
    dispose: () => {
      ao.dispose();
      for (const g of new Set(meshes.map((m) => m.geometry))) g.dispose();
    },
  };
}
function count(f, mode) {
  f.reset(mode);
  const counts = {
    geometryScans: 0,
    vertexPositions: 0,
    instanceScans: 0,
    placements: 0,
  };
  // eslint-disable-next-line typescript/unbound-method -- Instrumentation calls with the original receiver.
  const g = T.BufferGeometry.prototype.computeBoundingBox,
    // eslint-disable-next-line typescript/unbound-method -- Instrumentation calls with the original receiver.
    m = T.InstancedMesh.prototype.computeBoundingBox;
  T.BufferGeometry.prototype.computeBoundingBox = function () {
    counts.geometryScans++;
    counts.vertexPositions += this.attributes.position?.count || 0;
    return g.call(this);
  };
  T.InstancedMesh.prototype.computeBoundingBox = function () {
    counts.instanceScans++;
    counts.placements += this.count;
    return m.call(this);
  };
  try {
    for (let i = 0; i < frames; i++) f.step(mode, i);
  } finally {
    T.BufferGeometry.prototype.computeBoundingBox = g;
    T.InstancedMesh.prototype.computeBoundingBox = m;
  }
  return counts;
}
let pair;
for (const layout of ['compact', 'wide']) {
  pair?.A.dispose();
  pair?.B.dispose();
  pair = null;
  global.gc?.();
  // Reverse fresh construction order to expose preparation order effects.
  pair =
    layout === 'compact'
      ? { B: fixture('B', layout), A: fixture('A', layout) }
      : { A: fixture('A', layout), B: fixture('B', layout) };
  for (const mode of modes) {
    pair.A.reset(mode);
    pair.B.reset(mode);
    for (let i = 0; i < frames; i++) {
      assert.deepEqual(pair.A.step(mode, i).dirty, pair.B.step(mode, i).dirty);
      if ([0, 29, 59, 89, 119].includes(i)) {
        // Check the shadow consumer before preparation can repair a missed
        // local-bound refresh, then check influence preparation as well.
        assert.deepEqual(
          pair.A.snapshot(),
          pair.B.snapshot(),
          `${layout}/${mode}/${i}: bounds before influence preparation`,
        );
        pair.A.prepare();
        pair.B.prepare();
        assert.deepEqual(
          pair.A.snapshot(),
          pair.B.snapshot(),
          `${layout}/${mode}/${i}: bounds and receiver membership`,
        );
      }
    }
    report.verification.push({
      layout,
      mode,
      frames,
      exactBoundsAndMembershipPoses: 5,
    });
  }
}
report.inventory = pair.B.inventory;
for (const mode of modes)
  report.counts[mode] = { A: count(pair.A, mode), B: count(pair.B, mode) };
await save();
if (!args.has('verify-only')) {
  const deadline = Date.now() + 600_000;
  observe();
  await rest(30_000);
  for (const mode of modes) {
    for (const variant of ['A', 'B']) {
      pair[variant].reset(mode);
      for (let i = 0; i < frames; i++) pair[variant].step(mode, i);
    }
    for (const [block, order] of [
      ['controls', 'AA'],
      ['ABBA', 'ABBA'],
      ['BAAB', 'BAAB'],
    ]) {
      observe();
      for (const variant of order) {
        assert.ok(
          Date.now() < deadline,
          '10 minute measurement budget exhausted',
        );
        await rest(1_000);
        global.gc?.();
        pair[variant].reset(mode);
        const times = [],
          bounds = [];
        for (let i = 0; i < frames; i++) {
          const start = performance.now();
          const result = pair[variant].step(mode, i);
          times.push(performance.now() - start);
          bounds.push(result.boundsMs);
        }
        const stats = (values) => ({
          meanMs: values.reduce((a, b) => a + b, 0) / values.length,
          p95Ms: values.toSorted((a, b) => a - b)[
            Math.ceil(values.length * 0.95) - 1
          ],
        });
        const capture = {
          mode,
          block,
          variant,
          total: stats(times),
          bounds: stats(bounds),
          times,
          boundsTimes: bounds,
        };
        report.captures.push(capture);
        await save();
        console.log(
          JSON.stringify({
            mode,
            block,
            variant,
            total: capture.total,
            bounds: capture.bounds,
          }),
        );
      }
      observe();
      await save();
      if (block !== 'BAAB') await rest(10_000);
    }
  }
}
pair.A.dispose();
pair.B.dispose();
await save();
console.log(
  JSON.stringify({
    verification: report.verification,
    counts: report.counts,
    firstPreparation: report.firstPreparation,
  }),
);
