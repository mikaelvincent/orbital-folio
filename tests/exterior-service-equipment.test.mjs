import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import {
  wallLayout,
  PRESSURE_THROAT_START,
  LADDER_CENTER_Y,
} from '../lib/spacecraft-wall-layout.ts';
const equipment = (model, layout) => {
  const root = model.group.getObjectByName(
    layout + '-exterior-service-equipment',
  );
  assert(root);
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  return { root, meshes };
};

test('Solid exterior panels fit the exposed roof and docking shoulder without touching either passage', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const d = wallLayout(layout === 'wide' ? 1.4 : 1),
      { root, meshes } = equipment(model, layout);
    const bounds = new THREE.Box3().setFromObject(root);
    assert(
      bounds.max.z < PRESSURE_THROAT_START - 0.18,
      'All exterior pieces stop before the front cutaway',
    );
    assert(bounds.min.z > -0.6, 'No hidden rear panels');
    assert(bounds.max.x < d.rightX - 0.5, 'Service module remains clear');
    const roof = root.userData.layout.parts.filter((p) => p.surface === 'roof');
    const topBounds = roof.map((p) => p.bounds);
    assert(
      Math.abs(
        Math.min(...topBounds.map((b) => b[0][0])) +
          Math.max(...topBounds.map((b) => b[1][0])),
      ) < 1e-5,
    );
    for (const part of root.userData.layout.parts) {
      assert(!/louver|louvre|grille|vent|airfoil|intake/.test(part.name));
      if (part.surface === 'roof') {
        assert(part.bounds[0][1] >= d.roof - 0.00201);
        assert(part.bounds[1][1] <= d.roof + 0.1);
      } else {
        assert(
          Math.min(
            Math.abs(part.bounds[0][1] - LADDER_CENTER_Y),
            Math.abs(part.bounds[1][1] - LADDER_CENTER_Y),
          ) > 1.4,
          'Docking sleeve is clear of the shoulder covers',
        );
      }
    }
    for (const mesh of meshes) {
      const p = mesh.geometry.attributes.position,
        n = mesh.geometry.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        assert(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)));
        assert(
          Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 1e-5,
        );
      }
    }
  }
});

test('Exterior access shields share four existing materials and stay passive within a modest triangle budget', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' }),
    { root, meshes } = equipment(model, 'wide');
  assert.equal(meshes.length, 4);
  const triangles = meshes.reduce((v, m) => v + m.geometry.index.count / 3, 0);
  assert(triangles < 5500);
  assert.equal(root.userData.layout.sourceParts, 22);
  for (const m of meshes) {
    assert(m.userData.excludePick);
    assert(m.material.userData.exterior);
    assert.equal(m.material.emissive.getHex(), 0);
    assert.equal(m.material.map, null);
    assert.equal(m.material.bumpMap, null);
  }
  const before = meshes.map((m) => m.material.color.toArray());
  model.update(1, 'about', true, { activeRoom: 'about', hoveredWalkway: true });
  meshes.forEach((m, i) =>
    assert.deepEqual(m.material.color.toArray(), before[i]),
  );
});

test('Roof shield faces are directly exposed in supported landscape and portrait views', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  model.group.updateMatrixWorld(true);
  const { root, meshes } = equipment(model, 'wide'),
    owns = new Set(meshes),
    scene = [];
  model.group.traverseVisible((o) => {
    if (o.isMesh && !o.userData.isInteractionProxy) scene.push(o);
  });
  const covers = root.userData.layout.parts.filter(
    (p) => p.name === 'roof-sealed-shield-cover',
  );
  const ray = new THREE.Raycaster();
  for (const position of [
    [-8.416, 4.901, 23.239],
    [-7.009, 4.186, 20.364],
    [5.795, 3.509, 34.77],
  ])
    for (const part of covers) {
      const point = new THREE.Vector3(
          (part.bounds[0][0] + part.bounds[1][0]) / 2,
          part.bounds[1][1] - 0.003,
          (part.bounds[0][2] + part.bounds[1][2]) / 2,
        ),
        eye = new THREE.Vector3(...position);
      ray.set(eye, point.clone().sub(eye).normalize());
      const hit = ray.intersectObjects(scene, false)[0];
      assert(
        hit &&
          owns.has(hit.object) &&
          Math.sign(hit.point.x) === Math.sign(point.x),
      );
    }
});
