import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createModelPrimitives } from '../../features/spacecraft/geometry/model-primitives.ts';

test('Bevel detail follows radius while retaining closed bounds, smooth normals and face UVs', () => {
  const { roundedGeometry } = createModelPrimitives(
    THREE,
    new THREE.Group(),
    undefined,
    {},
  );
  for (const [w, h, d, r, triangles] of [
    [2, 0.12, 0.12, 0.008, 300],
    [2, 0.2, 0.2, 0.035, 588],
    [2, 0.4, 0.4, 0.08, 972],
    [0.2, 0.2, 0.2, 0.035, 300],
  ]) {
    const g = roundedGeometry(w, h, d, r);
    assert.equal(g.index.count / 3, triangles);
    g.computeBoundingBox();
    for (const [axis, length] of [
      ['x', w],
      ['y', h],
      ['z', d],
    ]) {
      assert.ok(Math.abs(g.boundingBox.min[axis] + length / 2) < 1e-7);
      assert.ok(Math.abs(g.boundingBox.max[axis] - length / 2) < 1e-7);
    }
    const p = g.attributes.position,
      n = g.attributes.normal,
      uv = g.attributes.uv;
    const edges = new Map();
    const vertexKey = (i) =>
      [p.getX(i), p.getY(i), p.getZ(i)]
        .map((v) => Math.round(v * 1e7))
        .join(',');
    for (let i = 0; i < g.index.count; i += 3) {
      const ids = [0, 1, 2].map((j) => g.index.getX(i + j));
      const vs = ids.map((j) => new THREE.Vector3().fromBufferAttribute(p, j));
      assert.ok(
        vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])).lengthSq() >
          1e-20,
      );
      for (let j = 0; j < 3; j++) {
        const key = [vertexKey(ids[j]), vertexKey(ids[(j + 1) % 3])]
          .sort()
          .join('|');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    assert.ok(
      [...edges.values()].every((count) => count === 2),
      'closed bevels have no cracks',
    );
    for (let i = 0; i < p.count; i++) {
      assert.ok(
        Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) <
          1e-6,
      );
      assert.ok(
        uv.getX(i) >= -1e-7 &&
          uv.getX(i) <= 1 + 1e-7 &&
          uv.getY(i) >= -1e-7 &&
          uv.getY(i) <= 1 + 1e-7,
      );
    }
    assert.equal(
      roundedGeometry(w, h, d, r),
      g,
      'shared geometry stays cached',
    );
  }
});
