/** CPU art-selection audit. Run: node docs/evidence/earth-mediterranean-presets/region-audit.mjs
 * Screen samples rank candidates, not geography truth, rendered art or performance.
 */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import sharp from 'sharp';
import * as THREE from 'three';
const root = 'docs/evidence/earth-mediterranean-presets/';
async function bundle(path) {
  const result = await build({
    entryPoints: [path],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  );
}
const paths = [
  'features/orbit/orbital-environment.ts',
  'features/orbit/earth-view-transform.ts',
  'features/orbit/earth-satellite.ts',
  'public/textures/earth-black-marble-8k.jpg',
  'public/textures/earth-blue-marble-8k.jpg',
  `${root}region-audit.mjs`,
  'docs/evidence/mediterranean-night/environment.json',
];
const sourceHashes = Object.fromEntries(
  await Promise.all(
    paths.map(async (p) => [
      p,
      createHash('sha256')
        .update(await fs.readFile(p))
        .digest('hex'),
    ]),
  ),
);
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const { createOrbitalEnvironment } = await bundle(paths[0]);
const { orientNightEarth } = await bundle(paths[1]);
const { data, info } = await sharp(paths[3])
  .resize(2048, 1024, { kernel: 'lanczos3' })
  .raw()
  .toBuffer({ resolveWithObject: true });
const day = await sharp(paths[4])
  .resize(2048, 1024, { kernel: 'lanczos3' })
  .removeAlpha()
  .raw()
  .toBuffer();
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const round = (x) => Math.round(x * 1e6) / 1e6;
const warm = new Float32Array(info.width * info.height),
  dark = new Uint8Array(warm.length),
  water = new Uint8Array(warm.length);
for (let p = 0; p < warm.length; p++) {
  const i = p * info.channels,
    r = data[i],
    g = data[i + 1],
    b = data[i + 2];
  warm[p] =
    clamp((r - b * 1.12 - 3) / 26, 0, 1) * clamp((r + g - 72) / 125, 0, 1);
  dark[p] = r + g < 72 ? 1 : 0;
  const j = p * 3,
    dr = day[j],
    dg = day[j + 1],
    db = day[j + 2];
  water[p] = db > dr * 1.18 + 5 && db > dg * 1.03 && dr < 105 ? 1 : 0;
}
const scenes = [];
for (const [width, height] of [
  [1280, 720],
  [2560, 600],
  [390, 844],
]) {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    cameraFov: 38,
    earthAppearance: 'night',
    earthTexture: new THREE.Texture({ width: 8192, height: 4096 }),
  });
  await env.ready;
  env.resize(width, height, 1);
  const earth = env.scene.getObjectByName('satellite-earth-surface').parent;
  const sets = {};
  for (const [name, columns, rows] of [
    ['coarse', 56, 18],
    ['fine', 168, 54],
  ]) {
    const points = [],
      weights = new Float64Array(15);
    let total = 0;
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const x = (column + 0.5) / columns,
          y = (row + 0.5) / rows;
        const dir = new THREE.Vector3(-1 + x * 2, -1 + y * 0.65, 0.5)
          .unproject(env.camera)
          .normalize();
        const hit = new THREE.Ray(new THREE.Vector3(), dir).intersectSphere(
          new THREE.Sphere(earth.position, 180),
          new THREE.Vector3(),
        );
        if (!hit) continue;
        const weight = 0.6 + (1 - y) * 0.4,
          tile =
            Math.min(4, Math.floor(x * 5)) + Math.min(2, Math.floor(y * 3)) * 5;
        points.push({
          normal: hit.sub(earth.position).normalize(),
          weight,
          tile,
        });
        weights[tile] += weight;
        total += weight;
      }
    sets[name] = { points, weights, total };
  }
  scenes.push({ env, earth, width, height, sets });
}
// Longitude is the periodic phase; direct current production orientation API.
function series(latitude, roll, grid = 'coarse', steps = 120) {
  return scenes.map(({ env, earth, width, height, sets }) => {
    orientNightEarth(THREE, earth, env.camera, {
      longitude: 0,
      latitude,
      roll,
    });
    const inv = earth.quaternion.clone().invert();
    const { points, weights, total } = sets[grid];
    const coords = points.map(({ normal, weight, tile }) => {
      const n = normal.clone().applyQuaternion(inv);
      return {
        u: Math.atan2(-n.z, n.x) / (2 * Math.PI) + 0.5,
        row: clamp(
          Math.floor((0.5 - Math.asin(n.y) / Math.PI) * info.height),
          0,
          info.height - 1,
        ),
        weight,
        tile,
      };
    });
    const values = [];
    for (let phase = 0; phase < steps; phase++) {
      let light = 0,
        energy = 0,
        darkArea = 0,
        waterArea = 0;
      const tiles = new Float64Array(15);
      for (const { u, row, weight, tile } of coords) {
        const moved = u + phase / steps,
          p =
            row * info.width +
            Math.floor((moved - Math.floor(moved)) * info.width);
        energy += warm[p] * weight;
        darkArea += dark[p] * weight;
        waterArea += water[p] * weight;
        if (warm[p] > 0.045) {
          light += weight;
          tiles[tile] += weight;
        }
      }
      let distributed = 0;
      for (let t = 0; t < 15; t++)
        if (weights[t] && tiles[t] / weights[t] >= 0.015)
          distributed += weights[t];
      const coverage = light / total,
        distribution = distributed / total;
      values.push([
        coverage,
        distribution,
        energy / total,
        darkArea / total,
        waterArea / total,
        coverage * (0.35 + 0.65 * distribution),
      ]);
    }
    return { size: [width, height], sampleCount: points.length, values };
  });
}
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const quantile = (xs, q) =>
  [...xs].sort((a, b) => a - b)[Math.floor(q * (xs.length - 1))];
