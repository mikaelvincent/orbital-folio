/** Read-only feasibility inventory; does not modify model geometry.
 * node scripts/probe-exact-vertex-indexing.mjs
 * Full byte-identical attribute tuples only, including normals, UVs and signed zero.
 */
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { createSpacecraftPerformance } from '../lib/spacecraft-performance.ts';

const started = performance.now();
const model = createSpacecraft(THREE);
const modelConstructionMs = performance.now() - started;
const meshes = [];
model.group.traverse((object) => {
  if (object.isMesh) meshes.push(object);
});
const diagnostics = createSpacecraftPerformance(model.group);
const classification = diagnostics.snapshot();
diagnostics.dispose();
const parts = new Map(
  meshes.map((mesh, i) => [mesh, classification.batches[i].partId]),
);
const labels = new Map(
  classification.groups.map((group) => [group.id, group.label]),
);
const defaults = THREE.Object3D.prototype;
const materialDefaults = THREE.Material.prototype;

function ineligible(mesh) {
  if (mesh.isSkinnedMesh || mesh.userData.isInteractionProxy)
    return 'skin-or-interaction-proxy';
  if (mesh.customDepthMaterial || mesh.customDistanceMaterial)
    return 'custom-shadow-material';
  if (
    mesh.onBeforeRender !== defaults.onBeforeRender ||
    mesh.onAfterRender !== defaults.onAfterRender ||
    mesh.onBeforeShadow !== defaults.onBeforeShadow ||
    mesh.onAfterShadow !== defaults.onAfterShadow
  )
    return 'custom-render-callback';
  for (let owner = mesh; owner; owner = owner.parent) {
    if (owner.userData.animated || owner.userData.irisHatch)
      return 'animated-or-iris-assembly';
  }
  const material = mesh.material;
  if (
    Array.isArray(material) ||
    ![
      'MeshStandardMaterial',
      'MeshPhysicalMaterial',
      'MeshBasicMaterial',
    ].includes(material.type)
  )
    return 'nonstandard-material';
  if (
    material.onBeforeCompile !== materialDefaults.onBeforeCompile ||
    material.customProgramCacheKey !== materialDefaults.customProgramCacheKey ||
    material.onBeforeRender !== materialDefaults.onBeforeRender
  )
    return 'custom-material-program';
  if (
    material.transparent ||
    material.opacity !== 1 ||
    material.transmission > 0 ||
    material.wireframe
  )
    return 'transparent-or-wireframe';
  const geometry = mesh.geometry;
  if (Object.keys(geometry.morphAttributes).length) return 'morph-attributes';
  const attributes = Object.values(geometry.attributes);
  if (
    !geometry.attributes.position ||
    attributes.some(
      (a) =>
        !a.isBufferAttribute ||
        a.isInstancedBufferAttribute ||
        a.usage !== THREE.StaticDrawUsage ||
        a.count !== geometry.attributes.position.count ||
        a.array.length !== a.count * a.itemSize,
    )
  )
    return 'unsupported-or-dynamic-attribute';
  if (
    geometry.index &&
    (!geometry.index.isBufferAttribute ||
      geometry.index.usage !== THREE.StaticDrawUsage)
  )
    return 'unsupported-or-dynamic-index';
  return null;
}
const owners = new Map();
for (const mesh of meshes) {
  if (!owners.has(mesh.geometry)) owners.set(mesh.geometry, []);
  owners.get(mesh.geometry).push(mesh);
}
const geometryReasons = new Map(
  [...owners].map(([geo, users]) => [
    geo,
    users.map(ineligible).find(Boolean) ?? null,
  ]),
);

function cacheMisses(
  indices,
  remap,
  cacheSize,
  start = 0,
  end = indices.length,
) {
  const cache = [];
  let misses = 0;
  for (let i = start; i < end; i++) {
    const vertex = remap ? remap[indices[i]] : indices[i];
    const at = cache.indexOf(vertex);
    if (at === -1) {
      misses++;
      if (cache.length === cacheSize) cache.pop();
    } else cache.splice(at, 1);
    cache.unshift(vertex);
  }
  return misses;
}
function probe(geometry) {
  const started = performance.now();
  const attributes = Object.keys(geometry.attributes)
    .sort()
    .map((name) => geometry.attributes[name]);
  const views = attributes.map((a) =>
    Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength),
  );
  const strides = attributes.map((a) => a.itemSize * a.array.BYTES_PER_ELEMENT);
  const vertices = geometry.attributes.position.count;
  const map = new Map();
  const remap = new Uint32Array(vertices);
  for (let vertex = 0; vertex < vertices; vertex++) {
    let key = '';
    for (let attribute = 0; attribute < views.length; attribute++) {
      const offset = vertex * strides[attribute];
      key += views[attribute].toString(
        'hex',
        offset,
        offset + strides[attribute],
      );
    }
    let id = map.get(key);
    if (id === undefined) {
      id = map.size;
      map.set(key, id);
    }
    remap[vertex] = id;
  }
  const byteTupleDedupMs = performance.now() - started;
  const indices =
    geometry.index?.array ??
    Uint32Array.from({ length: vertices }, (_, i) => i);
  const unique = map.size;
  const bytesBefore =
    views.reduce((n, v) => n + v.byteLength, 0) +
    (geometry.index?.array.byteLength ?? 0);
  const bytesAfter =
    strides.reduce((n, stride) => n + stride * unique, 0) +
    indices.length * (unique < 65535 ? 2 : 4);
  const start = Math.min(indices.length, geometry.drawRange.start);
  const end = Math.min(
    indices.length,
    geometry.drawRange.start + geometry.drawRange.count,
  );
  return {
    vertices,
    unique,
    bytesBefore,
    bytesAfter,
    byteTupleDedupMs,
    indexReferences: indices.length,
    cache16Before: cacheMisses(indices, null, 16, start, end),
    cache16After: cacheMisses(indices, remap, 16, start, end),
    cache32Before: cacheMisses(indices, null, 32, start, end),
    cache32After: cacheMisses(indices, remap, 32, start, end),
  };
}
const probes = new Map();
for (const [geometry, reason] of geometryReasons)
  if (!reason) probes.set(geometry, probe(geometry));

