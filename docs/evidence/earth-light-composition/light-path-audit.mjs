/** CPU-only night-Earth composition audit. Run from the repository root:
 * node docs/evidence/earth-light-composition/light-path-audit.mjs
 * The pixel/tile measures rank candidates for a subsequent rendered art review;
 * they are neither lighting simulation nor performance measurements.
 */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import sharp from 'sharp';
import * as THREE from 'three';

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
  'docs/evidence/earth-light-composition/light-path-audit.mjs',
];
const sourceHashesAtStart = Object.fromEntries(
  await Promise.all(
    paths.map(async (path) => [
      path,
      createHash('sha256')
        .update(await fs.readFile(path))
        .digest('hex'),
    ]),
  ),
);
const sourceCommitAtStart = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const { createOrbitalEnvironment } = await bundle(paths[0]);
const { NIGHT_EARTH_OPENING, orientNightEarth } = await bundle(paths[1]);
const { data, info } = await sharp(paths[3])
  .resize(2048, 1024, { kernel: 'lanczos3' })
  .raw()
  .toBuffer({ resolveWithObject: true });
const layouts = [
  [1280, 720],
  [2560, 600],
  [390, 844],
];
const sizes = { coarse: [72, 22], refined: [144, 44] };
const windowEnds = [180, 300, 600];
const dt = 20;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const round = (x) => Math.round(x * 1e6) / 1e6;