const cycle2 = (Math.PI * 2) / 0.006;
function maxCyclicStreak(values, test) {
  let n = 0,
    best = 0;
  for (let i = 0; i < values.length * 2; i++) {
    n = test(values[i % values.length]) ? n + 1 : 0;
    best = Math.max(best, n);
  }
  return (Math.min(best, values.length) * cycle2) / values.length;
}
function summary(s) {
  const all = s.flatMap((x) => x.values),
    floors = s.map((x) =>
      quantile(
        x.values.map((r) => r[5]),
        0.1,
      ),
    );
  return {
    meanLight: mean(all.map((r) => r[0])),
    meanDistribution: mean(all.map((r) => r[1])),
    meanScore: mean(all.map((r) => r[5])),
    minLayoutTenthScore: Math.min(...floors),
    meanWaterProxy: mean(all.map((r) => r[4])),
    maxLowLightSeconds2x: Math.max(
      ...s.map((x) => maxCyclicStreak(x.values, (r) => r[0] < 0.01)),
    ),
    maxMostlyWaterProxySeconds2x: Math.max(
      ...s.map((x) => maxCyclicStreak(x.values, (r) => r[4] > 0.7)),
    ),
  };
}
function rankedPhase(s) {
  const a = summary(s);
  const scores = [];
  for (let longitude = -4; longitude <= 60; longitude += 2) {
    const phase = (longitude / 2 + 180) % 180;
    const opening = s.map((x) => x.values[phase]);
    const first = s.map((x) =>
      Array.from({ length: 32 }, (_, j) => x.values[(phase - j + 180) % 180]),
    );
    const openingFloor = Math.min(...opening.map((x) => x[5]));
    const openingMean = mean(opening.map((x) => x[5]));
    const earlyMean = mean(first.flat().map((x) => x[5]));
    const earlyFloor = Math.min(
      ...first.map((xs) =>
        quantile(
          xs.map((x) => x[5]),
          0.15,
        ),
      ),
    );
    const score =
      openingFloor * 0.35 +
      openingMean * 0.15 +
      earlyMean * 0.3 +
      earlyFloor * 0.1 +
      a.meanScore * 0.1;
    scores.push({
      longitude,
      score,
      openingFloor,
      openingMean,
      earlyMean,
      earlyFloor,
    });
  }
  return scores.sort((a, b) => b.score - a.score);
}
const sweep = [];
for (const latitude of [22, 27, 32, 38, 43, 48, 55])
  for (const roll of [-60, -45, -30, -15, 0, 15, 30, 45, 60, 90, 135, 180]) {
    const s = series(latitude, roll, 'coarse', 180),
      a = summary(s),
      phases = rankedPhase(s);
    sweep.push({
      latitude,
      roll,
      ...a,
      phase: phases[0],
      regionPhases: phases,
    });
  }
