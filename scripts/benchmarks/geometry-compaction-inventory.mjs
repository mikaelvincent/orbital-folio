/** Current structural comparison and optimistic full offline-bake delivery probe.
 * No browser/startup performance claim. Output includes source and payload hashes.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { createSpacecraftPerformance } from '../../features/diagnostics/spacecraft-performance.ts';
import {
  assertGeometryEquivalent,
  geometryBytes,
  inventory,
  meshes,
  disposeModel,
} from './geometry-compaction-utils.mjs';

const hash = (data) => createHash('sha256').update(data).digest('hex');
const sources = execFileSync('rg', ['--files', 'features/spacecraft'], {
  encoding: 'utf8',
})
  .trim()
  .split('\n');
sources.push(
  'scripts/generate-indexed-cylinder.mjs',
  'scripts/benchmarks/geometry-compaction-inventory.mjs',
  'scripts/benchmarks/geometry-compaction-utils.mjs',
  'package-lock.json',
);
const sourceFiles = await Promise.all(
  sources
    .sort()
    .map(async (path) => ({ path, sha256: hash(await readFile(path)) })),
);
function eligible(mesh) {
  if (
    mesh.userData.isInteractionProxy ||
    mesh.isSkinnedMesh ||
    mesh.customDepthMaterial ||
    mesh.customDistanceMaterial
  )
    return false;
  for (let p = mesh; p; p = p.parent)
    if (p.userData.animated || p.userData.irisHatch) return false;
  for (const key of [
    'onBeforeRender',
    'onAfterRender',
    'onBeforeShadow',
    'onAfterShadow',
  ])
    if (mesh[key] !== THREE.Object3D.prototype[key]) return false;
  const m = mesh.material,
    g = mesh.geometry;
  if (
    Array.isArray(m) ||
    ![
      'MeshStandardMaterial',
      'MeshPhysicalMaterial',
      'MeshBasicMaterial',
    ].includes(m.type) ||
    m.transparent ||
    m.opacity !== 1 ||
    m.transmission > 0 ||
    m.wireframe
  )
    return false;
  for (const key of [
    'onBeforeCompile',
    'customProgramCacheKey',
    'onBeforeRender',
  ])
    if (m[key] !== THREE.Material.prototype[key]) return false;
  return (
    !Object.keys(g.morphAttributes).length &&
    Object.values(g.attributes).every(
      (a) =>
        a.isBufferAttribute &&
        !a.isInstancedBufferAttribute &&
        a.array instanceof Float32Array &&
        a.usage === THREE.StaticDrawUsage &&
        a.count === g.attributes.position.count,
    )
  );
}
function compact(g) {
  const names = Object.keys(g.attributes),
    attrs = names.map((n) => g.attributes[n]);
  const bits = attrs.map(
    (a) => new Uint32Array(a.array.buffer, a.array.byteOffset, a.array.length),
  );
  const representatives = [],
    remap = [],
    seen = new Map();
  for (let i = 0; i < attrs[0].count; i++) {
    const key = bits
      .map((a, j) =>
        Array.from(
          a.subarray(i * attrs[j].itemSize, (i + 1) * attrs[j].itemSize),
        ).join(','),
      )
      .join('|');
    if (!seen.has(key)) {
      seen.set(key, representatives.length);
      representatives.push(i);
    }
    remap.push(seen.get(key));
  }
  const result = g.clone();
  for (let j = 0; j < attrs.length; j++) {
    const a = attrs[j],
      data = new Float32Array(representatives.length * a.itemSize),
      words = new Uint32Array(data.buffer);
    representatives.forEach((old, i) =>
      words.set(
        bits[j].subarray(old * a.itemSize, (old + 1) * a.itemSize),
        i * a.itemSize,
      ),
    );
    const attribute = a.clone();
    attribute.array = data;
    attribute.count = representatives.length;
    result.setAttribute(names[j], attribute);
  }
  result.setIndex(
    Array.from(
      { length: g.index?.count ?? attrs[0].count },
      (_, i) => remap[g.index ? g.index.getX(i) : i],
    ),
  );
  return result;
}
function groups(model) {
  const list = meshes(model.group, true),
    diagnostics = createSpacecraftPerformance(model.group),
    snapshot = diagnostics.snapshot();
  diagnostics.dispose();
  const ids = new Map(
    meshes(model.group).map((m, i) => [m, snapshot.batches[i].partId]),
  );
  return snapshot.groups
    .filter((g) => g.id.startsWith('part:'))
    .map((group) => {
      const objects = list.filter((m) => ids.get(m) === group.id),
        geometries = new Set(objects.map((m) => m.geometry));
      return {
        id: group.id,
        label: group.label,
        meshes: objects.length,
        bytes: [...geometries].reduce((n, g) => n + geometryBytes(g), 0),
      };
    });
}
const report = {
  schemaVersion: 1,
  baselineCommit: '437824a',
  sourceFiles,
  recordedAt: new Date().toISOString(),
  layouts: {},
  offlineBake: null,
  limits: [
    'Inventory is geometry-array storage, not measured GPU/process memory or rendered draws. Visible inventory does not perform frustum/occlusion culling.',
    'Whole-buffer bake is an optimistic transfer lower bound: excludes object transforms/materials and loader/metadata. Existing procedural builders still run in a replacement-only architecture. Not adopted.',
    'Offline packing CPU is a developer-build observation, not visitor startup. No quantization, attribute rounding, seam changes or triangle simplification.',
  ],
};
for (const layout of ['wide', 'compact']) {
  const before = createSpacecraft(THREE, { layout, geometryCompaction: false }),
    after = createSpacecraft(THREE, { layout, geometryCompaction: true });
  const a = meshes(before.group),
    b = meshes(after.group);
  a.forEach((mesh, i) =>
    assertGeometryEquivalent(mesh.geometry, b[i].geometry, mesh.name),
  );
  report.layouts[layout] = {
    baseline: {
      all: inventory(before.group),
      visible: inventory(before.group, true),
      groups: groups(before),
    },
    indexed: {
      all: inventory(after.group),
      visible: inventory(after.group, true),
      groups: groups(after),
    },
    exactMeshChecks: a.length,
  };
  if (layout === 'wide') {
    const start = performance.now(),
      owners = new Map();
    for (const mesh of a) {
      if (!owners.has(mesh.geometry)) owners.set(mesh.geometry, []);
      owners.get(mesh.geometry).push(mesh);
    }
    const chunks = [],
      records = [];
    let saved = 0;
    for (const [geometry, users] of owners) {
      if (!users.every(eligible)) continue;
      const candidate = compact(geometry);
      const saving = geometryBytes(geometry) - geometryBytes(candidate);
      if (saving > 0) {
        assertGeometryEquivalent(geometry, candidate, users[0].name);
        saved += saving;
        for (const attribute of [
          ...Object.values(candidate.attributes),
          candidate.index,
        ])
          chunks.push(
            Buffer.from(
              attribute.array.buffer,
              attribute.array.byteOffset,
              attribute.array.byteLength,
            ),
          );
        records.push({
          name: users[0].name,
          beforeBytes: geometryBytes(geometry),
          afterBytes: geometryBytes(candidate),
          verticesBefore: geometry.attributes.position.count,
          verticesAfter: candidate.attributes.position.count,
        });
      }
      candidate.dispose();
    }
    const offlineAnalysisMs = performance.now() - start,
      payload = Buffer.concat(chunks),
      compressed = gzipSync(payload),
      brotli = brotliCompressSync(payload);
    await writeFile(
      '/tmp/orbital-offline-compacted-buffers.bin.gz',
      compressed,
    );
    report.offlineBake = {
      eligibleBeneficialBuffers: records.length,
      geometryBytesSaved: saved,
      minimumPayloadBytes: payload.length,
      gzipBytes: compressed.length,
      brotliBytes: brotli.length,
      sha256: hash(payload),
      gzipSha256: hash(compressed),
      offlineAnalysisMs,
      records,
    };
  }
  disposeModel(before);
  disposeModel(after);
}
const generated = await readFile(
  'features/spacecraft/geometry/indexed-cylinder.generated.js',
);
report.generator = {
  sourceBytes: generated.length,
  gzipBytes: gzipSync(generated).length,
  brotliBytes: brotliCompressSync(generated).length,
  newAssetDownloadBytes: 0,
  note: 'Source-file compression only; production bundle delta measured separately.',
};
await writeFile(
  'docs/evidence/performance/offline-geometry-compaction/inventory.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    layouts: report.layouts,
    offlineBake: { ...report.offlineBake, records: undefined },
    generator: report.generator,
  }),
);