// Filtered 2K sampling integrates tiny bright towns more consistently than a
// sparse nearest-pixel grid on the 8K texture. The production asset is untouched.
const warm = new Float32Array(info.width * info.height);
const dark = new Uint8Array(warm.length);
for (let p = 0; p < warm.length; p++) {
  const i = p * info.channels,
    r = data[i],
    g = data[i + 1],
    b = data[i + 2];
  const warmth = clamp((r - b * 1.12 - 3) / 26, 0, 1);
  const intensity = clamp((r + g - 72) / 125, 0, 1);
  warm[p] = warmth * intensity;
  dark[p] = r + g < 72 ? 1 : 0;
}
function basis({ longitude, latitude }) {
  const lon = (longitude * Math.PI) / 180,
    lat = (latitude * Math.PI) / 180;
  const normal = new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    -Math.cos(lat) * Math.sin(lon),
  );
  const east = new THREE.Vector3(-Math.sin(lon), 0, -Math.cos(lon));
  return {
    normal,
    matrix: new THREE.Matrix4().makeBasis(
      east,
      new THREE.Vector3().crossVectors(normal, east),
      normal,
    ),
  };
}
function orientCandidate(earth, camera, opening) {
  orientNightEarth(THREE, earth, camera);
  const current = basis(NIGHT_EARTH_OPENING),
    candidate = basis(opening);
  const normal = current.normal.clone().applyQuaternion(earth.quaternion);
  earth.quaternion.multiply(
    new THREE.Quaternion().setFromRotationMatrix(
      current.matrix.multiply(candidate.matrix.transpose()),
    ),
  );
  earth.quaternion.premultiply(
    new THREE.Quaternion().setFromAxisAngle(
      normal,
      ((opening.roll - NIGHT_EARTH_OPENING.roll) * Math.PI) / 180,
    ),
  );
}
const scenes = [];
for (const [width, height] of layouts) {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    cameraFov: 38,
    earthAppearance: 'night',
    earthTexture: new THREE.Texture({ width: 8192, height: 4096 }),
  });
  await env.ready;
  env.resize(width, height, 1);
  const earth = env.scene.getObjectByName('satellite-earth-surface').parent;
  const sampleSets = {};
  for (const [name, [columns, rows]] of Object.entries(sizes)) {
    const points = [];
    const weights = new Float64Array(15);
    let totalWeight = 0;
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
        const weight = 0.6 + (1 - y) * 0.4;
        const tile =
          Math.min(4, Math.floor(x * 5)) + Math.min(2, Math.floor(y * 3)) * 5;
        points.push({
          normal: hit.sub(earth.position).normalize(),
          weight,
          tile,
        });
        totalWeight += weight;
        weights[tile] += weight;
      }
    sampleSets[name] = { points, weights, totalWeight };
  }
  scenes.push({ env, earth, width, height, sampleSets });
}
function evaluate(opening, rate, sampling = 'coarse', finalSeconds = 600) {
  const results = [];
  for (const { env, earth, width, height, sampleSets } of scenes) {
    orientCandidate(earth, env.camera, opening);
    const inverse = earth.quaternion.clone().invert();
    const { points, weights, totalWeight } = sampleSets[sampling];
    const coords = points.map(({ normal, weight, tile }) => {
      const n = normal.clone().applyQuaternion(inverse);
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
    const timeline = [];
    for (let seconds = 0; seconds <= finalSeconds; seconds += dt) {
      let energy = 0,
        lightArea = 0,
        darkArea = 0;
      const tileLight = new Float64Array(15);
      for (const { u, row, weight, tile } of coords) {
        const movedU = u - (seconds * rate) / (2 * Math.PI);
        const p =
          row * info.width +
          Math.floor((movedU - Math.floor(movedU)) * info.width);
        energy += warm[p] * weight;
        if (warm[p] > 0.045) {
          lightArea += weight;
          tileLight[tile] += weight;
        }
        darkArea += dark[p] * weight;
      }
      let distributedWeight = 0;
      for (let t = 0; t < 15; t++)
        if (weights[t] && tileLight[t] / weights[t] >= 0.015)
          distributedWeight += weights[t];
      // Separate the raw terms: an isolated bright coast cannot hide extensive
      // empty foreground by merely having a few saturated city pixels.
      const coverage = lightArea / totalWeight,
        distribution = distributedWeight / totalWeight;
      const score = coverage * (0.35 + 0.65 * distribution);
      timeline.push([
        seconds,
        round(coverage),
        round(distribution),
        round(energy / totalWeight),
        round(darkArea / totalWeight),
        round(score),
      ]);
    }
    const windows = windowEnds.map((end) => {
      const rows = timeline.filter((row) => row[0] <= end),
        len = rows.length;
      const mean = (index) =>
        rows.reduce((sum, row) => sum + row[index], 0) / len;
      let worst60SecondScore = Infinity,
        worstStart = 0;
      for (let i = 0; i + 3 < len; i++) {
        const score =
          rows.slice(i, i + 4).reduce((sum, row) => sum + row[5], 0) / 4;
        if (score < worst60SecondScore) {
          worst60SecondScore = score;
          worstStart = rows[i][0];
        }
      }
      return [
        end,
        round(mean(1)),
        round(mean(2)),
        round(mean(3)),
        round(mean(4)),
        round(mean(5)),
        round(worst60SecondScore),
        worstStart,
      ];
    });
    results.push({
      size: [width, height],
      sampleCount: coords.length,
      opening: timeline[0],
      windows,
      timeline,
    });
  }
  const scores = windowEnds.map((end, i) => {
    const worst = Math.min(...results.map((r) => r.windows[i][6]));
    const mean =
      results.reduce((sum, r) => sum + r.windows[i][5], 0) / results.length;
    const openingFloor = Math.min(...results.map((r) => r.opening[5]));
    return round(worst * 0.55 + mean * 0.3 + openingFloor * 0.15);
  });
  return { opening, rate, scores, layouts: results };
}
const comparisons = [];
const candidateKeys = new Set();
function add(opening, rate, sampling) {
  const key = `${opening.longitude},${opening.latitude},${opening.roll},${rate},${sampling}`;
  if (candidateKeys.has(key)) return;
  candidateKeys.add(key);
  const c = evaluate(opening, rate, sampling);
  comparisons.push(c);
  return c;
}
// Broad candidates cover North America, Europe, India and East Asia. The spin
// remains positive and continuous in every candidate; no favorite-patch loop.
for (const longitude of [
  -135, -120, -105, -90, -75, -60, 0, 15, 30, 45, 60, 75, 90, 105, 120, 135,
])
  for (const latitude of [10, 20, 30, 40, 50, 55])
    for (const roll of [-45, -30, -15, 0, 15, 30, 45])
      for (const rate of [0.003, 0.001])
        add({ longitude, latitude, roll }, rate, 'coarse');
console.log(
  'Coarse winners',
  JSON.stringify(
    [0.003, 0.001].map((rate) => ({
      rate,
      top: comparisons
        .filter((c) => c.rate === rate)
        .sort((a, b) => b.scores[1] - a.scores[1])
        .slice(0, 4)
        .map(({ opening, scores }) => ({ opening, scores })),
    })),
  ),
);
const coarseResults = comparisons.map((c) => [
  c.opening.longitude,
  c.opening.latitude,
  c.opening.roll,
  c.rate,
  ...c.scores,
]);
// Refine around the leading orientations for both 5- and 10-minute objectives.
const seeds = [];
for (const rate of [0.003, 0.001])
  for (const index of [1, 2]) {
    seeds.push(
      ...comparisons
        .filter((c) => c.rate === rate)
        .sort((a, b) => b.scores[index] - a.scores[index])
        .slice(0, 2),
    );
  }
const refined = [];
for (const seed of seeds)
  for (const dlon of [-7.5, 0, 7.5])
    for (const dlat of [-5, 0, 5])
      for (const droll of [-7.5, 0, 7.5]) {
        const opening = {
          longitude: seed.opening.longitude + dlon,
          latitude: clamp(seed.opening.latitude + dlat, 10, 55),
          roll: seed.opening.roll + droll,
        };
        const c = add(opening, seed.rate, 'refined');
        if (c) refined.push(c);
      }
const retained = [
  evaluate({ longitude: 110, latitude: 30, roll: -12 }, 0.003, 'refined'),
  evaluate({ longitude: 110, latitude: 30, roll: -12 }, 0.001, 'refined'),
  evaluate({ longitude: 18, latitude: 38, roll: -12 }, 0.003, 'refined'),
];
for (const rate of [0.003, 0.001])
  for (const index of [0, 1, 2]) {
    for (const c of refined
      .filter((c) => c.rate === rate)
      .sort((a, b) => b.scores[index] - a.scores[index])
      .slice(0, 2))
      if (!retained.includes(c)) retained.push(c);
  }
for (const c of retained)
  c.fullRevolution = evaluate(
    c.opening,
    c.rate,
    'refined',
    Math.ceil((Math.PI * 2) / c.rate / dt) * dt,
  ).layouts.map(({ size, timeline }) => ({
    size,
    minimumLightCoverage: Math.min(...timeline.map((r) => r[1])),
    minimumScore: Math.min(...timeline.map((r) => r[5])),
    firstBelowOnePercentCoverage:
      timeline.find((r) => r[1] < 0.01)?.[0] ?? null,
  }));
const sourcesUnchanged = Object.fromEntries(
  await Promise.all(
    paths.map(async (path) => [
      path,
      sourceHashesAtStart[path] ===
        createHash('sha256')
          .update(await fs.readFile(path))
          .digest('hex'),
    ]),
  ),
);
const output = {
  generatedAt: new Date().toISOString(),
  sourceCommitAtStart,
  historicalBaselineCommit: execFileSync('git', ['rev-parse', 'baa290b'], {
    encoding: 'utf8',
  }).trim(),
  historicalBaselineOpening: { longitude: 110, latitude: 30, roll: -12 },
  sourceHashesAtStart,
  sourcesUnchanged,
  deliveredOpeningAtStart: NIGHT_EARTH_OPENING,
  method: {
    lensDegrees: 38,
    imageSampling:
      'Lanczos3-filter the unchanged source JPEG to 2048×1024 in memory, then sample nearest texel. This integrates small lights better than nearest 8K point sampling; this is an audit approximation, not a shipped texture change.',
    screenNdcRectangle: [-1, -1, 1, -0.35],
    sampleSizes: sizes,
    timeStepSeconds: dt,
    windowEnds,
    weight:
      '0.6 + 0.4 × (1 − normalized rectangle y): foreground bottom receives more weight than horizon. Actual spacecraft silhouette is not masked.',
    warmSignal:
      'clamp((red − 1.12×blue − 3)/26,0,1) × clamp((red + green − 72)/125,0,1), in 8-bit sRGB; threshold >0.045 for coverage.',
    distribution:
      'Divide foreground into 5 columns ×3 rows. A tile is populated when ≥1.5% of its retained sphere samples pass the warm-light threshold. Sum the screen-sample weights of populated tiles; divide by total weights.',
    darkFraction:
      'Weighted fraction with red+green<72. Context only, not land/ocean classification.',
    frameScore:
      'weighted light coverage ×(0.35 +0.65×spatial distribution). Penalizes bright narrow slivers surrounded by empty foreground.',
    objective:
      '0.55×minimum 60-second rolling mean frame score across all three layouts +0.30×mean frame score across all layouts and time samples +0.15×weakest opening frame score. Separate 3-,5-,10-minute scores retained.',
    timelineColumns: [
      'seconds',
      'weightedWarmLightCoverage',
      'weightedPopulatedTileFraction',
      'weightedWarmSignal',
      'weightedDarkFraction',
      'frameScore',
    ],
    windowColumns: [
      'endSeconds',
      'meanLightCoverage',
      'meanTileFraction',
      'meanWarmSignal',
      'meanDarkFraction',
      'meanFrameScore',
      'worst60SecondFrameScore',
      'worstWindowStart',
    ],
    compactCandidateColumns: [
      'longitude',
      'latitude',
      'roll',
      'radiansPerSecond',
      'threeMinuteScore',
      'fiveMinuteScore',
      'tenMinuteScore',
    ],
    motionTradeoff:
      '0.003 rad/s is delivered speed (~34.9-minute revolution). 0.001 is an explicitly slower artistic alternative (~104.7-minute revolution); it stretches the chosen city-light pass threefold but cannot remove dark geography. No timing/performance benefit is claimed.',
  },
  coarseCandidateCount: coarseResults.length,
  refinedCandidateCount: refined.length,
  coarseResults,
  refinedResults: refined.map((c) => [
    c.opening.longitude,
    c.opening.latitude,
    c.opening.roll,
    c.rate,
    ...c.scores,
  ]),
  finalists: retained,
  limitations: [
    'CPU composition proxies require actual rendered visual review; saturated lights, thin coasts, source artifact and deserts can still fool color thresholds.',
    'No spacecraft occlusion, atmosphere, display/tone mapping, drag/hover, room movement or animation-transition evaluation. All three are nominal overview layouts at production lens, not every screen.',
    'No orientation fixes the full rotating globe forever: every latitude band includes lightly populated terrain and ocean. Full-revolution minimum and first dim sample are reported for retained candidates.',
    '20-second time sampling is approximate. Three/5/10-minute summaries cannot establish continuous stability between samples. The warm detector is not a geographic city mask.',
    'This is art selection, not performance work: no GPU/CPU frame timing, memory, battery or heat gain is implied.',
  ],
};
// Keep numeric raw rows compact, with named objects still easy to inspect.
function serialize(value, depth = 0) {
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  if (
    Array.isArray(value) &&
    value.every((item) => !item || typeof item !== 'object')
  )
    return JSON.stringify(value);
  const indent = '  '.repeat(depth),
    childIndent = indent + '  ';
  if (Array.isArray(value))
    return (
      '[\n' +
      value
        .map((item) => childIndent + serialize(item, depth + 1))
        .join(',\n') +
      '\n' +
      indent +
      ']'
    );
  return (
    '{\n' +
    Object.entries(value)
      .map(
        ([key, item]) =>
          childIndent + JSON.stringify(key) + ': ' + serialize(item, depth + 1),
      )
      .join(',\n') +
    '\n' +
    indent +
    '}'
  );
}
await fs.writeFile(
  'docs/evidence/earth-light-composition/light-path-audit.json',
  serialize(output) + '\n',
);
for (const s of scenes) s.env.dispose();
console.log(
  JSON.stringify(
    retained.map(({ opening, rate, scores, layouts, fullRevolution }) => ({
      opening,
      rate,
      scores,
      layouts: layouts.map(({ size, opening, windows }) => ({
        size,
        opening,
        windows,
      })),
      fullRevolution,
    })),
    null,
    2,
  ),
);
