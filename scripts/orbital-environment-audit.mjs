/** node scripts/orbital-environment-audit.mjs REPO_ROOT [ARTIFACT] [REPORT] */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root = path.resolve(process.argv[2] ?? process.cwd()),
  artifact = path.resolve(
    process.argv[3] ?? path.join(root, 'components/orbital-environment.ts'),
  ),
  output = process.argv[4] ?? '/tmp/orbital-environment-audit.json';
const require = createRequire(root + '/package.json'),
  ts = require('typescript'),
  THREE = await import(pathToFileURL(require.resolve('three')));
const source = fs.readFileSync(artifact, 'utf8'),
  js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
    },
  }).outputText;
const { createOrbitalEnvironment } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);
assert.ok(
  !/TextureLoader|ImageLoader|fetch\(|setTimeout\(|setInterval\(|requestAnimationFrame\(/.test(
    source,
  ),
);
const cloudFragment = source.slice(
  source.indexOf('precision highp sampler3D'),
  source.indexOf('const clouds ='),
);
assert.ok(
  cloudFragment.lastIndexOf('field(') < cloudFragment.indexOf('discard'),
  'All derivatives evaluated before discard',
);
const mipBytes = (w, h, d, c) => {
  let sum = 0;
  for (;;) {
    sum += w * h * d * c;
    if (w === 1 && h === 1 && d === 1) return sum;
    w = Math.max(1, w >> 1);
    h = Math.max(1, h >> 1);
    d = Math.max(1, d >> 1);
  }
};
const add = (a, b) => a.map((v, i) => v + b[i]),
  scale = (a, b) => a.map((v, i) => v * (Array.isArray(b) ? b[i] : b)),
  dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const report = {
  artifact,
  sha256: crypto.createHash('sha256').update(source).digest('hex'),
  at: new Date().toISOString(),
  scope:
    'CPU allocation, sampled field and animation audit. No WebGL shader compilation or GPU/browser performance claim.',
  tiers: [],
};
for (const mobile of [false, true]) {
  const env = createOrbitalEnvironment(THREE, () => {}, { mobile });
  env.resize(mobile ? 390 : 1440, mobile ? 844 : 1000, 1);
  env.update(0, true, 0, 0);
  const initial = env.getDiagnostics();
  const textures = new Set(),
    geometries = new Set(),
    materials = new Set();
  let cloud;
  env.scene.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    for (const m of o.material ? [].concat(o.material) : []) {
      materials.add(m);
      for (const u of Object.values(m.uniforms ?? {}))
        if (u.value?.isTexture) textures.add(u.value);
      if (m.uniforms?.cloudNoise) cloud = o;
    }
  });
  const volume = cloud.material.uniforms.cloudNoise.value,
    N = volume.image.width,
    data = volume.image.data,
    cells = N / 8;
  assert.equal(volume.format, THREE.RGFormat);
  assert.equal(volume.minFilter, THREE.LinearMipmapLinearFilter);
  assert.equal(textures.size, 2);
  assert.equal(initial.cloudFieldSamples, mobile ? 11 : 17);
  assert.equal(initial.cloudSunProbes, 2);
  const fields = [...textures].map((t) => ({
    dimensions: [t.image.width, t.image.height, t.image.depth ?? 1],
    format: t.format === THREE.RGFormat ? 'RG8' : 'RGBA8',
    cpuBytes: t.image.data.byteLength,
    gpuMipBytes: mipBytes(
      t.image.width,
      t.image.height,
      t.image.depth ?? 1,
      t.format === THREE.RGFormat ? 2 : 4,
    ),
  }));
  assert.equal(
    fields.reduce((s, t) => s + t.cpuBytes, 0),
    initial.proceduralTextureBytes,
  );
  assert.equal(
    fields.reduce((s, t) => s + t.gpuMipBytes, 0),
    initial.proceduralTextureGpuBytes,
  );
  const texel = (x, y, z, c) =>
    data[
      (((((z % N) + N) % N) * N + (((y % N) + N) % N)) * N +
        (((x % N) + N) % N)) *
        2 +
        c
    ] / 255;
  const field = (p) => {
    const c = scale(p, 8),
      a = c.map(Math.floor),
      f = c.map((v, i) => v - a[i]),
      out = [0, 0];
    for (let z = 0; z < 2; z++)
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++) {
          const w =
            (x ? f[0] : 1 - f[0]) *
            (y ? f[1] : 1 - f[1]) *
            (z ? f[2] : 1 - f[2]);
          for (let k = 0; k < 2; k++)
            out[k] += texel(a[0] + x, a[1] + y, a[2] + z, k) * w;
        }
    return out;
  };
  let seed = 803719;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const feature = [];
  for (let z = 0; z < cells; z++)
    for (let y = 0; y < cells; y++)
      for (let x = 0; x < cells; x++) {
        random();
        random();
        feature.push([
          x + Math.fround(0.28 + random() * 0.44),
          y + Math.fround(0.28 + random() * 0.44),
          z + Math.fround(0.28 + random() * 0.44),
        ]);
      }
  let maximumCellularByteError = 0,
    periodError = 0;
  for (let i = 0; i < 256; i++) {
    const x = (i * 17) % N,
      y = (i * 29 + 7) % N,
      z = (i * 43 + 11) % N,
      p = [x / 8, y / 8, z / 8];
    let closest = Infinity;
    for (const q of feature) {
      const d = p.map((v, j) => {
        const raw = Math.abs(v - q[j]);
        return Math.min(raw, cells - raw);
      });
      closest = Math.min(closest, dot(d, d));
    }
    const expected = Math.round(Math.max(0, 1 - Math.sqrt(closest)) * 255);
    maximumCellularByteError = Math.max(
      maximumCellularByteError,
      Math.abs(texel(x, y, z, 1) * 255 - expected),
    );
    const v = field(p),
      w = field(add(p, [cells, -cells, cells]));
    periodError = Math.max(periodError, ...v.map((n, j) => Math.abs(n - w[j])));
  }
  assert.ok(maximumCellularByteError <= 1);
  assert.ok(periodError < 1e-12);
  let maxVisible = 0,
    triples = 0,
    visibleTicks = 0;
  const groups = new Map();
  const version = volume.version;
  for (let tick = 0; tick <= 90000; tick++) {
    const t = tick * 0.02;
    env.update(t, true, 0, 0);
    const d = env.getDiagnostics();
    maxVisible = Math.max(maxVisible, d.meteorCount);
    if (d.meteorCount === 3) triples++;
    if (d.meteorCount) visibleTicks++;
    groups.set(d.meteorCycle, d.meteorStreams[0].startAt);
    for (const m of d.meteorStreams) {
      assert.ok(m.duration >= 1.15 && m.duration <= 1.5);
      assert.ok(m.nextAt >= t);
    }
    if (d.meteorCount === 3 && tick % 11 === 0) {
      const before = env.getDiagnostics();
      env.update(t + 100, false, 0, 0);
      assert.deepEqual(env.getDiagnostics(), before);
    }
  }
  assert.equal(maxVisible, 3);
  assert.ok(triples > 0);
  assert.equal(volume.version, version);
  const starts = [...groups.values()],
    gaps = starts.slice(1).map((n, i) => n - starts[i]);
  assert.ok(Math.min(...gaps) >= 3.8 - 1e-8 && Math.max(...gaps) <= 5.2 + 1e-8);
  const timings = [];
  for (let i = 0; i < 5; i++) {
    const x = createOrbitalEnvironment(THREE, () => {}, { mobile });
    timings.push(x.getDiagnostics().proceduralGenerationMs);
    x.dispose();
  }
  timings.sort((a, b) => a - b);
  let disposed = 0;
  [...textures, ...materials, ...geometries].forEach((o) =>
    o.addEventListener('dispose', () => disposed++),
  );
  env.dispose();
  env.dispose();
  assert.equal(disposed, textures.size + materials.size + geometries.size);
  assert.equal(env.getDiagnostics().ready, false);
  const tier = {
    mobile,
    fields,
    initialCpuBytes: initial.proceduralTextureBytes,
    gpuMipBytes: initial.proceduralTextureGpuBytes,
    sharedThreeDfgExtraBytes: 1024,
    cloudSamples: initial.cloudFieldSamples,
    sunProbes: initial.cloudSunProbes,
    maximumCellularByteError,
    periodError,
    generationMs: {
      first: initial.proceduralGenerationMs,
      min: timings[0],
      median: timings[2],
      max: timings[4],
    },
    meteors: {
      activeSeconds: 1800,
      maxVisible,
      visibleFraction: visibleTicks / 90001,
      tripleFraction: triples / 90001,
      minGroupGap: Math.min(...gaps),
      maxGroupGap: Math.max(...gaps),
    },
    disposedObjects: disposed,
  };
  report.tiers.push(tier);
}
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
