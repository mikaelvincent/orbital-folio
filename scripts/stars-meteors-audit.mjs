#!/usr/bin/env node
// CPU/source audit only. Usage: node audit.mjs [repo] [candidate.ts] [output.json] [baseline.ts|git-ref]
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = resolve(process.argv[2] || process.cwd());
const candidatePath = resolve(
  process.argv[3] || '/tmp/stars-meteors-candidate.ts',
);
const outputPath = resolve(process.argv[4] || '/tmp/stars-meteors-audit.json');
const baselineArg = process.argv[5] || 'ff15f6a';
const req = createRequire(pathToFileURL(join(root, 'package.json')));
const ts = req('typescript');
const THREE = await import(pathToFileURL(req.resolve('three')).href);
const sha = (x) => createHash('sha256').update(x).digest('hex');
const candidate = readFileSync(candidatePath, 'utf8');
const baseline = baselineArg.endsWith('.ts')
  ? readFileSync(resolve(baselineArg), 'utf8')
  : execFileSync(
      'git',
      ['show', `${baselineArg}:components/orbital-environment.ts`],
      { cwd: root, encoding: 'utf8' },
    );
const section = (s, start, end) => {
  const a = s.indexOf(start),
    b = end ? s.indexOf(end, a) : s.length;
  assert(a >= 0 && b > a, `Missing section ${start}`);
  return s.slice(a, b);
};
const preserved = [
  [
    'procedural field, sky texture, and sky shader',
    'import type',
    '  let seed = 41871;',
  ],
  [
    'Earth/clouds/atmosphere/light/placement',
    '  let disposed = false;',
    '  let activeTime = 0;',
  ],
  [
    'caller active clock and Earth/cloud updates',
    '      camera.position.set(',
    '      for (let index = 0; index < meteors.length; index++)',
  ],
  ['resource disposal', '    dispose() {', null],
].map(([name, start, end]) => {
  const a = section(baseline, start, end),
    b = section(candidate, start, end);
  assert.equal(b, a, name);
  return { name, sha256: sha(b), identical: true };
});
assert.equal(
  (candidate.match(/new THREE\.Mesh\(screenGeometry, material\)/g) || [])
    .length,
  1,
);
async function load(source) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
    reportDiagnostics: true,
  });
  assert.equal(
    result.diagnostics.filter((x) => x.category === ts.DiagnosticCategory.Error)
      .length,
    0,
  );
  return import(
    'data:text/javascript;base64,' +
      Buffer.from(result.outputText).toString('base64')
  );
}
const typeOptions = {
  target: ts.ScriptTarget.ES2017,
  lib: ['lib.dom.d.ts', 'lib.dom.iterable.d.ts', 'lib.esnext.d.ts'],
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  types: [],
  baseUrl: root,
  paths: { three: [join(root, 'node_modules/@types/three/index.d.ts')] },
};
const typeProgram = ts.createProgram([candidatePath], typeOptions);
const typeDiagnostics = ts
  .getPreEmitDiagnostics(typeProgram)
  .filter((d) => d.category === ts.DiagnosticCategory.Error);
assert.equal(
  typeDiagnostics.length,
  0,
  typeDiagnostics
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
    .join('\n'),
);
const modules = {
  baseline: await load(baseline),
  candidate: await load(candidate),
};
const percentile = (a, p) =>
  [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];
