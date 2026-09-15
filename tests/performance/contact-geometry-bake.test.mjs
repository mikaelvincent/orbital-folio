import assert from 'node:assert/strict';
import test from 'node:test';
import { bakeContactGeometry } from '../../scripts/benchmarks/contact-geometry-bake.mjs';

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const bounds = { min: [-0.4, -0.4, -0.05], max: [0.4, 0.4, 0.15] };
const settings = { radius: 0.32, samples: 16, maxEdge: 0.2 };
function plane(id, z = 0, receiver = true) {
  return {
    id, receiver, matrix: identity.slice(),
    position: [-0.3, -0.3, z, 0.3, -0.3, z, 0.3, 0.3, z, -0.3, 0.3, z],
    normal: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    uv: [0, 0, 1, 0, 1, 1, 0, 1], index: [0, 1, 2, 0, 2, 3],
  };
}
function bake(meshes, overrides = {}) {
  return bakeContactGeometry({ meshes, bounds, settings, ...overrides });
}
const byId = (result) => Object.fromEntries(result.meshes.map((mesh) => [mesh.id, mesh]));
const near = (actual, expected, tolerance = 1e-12) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

test('an isolated surface remains white and repeated sampling is deterministic', () => {
  const input = plane('clear');
  const first = bake([input]);
  const second = bake([input]);
  assert.deepEqual(first.meshes, second.meshes);
  assert.ok(first.meshes[0].ao.length > input.position.length / 3);
  assert.ok(first.meshes[0].ao.every((value) => value === 255));
  assert.equal(first.stats.rays, first.stats.uniqueSamples * settings.samples);
  assert.equal(first.stats.hitRays, 0);
  assert.equal(first.stats.uniqueSamples + first.stats.memoHits, first.stats.outputVertices);
  assert.equal(first.stats.outputTriangles, first.meshes[0].index.length / 3);
  for (const timing of Object.values(first.stats.timingsMs))
    assert.ok(Number.isFinite(timing) && timing >= 0);
});

test('nearby static occluders darken receivers, but surfaces beyond radius do not', () => {
  const clear = bake([plane('floor')]);
  const nearby = bake([plane('floor'), plane('overhead', 0.06, false)]);
  // This blocker remains inside bounds + radius, so whiteness cannot be explained
  // by coarse region rejection instead of finite ray-distance handling.
  const distant = bake([plane('floor'), plane('overhead', 0.35, false)]);
  assert.equal(nearby.meshes.length, 1);
  assert.equal(nearby.meshes[0].id, 'floor');
  assert.ok(nearby.stats.meanAo < clear.stats.meanAo - 50);
  assert.ok(nearby.stats.hitRays > 0);
  assert.equal(distant.stats.occluderTriangles, 4);
  assert.deepEqual(distant.meshes[0].ao, clear.meshes[0].ao);
  const outside = bake([plane('floor'), plane('far away', 10, false)]);
  assert.equal(outside.stats.rejectedOutsideTriangles, 2);
  assert.deepEqual(outside.meshes[0].ao, clear.meshes[0].ao);
});

test('preparation-only sizing preserves refinement and counts without casting or reporting baked AO', () => {
  const input = { meshes: [plane('floor'), plane('blocker', 0.06, false)], bounds, settings };
  const sized = bakeContactGeometry(input, { prepareOnly: true });
  const actual = bakeContactGeometry(input);
  assert.equal(sized.stats.preparationOnly, true);
  assert.equal(actual.stats.preparationOnly, false);
  for (const key of ['id', 'position', 'normal', 'uv', 'index'])
    assert.deepEqual(sized.meshes[0][key], actual.meshes[0][key]);
  assert.equal(sized.stats.uniqueSamples, actual.stats.uniqueSamples);
  assert.equal(sized.stats.outsideReceiverVertices, actual.stats.outsideReceiverVertices);
  assert.equal(sized.stats.plannedRays, actual.stats.rays);
  assert.equal(sized.stats.rays, 0);
  assert.equal(sized.stats.triangleTests, 0);
  assert.equal(sized.stats.bvhNodes, 0);
  assert.equal(sized.stats.timingsMs.sampling, 0);
  assert.ok(sized.stats.timingsMs.samplePreparation >= 0);
  assert.ok(sized.meshes[0].ao.every((value) => value === 255));
  assert.ok(actual.meshes[0].ao.some((value) => value < 255));
  assert.equal(sized.stats.meshes[0].newlyUniqueSamples, sized.stats.uniqueSamples);
  assert.equal(sized.stats.meshes[0].outputVertices, sized.stats.outputVertices);
});

test('mesh input ordering and coincident receivers do not change the bake by id', () => {
  const meshes = [plane('first'), plane('blocker', 0.08, false), plane('second')];
  const forwards = bake(meshes);
  const backwards = bake(meshes.slice().reverse());
  assert.deepEqual(byId(forwards), byId(backwards));
  assert.deepEqual(forwards.meshes[0].ao, forwards.meshes[1].ao);
  assert.ok(forwards.stats.memoHits > 0);
  assert.equal(forwards.stats.rays, forwards.stats.uniqueSamples * settings.samples);
});

