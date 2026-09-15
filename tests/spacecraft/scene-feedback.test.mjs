import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSceneFeedback,
  EMPTY_SCENE_FEEDBACK,
} from '../../features/spacecraft/navigation/scene-feedback.ts';

const room = (room) => ({ room, object: '', walkway: false });
const object = (object) => ({ room: '', object, walkway: false });

test('Pointer departure does not resurrect a previously focused door or console', () => {
  for (const focused of [room('about'), object('contact-social-left')]) {
    const feedback = createSceneFeedback();
    let underPointer = focused;
    const read = () =>
      feedback.resolve(
        false,
        () => underPointer,
        () => focused,
      );
    feedback.keyboard();
    assert.deepEqual(read(), focused);
    feedback.press(10, 10, 'mouse'); // Native click leaves that same DOM focus.
    feedback.move(20, 20, 'mouse');
    underPointer = EMPTY_SCENE_FEEDBACK;
    assert.deepEqual(read(), EMPTY_SCENE_FEEDBACK);
    feedback.keyboard();
    assert.deepEqual(
      read(),
      focused,
      'Keyboard navigation still owns real focus',
    );
  }
});

test('Fast room-to-room-to-blank moves retain the final position within one frame', () => {
  const feedback = createSceneFeedback();
  const visited = [];
  feedback.move(1, 0, 'mouse');
  feedback.move(2, 0, 'mouse');
  feedback.move(3, 0, 'mouse');
  assert.deepEqual(
    feedback.resolve(
      false,
      (x) => {
        visited.push(x);
        return x === 3 ? EMPTY_SCENE_FEEDBACK : room('projects');
      },
      () => room('about'),
    ),
    EMPTY_SCENE_FEEDBACK,
  );
  assert.deepEqual(
    visited,
    [3],
    'No throttled-away trailing move or unnecessary intermediate raycasts',
  );
});

test('Stationary pointer follows live targets when camera, dropdown, or visibility changes', () => {
  const feedback = createSceneFeedback();
  feedback.move(10, 20, 'mouse');
  let target = room('projects');
  const read = () =>
    feedback.resolve(
      false,
      () => target,
      () => room('contact'),
    );
  assert.deepEqual(read(), room('projects'));
  target = EMPTY_SCENE_FEEDBACK; // Overlay, removed menu item, hidden/inert control.
  assert.deepEqual(read(), EMPTY_SCENE_FEEDBACK);
  target = room('about');
  assert.deepEqual(read(), room('about'));
});

test('Layout events do not steal keyboard feedback but actual pointer movement does', () => {
  const feedback = createSceneFeedback();
  const read = () =>
    feedback.resolve(
      false,
      () => room('contact'),
      () => room('about'),
    );
  feedback.move(20, 30, 'mouse');
  feedback.keyboard();
  feedback.move(20, 30, 'mouse');
  assert.deepEqual(read(), room('about'));
  feedback.move(21, 30, 'mouse');
  assert.deepEqual(read(), room('contact'));
});

test('Travel, dragging, blur and cancellation clear feedback until fresh input', () => {
  const feedback = createSceneFeedback();
  const read = (blocked = false) =>
    feedback.resolve(
      blocked,
      () => room('projects'),
      () => object('left'),
    );
  feedback.move(5, 5, 'mouse');
  assert.deepEqual(read(true), EMPTY_SCENE_FEEDBACK);
  feedback.reset();
  assert.deepEqual(read(), EMPTY_SCENE_FEEDBACK);
  feedback.move(6, 5, 'mouse');
  assert.deepEqual(read(), room('projects'));
  feedback.keyboard();
  feedback.reset();
  assert.deepEqual(
    read(),
    EMPTY_SCENE_FEEDBACK,
    'Focus remaining in the DOM is not restored after reset',
  );
});

test('Touch taps and drags never leave hover feedback; mouse and keyboard recover', () => {
  const feedback = createSceneFeedback();
  const read = () =>
    feedback.resolve(
      false,
      () => object('left'),
      () => room('about'),
    );
  feedback.press(1, 1, 'touch');
  feedback.move(10, 20, 'touch');
  assert.deepEqual(read(), EMPTY_SCENE_FEEDBACK);
  feedback.keyboard();
  assert.deepEqual(read(), room('about'));
  feedback.press(10, 20, 'mouse');
  assert.deepEqual(read(), object('left'));
});

test('Focus blur and hidden or unmounted controls resolve to no target', () => {
  const feedback = createSceneFeedback();
  let focused = room('projects');
  const read = () =>
    feedback.resolve(
      false,
      () => room('contact'),
      () => focused,
    );
  feedback.keyboard();
  assert.deepEqual(read(), room('projects'));
  focused = EMPTY_SCENE_FEEDBACK;
  assert.deepEqual(read(), EMPTY_SCENE_FEEDBACK);
});
