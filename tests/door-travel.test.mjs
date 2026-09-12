import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import {
  canUseDoorDuringTravel,
  createDoorNavigationQueue,
} from '../lib/door-navigation.ts';
import {
  createSceneFeedback,
  EMPTY_SCENE_FEEDBACK,
} from '../lib/scene-feedback.ts';
import {
  interlockLadderPortals,
  requiredPortalIds,
} from '../lib/iris-navigation.ts';

test('Travel hover opens the exact ordinary door and leaving releases only that request', () => {
  for (const layout of ['wide', 'compact']) {
    const model = createSpacecraft(THREE, { layout });
    const portals = model.group.userData.portals;
    let time = 0;
    const frame = (hoveredPortal) =>
      model.update((time += 1 / 60), '', false, {
        activeRoom: 'projects',
        travelling: true,
        transitRoom: 'about',
        hoveredPortal,
        openPortalIds: ['about:contact', 'contact:about'],
        delta: 1 / 60,
        reading: false,
      });
    for (let i = 0; i < 60; i++) frame('projects:experience');
    for (const id of [
      'projects:experience',
      'experience:projects',
      'about:contact',
      'contact:about',
    ])
      assert.equal(portals.find((p) => p.id === id).openProgress, 1, id);
    assert.ok(
      portals.filter((p) => p.via === 'walkway').every((p) => p.sealed),
    );
    assert.deepEqual(model.group.userData.activeRoute, [
      'projects',
      'experience',
    ]);
    for (let i = 0; i < 150; i++) frame('');
    assert.ok(
      portals
        .filter((p) => p.from === 'experience' || p.to === 'experience')
        .every((p) => p.sealed),
    );
    assert.equal(
      portals.find((p) => p.id === 'about:contact').openProgress,
      1,
      'The camera still owns the door on its current route',
    );
  }
});

test('Inside the ladder bay, travel hover cannot request an exit or infer a ladder route', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const portals = model.group.userData.portals;
  let time = 0;
  for (const hoveredPortal of ['projects:about', 'about', 'about:projects']) {
    for (let i = 0; i < 60; i++)
      model.update((time += 1 / 60), '', false, {
        activeRoom: 'projects',
        travelling: true,
        transitRoom: '',
        transitWalkway: true,
        hoveredPortal,
        openPortalIds: ['about:projects'],
        delta: 1 / 60,
      });
    assert.equal(
      portals.find((p) => p.id === 'projects:about').openProgress,
      0,
    );
    assert.equal(
      portals.find((p) => p.id === 'about:projects').openProgress,
      1,
    );
    assert.ok(portals.every((p) => p.highlight === 0));
  }
});

test('Both ladder entries open and queue during approach, but reject clicks from inside the bay', () => {
  for (const layout of ['wide', 'compact']) {
    const model = createSpacecraft(THREE, { layout });
    const portals = model.group.userData.portals;
    let time = 0;
    for (const id of ['projects:about', 'about:projects']) {
      const portal = portals.find((p) => p.id === id);
      const queue = createDoorNavigationQueue();
      assert.equal(canUseDoorDuringTravel(portal, portal.from), true);
      for (let i = 0; i < 90; i++)
        model.update((time += 1 / 60), '', false, {
          activeRoom: portal.from,
          travelling: true,
          transitWalkway: false,
          hoveredPortal: id,
          delta: 1 / 60,
        });
      assert.equal(portal.openProgress, 1, `${layout}: ${id}`);
      assert.equal(queue.request(portal, portal.from, true), null);
      assert.equal(queue.destination, portal.to);
      queue.requestDestination('home', portal.from, true);
      queue.request(portal, portal.from, true, true);
      assert.equal(
        queue.destination,
        'home',
        'An exit click cannot replace the queue',
      );
      assert.equal(queue.arrive(portal.from), 'home');
      for (let i = 0; i < 90; i++)
        model.update((time += 1 / 60), '', false, {
          activeRoom: portal.from,
          travelling: true,
          transitWalkway: true,
          hoveredPortal: id,
          delta: 1 / 60,
        });
      assert.ok(portals.every((p) => p.sealed && p.highlight === 0));
    }
  }
});

test('A pre-opened ladder preview yields to the other route hatch without pinning its interlock', () => {
  for (const layout of ['wide', 'compact']) {
    const model = createSpacecraft(THREE, { layout });
    const portals = model.group.userData.portals;
    const ladder = portals.filter((p) => p.via === 'walkway');
    let time = 0;
    for (const preview of ladder) {
      const required = ladder.find((p) => p !== preview);
      for (let i = 0; i < 90; i++)
        model.update((time += 1 / 60), '', false, {
          activeRoom: preview.from,
          travelling: true,
          hoveredPortal: preview.id,
          delta: 1 / 60,
        });
      assert.equal(preview.openProgress, 1);
      const queue = createDoorNavigationQueue();
      queue.requestDestination('home', preview.from, true);
      queue.request(preview, preview.from, true, false, [required.id]);
      assert.equal(queue.destination, 'home');
      assert.deepEqual(
        interlockLadderPortals(portals, [required.id]).openPortalIds,
        [],
      );
      for (let i = 0; i < 120; i++) {
        const gate = interlockLadderPortals(portals, [required.id]);
        model.update((time += 1 / 60), '', false, {
          activeRoom: preview.from,
          travelling: true,
          hoveredPortal: preview.id,
          routeLadderPortalIds: [required.id],
          openPortalIds: gate.openPortalIds,
          delta: 1 / 60,
        });
        assert.ok(ladder.filter((p) => p.openProgress > 0.001).length <= 1);
      }
      assert.equal(preview.openProgress, 0);
      assert.equal(
        required.openProgress,
        1,
        'The route clears without hover departure',
      );
      assert.equal(preview.highlight, 0);
      for (let i = 0; i < 90; i++)
        model.update((time += 1 / 60), '', false, {
          travelling: true,
          delta: 1 / 60,
        });
    }
  }
});

