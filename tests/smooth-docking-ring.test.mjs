import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildSmoothDockingRing } from '../components/smooth-docking-ring.ts';
import { createSpacecraft } from '../components/spacecraft-model.ts';

function checkRadialNormal(point, normal, outward) {
  const length = Math.hypot(normal.y, normal.z);
  if (length < 1e-7) return false;
  const radius = Math.hypot(point.y, point.z);
  const aligned = (normal.y * point.y + normal.z * point.z) / (length * radius);
  assert.ok(
    Math.abs(aligned - (outward ? 1 : -1)) < 2e-6,
    'Shading follows the circular surface, never an individual polygon face',
  );
  assert.ok(
    Math.abs(normal.length() - 1) < 2e-6,
    'Smoothed normals remain unit length',
  );
  return true;
}

for (const [name, outer, inner, depth] of [
  ['pressure mount', 1.06, 0.915, 0.3],
  ['retaining ring', 1.011, 0.91, 0.06],
]) {
  test(`${name} has continuous radial shading, flat mating faces and a closed clear bore`, () => {
    const geometry = buildSmoothDockingRing(THREE, outer, inner, depth);
    const p = geometry.getAttribute('position'),
      n = geometry.getAttribute('normal');
    geometry.computeBoundingBox();
    assert.ok(Math.abs(geometry.boundingBox.min.x + depth / 2 + 0.008) < 1e-7);
    assert.ok(Math.abs(geometry.boundingBox.max.x - depth / 2 - 0.008) < 1e-7);
    assert.ok(
      Math.abs(geometry.boundingBox.max.y - outer - 0.008) < 0.000005,
      'The original nominal radius and small bevel are preserved',
    );
    const edges = new Map();
    let smoothed = 0,
      flat = 0;
    for (let i = 0; i < p.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(p, i);
      const normal = new THREE.Vector3().fromBufferAttribute(n, i);
      assert.ok(
        [...point.toArray(), ...normal.toArray()].every(Number.isFinite),
      );
      if (
        checkRadialNormal(
          point,
          normal,
          Math.hypot(point.y, point.z) > (inner + outer) / 2,
        )
      )
        smoothed++;
      else {
        assert.ok(
          Math.abs(normal.x) > 0.999999,
          'The mounting faces remain flat',
        );
        flat++;
      }
    }
    for (let i = 0; i < p.count; i += 3) {
      const triangle = [0, 1, 2].map((offset) =>
        new THREE.Vector3().fromBufferAttribute(p, i + offset),
      );
      assert.ok(new THREE.Triangle(...triangle).getArea() > 1e-12);
      const keys = triangle.map((point) =>
        point
          .toArray()
          .map((v) => Math.round(v * 1e6))
          .join(':'),
      );
      for (let edge = 0; edge < 3; edge++) {
        const key = [keys[edge], keys[(edge + 1) % 3]].sort().join('|');
        edges.set(key, (edges.get(key) || 0) + 1);
      }
    }
    assert.ok(
      smoothed > 1000 && flat > 100,
      'Both curved and planar surfaces are covered',
    );
    assert.ok(
      [...edges.values()].every((count) => count === 2),
      'All ring surfaces remain watertight',
    );
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    mesh.updateMatrixWorld(true);
    assert.equal(
      new THREE.Raycaster(
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(1, 0, 0),
      ).intersectObject(mesh).length,
      0,
      'The central bore is unchanged and remains open',
    );
    for (let i = 0; i < 96; i++) {
      const angle = ((i + 0.5) * Math.PI * 2) / 96;
      const direction = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle));
      const hit = new THREE.Raycaster(
        direction.clone().multiplyScalar(outer + 0.5),
        direction.clone().negate(),
        0,
        0.7,
      ).intersectObject(mesh)[0];
      assert.ok(hit);
      assert.ok(
        Math.abs(hit.point.length() - outer - 0.008) < 0.0006,
        'Circumference chords remain below six ten-thousandths of a model unit',
      );
    }
  });
}

test('Production docking mount preserves radial normals through batching and both layouts', () => {
  const model = createSpacecraft(THREE);
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const docking = model.group.getObjectByName('central-docking-assembly');
    const inverse = docking.matrixWorld.clone().invert();
    let inspected = 0;
    docking.traverse((object) => {
      if (
        !object.isMesh ||
        ![object.name, ...(object.userData.parts || [])].includes(
          'coaxial-docking-load-bearing-mount',
        )
      )
        return;
      const matrix = inverse.clone().multiply(object.matrixWorld);
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
      const p = object.geometry.getAttribute('position'),
        n = object.geometry.getAttribute('normal');
      for (let i = 0; i < p.count; i++) {
        const point = new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .applyMatrix4(matrix)
          .sub(new THREE.Vector3(-4.58, 0.03, 0));
        if (Math.abs(point.x) > 0.159 || Math.hypot(point.y, point.z) < 1.059)
          continue;
        const normal = new THREE.Vector3()
          .fromBufferAttribute(n, i)
          .applyMatrix3(normalMatrix)
          .normalize();
        if (checkRadialNormal(point, normal, true)) inspected++;
      }
    });
    assert.ok(
      inspected > 1000,
      `${layout}: inspect the actual rendered cream mount`,
    );
  }
});
