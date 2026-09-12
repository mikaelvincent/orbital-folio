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

test('Travel hover cannot request ladder doors or infer a ladder route from a room name', () => {
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
  queue.request(stairs, 'about', true);
  assert.equal(
    queue.destination,
    'contact',
    'A ladder request cannot replace the pending hop',
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
