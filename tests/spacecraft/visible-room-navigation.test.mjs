import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRoomNavigationTargets } from '../../features/spacecraft/navigation/room-navigation-targets.ts';
import {
  roomNavigationIntent,
  sceneNavigationKey,
} from '../../features/spacecraft/navigation/room-navigation.ts';
import {
  canUseDoorDuringTravel,
  createDoorNavigationQueue,
} from '../../features/spacecraft/navigation/door-navigation.ts';
import {
  wallLayout,
  CABIN_FLOOR,
  CABIN_CEILING,
  DECK_HALF_PITCH,
  PRESSURE_FACE_FRONT,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

const portals = [
  { id: 'p-e', from: 'projects', to: 'experience' },
  { id: 'e-p', from: 'experience', to: 'projects' },
  { id: 'a-c', from: 'about', to: 'contact' },
  { id: 'c-a', from: 'contact', to: 'about' },
  { id: 'p-a', from: 'projects', to: 'about', via: 'walkway' },
  { id: 'a-p', from: 'about', to: 'projects', via: 'walkway' },
];

void test('A visible ladder bay selects its exit cabin and previews the current cabin first door', () => {
  for (const [from, section, portalId] of [
    ['projects', 'about', 'p-a'],
    ['about', 'projects', 'a-p'],
    ['experience', 'about', 'e-p'],
    ['contact', 'projects', 'c-a'],
  ]) {
    const intent = roomNavigationIntent(portals, from, 'walkway');
    assert.deepEqual(intent, { section, portalId, roomTarget: true });
    assert.equal(portals.find((p) => p.id === portalId).from, from);
    // The same exit cabin selected directly takes exactly this route.
    assert.deepEqual(intent, roomNavigationIntent(portals, from, section));
    const queue = createDoorNavigationQueue();
    queue.requestDestination(intent.section, from, true);
    assert.equal(queue.destination, section);
    queue.requestDestination('home', from, true);
    assert.equal(queue.arrive(from), 'home');
    queue.requestDestination(intent.section, from, true);
    assert.equal(queue.arrive(from), section);
  }
});

void test('Ladder bay selection stays inert in overview, inside the bay and without a reachable crossing', () => {
  assert.equal(roomNavigationIntent(portals, 'home', 'walkway'), null);
  assert.equal(roomNavigationIntent(portals, 'unknown', 'walkway'), null);
  assert.equal(roomNavigationIntent(portals, 'walkway', 'walkway'), null);
  for (const from of ['projects', 'about', 'experience', 'contact']) {
    assert.equal(roomNavigationIntent(portals, from, 'walkway', true), null);
    assert.equal(
      roomNavigationIntent(portals.filter((p) => !p.via), from, 'walkway'),
      null,
    );
  }
  // The restriction is specific to the bay, not a blanket ban on cabin targets.
  assert.equal(roomNavigationIntent(portals, 'contact', 'about', true).section, 'about');
});

void test('Ladder opening selections inherit travel preview and physical hatch restrictions', () => {
  for (const from of ['projects', 'about']) {
    const intent = roomNavigationIntent(portals, from, 'walkway');
    const portal = portals.find((p) => p.id === intent.portalId);
    const opposite = portals.find((p) => p.via && p.id !== portal.id);
    assert(canUseDoorDuringTravel(portal, from, false, []));
    assert(!canUseDoorDuringTravel(portal, from, false, [opposite.id]));
    assert(!canUseDoorDuringTravel(portal, from, true, []));
    assert.notEqual(sceneNavigationKey(intent), sceneNavigationKey({
      section: intent.section, portalId: intent.portalId,
    }));
  }
});

void test('Visible-room intent uses the same first door but preserves a nonadjacent final destination', () => {
  assert.deepEqual(roomNavigationIntent(portals, 'contact', 'experience'), {
    section: 'experience',
    portalId: 'c-a',
    roomTarget: true,
  });
  assert.deepEqual(roomNavigationIntent(portals, 'projects', 'experience'), {
    section: 'experience',
    portalId: 'p-e',
    roomTarget: true,
  });
  assert.equal(roomNavigationIntent(portals, 'about', 'about'), null);
  assert.equal(roomNavigationIntent(portals, 'contact', 'unknown'), null);
  assert.equal(roomNavigationIntent(portals, 'unknown', 'about'), null);
  assert.equal(
    roomNavigationIntent(portals, 'home', 'projects').portalId,
    undefined,
  );
});

void test('Room, doorway and Home requests share one overriding queue without losing the final room', () => {
  const queue = createDoorNavigationQueue();
  const room = roomNavigationIntent(portals, 'contact', 'experience');
  const first = portals.find((p) => p.id === room.portalId);
  assert(canUseDoorDuringTravel(first, 'contact'));
  queue.requestDestination(room.section, 'contact', true);
  assert.equal(queue.destination, 'experience');
  queue.request(
    portals.find((p) => p.id === 'c-a'),
    'contact',
    true,
  );
  assert.equal(queue.destination, 'about');
  queue.requestDestination(room.section, 'contact', true);
  assert.equal(queue.arrive('contact'), 'experience');
  queue.requestDestination(room.section, 'contact', true);
  queue.requestDestination('home', 'contact', true);
  assert.equal(queue.arrive('contact'), 'home');
  queue.requestDestination(room.section, 'contact', true);
  queue.requestDestination('contact', 'contact', true);
  assert.equal(queue.arrive('contact'), null);
});

void test('Room previews inherit the ladder entry/interlock and inside-bay exit restrictions', () => {
  const room = roomNavigationIntent(portals, 'about', 'experience');
  const first = portals.find((p) => p.id === room.portalId);
  assert.equal(first.id, 'a-p');
  assert(canUseDoorDuringTravel(first, 'about', false, []));
  assert(!canUseDoorDuringTravel(first, 'about', true, []));
  assert(!canUseDoorDuringTravel(first, 'about', false, ['p-a']));
  assert(!canUseDoorDuringTravel(first, 'contact', false, []));
});

void test('Pressing one visible room and releasing over another cannot activate their shared first door', () => {
  const about = roomNavigationIntent(portals, 'contact', 'about');
  const experience = roomNavigationIntent(portals, 'contact', 'experience');
  assert.equal(about.portalId, experience.portalId);
  assert.notEqual(sceneNavigationKey(about), sceneNavigationKey(experience));
  assert.notEqual(
    sceneNavigationKey(about),
    sceneNavigationKey({ section: 'about', portalId: 'c-a' }),
  );
});

void test('Real rounded opening masks select visible rooms at front and oblique angles in both layouts', () => {
  const group = new THREE.Group();
  const picking = createRoomNavigationTargets(THREE, group);
  const ray = new THREE.Raycaster();
  for (const scale of [1.4, 1]) {
    picking.sync(scale);
    group.updateMatrixWorld(true);
    const { halfPitch, ladderX } = wallLayout(scale);
    for (const [section, x, y] of [
      ['projects', -halfPitch, DECK_HALF_PITCH],
      ['about', -halfPitch, -DECK_HALF_PITCH],
      ['experience', halfPitch, DECK_HALF_PITCH],
      ['contact', halfPitch, -DECK_HALF_PITCH],
      ['walkway', ladderX, DECK_HALF_PITCH],
      ['walkway', ladderX, -DECK_HALF_PITCH],
    ]) {
      const target = new THREE.Vector3(x, y, PRESSURE_FACE_FRONT);
      for (const eye of [
        [x, y, 8],
        [-8, 5, 20],
        [7, -4, 15],
      ]) {
        const from = new THREE.Vector3(...eye);
        ray.set(from, target.clone().sub(from).normalize());
        assert.equal(picking.pick(ray).section, section);
        assert.equal(picking.pick(ray).blockedByFace, false);
      }
    }
  }
});

void test('Solid dividers, roof, rounded corners and sky cannot select a room or a doorway through the front face', () => {
  const group = new THREE.Group(),
    picking = createRoomNavigationTargets(THREE, group);
  const ray = new THREE.Raycaster();
  for (const scale of [1.4, 1]) {
    picking.sync(scale);
    group.updateMatrixWorld(true);
    const { halfPitch, halfWidth } = wallLayout(scale);
    for (const [x, y] of [
      [0, DECK_HALF_PITCH], // vertical divider
      [-halfPitch, (CABIN_FLOOR + CABIN_CEILING) / 2], // horizontal divider
      [-halfPitch + halfWidth - 0.02, DECK_HALF_PITCH + CABIN_CEILING - 0.02], // rounded corner
      [-halfPitch, DECK_HALF_PITCH + CABIN_CEILING + 0.07], // roof
      [12, 8], // sky
    ]) {
      ray.set(new THREE.Vector3(x, y, 8), new THREE.Vector3(0, 0, -1));
      assert.deepEqual(
        picking.pick(ray),
        { section: '', blockedByFace: true },
        `${scale}: ${x},${y}`,
      );
    }
  }
});

void test('Inside-cabin and ladder views keep doorway picking available without selecting the back of an opening', () => {
  const group = new THREE.Group(),
    picking = createRoomNavigationTargets(THREE, group);
  picking.sync(1.4);
  group.updateMatrixWorld(true);
  const { halfPitch, ladderX } = wallLayout(1.4),
    ray = new THREE.Raycaster();
  ray.set(
    new THREE.Vector3(-halfPitch, DECK_HALF_PITCH, 0.7),
    new THREE.Vector3(0, 0, -1),
  );
  assert.deepEqual(picking.pick(ray), { section: '', blockedByFace: false });
  ray.set(
    new THREE.Vector3(-halfPitch, DECK_HALF_PITCH, 0.7),
    new THREE.Vector3(0, 0, 1),
  );
  assert.equal(picking.pick(ray).section, '');
  ray.set(new THREE.Vector3(ladderX, 0, 8), new THREE.Vector3(0, 0, -1));
  assert.deepEqual(picking.pick(ray), {
    section: 'walkway',
    blockedByFace: false,
  });
});

void test('Opening masks stay invisible and replace geometry only when layout changes', () => {
  const group = new THREE.Group(),
    picking = createRoomNavigationTargets(THREE, group);
  picking.sync(1.4);
  const old = picking.targets[0].geometry;
  let disposed = 0;
  old.addEventListener('dispose', () => disposed++);
  picking.sync(1.4);
  assert.equal(picking.targets[0].geometry, old);
  picking.sync(1);
  assert.equal(disposed, 1);
  for (const target of picking.targets) {
    assert.equal(target.visible, false);
    assert(target.userData.isInteractionProxy);
    assert(target.geometry.attributes.position.count < 100);
  }
});
