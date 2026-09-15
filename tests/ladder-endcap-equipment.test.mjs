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

const model = createSpacecraft(THREE);
const root = model.group.getObjectByName('ladder-end-circulation-returns');
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
  let x = Infinity;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i],
      b = contour[(i + 1) % contour.length];
    if (
      Math.abs(a.y - b.y) < 1e-10 ||
      y < Math.min(a.y, b.y) ||
      y > Math.max(a.y, b.y)
    )
      continue;
    x = Math.min(x, a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
  }
  return x;
};
const meshes = [];
root.traverse((o) => {
  if (o.isMesh) meshes.push(o);
});

test('Ladder end returns occupy both previously empty curved ends and remain clear of the terminal lamps and doors', () => {
  assert.equal(meshes.length, 3, 'Three material batches serve both ends');
  const triangles = meshes.reduce(
    (sum, m) =>
      sum +
      (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3,
    0,
  );
  assert(triangles < 8000, 'Keep the two broad fixtures inexpensive');
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    assert(Math.abs(bounds.min.y + bounds.max.y - 2 * LADDER_CENTER_Y) < 1e-5);
    assert(Math.abs(bounds.min.z + bounds.max.z) < 1e-5);
    const sides = new Set();
    for (const mesh of meshes) {
      const p = mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i),
          offset = Math.abs(y - LADDER_CENTER_Y);
        sides.add(Math.sign(y - LADDER_CENTER_Y));
        assert(
          offset > 2.29 && offset < 2.63,
          'Both fixtures sit in the axial end gaps',
        );
        assert(x < 0.42, 'The right-hand door wall remains unobstructed');
        assert(
          Math.abs(z) < 0.537,
          'Stay ahead of the rear terminal lights and behind the front reveal',
        );
        assert(
          x - wallX(y) >= -0.00201 && x - wallX(y) <= 0.07401,
          'The mounting profile follows the actual curved liner',
        );
      }
    }
    assert.deepEqual(sides, new Set([-1, 1]));
  }
});

test('Air returns are passive, share existing materials and follow the ladder brightness state', () => {
  model.update(1, '', true, { activeRoom: 'home', transitWalkway: false });
  const dim = meshes.map((m) => m.material.color.toArray());
  model.update(2, '', true, {
    activeRoom: 'about',
    travelling: true,
    transitWalkway: true,
  });
  for (const [i, m] of meshes.entries()) {
    assert(m.userData.excludePick);
    assert.equal(m.material.emissive.getHex(), 0);
    assert(!m.material.userData.exterior);
    m.material.color
      .toArray()
      .forEach((v, j) => assert(Math.abs(v - 2 * dim[i][j]) < 1e-8));
  }
  assert(!root.children.some((o) => o.isLight));
  assert(root.userData.layout.noLightsOrControls);
});