function summarize(selected) {
  const uniqueGeometry = new Set(selected.map((mesh) => mesh.geometry));
  const eligible = [...uniqueGeometry].filter((g) => probes.has(g));
  const beneficial = eligible.filter(
    (g) => probes.get(g).bytesAfter < probes.get(g).bytesBefore,
  );
  const optimizedSet = new Set(beneficial);
  const sum = (key) =>
    beneficial.reduce((value, geo) => value + probes.get(geo)[key], 0);
  const estimates = selected
    .filter((mesh) => optimizedSet.has(mesh.geometry))
    .reduce(
      (value, mesh) => {
        const p = probes.get(mesh.geometry);
        const instances = mesh.isInstancedMesh ? mesh.count : 1;
        for (const key of Object.keys(value)) value[key] += p[key] * instances;
        return value;
      },
      { cache16Before: 0, cache16After: 0, cache32Before: 0, cache32After: 0 },
    );
  return {
    meshes: selected.length,
    uniqueGeometries: uniqueGeometry.size,
    allGeometryVertices: [...uniqueGeometry].reduce(
      (n, g) => n + g.attributes.position.count,
      0,
    ),
    allGeometryBytes: [...uniqueGeometry].reduce(
      (n, g) =>
        n +
        (g.index?.array.byteLength ?? 0) +
        Object.values(g.attributes).reduce((v, a) => v + a.array.byteLength, 0),
      0,
    ),
    eligibleGeometries: eligible.length,
    beneficialGeometries: beneficial.length,
    verticesBefore: sum('vertices'),
    verticesAfter: sum('unique'),
    bytesBefore: sum('bytesBefore'),
    bytesAfter: sum('bytesAfter'),
    bytesSaved: sum('bytesBefore') - sum('bytesAfter'),
    indexReferences: sum('indexReferences'),
    simulatedInvocations: estimates,
  };
}
const layouts = {};
for (const layout of ['wide', 'compact']) {
  model.setLayout(layout);
  model.update(0, 'home', true, {
    activeRoom: 'home',
    layout,
    delta: 0,
    immediateDoors: true,
  });
  const visible = [];
  model.group.traverseVisible((mesh) => {
    if (mesh.isMesh) visible.push(mesh);
  });
  const groupIds = [...new Set(visible.map((mesh) => parts.get(mesh)))];
  layouts[layout] = {
    total: summarize(visible),
    groups: groupIds
      .map((id) => ({
        id,
        label: labels.get(id),
        ...summarize(visible.filter((mesh) => parts.get(mesh) === id)),
      }))
      .sort((a, b) => b.bytesSaved - a.bytesSaved),
  };
}
const exclusions = {};
for (const [geo, reason] of geometryReasons)
  if (reason) {
    exclusions[reason] ??= { geometries: 0, vertices: 0 };
    exclusions[reason].geometries++;
    exclusions[reason].vertices += geo.attributes.position?.count ?? 0;
  }
const report = {
  method:
    'Read-only full byte tuple deduplication feasibility after production batching. No geometry has been changed. All attributes, signed zero, UV/normal seams remain distinct unless exactly identical; triangle order and draw ranges stay unchanged. Index references are remapped only. Shared geometry is excluded if any owner is unsafe.',
  eligibility:
    'Static BufferAttributes and built-in opaque standard/physical/basic materials; no custom material/shadow/render hooks, wireframe, skinning, morphs, animated/iris ancestry, or interaction proxies.',
  limitations: [
    'Storage counts are geometry attributes plus indices, not total GPU memory or process memory.',
    'Cache invocation numbers simulate fully associative LRU caches of 16/32 entries over current triangle order, including instance multiplicity. They are not GPU counters or guarantees; actual post-transform caches and cross-pass reuse are hardware dependent.',
    'Visible scene-graph inventory includes geometry potentially outside the camera frustum. It does not represent actual renderer draw cost.',
    'Per-part byte totals count unique geometry within each part; shared buffers can appear in multiple parts. Overall totals deduplicate globally.',
    'Buffer reindexing can change raw raycast face vertex IDs, although faceIndex, triangle order and hit positions remain unchanged. Runtime code currently does not consume those raw IDs.',
    'Prototype allocation/construction time and real browser rendering must be measured before recommending implementation. A compacting helper must preserve all attribute metadata, bounds, groups and index draw ranges.',
  ],
  probeTiming: {
    modelConstructionMs,
    byteTupleDedupMs: [...probes.values()].reduce(
      (n, p) => n + p.byteTupleDedupMs,
      0,
    ),
    totalIncludingCacheSimulationMs: performance.now() - started,
  },
  allVariants: summarize(meshes),
  exclusions,
  layouts,
  largestBuffers: [...probes.entries()]
    .filter(([, p]) => p.bytesAfter < p.bytesBefore)
    .map(([geo, p]) => ({
      name: owners.get(geo)[0].name,
      group: parts.get(owners.get(geo)[0]),
      ...p,
      bytesSaved: p.bytesBefore - p.bytesAfter,
    }))
    .sort((a, b) => b.bytesSaved - a.bytesSaved)
    .slice(0, 15),
};
console.log(JSON.stringify(report, null, 2));
