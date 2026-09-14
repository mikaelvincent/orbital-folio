/** Isolated, non-production numeric-hash compaction experiment.
 * node --expose-gc scripts/probe-targeted-exact-indexing.mjs
 * Only static, generic geometry batches in Ladder utilities and Projects.
 */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';

function scopeOf(object) {
  for (let owner = object; owner; owner = owner.parent) {
    if (owner.name === 'projects-workshop') return 'projects';
    if (
      ['engineering-service-spine', 'ladder-wall-isolation-cassette'].includes(
        owner.name,
      )
    )
      return 'ladder';
  }
  return null;
}
function eligible(object) {
  const defaults = THREE.Object3D.prototype;
  const materialDefaults = THREE.Material.prototype;
  const material = object.material;
  if (
    !object.isMesh ||
    object.isInstancedMesh ||
    object.isSkinnedMesh ||
    object.userData.isInteractionProxy ||
    !object.userData.parts
  )
    return false;
  if (
    object.customDepthMaterial ||
    object.customDistanceMaterial ||
    object.onBeforeRender !== defaults.onBeforeRender ||
    object.onAfterRender !== defaults.onAfterRender ||
    object.onBeforeShadow !== defaults.onBeforeShadow ||
    object.onAfterShadow !== defaults.onAfterShadow
  )
    return false;
  for (let owner = object; owner; owner = owner.parent)
    if (owner.userData.animated || owner.userData.irisHatch) return false;
  if (
    Array.isArray(material) ||
    ![
      'MeshStandardMaterial',
      'MeshPhysicalMaterial',
      'MeshBasicMaterial',
    ].includes(material.type) ||
    material.transparent ||
    material.opacity !== 1 ||
    material.transmission > 0 ||
    material.wireframe ||
    material.onBeforeCompile !== materialDefaults.onBeforeCompile ||
    material.onBeforeRender !== materialDefaults.onBeforeRender ||
    material.customProgramCacheKey !== materialDefaults.customProgramCacheKey
  )
    return false;
  const geometry = object.geometry;
  if (
    geometry.type !== 'BufferGeometry' ||
    !geometry.index ||
    geometry.attributes.position.count < 512 ||
    Object.keys(geometry.morphAttributes).length
  )
    return false;
  if (
    !(
      geometry.index.array instanceof Uint16Array ||
      geometry.index.array instanceof Uint32Array
    ) ||
    geometry.index.usage !== THREE.StaticDrawUsage ||
    geometry.index.onUploadCallback !==
      THREE.BufferAttribute.prototype.onUploadCallback ||
    geometry.index.updateRanges.length
  )
    return false;
  return Object.values(geometry.attributes).every(
    (a) =>
      a.isBufferAttribute &&
      !a.isInstancedBufferAttribute &&
      a.array instanceof Float32Array &&
      a.count === geometry.attributes.position.count &&
      a.array.length === a.count * a.itemSize &&
      a.usage === THREE.StaticDrawUsage &&
      !a.updateRanges.length &&
      a.onUploadCallback === THREE.BufferAttribute.prototype.onUploadCallback,
  );
}
function byteCount(geometry) {
  return (
    (geometry.index?.array.byteLength ?? 0) +
    Object.values(geometry.attributes).reduce(
      (sum, a) => sum + a.array.byteLength,
      0,
    )
  );
}

