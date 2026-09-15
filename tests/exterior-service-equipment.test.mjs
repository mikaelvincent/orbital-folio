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
    layout + '-exterior-service-equipment',
  );
  assert(root);
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  return { root, meshes };
};

test('The open EVA route is continuous from docking shoulder across the roof, with wide-spaced rungs and capped rails', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    const { root, meshes } = equipment(model, layout),
      data = root.userData.layout;
    assert(data.evaAccessRoute);
    assert.equal(data.routes.length, 2);
    const [main, transfer] = data.routes;
    assert(
      main.rungCount >= 16 &&
        main.rungSpacing > 0.46 &&
        main.rungSpacing < 0.55,
      'Rungs have open ladder spacing, not dense vent slots',
    );
    assert.equal(transfer.rungCount, 3);
    assert.equal(
      data.parts.filter((p) => p.name === 'main-continuous-rail').length,
      2,
    );
    assert.equal(
      data.parts.filter((p) => p.name.endsWith('rounded-rail-end')).length,
      8,
    );
    assert(
      data.parts.every(
        (p) => !/cover|shield|panel|louvre|louver|grille|airfoil/.test(p.name),
      ),
    );
    assert(
      data.railSeparation >= 0.8 && data.nominalRailClearance >= 0.2,
      'Tubular route remains open and large enough to read with glove clearance',
    );
    assert(main.centerline[0].p[0] < main.centerline.at(-1).p[0] - 7);
    const b = new THREE.Box3().setFromObject(root),
      d = wallLayout(layout === 'wide' ? 1.4 : 1);
    assert(
      b.max.z < PRESSURE_THROAT_START - 0.16,
      'Tether eyes and rails remain behind the front cutaway',
    );
    assert(b.min.z > -0.2, 'No route is fabricated around the concealed rear');
    assert(
      b.max.x < d.rightX - 0.5,
      'The service end and solar hinges remain clear',
    );
    for (const m of meshes) {
      const p = m.geometry.attributes.position,
        n = m.geometry.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        assert(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)));
        assert(
          Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 1e-5,
        );
      }
    }
  }
});

test('Every EVA stand-off terminates on the actual pressure skin in both layouts', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' }),
    ray = new THREE.Raycaster();
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const { root } = equipment(model, layout),
      skin = [];
    model.group.traverseVisible((o) => {
      if (!o.isMesh || o.userData.isInteractionProxy) return;
      for (let p = o; p; p = p.parent) if (p === root) return;
      skin.push(o);
    });
    for (const mount of root.userData.layout.mounts) {
      const p = new THREE.Vector3(...mount.skin),
        n = new THREE.Vector3(...mount.normal),
        rail = new THREE.Vector3(...mount.rail);
      ray.set(p.clone().addScaledVector(n, 0.13), n.clone().negate());
      ray.near = 0;
      ray.far = 0.18;
      const hit = ray.intersectObjects(skin, false)[0];
      assert(hit, 'Each mount has a wall behind it');
      assert.equal(hit.object.material.name, 'ceramic-hull');
      assert(
        hit.point.distanceTo(p) < 0.003,
        'Mount datums follow the rendered skin, not an approximate ellipse',
      );
      assert(
        rail.clone().sub(p).dot(n) > 0.195 &&
          rail.clone().sub(p).dot(n) < 0.215,
        'Posts span the deliberate stand-off gap',
      );
    }
  }
});

test('The route uses existing passive exterior materials and renders physical structure without lights, textures or actions', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' }),
    { root, meshes } = equipment(model, 'wide');
  assert.equal(meshes.length, 3);
  const triangles = meshes.reduce((v, m) => v + m.geometry.index.count / 3, 0);
  assert(
    triangles < 90000,
    'Guard against runaway tessellation while allowing articulated rails and mounts',
  );
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
  assert(!root.children.some((o) => o.isLight));
});

test('Roof rungs and the curved climb are exposed from supported default and hover camera views', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  model.group.updateMatrixWorld(true);
  const { root, meshes } = equipment(model, 'wide'),
    owns = new Set(meshes),
    scene = [];
  model.group.traverseVisible((o) => {
    if (o.isMesh && !o.userData.isInteractionProxy) scene.push(o);
  });
  const route = root.userData.layout.routes[0],
    ray = new THREE.Raycaster();
  for (const eyeValues of [
    [-8.416, 4.901, 23.239],
    [-7.009, 4.186, 20.364],
    [5.795, 3.509, 34.77],
  ]) {
    const eye = new THREE.Vector3(...eyeValues);
    let visible = 0;
    for (const rung of route.rungs) {
      const p = new THREE.Vector3(...rung.center);
      ray.set(eye, p.clone().sub(eye).normalize());
      const hit = ray.intersectObjects(scene, false)[0];
      if (hit && owns.has(hit.object)) visible++;
    }
    assert(
      visible >= 12,
      'The route reads as multiple open rungs in ordinary supported views',
    );
  }
});
