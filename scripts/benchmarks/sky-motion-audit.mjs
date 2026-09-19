/** Frozen September 2026 sky-art audit, not a GPU benchmark.
 * Run from the repository root. Shader luminance constants describe this
 * revision only; update them alongside the shader before reusing the audit.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import * as THREE from 'three';
const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const baseline = 'b64852f';
const sources = {
  before: execFileSync(
    'git',
    ['show', baseline + ':components/orbital-environment.ts'],
    { cwd: repo, encoding: 'utf8' },
  ),
  after: await fs.readFile(
    path.join(repo, 'features/orbit/orbital-environment.ts'),
    'utf8',
  ),
};
// Resolve the retained environment against its own geographic transform: the
// production export names and approved opening can change independently.
const earthTransforms = {
  before: execFileSync(
    'git',
    ['show', baseline + ':components/earth-view-transform.ts'],
    { cwd: repo, encoding: 'utf8' },
  ),
  after: await fs.readFile(path.join(repo, 'features/orbit/earth-view-transform.ts'), 'utf8'),
};
// Old environments use the loader API shipped in their own revision. Keeping
// that snapshot here avoids retaining obsolete day/resolution runtime APIs.
const earthLoaders = {
  before: execFileSync('git', ['show', baseline + ':components/earth-satellite.ts'], {
    cwd: repo, encoding: 'utf8',
  }),
  after: await fs.readFile(path.join(repo, 'features/orbit/earth-satellite.ts'), 'utf8'),
};
async function load(source, earthTransform, earthLoader) {
  const built = await build({
    stdin: {
      contents: source,
      loader: 'ts',
      resolveDir: path.join(repo, 'features/orbit'),
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    logLevel: 'silent',
    plugins: [{ name: 'matching-earth-transform', setup(builder) {
      builder.onLoad({ filter: /\/earth-satellite\.ts$/ }, () => ({
        contents: earthLoader, loader: 'ts', resolveDir: path.join(repo, 'features/orbit'),
      }));
      builder.onLoad({ filter: /\/earth-view-transform\.ts$/ }, () => ({
        contents: earthTransform, loader: 'ts', resolveDir: path.join(repo, 'features/orbit'),
      }));
    } }],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`
  );
}
function percentile(a, p) {
  return [...a].sort((x, y) => x - y)[
    Math.min(a.length - 1, Math.floor(a.length * p))
  ];
}
function summary(a) {
  return {
    min: Math.min(...a),
    p05: percentile(a, 0.05),
    median: percentile(a, 0.5),
    p95: percentile(a, 0.95),
    max: Math.max(...a),
    mean: a.reduce((s, x) => s + x, 0) / a.length,
  };
}
const result = {
  protocol: {
    eventWindowSeconds: 180,
    observationStepSeconds: 1 / 30,
    stars: 'Actual count recorded separately for each source revision',
    twinkleSeconds: 8,
    twinkleStepSeconds: 1 / 30,
    brightness:
      'Analytical central fragment, additive linear RGB before scene compositing / final output transform. No GPU timing or photographic brightness claim.',
  },
};
result.protocol.baseline = baseline;
result.protocol.sourceSha256 = Object.fromEntries(
  Object.entries(sources).map(([name, source]) => [
    name,
    createHash('sha256').update(source).digest('hex'),
  ]),
);
result.protocol.earthTransformSha256 = Object.fromEntries(
  Object.entries(earthTransforms).map(([name, source]) => [
    name, createHash('sha256').update(source).digest('hex'),
  ]),
);
result.protocol.earthLoaderSha256 = Object.fromEntries(
  Object.entries(earthLoaders).map(([name, source]) => [
    name, createHash('sha256').update(source).digest('hex'),
  ]),
);
for (const [label, source] of Object.entries(sources)) {
  const { createOrbitalEnvironment } = await load(source, earthTransforms[label], earthLoaders[label]);
  const env = createOrbitalEnvironment(THREE, () => {}, {
    earthTexture: new THREE.Texture({ width: 8192, height: 4096 }),
  });
  await env.ready;
  env.resize(1440, 900, 2);
  const objects = [];
  env.scene.traverse((o) => objects.push(o));
  const stars = objects.find((o) => o.isPoints);
  const materials = objects
    .filter((o) => o.material?.uniforms?.head)
    .map((o) => o.material);
  const events = new Map();
  const groups = new Map();
  let maxVisible = 0,
    visibleSamples = 0;
  for (let sample = 0; sample < 180 * 30; sample++) {
    const t = sample / 30;
    env.update(t, true, 0, 0);
    const d = env.getDiagnostics();
    maxVisible = Math.max(maxVisible, d.meteorCount);
    if (d.meteorCount) visibleSamples++;
    d.meteorStreams.forEach((m, i) => {
      if (!m.visible) return;
      const key = `${m.cycle}:${m.bank}:${m.member}`;
      if (events.has(key)) return;
      const uniforms = materials[i].uniforms;
      const exponent = label === 'before' ? 0.65 : 1.5;
      const strength =
        uniforms.opacity.value /
        Math.pow(Math.sin(Math.PI * m.phase), exponent);
      const head = uniforms.headColor.value;
      const alpha = Math.min(1, strength * (label === 'before' ? 1.97 : 1.67));
      const luminance =
        (head.r * 0.2126 + head.g * 0.7152 + head.b * 0.0722) * alpha;
      events.set(key, {
        ...m,
        strength,
        tailLength: uniforms.tailLength.value,
        peakCentralLinearLuminance: luminance,
      });
      if (m.member === 0)
        groups.set(`${m.cycle}:${m.bank}`, {
          start: m.startAt,
          groupId: m.groupId,
        });
    });
  }
  const e = [...events.values()],
    g = [...groups.values()].sort((a, b) => a.start - b.start);
  const twinkle = stars.geometry.getAttribute('twinkle'),
    color = stars.geometry.getAttribute('color');
  const swings = [],
    amplitudes = [],
    primaryPeriods = [],
    starRms = [];
  const aggregate = Array.from({ length: 8 * 30 }, () => 0);
  const central = [];
  for (let star = 0; star < twinkle.count; star++) {
    const phase = twinkle.getX(star),
      f1 = twinkle.getY(star),
      amp = twinkle.getZ(star),
      f2 = twinkle.getW(star);
    const values = [];
    let square = 0;
    for (let step = 0; step < 8 * 30; step++) {
      const t = step / 30;
      const relative =
        1 +
        amp *
          (Math.sin(t * f1 + phase) * 0.68 +
            Math.sin(t * f2 + phase * 1.618) * 0.32);
      values.push(relative);
      aggregate[step] += relative;
      square += (relative - 1) ** 2;
      if (step % 30 === 0)
        central.push(
          (color.getX(star) * 0.2126 +
            color.getY(star) * 0.7152 +
            color.getZ(star) * 0.0722) *
            relative,
        );
    }
    swings.push(Math.max(...values) - Math.min(...values));
    amplitudes.push(amp);
    primaryPeriods.push((2 * Math.PI) / f1);
    starRms.push(Math.sqrt(square / values.length));
  }
  const brightness = summary(central);
  result[label] = {
    meteors: {
      individualStarts: e.length,
      individualStartsPerMinute: e.length / 3,
      groups: g.length,
      groupsPerMinute: g.length / 3,
      maxSimultaneouslyVisible: maxVisible,
      anyVisibleTimeFraction: visibleSamples / (180 * 30),
      durationSeconds: summary(e.map((x) => x.duration)),
      groupStartGapSeconds: summary(
        g.slice(1).map((x, i) => x.start - g[i].start),
      ),
      memberCounts: {
        leadingMembers: e.filter((x) => x.member === 0).length,
        pairMembers: e.filter((x) => x.member === 1).length,
        tripleMembers: e.filter((x) => x.member === 2).length,
      },
      peakOpacity: summary(e.map((x) => x.strength)),
      peakCentralLinearLuminance: summary(
        e.map((x) => x.peakCentralLinearLuminance),
      ),
      tailLength: summary(e.map((x) => x.tailLength)),
    },
    twinkle: {
      amplitude: summary(amplitudes),
      primaryPeriodSeconds: summary(primaryPeriods),
      eightSecondRelativeBrightnessSwing: summary(swings),
      fractionWith40PercentOrGreaterSwing:
        swings.filter((x) => x >= 0.4).length / swings.length,
      individualRms: summary(starRms),
      aggregateBrightnessSwing:
        (Math.max(...aggregate) - Math.min(...aggregate)) / twinkle.count,
      centralLinearLuminance: brightness,
    },
    resources: {
      starCount: env.getDiagnostics().starCount,
      starBufferBytes: env.getDiagnostics().starBufferBytes,
      meteorCapacity: env.getDiagnostics().meteorCapacity,
      earthTextureDimensions: env.getDiagnostics().earthTextureDimensions,
    },
  };
  env.dispose();
}
result.comparison = {
  meteorStartRatio:
    result.after.meteors.individualStarts /
    result.before.meteors.individualStarts,
  medianDurationRatio:
    result.after.meteors.durationSeconds.median /
    result.before.meteors.durationSeconds.median,
  medianTwinkleSwingRatio:
    result.after.twinkle.eightSecondRelativeBrightnessSwing.median /
    result.before.twinkle.eightSecondRelativeBrightnessSwing.median,
  medianMeteorPeakLuminanceRatio:
    result.after.meteors.peakCentralLinearLuminance.median /
    result.before.meteors.peakCentralLinearLuminance.median,
};

console.log(JSON.stringify(result, null, 2));