sweep.sort((a, b) => b.phase.score - a.phase.score);
await fs.writeFile(
  root + 'coarse-results.json',
  JSON.stringify({ sourceCommit, sourceHashes, cycle2, sweep }, null, 2) + '\n',
);
console.log(
  'COARSE',
  JSON.stringify(
    sweep.slice(0, 15).map(({ regionPhases: _regionPhases, ...c }) => c),
  ),
);
const seeds = [];
for (const c of sweep)
  if (
    !seeds.some(
      (s) =>
        Math.abs(s.latitude - c.latitude) < 8 && Math.abs(s.roll - c.roll) < 35,
    )
  ) {
    seeds.push(c);
    if (seeds.length === 10) break;
  }
const refined = [],
  seen = new Set();
for (const seed of seeds)
  for (const dl of [-3, 0, 3])
    for (const dr of [-7.5, 0, 7.5]) {
      const latitude = clamp(seed.latitude + dl, 22, 55),
        roll = clamp(seed.roll + dr, -60, 180),
        key = `${latitude},${roll}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const s = series(latitude, roll, 'coarse', 180),
        a = summary(s),
        phases = rankedPhase(s);
      refined.push({ latitude, roll, ...a, phase: phases[0] });
    }
refined.sort((a, b) => b.phase.score - a.phase.score);
console.log('REFINED', JSON.stringify(refined.slice(0, 30)));
const choices = [];
for (const c of refined)
  if (
    !choices.some(
      (s) =>
        Math.abs(s.latitude - c.latitude) < 6 && Math.abs(s.roll - c.roll) < 28,
    )
  ) {
    choices.push(c);
    if (choices.length === 12) break;
  }
// Exact historic settings are evaluated in the CURRENT transform, not claimed
// pixel-identical to historical framing, atmosphere, source resolution or motion.
for (const [longitude, latitude, roll] of [
  [18, 38, -12],
  [12, 48, -10],
  [25, 38, -12],
  [35, 38, -12],
  [45, 32, -12],
  [42, 30, 20],
  [50, 28, 20],
  [48, 35, -20],
  [22, 43, 0],
  [18, 38, 45],
  [18, 38, 135],
  [32, 30, 20],
  [35, 32, 20],
  [34, 32, 45],
])
  choices.push({ latitude, roll, phase: { longitude } });
const finalists = choices.map((c) => {
  const longitude = c.phase.longitude,
    s = series(c.latitude, c.roll, 'fine', 360),
    phase = (Math.round(longitude) + 360) % 360;
  const layouts = s.map(({ size, sampleCount, values }) => {
    const timeline = values.map((_, j) => [
      round((j * cycle2) / 360),
      ...values[(phase - j + 360) % 360].map(round),
    ]);
    const window = (seconds) => timeline.filter((r) => r[0] <= seconds);
    return {
      size,
      sampleCount,
      opening: timeline[0],
      first3Minutes: {
        meanLight: round(mean(window(180).map((r) => r[1]))),
        meanScore: round(mean(window(180).map((r) => r[6]))),
      },
      first5Minutes: {
        meanLight: round(mean(window(300).map((r) => r[1]))),
        meanScore: round(mean(window(300).map((r) => r[6]))),
      },
      maxLowLightSeconds2x: round(maxCyclicStreak(values, (r) => r[0] < 0.01)),
      maxMostlyWaterProxySeconds2x: round(
        maxCyclicStreak(values, (r) => r[4] > 0.7),
      ),
      timeline,
    };
  });
  return {
    opening: { longitude, latitude: c.latitude, roll: c.roll },
    ...summary(s),
    layouts,
  };
});
const output = {
  generatedAt: new Date().toISOString(),
  sourceCommit,
  sourceHashes,
  method: {
    nightTexture:
      '8K production JPEG filtered to2K in memory for sparse CPU sampling',
    dayTexture:
      '8K historical day JPEG filtered to2K, qualitative blue-water proxy only',
    rate: 0.006,
    cycleSeconds2x: cycle2,
    cycleSeconds3x: (cycle2 * 2) / 3,
    layouts: [
      [1280, 720],
      [2560, 600],
      [390, 844],
    ],
    screenNdcRectangle: [-1, -1, 1, -0.35],
    samples: { coarse: [56, 18], fine: [168, 54] },
    warm: 'clamp((red−1.12blue−3)/26,0,1) × clamp((red+green−72)/125,0,1), coverage threshold >.045',
    waterProxy:
      'Day blue>red×1.18+5 && blue>green×1.03 && red<105. Clouds, haze, shallow water and green terrain are misclassified. NOT a geographic land/ocean mask.',
    timelineColumns: [
      'secondsAt2x',
      'weightedWarmLightCoverage',
      'weightedPopulatedTileFraction',
      'weightedWarmSignal',
      'weightedDarkFraction',
      'dayBlueWaterProxy',
      'frameScore',
    ],
    score:
      'Frame: light coverage ×(.35+.65×distributed15tileFraction). Candidate: .35×worst-layout opening + .15×mean opening + .30×first3min mean + .10×worst-layout first3min15th percentile + .10×fullcycle mean. Longitudes bounded−4..60° at2° steps.',
    lowLightThreshold:
      '<1% warm coverage; not a calibrated human dimness threshold',
    sourceOrientation:
      'Current orientNightEarth(THREE,earth,camera,opening) direct call; longitude phase can vary opening but not complete-loop statistics.',
  },
  limitations: [
    'CPU proxies require rendered review and do not establish visual quality. Previously favored proxies disappointed the owner.',
    'Actual spacecraft occlusion, tone mapping, night material shading, atmosphere, hover, drag and room movement are omitted. Fixed overview crop only.',
    'Blue day-image threshold is not a reliable unlit-land classifier. We do not claim true land/water percentages or exact unlit-land durations.',
    'At3× the same path takes2/3 the listed2×times. Speed cannot remove ocean or empty geography, only change its duration.',
    'Art selection only; no runtime performance, memory, heat or battery measurements or benefits.',
  ],
  historicalReference: {
    longitude: 18,
    latitude: 38,
    roll: -12,
    note: 'Exact saved historical angles, evaluated in current orientation/framing; not a recreation of all historical appearance.',
  },
  coarseCount: sweep.length,
  refinedCount: refined.length,
  refined,
  finalists,
};
function serialize(value, depth = 0) {
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value) && value.every((x) => !x || typeof x !== 'object'))
    return JSON.stringify(value);
  const indent = '  '.repeat(depth),
    child = indent + '  ';
  if (Array.isArray(value))
    return (
      '[\n' +
      value.map((x) => child + serialize(x, depth + 1)).join(',\n') +
      '\n' +
      indent +
      ']'
    );
  return (
    '{\n' +
    Object.entries(value)
      .map(
        ([k, v]) => child + JSON.stringify(k) + ': ' + serialize(v, depth + 1),
      )
      .join(',\n') +
    '\n' +
    indent +
    '}'
  );
}
await fs.writeFile(root + 'region-audit.json', serialize(output) + '\n');
for (const s of scenes) s.env.dispose();
console.log(
  'FINAL',
  JSON.stringify(
    finalists.map(({ layouts, ...f }) => ({
      ...f,
      layouts: layouts.map(({ timeline: _timeline, ...l }) => l),
    })),
    null,
    2,
  ),
);
