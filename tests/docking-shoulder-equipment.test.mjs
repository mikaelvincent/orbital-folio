import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { buildDockingShoulderEquipment } from '../components/docking-shoulder-equipment.ts';
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
const equipment = (model) => {
  const root = model.group.getObjectByName('docking-shoulder-rescue-torches');
  assert(root);
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  return { root, meshes };
};

test('Both holstered torches have open optics, graspable barrels and restrained hardware instead of generic covers', () => {
  const model = createSpacecraft(THREE),
    { root, meshes } = equipment(model),
    names = root.userData.layout.parts;
  assert.equal(root.userData.layout.torches.length, 2);
  for (const name of [
    'torch-graspable-barrel',
    'torch-flared-optical-head',
    'torch-open-optical-bezel',
    'torch-recessed-reflector',
    'torch-pale-optic',
    'holster-quick-release-lever',
  ])
    assert.equal(names.filter((n) => n === name).length, 2);
  assert.equal(names.filter((n) => n === 'holster-open-saddle').length, 4);
  assert(!names.some((n) => /cover|cassette|grille|vent|airfoil/.test(n)));
  assert.equal(meshes.length, 4);
});

test('Torches and open brackets follow the curved wall and retain hatch, ladder and end-equipment clearance', () => {
  const model = createSpacecraft(THREE),
    { root, meshes } = equipment(model);
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(root);
    assert(
      Math.abs(b.min.y + b.max.y - 2 * LADDER_CENTER_Y) < 1e-5,
      'One mirrored torch is mounted per deck',
    );
    for (const mesh of meshes) {
      const p = mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i),
          projection = x - wallX(y),
          dy = Math.abs(y - LADDER_CENTER_Y);
        assert(Number.isFinite(x + y + z));
        assert(
          projection >= -0.006 && projection < 0.36,
          'Only the fitted anchors enter the wall; objects stay within the shoulder equipment envelope',
        );
        assert(
          dy > 1.11 && dy < 2.01,
          'The docking hatch and end fixtures remain clear',
        );
        assert(
          z > -0.26 && z < 0.3,
          'Keep clear of the rear ladder spine and front reveal',
        );
      }
    }
    for (const mount of root.userData.layout.mounts)
      assert(Math.abs(mount.skin[0] - wallX(mount.skin[1])) < 1e-8);
  }
});

test('Only bonded feet and post ends intersect the liner; torch bodies and open saddles stand clear', () => {
  const parent = new THREE.Group();
  const h = {
    mesh(geometry, material, parent, name) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      parent.add(mesh);
      return mesh;
    },
    box(w, h, d, material, x, y, z, parent, _radius, name) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.name = name;
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
  };
  const root = buildDockingShoulderEquipment(
    THREE,
    h,
    parent,
    contour,
    LADDER_CENTER_Y,
  );
  for (const mesh of root.children) {
    const anchor = /holster-(bonded-mount-foot|rigid-post)$/.test(mesh.name),
      p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const offset = p.getX(i) - wallX(p.getY(i));
      assert(
        offset >= (anchor ? -0.006 : 0.1),
        `${mesh.name} keeps its designed stand-off; only anchor ends embed in the wall`,
      );
    }
  }
});

test('The recessed pale lenses face into the cabin and are not hidden behind a solid head cap', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  model.group.updateMatrixWorld(true);
  const { root, meshes } = equipment(model),
    ray = new THREE.Raycaster();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(root.matrixWorld);
  for (const torch of root.userData.layout.torches) {
    assert(
      torch.axis[2] > 0.5,
      'Both heads tilt forward, including the lower torch',
    );
    const p = new THREE.Vector3(...torch.lens).applyMatrix4(root.matrixWorld),
      n = new THREE.Vector3(...torch.axis)
        .applyMatrix3(normalMatrix)
        .normalize();
    ray.set(p.clone().addScaledVector(n, 0.4), n.clone().negate());
    ray.far = 0.55;
    const hit = ray.intersectObjects(meshes, false)[0];
    assert(hit);
    assert.equal(
      hit.object.material.name,
      'docking-shoulder-torch-pale-optics',
      'Hollow bezel exposes the optic instead of a cylinder cap',
    );
  }
});

test('The inactive rescue torches remain passive, nonemissive and follow the walkway dimmer', () => {
  const model = createSpacecraft(THREE),
    { root, meshes } = equipment(model);
  model.update(1, '', true, { activeRoom: 'home', transitWalkway: false });
  const dim = meshes.map((m) => m.material.color.toArray());
  model.update(2, '', true, {
    activeRoom: 'about',
    travelling: true,
    transitWalkway: true,
  });
  for (const [i, m] of meshes.entries()) {
    assert(m.userData.excludePick);
    assert(!m.material.userData.exterior);
    assert.equal(m.material.emissive.getHex(), 0);
    assert.equal(m.material.map, null);
    m.material.color
      .toArray()
      .forEach((v, j) => assert(Math.abs(v - 2 * dim[i][j]) < 1e-8));
  }
  assert(!root.children.some((o) => o.isLight));
  const disposed = { materials: 0, geometries: 0 };
  for (const m of meshes) {
    m.material.addEventListener('dispose', () => disposed.materials++);
    m.geometry.addEventListener('dispose', () => disposed.geometries++);
    m.material.dispose();
    m.geometry.dispose();
  }
  assert.equal(disposed.materials, 4);
  assert.equal(disposed.geometries, 4);
});