test('world transforms affect sampling and subdivision without leaking into local output', () => {
  const original = bake([plane('receiver'), plane('blocker', 0.06, false)]);
  const translated = [plane('receiver'), plane('blocker', 0.06, false)];
  for (const mesh of translated) mesh.matrix.splice(12, 3, 2, 3, 4);
  const result = bake(translated, {
    bounds: { min: [1.6, 2.6, 3.95], max: [2.4, 3.4, 4.15] },
  });
  // Rays exactly on an occluder boundary can change hit status under translated
  // floating-point arithmetic. The baker promises local geometry preservation,
  // not a watertight or bit-exact, translation-invariant occlusion field.
  for (const key of ['id', 'position', 'normal', 'uv', 'index'])
    assert.deepEqual(result.meshes[0][key], original.meshes[0][key]);
  assert.ok(result.stats.meanAo < 200);
  assert.ok(result.stats.hitRays > 0);
  const scaled = plane('scaled');
  scaled.matrix[0] = 2;
  const scaledResult = bake([scaled], {
    bounds: { min: [-0.7, -0.4, -0.05], max: [0.7, 0.4, 0.15] },
  });
  assert.ok(scaledResult.stats.outputTriangles > bake([plane('scaled')]).stats.outputTriangles);
  assert.ok(scaledResult.stats.maximumOutputEdge <= settings.maxEdge + 1e-12);
  assert.ok(scaledResult.meshes[0].position.every((value, i) => i % 3 !== 0 || Math.abs(value) <= 0.3));
});

test('subdivision preserves area, winding, affine UV/normal fields and the original input', () => {
  const mesh = {
    id: 'triangle', receiver: true, matrix: identity.slice(),
    position: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    normal: [0, 0, 1, 1, 0, 1, 0, 1, 1],
    uv: [4, 5, 6, 4, 7, 7], index: [0, 1, 2],
  };
  const input = { meshes: [mesh], bounds: { min: [-0.1, -0.1, -0.1], max: [1.1, 1.1, 0.1] }, settings: { ...settings, maxEdge: 0.26 } };
  const untouched = structuredClone(input);
  const result = bakeContactGeometry(input);
  const output = result.meshes[0];
  assert.deepEqual(input, untouched);
  let twiceArea = 0;
  for (let i = 0; i < output.index.length; i += 3) {
    const [a, b, c] = output.index.slice(i, i + 3).map((index) => output.position.slice(index * 3, index * 3 + 3));
    const crossZ = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    assert.ok(crossZ > 0, 'subdivision must retain winding and nonzero triangle area');
    twiceArea += crossZ;
  }
  near(twiceArea, 1);
  for (let i = 0; i < output.position.length / 3; i++) {
    const [x, y, z] = output.position.slice(i * 3, i * 3 + 3);
    near(z, 0);
    near(output.uv[i * 2], 2 * x + 3 * y + 4);
    near(output.uv[i * 2 + 1], -x + 2 * y + 5);
    near(output.normal[i * 3], x);
    near(output.normal[i * 3 + 1], y);
    near(output.normal[i * 3 + 2], 1);
  }
  assert.ok(result.stats.maximumOutputEdge <= 0.26 + 1e-12);
  assert.equal(result.stats.subdivisionDepthLimitedTriangles, 0);
});

test('coincident positions keep separate UV seams even when their AO samples are reused', () => {
  const first = plane('seamed');
  const position = [...first.position, ...first.position];
  const mesh = { ...first, position, normal: [...first.normal, ...first.normal],
    uv: [...first.uv, ...first.uv.map((value) => value + 2)],
    index: [0, 1, 2, 4, 6, 7] };
  const result = bake([mesh]);
  const output = result.meshes[0];
  assert.deepEqual(output.position.slice(0, 12), output.position.slice(12, 24));
  assert.deepEqual(output.uv.slice(0, 8), first.uv);
  assert.deepEqual(output.uv.slice(8, 16), first.uv.map((value) => value + 2));
  assert.ok(result.stats.memoHits > 0);
  assert.equal(output.ao[0], output.ao[4]);
});

test('unindexed receivers are supported and empty input is reported without fabricated AO', () => {
  const indexed = plane('triangle');
  indexed.index = [0, 1, 2];
  const unindexed = { ...indexed, position: indexed.position.slice(0, 9), normal: indexed.normal.slice(0, 9), uv: indexed.uv.slice(0, 6) };
  delete unindexed.index;
  const result = bake([unindexed]);
  assert.equal(result.stats.receiverInputTriangles, 1);
  assert.ok(result.meshes[0].ao.every((value) => value === 255));
  const empty = bake([]);
  assert.deepEqual(empty.meshes, []);
  assert.equal(empty.stats.rays, 0);
  assert.equal(empty.stats.meanAo, null);
  assert.equal(empty.stats.minimumAo, null);
});