// Hash integer IEEE-754 representations, then verify every component in each
// collision bucket. Hash collisions cannot merge different inputs; +0/-0 and
// distinct NaN payloads also remain separate. No decimal/string/quantized keys.
function compact(geometry, hashMask = 0xffffffff) {
  const names = Object.keys(geometry.attributes);
  const attributes = names.map((name) => geometry.attributes[name]);
  const bits = attributes.map(
    (a) => new Uint32Array(a.array.buffer, a.array.byteOffset, a.array.length),
  );
  const count = geometry.attributes.position.count;
  const remap = new Uint32Array(count);
  const representatives = new Uint32Array(count);
  const nextCollision = new Uint32Array(count);
  const heads = new Map();
  let unique = 0;
  let collisions = 0;
  const matches = (left, right) => {
    for (let attribute = 0; attribute < attributes.length; attribute++) {
      const size = attributes[attribute].itemSize;
      for (let component = 0; component < size; component++)
        if (
          bits[attribute][left * size + component] !==
          bits[attribute][right * size + component]
        )
          return false;
    }
    return true;
  };
  for (let vertex = 0; vertex < count; vertex++) {
    let hash = 2166136261;
    for (let attribute = 0; attribute < attributes.length; attribute++) {
      const size = attributes[attribute].itemSize;
      for (let component = 0; component < size; component++) {
        hash = Math.imul(
          hash ^ bits[attribute][vertex * size + component],
          0x85ebca6b,
        );
        hash ^= hash >>> 13;
      }
    }
    hash = (hash & hashMask) >>> 0;
    const head = heads.get(hash) ?? 0;
    let match = head;
    while (match && !matches(vertex, representatives[match - 1])) {
      collisions++;
      match = nextCollision[match - 1];
    }
    if (match) remap[vertex] = match - 1;
    else {
      remap[vertex] = unique;
      representatives[unique] = vertex;
      nextCollision[unique] = head;
      heads.set(hash, unique + 1);
      unique++;
    }
  }
  const beforeBytes = byteCount(geometry);
  const afterBytes =
    attributes.reduce(
      (n, a) => n + unique * a.itemSize * a.array.BYTES_PER_ELEMENT,
      0,
    ) + geometry.index.array.byteLength;
  if (afterBytes > beforeBytes * 0.95) return null;
  const result = new THREE.BufferGeometry();
  result.name = geometry.name;
  result.userData = { ...geometry.userData };
  result.morphTargetsRelative = geometry.morphTargetsRelative;
  result.drawRange = { ...geometry.drawRange };
  result.groups = geometry.groups.map((group) => ({ ...group }));
  result.boundingBox = geometry.boundingBox?.clone() ?? null;
  result.boundingSphere = geometry.boundingSphere?.clone() ?? null;
  for (let i = 0; i < attributes.length; i++) {
    const previous = attributes[i];
    const array = new Float32Array(unique * previous.itemSize);
    const destination = new Uint32Array(array.buffer);
    for (let vertex = 0; vertex < unique; vertex++) {
      const source = representatives[vertex] * previous.itemSize;
      for (let component = 0; component < previous.itemSize; component++)
        destination[vertex * previous.itemSize + component] =
          bits[i][source + component];
    }
    const attribute = new THREE.BufferAttribute(
      array,
      previous.itemSize,
      previous.normalized,
    );
    attribute.name = previous.name;
    attribute.gpuType = previous.gpuType;
    attribute.setUsage(previous.usage);
    result.setAttribute(names[i], attribute);
  }
  const indexArray = new geometry.index.array.constructor(geometry.index.count);
  for (let i = 0; i < indexArray.length; i++)
    indexArray[i] = remap[geometry.index.array[i]];
  const index = new THREE.BufferAttribute(
    indexArray,
    geometry.index.itemSize,
    geometry.index.normalized,
  );
  index.name = geometry.index.name;
  index.gpuType = geometry.index.gpuType;
  index.setUsage(geometry.index.usage);
  result.setIndex(index);
  return {
    geometry: result,
    verticesBefore: count,
    verticesAfter: unique,
    bytesSaved: beforeBytes - afterBytes,
    collisions,
  };
}
function assertEquivalent(before, after) {
  assert.equal(before.index.count, after.index.count);
  assert.equal(before.index.array.constructor, after.index.array.constructor);
  for (const key of ['itemSize', 'normalized', 'gpuType', 'usage', 'name'])
    assert.equal(before.index[key], after.index[key]);
  assert.deepEqual(before.drawRange, after.drawRange);
  assert.deepEqual(before.groups, after.groups);
  assert.deepEqual(before.boundingBox, after.boundingBox);
  assert.deepEqual(before.boundingSphere, after.boundingSphere);
  assert.deepEqual(before.userData, after.userData);
  assert.deepEqual(
    Object.keys(before.attributes),
    Object.keys(after.attributes),
  );
  for (const name of Object.keys(before.attributes)) {
    const a = before.attributes[name];
    const b = after.attributes[name];
    for (const key of ['itemSize', 'normalized', 'gpuType', 'usage', 'name'])
      assert.equal(a[key], b[key]);
    assert.equal(a.array.constructor, b.array.constructor);
    const left = new Uint32Array(
      a.array.buffer,
      a.array.byteOffset,
      a.array.length,
    );
    const right = new Uint32Array(
      b.array.buffer,
      b.array.byteOffset,
      b.array.length,
    );
    for (let index = 0; index < before.index.count; index++)
      for (let component = 0; component < a.itemSize; component++) {
        assert.equal(
          left[before.index.array[index] * a.itemSize + component],
          right[after.index.array[index] * b.itemSize + component],
          `Expanded draw input differs at ${name}/${index}/${component}`,
        );
      }
  }
}
export function applyExperiment(root, verify = false) {
  const owners = new Map();
  root.traverse((object) => {
    if (!object.isMesh) return;
    if (!owners.has(object.geometry)) owners.set(object.geometry, []);
    owners.get(object.geometry).push(object);
  });
  const groups = {
    ladder: {
      checked: 0,
      changed: 0,
      milliseconds: 0,
      bytesSaved: 0,
      verticesBefore: 0,
      verticesAfter: 0,
    },
    projects: {
      checked: 0,
      changed: 0,
      milliseconds: 0,
      bytesSaved: 0,
      verticesBefore: 0,
      verticesAfter: 0,
    },
  };
  const records = [];
  for (const [geometry, users] of owners) {
    const scope = scopeOf(users[0]);
    if (
      !scope ||
      !users.every((object) => scopeOf(object) === scope && eligible(object))
    )
      continue;
    const group = groups[scope];
    group.checked++;
    const start = performance.now();
    const result = compact(geometry);
    group.milliseconds += performance.now() - start;
    if (!result) continue;
    group.changed++;
    group.bytesSaved += result.bytesSaved;
    group.verticesBefore += result.verticesBefore;
    group.verticesAfter += result.verticesAfter;
    if (verify) assertEquivalent(geometry, result.geometry);
    for (const object of users) object.geometry = result.geometry;
    records.push({
      name: users[0].name,
      scope,
      ...result,
      geometry: undefined,
    });
  }
  return { groups, records };
}
export function collisionFixture() {
  const geometry = new THREE.BufferGeometry();
  // Duplicate triangles, signed-zero seam and differing UV tuples all collide.
  const positions = new Float32Array([
    0, 0, 0, 1, 0, 0, 0, 1, 0, -0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0,
    1, 0,
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(new Float32Array(positions.length).fill(1), 3),
  );
  geometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(
      new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0.5, 0, 0, 1,
      ]),
      2,
    ),
  );
  geometry.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  geometry.setDrawRange(3, 6);
  geometry.addGroup(0, 3, 0);
  geometry.addGroup(3, 6, 1);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const result = compact(geometry, 0);
  assert.ok(result);
  assert.ok(result.collisions > 0);
  assert.equal(result.verticesAfter, 5);
  assertEquivalent(geometry, result.geometry);
}
function validateProduction() {
  const model = createSpacecraft(THREE);
  return applyExperiment(model.group, true);
}
function run(label, optimized) {
  globalThis.gc?.();
  const start = performance.now();
  const model = createSpacecraft(THREE);
  const constructionMs = performance.now() - start;
  const compactStart = performance.now();
  const details = optimized ? applyExperiment(model.group) : null;
  const compactionMs = optimized ? performance.now() - compactStart : 0;
  return {
    label,
    optimized,
    constructionMs,
    compactionMs,
    totalReadyMs: constructionMs + compactionMs,
    groups: details?.groups ?? null,
  };
}
async function main() {
  collisionFixture();
  const verification = validateProduction();
  run('warmup A', false);
  run('warmup B', true);
  const runs = [];
  for (const [i, optimized] of [
    false,
    true,
    true,
    false,
    false,
    true,
    true,
    false,
  ].entries())
    runs.push(run(`${optimized ? 'B' : 'A'}${i + 1}`, optimized));
  const average = (items, key) =>
    items.reduce((sum, row) => sum + row[key], 0) / items.length;
  const a = runs.filter((run) => !run.optimized),
    b = runs.filter((run) => run.optimized);
  console.log(
    JSON.stringify(
      {
        method:
          'Two ABBA sequences in one Node process after common module import and warmups. Explicit GC before each run outside the timer. A is model construction, B is the same model plus numeric-hash vertex compaction. No production files use this helper.',
        limits: [
          'CPU model-construction and compaction only; no browser CanvasTextures, GPU buffer uploads or rendering.',
          'Only immutable generic material batches >=512 vertices in Ladder utilities and Projects; apply only if geometry attribute+index bytes fall at least5%.',
          'Collision chains verify every original Uint32 IEEE-754 word. Full index-expanded attribute stream, metadata, groups, draw ranges and bounds are checked before timing.',
        ],
        verification: {
          forcedHashCollisions: 'passed, including signed zero and UV seams',
          productionExpandedInputs: 'all passed',
          ...verification,
        },
        runs,
        means: {
          baselineConstructionMs: average(a, 'constructionMs'),
          candidateConstructionMs: average(b, 'constructionMs'),
          candidateCompactionMs: average(b, 'compactionMs'),
          baselineReadyMs: average(a, 'totalReadyMs'),
          candidateReadyMs: average(b, 'totalReadyMs'),
        },
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
)
  await main();