function stats(a) {
  return {
    min: Math.min(...a),
    max: Math.max(...a),
    mean: a.reduce((s, x) => s + x, 0) / a.length,
    p50: percentile(a, 0.5),
    p95: percentile(a, 0.95),
    unique: new Set(a).size,
  };
}
function resources(env) {
  const objects = [],
    geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  env.scene.traverse((o) => {
    objects.push(o);
    if (o.geometry) geometries.add(o.geometry);
    for (const m of o.material
      ? Array.isArray(o.material)
        ? o.material
        : [o.material]
      : []) {
      materials.add(m);
      for (const u of Object.values(m.uniforms || {}))
        if (u.value?.isTexture) textures.add(u.value);
    }
  });
  return {
    objects,
    geometries: [...geometries],
    materials: [...materials],
    textures: [...textures],
  };
}
function sameResources(a, b) {
  for (const k of Object.keys(a)) assert.deepEqual(b[k], a[k], `stable ${k}`);
}
function visibleFingerprint(env) {
  const d = env.getDiagnostics();
  return {
    time: d.activeTime,
    earth: d.earthRotation,
    cloud: d.cloudRotation,
    morph: d.cloudMorphTime,
    meteorStreams: d.meteorStreams.map((m) => ({
      visible: m.visible,
      phase: m.phase,
      startAt: m.startAt,
      duration: m.duration,
      nextAt: m.nextAt,
      cycle: m.cycle,
      origin: m.origin,
      direction: m.direction,
    })),
    starTime: env.scene.children.find((o) => o.isPoints).material.uniforms.time
      .value,
  };
}
function starStats(env) {
  const g = env.scene.children.find((o) => o.isPoints).geometry;
  const { position, color, size, twinkle } = g.attributes;
  const get = (a, c) =>
    Array.from({ length: a.count }, (_, i) => a.array[i * a.itemSize + c]);
  const primary = get(twinkle, 1),
    secondary =
      twinkle.itemSize === 4 ? get(twinkle, 3) : primary.map((x) => x * 0.47);
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const p = mean(primary),
    q = mean(secondary);
  const cov = primary.reduce((s, x, i) => s + (x - p) * (secondary[i] - q), 0);
  const corr =
    cov /
    Math.sqrt(
      primary.reduce((s, x) => s + (x - p) ** 2, 0) *
        secondary.reduce((s, x) => s + (x - q) ** 2, 0),
    );
  return {
    count: position.count,
    bufferBytes: Object.values(g.attributes).reduce(
      (s, a) => s + a.array.byteLength,
      0,
    ),
    positionHash: sha(Buffer.from(position.array.buffer)),
    brightnessBlue: stats(get(color, 2)),
    pointSize: stats(get(size, 0)),
    twinklePhase: stats(get(twinkle, 0)),
    twinklePrimaryRadiansPerSecond: stats(primary),
    twinkleSecondaryRadiansPerSecond: stats(secondary),
    twinkleAmplitude: stats(get(twinkle, 2)),
    primarySecondaryCorrelation: corr,
  };
}
const timelineSeconds = 630,
  step = 0.025;