test('malformed geometry, unsafe settings and exhausted work budgets fail explicitly', () => {
  const malformed = [
    { ...plane('invalid'), position: [0, 0] },
    { ...plane('invalid'), normal: [] },
    { ...plane('invalid'), uv: [0, 0] },
    { ...plane('invalid'), index: [0, 1, 99] },
    { ...plane('invalid'), index: [0, 1] },
    { ...plane('invalid'), matrix: identity.map(() => 0) },
    { ...plane('invalid'), position: [NaN, ...plane('invalid').position.slice(1)] },
    { ...plane('invalid'), normal: plane('invalid').normal.map(() => 0) },
  ];
  for (const mesh of malformed) assert.throws(() => bake([mesh]));
  assert.throws(() => bake([plane('duplicate'), plane('duplicate')]));
  assert.throws(() => bake([plane('invalid')], { bounds: { min: [0, 0, 0], max: [0, 1, 1] } }));
  for (const override of [{ radius: 0 }, { samples: 1.5 }, { samples: 4097 }, { originBias: 0.5 }, { maxSubdivisionDepth: 31 }])
    assert.throws(() => bake([plane('invalid')], { settings: { ...settings, ...override } }));
  for (const limit of [{ maxOutputVertices: 4 }, { maxOutputTriangles: 1 }, { maxUniqueSamples: 1 }, { maxOccluderTriangles: 1 }])
    assert.throws(() => bake([plane('bounded')], { settings: { ...settings, ...limit } }), /budget exceeded/);
});

test('a deliberate subdivision depth limit reports incomplete refinement', () => {
  const result = bake([plane('depth limited')], { settings: { ...settings, maxEdge: 0.01, maxSubdivisionDepth: 1 } });
  assert.ok(result.stats.subdivisionDepthLimitedTriangles > 0);
  assert.ok(result.stats.maximumOutputEdge > 0.01);
  assert.ok(result.meshes[0].ao.every((value) => value === 255));
});

test('large outside receiver triangles stay coarse and white without consuming ray budget', () => {
  const outside = {
    id: 'outside', receiver: true, matrix: identity.slice(),
    position: [10, 0, 0, 100, 0, 0, 10, 100, 0],
    normal: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    uv: [0, 0, 1, 0, 0, 1], index: [0, 1, 2],
  };
  const result = bake([outside], { settings: { ...settings, maxUniqueSamples: 1, maxOutputVertices: 3, maxOutputTriangles: 1 } });
  const { matrix: _matrix, receiver: _receiver, ...expected } = outside;
  assert.deepEqual(result.meshes[0], { ...expected, ao: [255, 255, 255] });
  assert.equal(result.stats.outsideReceiverVertices, 3);
  assert.equal(result.stats.outsideReceiverTriangles, 1);
  assert.equal(result.stats.subdivisionSplits, 0);
  assert.equal(result.stats.rays, 0);
  assert.equal(result.stats.uniqueSamples, 0);
  assert.equal(result.stats.maximumRefinedRegionEdge, 0);
  assert.ok(result.stats.maximumOutputEdge > 100);
});

test('triangles spanning the room refine only its region and retain valid coverage', () => {
  const spanning = {
    id: 'spanning', receiver: true, matrix: identity.slice(),
    position: [-2, -2, 0, 2, -2, 0, 0, 2, 0],
    normal: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    uv: [-2, -2, 2, -2, 0, 2], index: [0, 1, 2],
  };
  const input = structuredClone(spanning);
  const result = bake([spanning, plane('blocker', 0.06, false)]);
  const output = result.meshes[0];
  assert.deepEqual(spanning, input);
  assert.ok(result.stats.outsideReceiverTriangles > 0);
  assert.ok(result.stats.outsideReceiverVertices > 0);
  assert.ok(result.stats.uniqueSamples > 0);
  assert.ok(result.stats.maximumRefinedRegionEdge <= settings.maxEdge + 1e-12);
  assert.ok(result.stats.maximumOutputEdge > settings.maxEdge);
  assert.equal(result.stats.outsideReceiverVertices + result.stats.uniqueSamples + result.stats.memoHits, result.stats.outputVertices);
  let twiceArea = 0, shadedInside = 0, outsideVertices = 0;
  for (let i = 0; i < output.index.length; i += 3) {
    const [a, b, c] = output.index.slice(i, i + 3).map((index) => output.position.slice(index * 3, index * 3 + 3));
    const crossZ = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    assert.ok(crossZ > 0);
    twiceArea += crossZ;
  }
  near(twiceArea, 16);
  for (let i = 0; i < output.position.length / 3; i++) {
    const point = output.position.slice(i * 3, i * 3 + 3);
    near(output.uv[i * 2], point[0]);
    near(output.uv[i * 2 + 1], point[1]);
    const outside = point.some((value, axis) => value < bounds.min[axis] || value > bounds.max[axis]);
    if (outside) {
      outsideVertices++;
      assert.equal(output.ao[i], 255);
    } else if (output.ao[i] < 255) shadedInside++;
  }
  assert.equal(outsideVertices, result.stats.outsideReceiverVertices);
  assert.ok(shadedInside > 0);
});
