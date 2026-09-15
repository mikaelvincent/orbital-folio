import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { createRoomNavigationTargets } from '../../features/spacecraft/navigation/room-navigation-targets.ts';
import { roomNavigationIntent } from '../../features/spacecraft/navigation/room-navigation.ts';
import { wallLayout, PRESSURE_FACE_FRONT } from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

const model = createSpacecraft(THREE, { layout: 'wide' });
const picking = createRoomNavigationTargets(THREE, model.group);
const neutral = { section: '', walkway: false };

function layout(name) {
  model.setLayout(name);
  picking.sync(model.group.userData.layoutScale);
  model.group.updateMatrixWorld(true);
  return wallLayout(model.group.userData.layoutScale);
}
function rayTo(eye, target) {
  return new THREE.Raycaster(eye, target.clone().sub(eye).normalize());
}
function select(ray, active, overrides = {}) {
  return picking.select(ray, {
    active,
    reading: false,
    portalTargets: model.portalTargets,
    roomIntent: (destination) => roomNavigationIntent(
      model.group.userData.portals, active, destination,
    ),
    canUsePortal: () => true,
    ...overrides,
  });
}
function eyes(room) {
  const [x, y] = model.group.userData.roomAnchors[room];
  return [
    new THREE.Vector3(x, y, 6),
    new THREE.Vector3(x + 0.25, y + 0.3, 4.5),
    new THREE.Vector3(x - 0.25, y - 0.3, 7.5),
  ];
}

void test('Actual solid cabin walls stay neutral even when the old ladder box lies behind them', () => {
  for (const name of ['wide', 'compact']) {
    const walls = layout(name);
    const bounds = model.group.userData.walkwayBounds;
    const oldBayBox = new THREE.Mesh(
      new THREE.BoxGeometry(...bounds.size), new THREE.MeshBasicMaterial(),
    );
    oldBayBox.position.set(...bounds.center);
    oldBayBox.updateMatrixWorld(true);
    let reproducedOldLeaks = 0;
    for (const portal of model.group.userData.portals) {
      const [x] = model.group.userData.roomAnchors[portal.from];
      const wallX = x + (portal.edge === 'right' ? 1 : -1) * walls.halfWidth;
      for (const [dy, dz] of [[0, 1], [-1.07, 0], [0.75, 0.75], [-0.75, 0.75]]) {
        const point = new THREE.Vector3(wallX, portal.position[1] + dy, portal.position[2] + dz);
        for (const eye of eyes(portal.from)) {
          const ray = rayTo(eye, point);
          assert.deepEqual(select(ray, portal.from), neutral, `${name} ${portal.id} wall ${dy},${dz}`);
          if (picking.pick(ray).section === portal.from && ray.intersectObject(oldBayBox).length)
            reproducedOldLeaks++;
        }
      }
    }
    assert(reproducedOldLeaks > 0, 'Exercise the original through-wall box hit, not just empty sky');
    oldBayBox.geometry.dispose();
    oldBayBox.material.dispose();
  }
});

void test('Actual door and guide faces remain selectable at oblique angles on all six directed portals', () => {
  for (const name of ['wide', 'compact']) {
    const walls = layout(name);
    for (const portal of model.group.userData.portals) {
      const [x] = model.group.userData.roomAnchors[portal.from];
      const wallX = x + (portal.edge === 'right' ? 1 : -1) * walls.halfWidth;
      for (const [dy, dz] of [[0, 0], [-0.91, 0], [0, 0.91]]) {
        const point = new THREE.Vector3(wallX, portal.position[1] + dy, portal.position[2] + dz);
        for (const eye of eyes(portal.from)) {
          const ray = rayTo(eye, point);
          assert.deepEqual(select(ray, portal.from), {
            section: portal.to, portalId: portal.id, walkway: false,
          }, `${name} ${portal.id} aperture/guide ${dy},${dz}`);
          assert.deepEqual(select(ray, portal.from, { reading: true }), neutral);
          assert.deepEqual(select(ray, portal.from, { canUsePortal: () => false }), neutral);
        }
      }
    }
  }
});

void test('Caption picking follows its face without extending sideways onto the wall', () => {
  for (const name of ['wide', 'compact']) {
    layout(name);
    for (const portal of model.group.userData.portals) {
      const center = new THREE.Vector3(...portal.labelPosition);
      const right = new THREE.Vector3(...portal.labelRight);
      for (const eye of eyes(portal.from)) {
        for (const fraction of [-0.4, 0, 0.4]) {
          const point = center.clone().addScaledVector(right, portal.plateSize[0] * fraction);
          assert.equal(select(rayTo(eye, point), portal.from).portalId, portal.id);
        }
        for (const side of [-1, 1]) {
          const point = center.clone().addScaledVector(right, side * (portal.plateSize[0] / 2 + 0.04));
          assert.deepEqual(select(rayTo(eye, point), portal.from), neutral, `${name} ${portal.id} beside caption`);
        }
      }
    }
  }
});

void test('Visible ladder opening keeps its route while overview and inside-bay restrictions remain', () => {
  for (const name of ['wide', 'compact']) {
    const walls = layout(name);
    for (const active of ['about', 'projects']) {
      const [, y] = model.group.userData.roomAnchors[active];
      const point = new THREE.Vector3(walls.ladderX, y, PRESSURE_FACE_FRONT);
      const ray = rayTo(new THREE.Vector3(walls.ladderX, y, 8), point);
      const intent = roomNavigationIntent(model.group.userData.portals, active, 'walkway');
      assert.deepEqual(select(ray, active), { ...intent, walkway: true });
      assert.deepEqual(select(ray, 'home'), neutral);
      assert.deepEqual(select(ray, active, { reading: true }), neutral);
      assert.deepEqual(select(ray, active, {
        roomIntent: (destination) => roomNavigationIntent(model.group.userData.portals, active, destination, true),
      }), neutral);
    }
  }
});

after(() => {
  const geometries = new Set(), materials = new Set();
  model.group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) materials.add(material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
});
