/** CPU art survey, not a rendering/performance benchmark.
 * node scripts/benchmarks/regional-earth-light-audit.mjs [--out PATH]
 * Uses native decoded pixels (no resizing) and the source-identified physical
 * cameras in coverage.json. Values rank frames for a subsequent visual review.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';
import sharp from 'sharp';
import * as THREE from 'three';

const coveragePath = 'docs/evidence/europe-regional-loop/coverage.json';
const outputIndex = process.argv.indexOf('--out');
const output = resolve(
  outputIndex < 0
    ? 'docs/evidence/europe-regional-loop/light-coverage.json'
    : process.argv[outputIndex + 1],
);
const coverage = JSON.parse(await readFile(coveragePath, 'utf8'));
const sources = [
  'features/orbit/orbital-environment.ts',
  'features/orbit/earth-view-transform.ts',
  'features/orbit/earth-satellite.ts',
  'scripts/benchmarks/regional-earth-light-audit.mjs',
  coveragePath,
];
const hash = (data) => createHash('sha256').update(data).digest('hex');
const sourceHashes = Object.fromEntries(
  await Promise.all(
    sources.map(async (path) => [path, hash(await readFile(path))]),
  ),
);
const bundle = await build({
  entryPoints: [sources[0]],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const { createOrbitalEnvironment } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);
const rate = 0.0045;
const sourceWidth = 8192,
  sourceHeight = 4096;
const assetDefinitions = [
  {
    name: 'baseline',
    path: 'public/textures/earth-black-marble-8k.jpg',
    cropX: 0,
    cropY: 0,
    width: 8192,
    height: 4096,
  },
  {
    name: 'regional',
    path: 'public/textures/earth-europe-loop.webp',
    cropX: 3712,
    cropY: 128,
    width: 4096,
    height: 3072,
  },
];
const assets = [];
for (const definition of assetDefinitions) {
  let bytes,
    provenance = 'working-tree asset';
  try {
    bytes = await readFile(definition.path);
  } catch (error) {
    if (definition.name !== 'baseline' || error.code !== 'ENOENT') throw error;
    bytes = execFileSync('git', ['show', `c645c83:${definition.path}`], {
      maxBuffer: 16 * 1024 * 1024,
    });
    provenance = 'Git c645c83 baseline asset';
  }
  const { data, info } = await sharp(bytes)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    info.width !== definition.width ||
    info.height !== definition.height ||
    info.channels !== 3
  )
    throw new Error(
      `Unexpected decoded dimensions/channels for ${definition.name}`,
    );
  assets.push({
    ...definition,
    data,
    hash: hash(bytes),
    encodedBytes: bytes.length,
    provenance,
    periodSeconds: ((definition.width / sourceWidth) * Math.PI * 2) / rate,
  });
}
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const modulo = (value, period) => ((value % period) + period) % period;
const round = (value) => Math.round(value * 1e8) / 1e8;
const selected = coverage.samples.filter(
  ({ viewport, state, angles }) =>
    ((viewport[0] === 1280 && viewport[1] === 720) ||
      (viewport[0] === 390 && viewport[1] === 844)) &&
    (state === 'overview/neutral' ||
      (state === 'overview/drag' && angles[0] === -0.18 && angles[1] === 0)),
);
const environment = createOrbitalEnvironment(THREE, () => {}, {
  cameraFov: 38,
  earthTexture: new THREE.Texture({ width: 4096, height: 3072 }),
});
await environment.ready;
const earth = environment.scene.getObjectByName(
  'satellite-earth-surface',
).parent;
const scenarios = [];
for (const record of selected) {
  const [width, height] = record.viewport;
  environment.resize(width, height, 1);
  environment.camera.position.fromArray(record.camera.position);
  environment.camera.quaternion.fromArray(record.camera.quaternion);
  environment.camera.updateMatrixWorld(true);
  const camera = environment.camera;
  const inverse = earth.quaternion.clone().invert();
  const origin = camera.position.clone();
  const ray = new THREE.Ray(origin),
    sphere = new THREE.Sphere(earth.position, 180);
  const direction = new THREE.Vector3(),
    point = new THREE.Vector3();
  const columns = width > height ? 320 : 180;
  const rows = Math.round((columns * height) / width);
  const coordinates = [];
  const tileCounts = new Uint32Array(15);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      direction
        .set(((x + 0.5) / columns) * 2 - 1, 1 - ((y + 0.5) / rows) * 2, 0.5)
        .unproject(camera)
        .sub(origin)
        .normalize();
      ray.direction.copy(direction);
      if (!ray.intersectSphere(sphere, point)) continue;
      point.sub(earth.position).normalize().applyQuaternion(inverse);
      const u = Math.atan2(-point.z, point.x) / (Math.PI * 2) + 0.5;
      const v = 0.5 - Math.asin(clamp(point.y, -1, 1)) / Math.PI;
      const tile =
        Math.min(4, Math.floor((x / columns) * 5)) +
        5 * Math.min(2, Math.floor((y / rows) * 3));
      coordinates.push({
        sourceX: u * sourceWidth,
        sourceY: v * sourceHeight,
        tile,
      });
      tileCounts[tile]++;
    }
  const sourceSampleCount = coordinates.length;
  function evaluate(asset, seconds) {
    const shift = ((-seconds * rate) / (Math.PI * 2)) * sourceWidth;
    let warmLight = 0,
      dark = 0,
      warmthSum = 0,
      luminanceSum = 0;
    const thresholdCounts = [0, 0, 0, 0];
    const thresholds = [32, 48, 64, 96];
    const tileLight = new Uint32Array(15);
    for (const coordinate of coordinates) {
      const x = modulo(
        coordinate.sourceX + shift - asset.cropX - 0.5,
        asset.width,
      );
      const y = clamp(
        coordinate.sourceY - asset.cropY - 0.5,
        0,
        asset.height - 1,
      );
      const left = Math.floor(x),
        right = (left + 1) % asset.width;
      const top = Math.floor(y),
        bottom = Math.min(top + 1, asset.height - 1);
      const fx = x - left,
        fy = y - top;
      const sampleChannel = (channel) => {
        const a = asset.data[(top * asset.width + left) * 3 + channel];
        const b = asset.data[(top * asset.width + right) * 3 + channel];
        const c = asset.data[(bottom * asset.width + left) * 3 + channel];
        const d = asset.data[(bottom * asset.width + right) * 3 + channel];
        return (
          (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
        );
      };
      const r = sampleChannel(0),
        g = sampleChannel(1),
        b = sampleChannel(2);
      const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
      for (let i = 0; i < thresholds.length; i++)
        if (luminance >= thresholds[i]) thresholdCounts[i]++;
      const warmth =
        clamp((r - b * 1.12 - 3) / 26, 0, 1) * clamp((r + g - 72) / 125, 0, 1);
      if (warmth > 0.045) {
        warmLight++;
        tileLight[coordinate.tile]++;
      }
      if (r + g < 72) dark++;
      warmthSum += warmth;
      luminanceSum += luminance;
    }
    const occupiedWeight = tileCounts.reduce(
      (sum, count, tile) =>
        sum + (count && tileLight[tile] / count >= 0.015 ? count : 0),
      0,
    );
    return {
      seconds: round(seconds),
      warmLightFraction: round(warmLight / sourceSampleCount),
      darkRedGreenFraction: round(dark / sourceSampleCount),
      meanWarmthProxy: round(warmthSum / sourceSampleCount),
      meanEncodedBrightness: round(luminanceSum / sourceSampleCount),
      distributedLightFraction: round(occupiedWeight / sourceSampleCount),
      encodedBrightnessAtLeast: Object.fromEntries(
        thresholds.map((threshold, i) => [
          threshold,
          round(thresholdCounts[i] / sourceSampleCount),
        ]),
      ),
    };
  }
  const variants = {};
  for (const asset of assets) {
    const regularTimes = Array.from(
      { length: 49 },
      (_, i) => (i / 48) * asset.periodSeconds,
    );
    const commonTimes = [
      0, 30, 60, 120, 180, 240, 300, 360, 480, 600, 698.1317007977318, 720, 900,
      1200, 1396.2634015954636,
    ];
    const times = [...new Set([...regularTimes, ...commonTimes])].sort(
      (a, b) => a - b,
    );
    const timeline = times.map((seconds) => ({
      ...evaluate(asset, seconds),
      cycleSample: regularTimes.includes(seconds),
      commonSample: commonTimes.includes(seconds),
    }));
    const cycle = timeline.filter((frame) => frame.cycleSample);
    const ranked = [...cycle].sort(
      (a, b) => a.warmLightFraction - b.warmLightFraction,
    );
    const minimum = ranked[0],
      median = ranked[Math.floor(ranked.length / 2)],
      maximum = ranked.at(-1);
    let longestBelowOnePercentSamples = 0,
      ongoing = 0;
    for (const frame of cycle) {
      ongoing = frame.warmLightFraction < 0.01 ? ongoing + 1 : 0;
      longestBelowOnePercentSamples = Math.max(
        longestBelowOnePercentSamples,
        ongoing,
      );
    }
    variants[asset.name] = {
      periodSeconds: asset.periodSeconds,
      cycleSummary: {
        minimum,
        median,
        maximum,
        meanWarmLightFraction: round(
          cycle.reduce((sum, frame) => sum + frame.warmLightFraction, 0) /
            cycle.length,
        ),
        belowOnePercentSampleFraction: round(
          cycle.filter((frame) => frame.warmLightFraction < 0.01).length /
            cycle.length,
        ),
        longestBelowOnePercentSampleSpanSeconds: round(
          (Math.max(0, longestBelowOnePercentSamples - 1) *
            asset.periodSeconds) /
            48,
        ),
        continuousDurationCaveat:
          'Span between finite consecutive low samples; not a proof that every intervening frame is below threshold. Cyclic runs crossing the first/last sample are not joined.',
      },
      timeline,
    };
  }
  scenarios.push({
    viewport: record.viewport,
    state: record.state,
    angles: record.angles,
    camera: record.camera,
    samplingGrid: [columns, rows],
    sphereRayHits: sourceSampleCount,
    sphereScreenFraction: round(sourceSampleCount / (columns * rows)),
    variants,
  });
}
environment.dispose();
const report = {
  createdAt: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  sourceHashes,
  angularRate: rate,
  assets: assets.map(({ data: _data, ...asset }) => asset),
  method: [
    'Native8192x4096 JPEG and4096x3072 WebP decoded with sharp into RGB. No source resize/downsample. Bilinear sampling preserves continuous source coordinates.',
    'Analytic sphere intersections through physical cameras from coverage.json. No spacecraft occlusion, atmosphere, tone mapping, mipmapping, anisotropic filtering or browser rendering.',
    'Pixel grid is uniform in screen space. All in-frustum sphere samples are equally weighted; this is not a latitude/longitude area average.',
    'Warm-light proxy follows the earlier light-path audit formula: clamp((R-1.12B-3)/26)*clamp((R+G-72)/125) >0.045. It is not a physical city/light classification.',
    'Brightness thresholds use0.2126R+0.7152G+0.0722B on encoded byte RGB, not radiometric linear luminance. DarkRedGreen uses R+G<72; dark regions may be ocean or unlit land.',
    'Distributed light counts the sphere-sample area in5x3 screen tiles whose warm-light fraction is at least1.5%. Ship-obscured tiles remain included.',
    '49 equally spaced frames across each variant full repeat cycle plus shared elapsed-minute samples. This ranks stills and estimates persistence at sampled times; it does not prove absence of short dark intervals.',
    'The regional period is180degrees while baseline is360degrees, both at0.0045rad/s. Common elapsed times allow direct comparison; full-cycle statistics cover their respective different durations.',
    'No CPU/GPU speed, memory, thermal or power measurements are performed.',
  ],
  scenarios,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      output,
      results: scenarios.map(({ viewport, state, variants }) => ({
        viewport,
        state,
        baseline: {
          minimum: variants.baseline.cycleSummary.minimum,
          median: variants.baseline.cycleSummary.median,
        },
        regional: {
          minimum: variants.regional.cycleSummary.minimum,
          median: variants.regional.cycleSummary.median,
        },
      })),
    },
    null,
    2,
  ),
);
