import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as THREE from 'three';
import { indexedCylinderType } from '../../features/spacecraft/geometry/indexed-cylinder.generated.js';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  assertGeometryEquivalent,
  meshes,
  inventory,
  disposeModel,
} from '../../scripts/benchmarks/geometry-compaction-utils.mjs';

const IndexedCylinder = indexedCylinderType(THREE);
void test('Offline specialization is reproducible from the installed Three source', () => {
  execFileSync(process.execPath, [
    'scripts/generate-indexed-cylinder.mjs',
    '--check',
  ]);
});
void test('Indexed cylinders preserve exact surfaces, seams, groups, bounds and serialization across parameters', () => {
  const inputs = [
    [0.1, 0.1, 1, 16],
    [0, 0.2, 0.9, 24, 3],
    [0.2, 0, 1.1, 32, 2],
    [0.04, 0.09, 0.031, 12, 1, true],
    [0.2, 0.1, 0.4, 40, 4, false, 0.7, 3.8],
    [0.3, 0.3, 0.002, 6, 1, false, -0.4, 1.2],
    [0.001, 0.002, 4, 5, 2],
  ];
  for (let i = 1; i <= 24; i++)
    inputs.push([
      i / 97,
      (25 - i) / 79,
      i / 13,
      [6, 8, 12, 16, 20, 24, 32, 40][i % 8],
      1 + (i % 4),
      i % 3 === 0,
      i / 23,
      Math.PI * (0.5 + (i % 3)),
    ]);
  for (const args of inputs) {
    const before = new THREE.CylinderGeometry(...args),
      after = new IndexedCylinder(...args);
    assertGeometryEquivalent(before, after, JSON.stringify(args));
    assert.deepEqual(after.parameters, before.parameters);
    assert.equal(after.type, before.type);
    const serialized = after.toJSON();
    const clone = after.clone(),
      roundTrip = IndexedCylinder.fromJSON(serialized);
    assertGeometryEquivalent(after, clone, 'clone');
    assertGeometryEquivalent(after, roundTrip, 'JSON');
    if (!args[5])
      assert(
        after.attributes.position.count < before.attributes.position.count,
      );
    [before, after, clone, roundTrip].forEach((g) => g.dispose());
  }
});
void test('Unusual unsupported inputs retain Three constructor behavior', () => {
  for (const args of [
    [0.2, 0.2, 0, 16],
    [-1, 0.1, 1, 8],
    [0.2, 0.1, 1, 2],
    [0.2, 0.1, 1, 8, 0],
  ]) {
    const a = new THREE.CylinderGeometry(...args),
      b = new IndexedCylinder(...args);
    for (const key of Object.keys(a.attributes))
      assert.deepEqual(b.attributes[key].array, a.attributes[key].array);
    assert.deepEqual(b.index.array, a.index.array);
    a.dispose();
    b.dispose();
  }
});
void test('Index narrowing respects the reserved 65535 boundary and preserves every triangle', () => {
  const a = new THREE.CylinderGeometry(0.2, 0.2, 1, 10922),
    b = new IndexedCylinder(0.2, 0.2, 1, 10922);
  assert(a.index.array instanceof Uint32Array);
  assert(b.index.array instanceof Uint16Array);
  assertGeometryEquivalent(a, b, 'index width');
  a.dispose();
  b.dispose();
});
void test('Actual complete spacecraft keeps every triangle input and ownership in both layouts and editable configurations', () => {
  for (const config of [
    {},
    {
      accent: '#476cc2',
      vesselName: 'AN EDITED VESSEL',
      labels: { about: 'Personal archive', projects: 'Selected work' },
      projects: [{ title: 'Changed project', slug: 'changed' }],
      caseStudies: [{ title: 'Changed study', slug: 'study' }],
      projectPageSize: 3,
    },
  ]) {
    const before = createSpacecraft(THREE, {
      ...config,
      geometryCompaction: false,
    });
    const after = createSpacecraft(THREE, {
      ...config,
      geometryCompaction: true,
    });
    for (const layout of ['wide', 'compact', 'wide']) {
      before.setLayout(layout);
      after.setLayout(layout);
      const a = meshes(before.group),
        b = meshes(after.group);
      assert.equal(b.length, a.length);
      for (let i = 0; i < a.length; i++) {
        for (const key of [
          'name',
          'visible',
          'castShadow',
          'receiveShadow',
          'renderOrder',
          'frustumCulled',
        ])
          assert.equal(b[i][key], a[i][key]);
        assert.deepEqual(b[i].matrix.elements, a[i].matrix.elements);
        assert.deepEqual(b[i].userData, a[i].userData);
        assert.deepEqual(b[i].layers.mask, a[i].layers.mask);
        assertGeometryEquivalent(
          a[i].geometry,
          b[i].geometry,
          `${layout}/${a[i].name}`,
        );
        if (a[i].isInstancedMesh) {
          assert.equal(b[i].count, a[i].count);
          assert.deepEqual(
            b[i].instanceMatrix.array,
            a[i].instanceMatrix.array,
          );
        }
      }
      assert(
        inventory(after.group).geometryBytes <
          inventory(before.group).geometryBytes,
      );
      assert.equal(
        inventory(after.group).triangles,
        inventory(before.group).triangles,
      );
      assert.deepEqual(
        after.group.userData.portals,
        before.group.userData.portals,
      );
    }
    disposeModel(before);
    disposeModel(after);
  }
});
