import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createContactRoomDismissPicker } from '../../features/spacecraft/navigation/contact-room-dismiss.ts';

function panel(width, height, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  mesh.position.set(x, y, z);
  mesh.updateMatrixWorld(true);
  return mesh;
}

function ray(x = 0, y = 0) {
  return new THREE.Raycaster(
    new THREE.Vector3(x, y, 10),
    new THREE.Vector3(0, 0, -1),
  );
}

test('actual exposed wall geometry returns the nearest wall and sky does no console raycasting', () => {
  const back = panel(8, 6, 0, 0, 0);
  const near = panel(1, 1, 2, 1, 2);
  const console = panel(1, 1, 0, 0, 1);
  const pick = createContactRoomDismissPicker([back, near], [console]);
  assert.equal(pick.pick(ray(2, 1))?.object, near);
  assert.equal(pick.pick(ray(-3, 2))?.object, back);
  console.raycast = () =>
    assert.fail('No console work is needed after a wall miss');
  assert.equal(pick.pick(ray(8, 8)), null);
});

test('main monitor, both socials, keyboard and desk block only their actual silhouettes', () => {
  const wall = panel(10, 8, 0, 0, 0);
  const objects = [
    ['main screen', panel(2, 1.5, 0, 1.5, 1)],
    ['left social', panel(1, 1, -2, 1.5, 1.2)],
    ['right social', panel(1, 1, 2, 1.5, 1.2)],
    ['keyboard', panel(2.5, 0.5, 0, 0, 2)],
    ['desk', panel(6, 0.4, 0, -0.8, 1.8)],
  ];
  const pick = createContactRoomDismissPicker(
    [wall],
    objects.map(([, mesh]) => mesh),
  );
  for (const [name, mesh] of objects)
    assert.equal(pick.pick(ray(mesh.position.x, mesh.position.y)), null, name);
  assert.equal(
    pick.pick(ray(1.35, 1.5))?.object,
    wall,
    'Gap between monitors is still wall',
  );
  assert.equal(
    pick.pick(ray(0, -1.2))?.object,
    wall,
    'Space below the desk is not a broad proxy',
  );
});

test('blockers behind the wall do not consume it, while a flush rendered face does', () => {
  const wall = panel(4, 4, 0, 0, 0);
  const blocker = panel(1, 1, 0, 0, -1);
  const pick = createContactRoomDismissPicker([wall], [blocker]);
  const view = ray();
  const originalFar = view.far;
  assert.equal(pick.pick(view)?.object, wall);
  blocker.position.z = 0;
  blocker.updateMatrixWorld(true);
  assert.equal(pick.pick(view), null);
  assert.equal(
    view.far,
    originalFar,
    'Caller raycaster is not narrowed or otherwise mutated',
  );
});

test('hidden parents, invisible materials and interaction proxies never act as rendered surfaces', () => {
  const wall = panel(4, 4, 0, 0, 0);
  const blocker = panel(1, 1, 0, 0, 1);
  const group = new THREE.Group();
  group.add(blocker);
  group.updateMatrixWorld(true);
  const pick = createContactRoomDismissPicker([wall], [blocker]);
  for (const hide of [
    () => {
      group.visible = false;
    },
    () => {
      blocker.visible = false;
    },
    () => {
      blocker.material.visible = false;
    },
    () => {
      blocker.material.transparent = true;
      blocker.material.opacity = 0;
    },
    () => {
      blocker.userData.isInteractionProxy = true;
    },
  ]) {
    group.visible = blocker.visible = blocker.material.visible = true;
    blocker.material.opacity = 1;
    blocker.userData.isInteractionProxy = false;
    hide();
    assert.equal(pick.pick(ray())?.object, wall);
  }
  wall.visible = false;
  assert.equal(pick.pick(ray()), null);
  wall.visible = true;
  wall.material.visible = false;
  assert.equal(pick.pick(ray()), null);
});

test('batched keyboard instances use their current matrices and leave the gaps selectable', () => {
  const wall = panel(8, 6, 0, 0, 0);
  const caps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.15),
    new THREE.MeshBasicMaterial(),
    2,
  );
  caps.setMatrixAt(0, new THREE.Matrix4().makeTranslation(-1, 0, 1));
  caps.setMatrixAt(1, new THREE.Matrix4().makeTranslation(1, 0, 1));
  caps.updateMatrixWorld(true);
  const pick = createContactRoomDismissPicker([wall], [caps]);
  assert.equal(pick.pick(ray(-1, 0)), null);
  assert.equal(pick.pick(ray(1, 0)), null);
  assert.equal(pick.pick(ray())?.object, wall);
  caps.setMatrixAt(1, new THREE.Matrix4().makeTranslation(0, 0, 1));
  caps.instanceMatrix.needsUpdate = true;
  assert.equal(pick.pick(ray()), null);
  assert.equal(pick.pick(ray(1, 0))?.object, wall);
});

test('material groups and ray layers match the visible faces instead of hiding a whole mesh', () => {
  const wall = panel(8, 6, 0, 0, 0);
  const materials = Array.from(
    { length: 6 },
    () => new THREE.MeshBasicMaterial(),
  );
  const blocker = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), materials);
  blocker.position.z = 1;
  blocker.updateMatrixWorld(true);
  const pick = createContactRoomDismissPicker([wall], [blocker]);
  assert.equal(pick.pick(ray()), null);
  materials[4].visible = false; // Front-facing group; the rear face is backface culled.
  assert.equal(pick.pick(ray())?.object, wall);
  materials[4].visible = true;
  blocker.layers.set(1);
  assert.equal(pick.pick(ray())?.object, wall);
});
