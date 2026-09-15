import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import {
  wallLayout,
  PRESSURE_THROAT_START,
} from '../lib/spacecraft-wall-layout.ts';

const equipment = (model, layout) => {
  const root = model.group.getObjectByName(
    layout + '-exterior-thermal-equipment',
  );
  assert(root, 'Exposed roof has paired thermal-control trays');
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  return { root, meshes };
};

test('Roof thermal trays remain seated, symmetric and clear of the cutaway and end modules in both layouts', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  for (const layout of ['wide', 'compact']) {
    const s = layout === 'wide' ? 1.4 : 1,
      d = wallLayout(s);
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const { root, meshes } = equipment(model, layout),
      bounds = new THREE.Box3().setFromObject(root);
    assert(
      Math.abs(bounds.min.x + bounds.max.x) < 1e-6,
      'Paired carrier footprints balance around the cabin columns',
    );
    assert(
      bounds.min.x > d.leftCabinWall + 0.45 * s,
      'Keep the docking shoulder and approach free',
    );
    assert(
      bounds.max.x < d.rightX - 0.5 * s,
      'Keep the service module and solar hinge envelope free',
    );
    assert(
      bounds.max.z < PRESSURE_THROAT_START - 0.7,
      'No hardware overlaps the visible cutaway or room labels',
    );
    assert(bounds.min.z > -0.6, 'Do not decorate the hidden rear');
    assert(
      bounds.min.y > d.roof - 0.003 && bounds.max.y < d.roof + 0.101,
      'Mount only on the exposed roof, with less than .1 projection',
    );
    for (const mesh of meshes) {
      const p = mesh.geometry.getAttribute('position'),
        n = mesh.geometry.getAttribute('normal');
      for (let i = 0; i < p.count; i++) {
        assert(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)));
        assert(
          Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 1e-5,
          'Surface normals remain finite and unit length',
        );
        assert(
          p.getY(i) >= d.roof - 0.00201,
          'Only mounting flanges embed by .002; do not cut into the liner',
        );
      }
    }
  }
});

test('Thermal decoration adds four passive material batches without textures or moving objects', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const { root, meshes } = equipment(model, 'wide');
  assert.equal(meshes.length, 4);
  let triangles = 0;
  for (const mesh of meshes) {
    triangles +=
      (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) /
      3;
    assert(mesh.userData.excludePick);
    assert(mesh.material.userData.exterior);
    assert.equal(mesh.material.emissive.getHex(), 0);
    assert.equal(mesh.material.map, null);
    assert.equal(mesh.material.normalMap, null);
    assert.equal(mesh.material.bumpMap, null);
  }
  assert(
    triangles <= 4000,
    'Keep the complete rooftop addition below four thousand triangles',
  );
  assert.equal(root.userData.layout.sourceParts, 24);
  assert.equal(root.userData.layout.hiddenRearGeometry, false);
  const before = meshes.map((m) => m.material.color.toArray());
  model.update(1, 'about', true, { activeRoom: 'about', hoveredWalkway: true });
  meshes.forEach((m, i) =>
    assert.deepEqual(
      m.material.color.toArray(),
      before[i],
      'Interior hover does not brighten exterior hardware',
    ),
  );
});

test('Both roof trays are exposed from supported landscape and portrait camera positions', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  model.setLayout('wide');
  model.group.updateMatrixWorld(true);
  const { root, meshes } = equipment(model, 'wide'),
    roof = new Set(meshes),
    sceneMeshes = [];
  model.group.traverseVisible((o) => {
    if (o.isMesh && !o.userData.isInteractionProxy) sceneMeshes.push(o);
  });
  const points = root.userData.layout.parts
    .filter((p) => p.name === 'ceramic-louver-vane')
    .map(
      (p) =>
        new THREE.Vector3(
          (p.bounds[0][0] + p.bounds[1][0]) / 2,
          (p.bounds[0][1] + p.bounds[1][1]) / 2 + 0.005,
          (p.bounds[0][2] + p.bounds[1][2]) / 2,
        ),
    );
  // Physical positions from the candidate fit with conservative UI insets.
  // Portrait has already undone the virtual 90-degree view roll.
  const eyes = [
    [-8.416, 4.901, 23.239],
    [-7.009, 4.186, 20.364],
    [5.795, 3.509, 34.77],
  ];
  const ray = new THREE.Raycaster();
  for (const position of eyes) {
    const eye = new THREE.Vector3(...position);
    let visible = 0;
    for (const point of points) {
      ray.set(eye, point.clone().sub(eye).normalize());
      const hit = ray.intersectObjects(sceneMeshes, false)[0];
      // A nearer vane in the same tray may occlude the target point.
      // This verifies both tray groups are exposed, not every individual vane.
      if (
        hit &&
        roof.has(hit.object) &&
        Math.sign(hit.point.x) === Math.sign(point.x)
      )
        visible++;
    }
    assert.equal(
      visible,
      12,
      'All sample rays reach their intended roof tray before other scene geometry',
    );
  }
});