function timeline(env, _kind) {
  const starts = new Map(),
    hist = Array(10).fill(0),
    directions = new Set(),
    origins = new Set(),
    groupEvents = new Map();
  const perSlot = new Map();
  let maximum = 0,
    firstMaximumTime = 0,
    lastCount = -1,
    transitions = 0;
  const initial = resources(env),
    starsBefore = starStats(env).positionHash;
  const updateDurations = [];
  for (let i = 0; i < timelineSeconds / step; i++) {
    const time = i * step;
    const t = performance.now();
    env.update(time, true, 0, 0);
    if (i % 40 === 0) updateDurations.push(performance.now() - t);
    const d = env.getDiagnostics();
    if (d.meteorCount > maximum) {
      maximum = d.meteorCount;
      firstMaximumTime = time;
    }
    hist[d.meteorCount]++;
    if (lastCount !== d.meteorCount) transitions++;
    lastCount = d.meteorCount;
    for (let s = 0; s < d.meteorStreams.length; s++) {
      const m = d.meteorStreams[s];
      assert(m.nextAt >= time - 1e-9, 'future nextAt');
      if (m.visible) {
        const key = `${s}:${m.startAt}`;
        if (!starts.has(key)) {
          starts.set(key, { slot: s, ...m });
          const prev = perSlot.get(s);
          if (prev)
            assert(
              m.startAt >= prev.startAt + prev.duration - 1e-9,
              'slot reused while previous streak alive',
            );
          perSlot.set(s, m);
          if (m.direction) {
            directions.add(m.direction.map((x) => x.toFixed(6)).join(','));
            origins.add(m.origin.map((x) => x.toFixed(6)).join(','));
            const id = `${m.cycle}:${m.bank}`;
            if (!groupEvents.has(id)) groupEvents.set(id, []);
            groupEvents.get(id).push(m);
          }
        }
      }
    }
  }
  sameResources(initial, resources(env));
  assert.equal(starsBefore, starStats(env).positionHash);
  const events = [...starts.values()],
    multi = [...groupEvents.values()].filter((g) => g.length > 1),
    parallel = multi.filter((g) => g.every((m) => m.parallel)),
    independent = multi.filter((g) => g.some((m) => !m.parallel));
  for (const group of parallel)
    assert(
      group.every(
        (m) =>
          Math.abs(m.direction[0] - group[0].direction[0]) < 1e-12 &&
          Math.abs(m.direction[1] - group[0].direction[1]) < 1e-12,
      ),
      'parallel group axes',
    );
  for (const group of independent)
    assert(
      new Set(group.map((m) => m.direction.join(','))).size > 1,
      'independent group axes',
    );
  return {
    seconds: timelineSeconds,
    sampleIntervalSeconds: step,
    meteorStarts: starts.size,
    startsPerMinute: starts.size / (timelineSeconds / 60),
    maxConcurrent: maximum,
    firstMaximumTimeSeconds: firstMaximumTime,
    concurrencyFraction: hist.map((n, count) => ({
      count,
      fraction: n / (timelineSeconds / step),
    })),
    countTransitions: transitions,
    multiGroups: multi.length,
    parallelMultiGroups: parallel.length,
    independentMultiGroups: independent.length,
    uniqueDirections: directions.size,
    uniqueOrigins: origins.size,
    risingEvents: events.filter((m) => m.direction?.[1] > 0).length,
    leftToRightEvents: events.filter((m) => m.direction?.[0] > 0).length,
    rightToLeftEvents: events.filter((m) => m.direction?.[0] < 0).length,
    shallowEvents: events.filter(
      (m) => m.direction && Math.abs(m.direction[1] / m.direction[0]) < 0.5,
    ).length,
    steepEvents: events.filter(
      (m) => m.direction && Math.abs(m.direction[1] / m.direction[0]) > 1,
    ).length,
    durationRange: [
      Math.min(...events.map((m) => m.duration)),
      Math.max(...events.map((m) => m.duration)),
    ],
    cpuUpdateSampleMs: stats(updateDurations),
    stableResourceIdentity: true,
    starPositionsStatic: true,
  };
}
const results = {
  scope: 'CPU and source only; no GPU/frame-rate or visual approval claim',
  repo: root,
  candidatePath,
  baseline: baselineArg,
  sourceHashes: { candidate: sha(candidate), baseline: sha(baseline) },
  preserved,
  threeRevision: THREE.REVISION,
  standaloneStrictTypecheckPassed: true,
  profiles: {},
};
for (const mobile of [false, true]) {
  const profile = mobile ? 'mobile' : 'desktop';
  results.profiles[profile] = {};
  for (const kind of ['baseline', 'candidate']) {
    let invalidates = 0;
    const began = performance.now();
    const env = modules[kind].createOrbitalEnvironment(
      THREE,
      () => invalidates++,
      { mobile },
    );
    const generationMs = performance.now() - began;
    env.resize(mobile ? 390 : 1440, mobile ? 844 : 1000, 1);
    env.update(0, false, 0, 0);
    const initial = visibleFingerprint(env);
    assert.equal(env.getDiagnostics().meteorCount, 0);
    env.update(500, false, 0.3, -0.2);
    assert.deepEqual(
      visibleFingerprint(env),
      initial,
      'initial reduced motion',
    );
    env.update(55.123, true, 0, 0);
    const active = visibleFingerprint(env);
    env.update(999, false, 0, 0);
    assert.deepEqual(visibleFingerprint(env), active, 'paused time');
    env.update(NaN, true, 0, 0);
    assert.deepEqual(visibleFingerprint(env), active, 'NaN ignored');
    env.update(77, true, 0, 0);
    env.update(55.123, true, 0, 0);
    assert.deepEqual(visibleFingerprint(env), active, 'deterministic seek');
    env.update(0, true, 0, 0);
    assert.deepEqual(visibleFingerprint(env), initial, 'reset');
    const star = starStats(env);
    const before = resources(env);
    const timing = !mobile ? timeline(env, kind) : null;
    const d = env.getDiagnostics();
    const resourceCounts = Object.fromEntries(
      Object.entries(before).map(([k, v]) => [k, v.length]),
    );
    const counts = new Map();
    for (const obj of [
      ...before.geometries,
      ...before.materials,
      ...before.textures,
    ]) {
      counts.set(obj, 0);
      obj.addEventListener('dispose', () =>
        counts.set(obj, counts.get(obj) + 1),
      );
    }
    env.dispose();
    env.dispose();
    for (const n of counts.values()) assert.equal(n, 1, 'disposed once');
    assert.equal(env.scene.children.length, 0);
    env.update(1000, true, 0, 0);
    assert.equal(env.getDiagnostics().ready, false);
    assert.equal(invalidates, 1);
    results.profiles[profile][kind] = {
      generationMs,
      star,
      timing,
      resourceCounts,
      proceduralTextureGpuBytes: d.proceduralTextureGpuBytes,
      drawCallBudget: d.drawCallBudget,
      pauseAndFreshReducedMotion: true,
      nonfiniteTimeIgnored: true,
      deterministicSeek: true,
      reset: true,
      disposedOnce: true,
    };
  }
}
const old = results.profiles.desktop.baseline,
  newer = results.profiles.desktop.candidate;
