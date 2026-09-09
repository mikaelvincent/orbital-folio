/** Portable Node audit: node audit-orbital-cloud-refinement.mjs REPO_ROOT [ARTIFACT.ts] */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = path.resolve(process.argv[2] ?? process.cwd());
const artifact = path.resolve(
  process.argv[3] ?? path.join(root, 'components/orbital-environment.ts'),
);
const require = createRequire(path.join(root, 'package.json'));
const ts = require('typescript');
const THREE = await import(pathToFileURL(require.resolve('three')).href);
const source = fs.readFileSync(artifact, 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const { createOrbitalEnvironment } = await import(
  'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);
assert.ok(
  !/TextureLoader|ImageLoader|fetch\(|setTimeout\(|setInterval\(|requestAnimationFrame\(/.test(
    source,
  ),
  'No downloads/timers',
);
const mipBytes = (w, h, d, channels) => {
  let bytes = 0;
  for (;;) {
    bytes += w * h * d * channels;
    if (w === 1 && h === 1 && d === 1) return bytes;
    w = Math.max(1, w >> 1);
    h = Math.max(1, h >> 1);
    d = Math.max(1, d >> 1);
  }
};
const report = {
  artifact,
  artifactSha256: createHash('sha256').update(source).digest('hex'),
  verifiedAt: new Date().toISOString(),
  tiers: [],
};
for (const mobile of [false, true]) {
  let invalidations = 0;
  const env = createOrbitalEnvironment(THREE, () => invalidations++, {
    mobile,
  });
  env.resize(mobile ? 390 : 1440, mobile ? 844 : 900, mobile ? 1.75 : 2);
  env.update(0, true, 0, 0);
  const initial = env.getDiagnostics();
  assert.equal(invalidations, 1);
  assert.equal(initial.ready, true);
  const textures = new Set(),
    geometries = new Set(),
    materials = new Set();
  env.scene.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    for (const m of o.material ? [].concat(o.material) : []) {
      materials.add(m);
      for (const u of Object.values(m.uniforms ?? {}))
        if (u.value?.isTexture) textures.add(u.value);
    }
  });
  assert.equal(textures.size, 2);
  const fields = [...textures].map((t) => ({
    width: t.image.width,
    height: t.image.height,
    depth: t.image.depth ?? 1,
    bytes: t.image.data.byteLength,
    gpuBytes: mipBytes(
      t.image.width,
      t.image.height,
      t.image.depth ?? 1,
      t.format === THREE.RedFormat ? 1 : 4,
    ),
    mipmaps: t.generateMipmaps,
  }));
  const cpuTextureBytes = fields.reduce((n, t) => n + t.bytes, 0),
    gpuTextureBytes = fields.reduce((n, t) => n + t.gpuBytes, 0);
  assert.equal(cpuTextureBytes, initial.proceduralTextureBytes);
  assert.equal(gpuTextureBytes, initial.proceduralTextureGpuBytes);
  const volume = [...textures].find((t) => t.isData3DTexture);
  assert.equal(volume.format, THREE.RedFormat);
  assert.equal(volume.minFilter, THREE.LinearMipmapLinearFilter);
  assert.equal(volume.generateMipmaps, true);
  // Independently sample the baked R8 volume using normalized texture coordinates.
  const N = volume.image.width,
    data = volume.image.data,
    cells = N / 8;
  const value = (x, y, z) =>
    data[
      ((((z % N) + N) % N) * N + (((y % N) + N) % N)) * N + (((x % N) + N) % N)
    ] / 255;
  const noise = (x, y, z) => {
    x *= 8;
    y *= 8;
    z *= 8;
    const ix = Math.floor(x),
      iy = Math.floor(y),
      iz = Math.floor(z),
      fx = x - ix,
      fy = y - iy,
      fz = z - iz;
    let n = 0;
    for (let dz = 0; dz < 2; dz++)
      for (let dy = 0; dy < 2; dy++)
        for (let dx = 0; dx < 2; dx++)
          n +=
            value(ix + dx, iy + dy, iz + dz) *
            (dx ? fx : 1 - fx) *
            (dy ? fy : 1 - fy) *
            (dz ? fz : 1 - fz);
    return n;
  };
  let periodError = 0,
    seamJump = 0,
    maxVoxelJump = 0;
  for (let i = 0; i < 1000; i++) {
    const x = i * 0.317 - 41,
      y = i * 0.73 - 21,
      z = i * 0.119 + 3;
    periodError = Math.max(
      periodError,
      Math.abs(noise(x, y, z) - noise(x + cells, y - cells, z + cells)),
    );
    seamJump = Math.max(
      seamJump,
      Math.abs(noise(-1e-5, y, z) - noise(1e-5, y, z)),
    );
  }
  for (let z = 0; z < N; z++)
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        for (const delta of [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ])
          maxVoxelJump = Math.max(
            maxVoxelJump,
            Math.abs(
              value(x, y, z) - value(x + delta[0], y + delta[1], z + delta[2]),
            ),
          );
  assert.ok(periodError < 1e-12);
  assert.ok(seamJump < 0.0001);
  assert.ok(maxVoxelJump < 0.2);
  assert.equal(initial.cloudSamplesPerCell, 8);
  assert.equal(initial.cloudFieldCells, cells);
  env.update(10, true, 0, 0);
  assert.ok(Math.abs(env.getDiagnostics().cloudRotation - 0.072) < 1e-12);
  assert.ok(Math.abs(env.getDiagnostics().earthRotation - 0.03) < 1e-12);
  let maxVisible = 0,
    visibleSamples = 0,
    pairSamples = 0;
  const groupStarts = new Map(),
    actualStarts = new Map();
  for (let tick = 0; tick <= 180000; tick++) {
    const t = tick * 0.02;
    env.update(t, true, 0, 0);
    const d = env.getDiagnostics();
    maxVisible = Math.max(maxVisible, d.meteorCount);
    visibleSamples += d.meteorCount > 0 ? 1 : 0;
    pairSamples += d.meteorCount === 2 ? 1 : 0;
    groupStarts.set(d.meteorCycle, d.meteorStreams[0].startAt);
    for (let i = 0; i < 2; i++) {
      const m = d.meteorStreams[i];
      assert.ok(m.duration >= 1.1 && m.duration <= 1.55);
      assert.ok(m.nextAt >= t);
      if (i === 0 || d.meteorGroupHasPair)
        actualStarts.set(m.startAt, m.duration);
    }
    if (d.meteorCount === 2 && tick % 7 === 0) {
      const before = env.getDiagnostics();
      env.update(t + 1000, false, 0, 0);
      assert.deepEqual(env.getDiagnostics(), before);
    }
  }
  assert.equal(maxVisible, 2);
  assert.ok(pairSamples > 0);
  const groups = [...groupStarts.values()],
    gaps = groups.slice(1).map((t, i) => t - groups[i]);
  assert.ok(Math.min(...gaps) >= 5);
  assert.ok(Math.max(...gaps) <= 9);
  const generation = [];
  for (let i = 0; i < 7; i++) {
    const sample = createOrbitalEnvironment(THREE, () => {}, { mobile });
    generation.push(sample.getDiagnostics().proceduralGenerationMs);
    sample.dispose();
  }
  generation.sort((a, b) => a - b);
  const geometryBytes = [...geometries].reduce(
    (n, g) =>
      n +
      Object.values(g.attributes).reduce((s, a) => s + a.array.byteLength, 0) +
      (g.index?.array.byteLength ?? 0),
    0,
  );
  let disposed = 0;
  [...textures, ...geometries, ...materials].forEach((o) =>
    o.addEventListener('dispose', () => disposed++),
  );
  env.dispose();
  env.dispose();
  assert.equal(disposed, textures.size + geometries.size + materials.size);
  assert.equal(env.scene.children.length, 0);
  assert.equal(env.getDiagnostics().ready, false);
  report.tiers.push({
    mobile,
    fields,
    cpuTextureBytes,
    gpuTextureBytes,
    gpuTextureBytesIncludingSharedThreeDfg: gpuTextureBytes + 1024,
    geometryBytes,
    cloudSamples: initial.cloudFieldSamples,
    cloudRotationRate: initial.cloudRotationRate,
    cloudRotationMultiple: initial.cloudRotationRate / 0.0021,
    firstGenerationMs: initial.proceduralGenerationMs,
    warmGenerationMs: {
      min: generation[0],
      median: generation[3],
      max: generation.at(-1),
    },
    periodError,
    seamJump,
    maxVoxelJump,
    meteorAudit: {
      activeSeconds: 3600,
      stepSeconds: 0.02,
      groups: groups.length,
      events: actualStarts.size,
      minGroupGap: Math.min(...gaps),
      maxGroupGap: Math.max(...gaps),
      maxVisible,
      visibleDutyFraction: visibleSamples / 180001,
      pairDutyFraction: pairSamples / 180001,
    },
    disposedObjects: disposed,
  });
}
console.log(JSON.stringify(report, null, 2));
