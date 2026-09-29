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

test('revision cache retains walls and misses, with separate ownership per room and rebuilt picker', () => {
  const wall = panel(4, 4, 0, 0, 0);
  const picker = createContactRoomDismissPicker([wall], []);
  const other = createContactRoomDismissPicker([], []);
  const view = ray();
  const hit = picker.pick(view, 0);
  assert.equal(hit?.object, wall);
  assert.equal(picker.pick(view, 0), hit);
  assert.equal(picker.raycasts, 1);
  assert.equal(other.pick(view, 0), null);
  assert.equal(other.pick(view, 0), null);
  assert.equal(other.raycasts, 1);
  assert.equal(picker.pick(view, 0), hit);
  const rebuilt = createContactRoomDismissPicker([], []);
  assert.equal(rebuilt.pick(view, 0), null);
  view.ray.origin.x = 10;
  assert.equal(picker.pick(view, 0), null);
  assert.equal(picker.pick(view, 0), null);
  assert.equal(picker.raycasts, 2, 'Sky misses are reusable too');
});

test('exact ray, clipping range and layers invalidate a cached pick without pointer movement', () => {
  const wall = panel(4, 4, 0, 0, 0);
  const picker = createContactRoomDismissPicker([wall], []);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  camera.position.z = 10;
  camera.updateMatrixWorld(true);
  const pointer = new THREE.Vector2(0.1, 0);
  const view = ray();
  const pick = () => {
    view.setFromCamera(pointer, camera);
    return picker.pick(view, 0);
  };
  assert.equal(pick()?.object, wall);
  assert.equal(pick()?.object, wall);
  assert.equal(picker.raycasts, 1);
  camera.position.x = 10;
  camera.updateMatrixWorld(true);
  assert.equal(pick(), null, 'Stationary pointer sees a new camera ray');
  camera.position.x = 0;
  camera.updateMatrixWorld(true);
  assert.equal(pick()?.object, wall);
  camera.fov = 160;
  camera.updateProjectionMatrix();
  assert.equal(pick(), null, 'Projection changes update the ray');
  camera.fov = 40;
  camera.updateProjectionMatrix();
  assert.equal(pick()?.object, wall);
  view.far = 5;
  assert.equal(pick(), null);
  view.far = 80;
  view.near = 11;
  assert.equal(pick(), null);
  view.near = 0;
  assert.equal(pick()?.object, wall);
  view.layers.set(1);
  assert.equal(pick(), null);
  view.layers.set(0);
  assert.equal(pick()?.object, wall);
  assert.equal(picker.raycasts, 10);
});

test('geometry revisions and explicit invalidation refresh moving or hidden blockers', () => {
  const wall = panel(4, 4, 0, 0, 0);
  const blocker = panel(1, 1, 0, 0, 1);
  const parent = new THREE.Group();
  parent.add(blocker);
  parent.updateMatrixWorld(true);
  const picker = createContactRoomDismissPicker([wall], [blocker]);
  const view = ray();
  let revision = 0;
  const check = (expected) => {
    assert.equal(picker.pick(view, ++revision)?.object ?? null, expected);
    const before = picker.raycasts;
    assert.equal(picker.pick(view, revision)?.object ?? null, expected);
    assert.equal(picker.raycasts, before);
  };
  check(null);
  parent.position.x = 3;
  parent.updateMatrixWorld(true);
  check(wall);
  parent.position.x = 0;
  parent.updateMatrixWorld(true);
  check(null);
  parent.visible = false;
  check(wall);
  parent.visible = true;
  check(null);
  blocker.material.visible = false;
  check(wall);
  blocker.material.visible = true;
  blocker.geometry.translate(3, 0, 0);
  check(wall);
  blocker.geometry = new THREE.PlaneGeometry(1, 1);
  picker.invalidate();
  assert.equal(picker.pick(view, revision), null);
  parent.visible = false;
  assert.equal(picker.pick(view)?.object, wall, 'Unversioned picks stay live');
  parent.visible = true;
  assert.equal(
    picker.pick(view, revision),
    null,
    'Unversioned pick clears old revision',
  );
});

test('revision changes include instance-buffer motion and instance count', () => {
  const wall = panel(8, 6, 0, 0, 0);
  const caps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.15),
    new THREE.MeshBasicMaterial(),
    1,
  );
  caps.setMatrixAt(0, new THREE.Matrix4().makeTranslation(1, 0, 1));
  caps.updateMatrixWorld(true);
  const picker = createContactRoomDismissPicker([wall], [caps]);
  const view = ray();
  assert.equal(picker.pick(view, 0)?.object, wall);
  caps.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 0, 1));
  caps.instanceMatrix.needsUpdate = true;
  caps.computeBoundingSphere();
  assert.equal(picker.pick(view, 1), null);
  caps.count = 0;
  assert.equal(picker.pick(view, 2)?.object, wall);
});