assert.equal(newer.timing.meteorStarts, old.timing.meteorStarts * 3);
assert.equal(newer.timing.maxConcurrent, 9);
assert(newer.timing.concurrencyFraction[1].fraction > 0.1);
assert(
  newer.timing.parallelMultiGroups > 0 &&
    newer.timing.independentMultiGroups > 0,
);
assert(
  newer.timing.risingEvents > 0 &&
    newer.timing.steepEvents > 0 &&
    newer.timing.leftToRightEvents > 0 &&
    newer.timing.rightToLeftEvents > 0,
);
assert(Math.abs(newer.star.primarySecondaryCorrelation) < 0.1);
for (const p of Object.values(results.profiles)) {
  assert.equal(p.baseline.star.count, p.candidate.star.count);
  assert.equal(
    p.baseline.proceduralTextureGpuBytes,
    p.candidate.proceduralTextureGpuBytes,
  );
  assert(
    p.candidate.star.brightnessBlue.mean > p.baseline.star.brightnessBlue.mean,
  );
  assert.equal(
    p.candidate.resourceCounts.materials - p.baseline.resourceCounts.materials,
    6,
  );
  assert.equal(
    p.candidate.resourceCounts.geometries,
    p.baseline.resourceCounts.geometries,
  );
}
results.summary = {
  creationRatio: newer.timing.meteorStarts / old.timing.meteorStarts,
  capacityRatio: 9 / 3,
  extraStarBufferBytesDesktop: newer.star.bufferBytes - old.star.bufferBytes,
  extraStarBufferBytesMobile:
    results.profiles.mobile.candidate.star.bufferBytes -
    results.profiles.mobile.baseline.star.bufferBytes,
  brightnessMeanRatio:
    newer.star.brightnessBlue.mean / old.star.brightnessBlue.mean,
  singleMeteorFraction: newer.timing.concurrencyFraction[1].fraction,
  maxEnvironmentDrawCalls: newer.drawCallBudget,
  allAssertionsPassed: true,
};
writeFileSync(outputPath, JSON.stringify(results, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      outputPath,
      sourceHashes: results.sourceHashes,
      summary: results.summary,
      desktopTiming: newer.timing,
      resources: newer.resourceCounts,
    },
    null,
    2,
  ),
);
