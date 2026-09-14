import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { ladderOpeningOutline } from '../components/ladder-opening-outline.ts';
import {
  LADDER_CENTER_Y,
  LADDER_HEIGHT,
  LADDER_SHOULDER_RUN,
  LADDER_SHOULDER_RISE,
  LADDER_RIGHT_RADIUS,
} from '../lib/spacecraft-wall-layout.ts';

const contour = ladderOpeningOutline(new THREE.Shape(), {
  width: 1.33,
  height: LADDER_HEIGHT,
  leftWidth: LADDER_SHOULDER_RUN,
  leftHeight: LADDER_SHOULDER_RISE,
  rightRadius: LADDER_RIGHT_RADIUS,
  rightEdge: 0.69,
})
  .getPoints(64)
  .map((p) => p.add(new THREE.Vector2(0, LADDER_CENTER_Y)));
const wallX = (y) => {
  let left = Infinity;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i],
      b = contour[(i + 1) % contour.length];
    if (
      Math.abs(a.y - b.y) < 1e-10 ||
      y < Math.min(a.y, b.y) ||
      y > Math.max(a.y, b.y)
    )
      continue;
    left = Math.min(left, a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
  }
  return left;
};
const cassetteMeshes = (model) => {
  const root = model.group.getObjectByName(
    'docking-shoulder-service-cassettes',
  );
  assert(root, 'Docking bay has the matching pressure-service cassettes');
  const meshes = [];
  root.traverse((object) => {
    if (object.isMesh) meshes.push(object);
  });
  return { root, meshes };
};

test('Docking service cassettes stay mirrored, seated on the curved wall and clear of the hatch in both layouts', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const { root, meshes } = cassetteMeshes(model);
  assert(
    meshes.length <= 4,
    'Static fittings stay within four material batches',
  );
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    assert(Math.abs(bounds.min.y + bounds.max.y - 2 * LADDER_CENTER_Y) < 1e-5);
    assert(
      Math.abs(bounds.min.z + bounds.max.z) < 1e-5,
      'Both share the docking hatch depth axis',
    );
    for (const mesh of meshes) {
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i),
          y = positions.getY(i),
          z = positions.getZ(i);
        const projection = x - wallX(y);
        assert(
          projection >= -0.00201 && projection <= 0.11801,
          'Each fitting remains flush with the actual curved liner',
        );
        assert(
          Math.abs(y - LADDER_CENTER_Y) >= 1.32999,
          'Keep at least .34 clearance outside the docking hatch',
        );
        assert(
          Math.abs(z) <= 0.35501,
          'Keep the existing rear service spine and front rim unobstructed',
        );
      }
    }
  }
});

test('Docking fittings follow the walkway dimmer and remain passive, disposable scene geometry', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const { meshes } = cassetteMeshes(model);
  model.update(1, '', true, { activeRoom: 'home', transitWalkway: false });
  const dim = meshes.map((mesh) => mesh.material.color.toArray());
  model.update(2, '', true, {
    activeRoom: 'about',
    travelling: true,
    transitWalkway: true,
  });
  for (const [i, mesh] of meshes.entries()) {
    mesh.material.color
      .toArray()
      .forEach((value, axis) =>
        assert(Math.abs(value - 2 * dim[i][axis]) < 1e-8),
      );
    assert.equal(mesh.userData.section, 'walkway');
    assert(mesh.userData.excludePick);
    assert(!mesh.material.userData.exterior);
    assert.equal(mesh.material.emissive.getHex(), 0);
  }
  const disposed = { materials: 0, geometries: 0 };
  for (const mesh of meshes) {
    mesh.material.addEventListener('dispose', () => disposed.materials++);
    mesh.geometry.addEventListener('dispose', () => disposed.geometries++);
  }
  const materials = new Set(),
    geometries = new Set();
  model.group.traverse((object) => {
    if (object.isMesh) {
      materials.add(object.material);
      geometries.add(object.geometry);
    }
  });
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  assert.equal(disposed.materials, meshes.length);
  assert.equal(disposed.geometries, meshes.length);
});
