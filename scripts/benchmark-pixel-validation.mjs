/** CPU-only comparison of the actual cache validator and render wrapper.
 * Run in a disposable source checkout. --baseline-dir contains the original
 * stationary-pixel-cache.ts and dish-influence-cache.ts from the recorded ref.
 * node --expose-gc scripts/benchmark-pixel-validation.mjs \
 *   --baseline-dir=/tmp/baseline --out=/tmp/pixel-validation.json
 * Optional --verify-only and --telemetry=/absolute/path/to/thermal-sampler.
 * No WebGL: wrapper timings include bookkeeping/preparation, not GPU or draws.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { setTimeout as rest } from 'node:timers/promises';
import os from 'node:os';
import * as T from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { createSpacecraft } from '../features/spacecraft/spacecraft-model.ts';
import {
  applyCabinLighting,
  createExteriorLight,
} from '../features/spacecraft/lighting.ts';

const args = new Map(
  process.argv.slice(2).map((a) => {
    const i = a.indexOf('=');
    return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)];
  }),
);
assert.ok(
  args.get('baseline-dir') && args.get('out'),
  '--baseline-dir and --out required',
);
const directory = resolve('features/spacecraft');
const temporary = [];
const report = {
  method:
    'Node CPU; actual authored model; 240 matched steps per capture; 30s initial rest; AA controls then ABBA, BAAB per state, 1s sample and 10s block rests; no retries; 10min timing budget',
  scope:
    'No DOM canvas textures, WebGL draws, GPU, pacing or energy claims. Wrapper covers validation/masking/influence preparation, with shadow rendering stubbed and AO outside the timer. Model update excluded from both timers.',
  measuredLayout: 'wide',
  correctnessLayouts: ['compact', 'wide'],
  baselineRef: args.get('baseline-ref') || 'See baseline module hashes',
  recordedAt: new Date().toISOString(),
  node: process.version,
  three: T.REVISION,
  platform: `${os.platform()} ${os.release()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model,
  hashes: {},
  construction: [],
  verification: [],
  captures: [],
  telemetry: [],
};
const hash = (data) => createHash('sha256').update(data).digest('hex');
const save = () =>
  writeFile(resolve(args.get('out')), JSON.stringify(report, null, 2) + '\n');
async function load(variant, sourceDirectory) {
  const influenceName = `.validation-${process.pid}-${variant}-dish.ts`;
  for (const [name, output] of [
    ['dish-influence-cache.ts', influenceName],
    ['stationary-pixel-cache.ts', `.validation-${process.pid}-${variant}.ts`],
  ]) {
    const path = resolve(sourceDirectory, name);
    let source = await readFile(path, 'utf8');
    report.hashes[`${variant}/${name}`] = hash(source);
    if (name === 'stationary-pixel-cache.ts') {
      assert.ok(
        source.includes(
          '    /** Used only by the explicit local comparison fixture. */',
        ),
      );
      source = source
        .replace("'./dish-influence-cache.ts'", `'./${influenceName}'`)
        .replace(
          '    /** Used only by the explicit local comparison fixture. */',
          '    validate: changed,\n    signatureSize: () => previous.length + previousColors.length,',
        );
    }
    const target = resolve(directory, output);
    await writeFile(target, source, { flag: 'wx' });
    temporary.push(target);
  }
  return (await import(pathToFileURL(temporary.at(-1))))
    .createStationaryPixelCache;
}
function fixture(create, variant, layout) {
  const model = createSpacecraft(T, {
    layout,
    journal: [{ title: 'One' }, { title: 'Two' }],
  });
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(45, 16 / 9, 0.1, 100);
  camera.position.z = 18;
  camera.updateMatrixWorld();
  const lighting = applyCabinLighting(T, model.group),
    key = createExteriorLight(T);
  scene.add(model.group, key, key.target);
  for (const light of [key, ...lighting.lights]) {
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = false;
    light.shadow.map = new T.WebGLRenderTarget(512, 512);
  }
  const ao = new GTAOPass(scene, camera, 832, 468);
  ao.updateGtaoMaterial({ radius: 0.32, thickness: 0.18 });
  let target = null,
    alpha = 1,
    width = 1280;
  const clear = new T.Color();
  const renderer = {
    shadowMap: {
      type: T.PCFShadowMap,
      autoUpdate: false,
      enabled: true,
      needsUpdate: false,
      render() {},
    },
    toneMapping: T.ACESFilmicToneMapping,
    toneMappingExposure: 0.95,
    outputColorSpace: T.SRGBColorSpace,
    getRenderTarget: () => target,
    setRenderTarget: (value) => {
      target = value;
    },
    getDrawingBufferSize: (value) => value.set(width, 720),
    getClearAlpha: () => alpha,
    getClearColor: (value) => value.copy(clear),
    setClearColor: (value, a) => {
      clear.set(value);
      alpha = a;
    },
    clear() {},
    render() {},
  };
  scene.updateMatrixWorld(true);
  const start = performance.now();
  const cache = create({ three: T, renderer, scene, camera, model, key, ao });
  const created = performance.now();
  cache.validate();
  report.construction.push({
    variant,
    layout,
    createMs: created - start,
    firstValidationMs: performance.now() - created,
  });
  const portal = model.group.userData.portals.find(
    (p) => p.from === 'about',
  ).id;
  const keyboard = model.group.userData.contactComputer.keyboard;
  const update = (mode, i, instant = false) => {
    const t = mode === 'dish' ? 5 + i / 60 : 14;
    if (mode === 'keyboard')
      (i % 30 < 15 ? keyboard.press : keyboard.release)('KeyA');
    model.update(
      t,
      '',
      instant,
      {
        activeRoom: mode === 'keyboard' ? 'contact' : 'about',
        reading: mode === 'keyboard' || mode === 'notebook',
        notebookChapter: mode === 'notebook' ? Math.floor(i / 60) % 2 : 0,
        hoveredObject: mode === 'color' && i % 60 < 30 ? 'about-notebook' : '',
        openPortalIds: mode === 'doors' && i % 60 < 30 ? [portal] : [],
        immediateDoors: instant,
        reducedMotion: false,
        delta: 1 / 60,
      },
      true,
    );
    camera.position.x = mode === 'camera' ? Math.sin(i / 60) : 0;
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
  };
  function reset(mode) {
    width = 1280;
    keyboard.clear(true);
    update(mode, 0, true);
    cache.invalidate();
    for (let i = 0; i < 6; i++) renderer.render(scene, camera);
    cache.occlusion(() => {}, true);
  }
  function step(mode, i, scope) {
    update(mode, i);
    if (mode === 'resize') width = 1280 + (i % 2);
    if (mode === 'rebuild') cache.invalidate();
    const start = performance.now();
    const change =
      scope === 'validation'
        ? cache.validate()
        : renderer.render(scene, camera);
    const ms = performance.now() - start;
    if (scope === 'wrapper') cache.occlusion(() => {}, true);
    return { change, ms };
  }
  return {
    reset,
    step,
    stats: () => ({ ...cache.stats(), influence: undefined }),
    size: () => cache.signatureSize(),
    dispose() {
      cache.dispose();
      ao.dispose();
      for (const light of [key, ...lighting.lights]) light.shadow.map.dispose();
      const geometries = new Set(),
        materials = new Set();
      model.group.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        for (const m of [o.material].flat()) if (m) materials.add(m);
      });
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
function observe() {
  const value = args.has('telemetry')
    ? JSON.parse(
        execFileSync(args.get('telemetry'), ['--pmset', '--settings'], {
          encoding: 'utf8',
        }),
      )
    : { thermalState: 'unavailable', power: 'unknown' };
  report.telemetry.push(value);
  assert.ok(
    !['serious', 'critical'].includes(value.thermalState),
    'Stop at serious/critical pressure',
  );
}
const modes = [
  'hold',
  'dish',
  'color',
  'doors',
  'notebook',
  'keyboard',
  'camera',
  'resize',
  'rebuild',
];
const frames = 240;
let pair;
try {
  for (const name of [
    'package-lock.json',
    'features/spacecraft/spacecraft-model.ts',
    'scripts/benchmark-pixel-validation.mjs',
  ])
    report.hashes[name] = hash(await readFile(name));
  const createA = await load('A', args.get('baseline-dir')),
    createB = await load('B', directory);
  for (const layout of ['compact', 'wide']) {
    pair?.A.dispose();
    pair?.B.dispose();
    pair = {
      A: fixture(createA, 'A', layout),
      B: fixture(createB, 'B', layout),
    };
    for (const scope of ['validation', 'wrapper'])
      for (const mode of modes) {
        for (const f of Object.values(pair)) f.reset(mode);
        const before = Object.fromEntries(
          Object.entries(pair).map(([k, f]) => [k, f.stats()]),
        );
        const changes = {};
        for (let i = 0; i < frames; i++) {
          const a = pair.A.step(mode, i, scope),
            b = pair.B.step(mode, i, scope);
          assert.equal(b.change, a.change, `${layout}/${scope}/${mode}/${i}`);
          changes[String(a.change)] = (changes[String(a.change)] || 0) + 1;
          if (scope === 'wrapper') {
            for (const key of [
              'valid',
              'equalFrames',
              'width',
              'height',
              'cached',
              'live',
            ])
              assert.equal(
                pair.B.stats()[key],
                pair.A.stats()[key],
                `${layout}/${mode}/${i}/${key}`,
              );
            for (const key of ['hits', 'builds', 'fallbacks'])
              assert.equal(
                pair.B.stats()[key] - before.B[key],
                pair.A.stats()[key] - before.A[key],
              );
          }
        }
        report.verification.push({ layout, scope, mode, frames, changes });
      }
  }
  report.signatureSlots = { A: pair.A.size(), B: pair.B.size() };
  await save();
  if (!args.has('verify-only')) {
    const deadline = Date.now() + 600_000;
    observe();
    await rest(30_000);
    for (const [scope, cases] of [
      ['validation', modes.slice(0, 6)],
      ['wrapper', modes],
    ]) {
      for (const mode of cases) {
        for (const f of Object.values(pair)) {
          f.reset(mode);
          for (let i = 0; i < frames; i++) f.step(mode, i, scope);
        }
        for (const block of ['AA', 'ABBA', 'BAAB']) {
          observe();
          for (const variant of block) {
            assert.ok(
              Date.now() < deadline,
              '10 minute timing budget exhausted',
            );
            await rest(1000);
            global.gc?.();
            pair[variant].reset(mode);
            const times = [];
            for (let i = 0; i < frames; i++)
              times.push(pair[variant].step(mode, i, scope).ms);
            const capture = {
              layout: 'wide',
              scope,
              mode,
              block,
              variant,
              meanMs: times.reduce((a, b) => a + b, 0) / frames,
              p95Ms: times.toSorted((a, b) => a - b)[
                Math.ceil(frames * 0.95) - 1
              ],
              times,
            };
            report.captures.push(capture);
            await save();
            console.log(JSON.stringify({ ...capture, times: undefined }));
          }
          if (block !== 'BAAB') await rest(10_000);
        }
      }
    }
    observe();
  }
} finally {
  pair?.A.dispose();
  pair?.B.dispose();
  await Promise.all(temporary.map((file) => unlink(file)));
  await save();
}
console.log(
  JSON.stringify({
    verified: report.verification.length,
    signatureSlots: report.signatureSlots,
    construction: report.construction,
  }),
);
