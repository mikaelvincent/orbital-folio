/** CPU-only geographic composition comparison. Run from the repository root:
 * node docs/evidence/sky-land-composition/earth-land-audit.mjs
 * No browser, texture changes, network access or performance measurements.
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
const { createOrbitalEnvironment } = await bundle(
  'features/orbit/orbital-environment.ts',
);
const { NIGHT_EARTH_OPENING, orientNightEarth } = await bundle(
  'features/orbit/earth-view-transform.ts',
);
const asset = 'public/textures/earth-black-marble-8k.jpg';
const { data, info } = await sharp(asset)
  .raw()
  .toBuffer({ resolveWithObject: true });
const layouts = [
  [1280, 720],
  [2560, 600],
  [390, 844],
];
const radius = 180;
const sampleColumns = 112,
  sampleRows = 32;
const rotationRate = 0.003;
const earthSamples = [];

function localBasis({ longitude, latitude }) {
  const lon = THREE.MathUtils.degToRad(longitude),
    lat = THREE.MathUtils.degToRad(latitude);
  const normal = new THREE.Vector3(
    Math.cos(lat) * Math.cos(lon),
    Math.sin(lat),
    -Math.cos(lat) * Math.sin(lon),
  );
  const east = new THREE.Vector3(-Math.sin(lon), 0, -Math.cos(lon));
  const north = new THREE.Vector3().crossVectors(normal, east);
  return { normal, matrix: new THREE.Matrix4().makeBasis(east, north, normal) };
}

// Reuse production horizon placement and opening orientation, then change only
// the geographic basis/roll. No duplicate responsive horizon implementation.
function orientCandidate(earth, camera, opening) {
  orientNightEarth(THREE, earth, camera);
  const current = localBasis(NIGHT_EARTH_OPENING),
    candidate = localBasis(opening);
  const anchorNormal = current.normal.clone().applyQuaternion(earth.quaternion);
  earth.quaternion.multiply(
    new THREE.Quaternion().setFromRotationMatrix(
      current.matrix.multiply(candidate.matrix.transpose()),
    ),
  );
  earth.quaternion.premultiply(
    new THREE.Quaternion().setFromAxisAngle(
      anchorNormal,
      THREE.MathUtils.degToRad(opening.roll - NIGHT_EARTH_OPENING.roll),
    ),
  );
}

for (const [width, height] of layouts) {
  const env = createOrbitalEnvironment(THREE, () => {}, {
    cameraFov: 38,
    earthAppearance: 'night',
    earthTexture: new THREE.Texture({ width: 8192, height: 4096 }),
  });
  await env.ready;
  env.resize(width, height, 1);
  const earth = env.scene.getObjectByName('satellite-earth-surface').parent;
  const normals = [];
  for (let row = 0; row < sampleRows; row++) {
    for (let column = 0; column < sampleColumns; column++) {
      const direction = new THREE.Vector3(
        -1 + ((column + 0.5) * 2) / sampleColumns,
        -1 + ((row + 0.5) * 0.65) / sampleRows,
        0.5,
      )
        .unproject(env.camera)
        .normalize();
      const hit = new THREE.Ray(new THREE.Vector3(), direction).intersectSphere(
        new THREE.Sphere(earth.position, radius),
        new THREE.Vector3(),
      );
      if (hit) normals.push(hit.sub(earth.position).normalize());
    }
  }
  earthSamples.push({ env, earth, normals, width, height });
}

function pixel(normal) {
  const longitude = Math.atan2(-normal.z, normal.x),
    latitude = Math.asin(normal.y);
  const x = Math.min(
    info.width - 1,
    Math.max(0, Math.floor((longitude / (Math.PI * 2) + 0.5) * info.width)),
  );
  const y = Math.min(
    info.height - 1,
    Math.max(0, Math.floor((0.5 - latitude / Math.PI) * info.height)),
  );
  const index = (y * info.width + x) * info.channels;
  return [data[index], data[index + 1], data[index + 2]];
}

function compare(opening) {
  return {
    opening,
    layouts: earthSamples.map(({ env, earth, normals, width, height }) => {
      orientCandidate(earth, env.camera, opening);
      const inverse = earth.quaternion.clone().invert();
      const local = normals.map((normal) =>
        normal.clone().applyQuaternion(inverse),
      );
      const timeline = [];
      for (let elapsed = 0; elapsed <= 1200; elapsed += 20) {
        let land = 0,
          warmLights = 0,
          brightness = 0;
        const spin = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          -elapsed * rotationRate,
        );
        for (const normal of local) {
          const [red, green, blue] = pixel(
            normal.clone().applyQuaternion(spin),
          );
          if (blue > 22 || red > 28) land++;
          if (red > 50 && red > 1.08 * blue) warmLights++;
          brightness += red + green;
        }
        timeline.push([
          elapsed,
          land / local.length,
          warmLights / local.length,
          brightness / local.length,
        ]);
      }
      const firstFiveMinutes = timeline.filter(([elapsed]) => elapsed <= 300);
      return {
        width,
        height,
        samples: local.length,
        firstBelow40PercentLandProxySeconds:
          timeline.find((row) => row[1] < 0.4)?.[0] ?? null,
        firstFiveMinuteMeanLandProxy:
          firstFiveMinutes.reduce((sum, row) => sum + row[1], 0) /
          firstFiveMinutes.length,
        firstFiveMinuteMeanWarmLightProxy:
          firstFiveMinutes.reduce((sum, row) => sum + row[2], 0) /
          firstFiveMinutes.length,
        timeline,
      };
    }),
  };
}

const comparisons = [];
for (const latitude of [30, 34, 38, 42]) {
  for (const longitude of [18, 100, 110, 115, 120, 125]) {
    for (const roll of [-12, 0, 12])
      comparisons.push(compare({ longitude, latitude, roll }));
  }
}
const sources = {};
for (const path of [
  asset,
  'features/orbit/earth-view-transform.ts',
  'features/orbit/orbital-environment.ts',
]) {
  sources[path] = createHash('sha256')
    .update(await fs.readFile(path))
    .digest('hex');
}
const output = {
  generatedAt: new Date().toISOString(),
  baselineCommit: execFileSync('git', ['rev-parse', '29ffee1'], {
    encoding: 'utf8',
  }).trim(),
  baselineOpening: { longitude: 18, latitude: 38, roll: -12 },
  deliveredOpening: NIGHT_EARTH_OPENING,
  sources,
  method: {
    lensDegrees: 38,
    rotationRadiansPerSecond: rotationRate,
    activeTimeRangeSeconds: [0, 1200],
    activeTimeStepSeconds: 20,
    sampleColumns,
    sampleRows,
    screenNdcRectangle: [-1, -1, 1, -0.35],
    sampling:
      'Uniform screen grid, retain first ray/sphere intersection; nearest source JPEG pixel after inverse globe transform and rotation.',
    landColorProxy:
      '8-bit sRGB blue > 22 OR red > 28. Distinguishes the photograph’s nearly uniform dark ocean from brighter terrain; not an authoritative coastline or land mask.',
    warmLightProxy:
      '8-bit sRGB red > 50 AND red > 1.08 × blue. A rough city-light/detail proxy, not measured geographic population or a complete light detector.',
    timelineColumns: [
      'activeSeconds',
      'landColorProxyFraction',
      'warmLightProxyFraction',
      'meanRedPlusGreen8Bit',
    ],
  },
  selection:
    '110°E / 30°N / −12° balances the initial city-light pattern with a long Eurasian land pass. More eastern starts delay the Atlantic slightly longer but open with more ocean, particularly in portrait. Higher latitudes add terrain but reduce warm lights. This selection is subject to separate rendered visual review.',
  limitations: [
    'CPU geographic comparison only; no GPU, frame-time, heat or battery claim.',
    'No spacecraft occlusion, atmosphere, tone/display response, camera hover/drag or room travel in this comparison.',
    'Measures nominal overview across three layout shapes, not every possible screen or camera.',
    'Thresholds are visual proxies specific to this unchanged night photograph; reported fractions are approximate, not exact land coverage.',
    'Nearest-pixel grid sampling and 20-second time steps limit precision; first-below threshold times can vary by up to one sample interval and need not represent continuous ocean.',
    'All original physical rotation remains. A full revolution takes about 34.9 minutes and still includes oceans; this delays ocean-heavy views, it does not remove them.',
    'Exploratory 42°-lens pass was superseded by this 38° production-lens run and is not used for the reported comparison.',
  ],
  comparisons,
};
await fs.writeFile(
  'docs/evidence/sky-land-composition/earth-land-audit.json',
  JSON.stringify(output, null, 2) + '\n',
);
for (const sample of earthSamples) sample.env.dispose();
for (const opening of [output.baselineOpening, output.deliveredOpening]) {
  const result = comparisons.find(
    (candidate) =>
      JSON.stringify(candidate.opening) === JSON.stringify(opening),
  );
  console.log(
    JSON.stringify(
      {
        opening,
        layouts: result.layouts.map(
          ({ width, height, samples, timeline, ...summary }) => ({
            width,
            height,
            samples,
            opening: timeline[0],
            ...summary,
          }),
        ),
      },
      null,
      2,
    ),
  );
}