test('Future ladder legs reserve their hatches before an opposite preview can delay entry', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const portals = model.group.userData.portals;
  const anchors = model.group.userData.roomAnchors;
  const upper = portals.find((p) => p.id === 'projects:about');
  const lower = portals.find((p) => p.id === 'about:projects');
  const ordinary = portals.find((p) => p.id === 'projects:experience');
  const currentLeg = requiredPortalIds(portals, [
    anchors.contact,
    anchors.about,
  ]);
  assert.ok(currentLeg.every((id) => ![upper.id, lower.id].includes(id)));
  const reserved = requiredPortalIds(portals, [
    anchors.contact,
    anchors.about,
    ...lower.waypoints,
    anchors.projects,
  ]).filter((id) => portals.find((p) => p.id === id).via === 'walkway');
  assert.deepEqual(new Set(reserved), new Set([upper.id, lower.id]));
  assert.equal(
    canUseDoorDuringTravel(upper, 'projects', false, reserved),
    false,
  );
  assert.equal(
    canUseDoorDuringTravel(ordinary, 'projects', false, reserved),
    true,
  );
  const queue = createDoorNavigationQueue();
  queue.requestDestination('home', 'projects', true);
  queue.request(upper, 'projects', true, false, reserved);
  assert.equal(queue.destination, 'home');
});

test('Door clicks defer until the named arrival, consume once, and discard cancelled navigation', () => {
  const queue = createDoorNavigationQueue();
  const door = { id: 'about:contact', from: 'about', to: 'contact' };
  const stairs = {
    id: 'about:projects',
    from: 'about',
    to: 'projects',
    via: 'walkway',
  };
  assert.equal(
    queue.request(door, 'about', false),
    'contact',
    'Idle navigation starts immediately',
  );
  assert.equal(queue.destination, '');
  assert.equal(
    queue.request(door, 'about', true),
    null,
    'Travel click must not retarget midflight',
  );
  assert.equal(queue.destination, 'contact');
  queue.request(stairs, 'about', true, true);
  assert.equal(
    queue.destination,
    'contact',
    'A ladder exit request from inside the bay cannot replace the pending hop',
  );
  assert.equal(canUseDoorDuringTravel(door, 'projects'), false);
  assert.equal(queue.request(door, 'projects', true), null);
  assert.equal(queue.destination, 'contact');
  queue.request(door, 'about', true);
  assert.equal(queue.arrive('about'), 'contact');
  assert.equal(
    queue.arrive('about'),
    null,
    'Repeated clicks schedule only one hop',
  );
  queue.request(door, 'about', true);
  queue.clear(); // External navigation or reading-mode change, never internal resize.
  assert.equal(queue.arrive('about'), null);
  queue.request(door, 'about', true);
  assert.equal(
    queue.arrive('projects'),
    null,
    'Stale arrivals cannot trigger a queued hop',
  );
});

test('Home, menu destinations and door clicks replace the same single pending hop', () => {
  const queue = createDoorNavigationQueue();
  const door = {
    id: 'projects:experience',
    from: 'projects',
    to: 'experience',
  };
  queue.request(door, 'projects', true);
  assert.equal(queue.requestDestination('home', 'projects', true), null);
  assert.equal(queue.destination, 'home');
  queue.requestDestination('contact', 'projects', true);
  assert.equal(queue.destination, 'contact');
  queue.request(door, 'projects', true);
  assert.equal(queue.destination, 'experience');
  assert.equal(queue.arrive('projects'), 'experience');
  assert.equal(
    queue.arrive('experience'),
    null,
    'Overwritten requests never run later',
  );

  queue.requestDestination('contact', 'about', true);
  queue.requestDestination('home', 'about', true);
  assert.equal(
    queue.arrive('about'),
    'home',
    'Overview is a valid queued destination',
  );
  assert.equal(queue.arrive('home'), null);

  queue.requestDestination('home', 'projects', true);
  queue.requestDestination('projects', 'projects', true);
  assert.equal(
    queue.destination,
    '',
    'Choosing the current arrival cancels the queued detour',
  );
  assert.equal(queue.arrive('projects'), null);
});

test('A live door hover follows the moving pointer target without restoring stale focus', () => {
  const feedback = createSceneFeedback();
  const door = {
    room: 'contact',
    object: '',
    walkway: false,
    portalId: 'about:contact',
  };
  let hit = door;
  const resolve = () =>
    feedback.resolve(
      false,
      () => hit,
      () => door,
    );
  feedback.move(10, 10, 'mouse');
  assert.equal(resolve().portalId, 'about:contact');
  hit = EMPTY_SCENE_FEEDBACK;
  assert.deepEqual(
    resolve(),
    EMPTY_SCENE_FEEDBACK,
    'A moving camera can move the door away from a stationary pointer',
  );
  feedback.keyboard();
  assert.equal(resolve().portalId, 'about:contact');
  feedback.move(11, 10, 'mouse');
  assert.deepEqual(resolve(), EMPTY_SCENE_FEEDBACK);
  feedback.reset();
  assert.deepEqual(resolve(), EMPTY_SCENE_FEEDBACK);
});
