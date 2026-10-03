import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createCameraZoom,
  bindCameraZoom,
  wheelZoomDelta,
} from '../../features/spacecraft/navigation/camera-zoom.ts';
import { createVesselCameraFrame } from '../../features/spacecraft/navigation/vessel-camera.ts';

test('zoom moves the physical eye forward with the same lens and never behind its starting pose', () => {
  for (const roll of [0, Math.PI / 2]) {
    const zoom = createCameraZoom();
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.08, 80);
    const frame = createVesselCameraFrame(THREE);
    const target = new THREE.Vector3(-2, 1, 0.16);
    const direction = new THREE.Vector3(-0.2, 0.1, 1).normalize();
    const lens = camera.projectionMatrix.clone();
    const apply = () =>
      frame.apply(camera, target, direction, 12 * zoom.factor(), roll);
    apply();
    const original = camera.position.clone();
    const forward = camera.getWorldDirection(new THREE.Vector3());
    zoom.change(Math.log(2));
    zoom.update(0, true);
    apply();
    const movement = camera.position.clone().sub(original);
    assert.ok(movement.clone().cross(forward).length() < 1e-10);
    assert.ok(Math.abs(movement.dot(forward) - 6) < 1e-10);
    assert.deepEqual(camera.projectionMatrix, lens);
    zoom.change(-100);
    zoom.update(0, true);
    apply();
    assert.deepEqual(camera.position, original);
  }
});

test('rapid reversals, inward limits, and reduced motion retain hard camera bounds', () => {
  for (const hz of [30, 60, 120]) {
    const zoom = createCameraZoom();
    zoom.limit(4, 1.6);
    for (let i = 0; i < hz * 4; i++) {
      if (i % 9 === 0) zoom.change(i % 18 === 0 ? 10 : -10);
      const factor = zoom.update(1 / hz);
      assert.ok(factor <= 1 && factor >= 0.4 - 1e-12);
    }
    zoom.change(100);
    assert.ok(Math.abs(zoom.update(0, true) - 0.4) < 1e-12);
    zoom.limit(2, 1.6);
    assert.ok(
      Math.abs(zoom.factor() - 0.8) < 1e-12,
      'resize clamps against the new clearance',
    );
    zoom.reset();
    for (let i = 0; i < hz * 3; i++) zoom.update(1 / hz);
    assert.equal(zoom.factor(), 1);
    assert.equal(zoom.motion.velocity, 0);
    zoom.change(NaN);
    zoom.change(Infinity);
    assert.equal(zoom.goal, 0);
  }
});

test('cursor dolly follows the selected ray and holds its focus-plane point in landscape, portrait and tilted views', () => {
  for (const [aspect, roll, fov] of [
    [16 / 9, 0, 38],
    [390 / 844, Math.PI / 2, 74],
  ]) {
    for (const view of [
      [-0.28, 0.2, 1],
      [0, 0.54, 0.84],
    ]) {
      for (const point of [
        [-0.7, 0.6],
        [0.65, -0.5],
      ]) {
        const zoom = createCameraZoom();
        const camera = new THREE.PerspectiveCamera(fov, aspect, 0.08, 80);
        const frame = createVesselCameraFrame(THREE);
        const target = new THREE.Vector3(-2, 1, 0.16);
        const direction = new THREE.Vector3(...view).normalize();
        const apply = () =>
          frame.apply(
            camera,
            target
              .clone()
              .add(
                new THREE.Vector3(
                  ...zoom.offset(12, direction.toArray(), fov, aspect),
                ),
              ),
            direction,
            12 * zoom.factor(),
            roll,
          );
        apply();
        const original = camera.position.clone();
        const rotation = camera.quaternion.clone();
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
          camera.getWorldDirection(new THREE.Vector3()),
          target.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), -roll),
        );
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(...point), camera);
        const landmark = ray.ray.intersectPlane(plane, new THREE.Vector3());
        assert.ok(landmark);
        zoom.change(Math.log(2.5), point);
        for (let i = 0; i < 240; i++) {
          zoom.update(1 / 60);
          apply();
          const projected = landmark.clone().project(camera);
          assert.ok(
            Math.hypot(projected.x - point[0], projected.y - point[1]) < 1e-9,
          );
          assert.ok(
            camera.position
              .clone()
              .sub(original)
              .cross(ray.ray.direction)
              .length() < 1e-9,
          );
          assert.ok(camera.quaternion.angleTo(rotation) < 1e-7);
        }
        zoom.change(-100, [-point[0], -point[1]]);
        zoom.update(0, true);
        apply();
        assert.deepEqual(
          camera.position,
          original,
          'outward zoom restores the entire original eye position',
        );
      }
    }
  }
});

test('changing aim only redirects new travel, stays smooth mid-gesture and cannot pan at the inward limit', () => {
  const zoom = createCameraZoom();
  const offset = () =>
    new THREE.Vector3(...zoom.offset(12, [0, 0, 1], 38, 16 / 9));
  const slope = Math.tan((38 * Math.PI) / 360);
  zoom.change(Math.log(1.5), [-0.8, 0.4]);
  zoom.update(0, true);
  const first = offset();
  zoom.change(Math.log(2 / 1.5), [0.6, -0.5]);
  assert.deepEqual(
    offset(),
    first,
    'receiving a new aim does not jump the displayed camera',
  );
  for (let i = 0; i < 240; i++) {
    zoom.update(1 / 60);
    const addedTravel = 12 * (1 / 1.5 - zoom.factor()) * slope;
    const movement = offset().sub(first);
    assert.ok(
      movement.x >= 0,
      'new rightward aim must not initially continue left',
    );
    assert.ok(Math.abs(movement.x - ((addedTravel * 16) / 9) * 0.6) < 1e-10);
    assert.ok(Math.abs(movement.y - addedTravel * -0.5) < 1e-10);
  }
  const increment = offset().sub(first);
  assert.ok(
    Math.abs(increment.x - ((12 * (1 / 1.5 - 1 / 2) * slope * 16) / 9) * 0.6) <
      1e-10,
  );
  assert.ok(
    Math.abs(increment.y - 12 * (1 / 1.5 - 1 / 2) * slope * -0.5) < 1e-10,
  );
  zoom.change(100, [0.4, 0.6]);
  zoom.update(0, true);
  const maximum = offset();
  zoom.change(10, [-1, -1]);
  zoom.update(0, true);
  assert.deepEqual(
    offset(),
    maximum,
    'a clamped zoom increment cannot move sideways',
  );
  zoom.limit(1, 1.6);
  assert.equal(
    offset().length(),
    0,
    'a resized view with no forward room cannot retain a side offset',
  );
  zoom.clear();
  zoom.limit(12, 4);
  zoom.change(Math.log(2), [1, 0]);
  for (let i = 0; i < 8; i++) zoom.update(1 / 60);
  const moving = offset();
  zoom.change(0.1, [-1, 1]);
  assert.deepEqual(
    offset(),
    moving,
    're-aiming during the spring also retains continuity',
  );
  let previous = offset();
  let previousFactor = zoom.factor();
  for (let i = 0; i < 240; i++) {
    zoom.update(1 / 60);
    const travel = 12 * (previousFactor - zoom.factor()) * slope;
    const next = offset();
    assert.ok(
      Math.abs(next.x - previous.x + (travel * 16) / 9) < 1e-10,
      'unfinished inward travel immediately follows the new leftward aim',
    );
    assert.ok(Math.abs(next.y - previous.y - travel) < 1e-10);
    previous = next;
    previousFactor = zoom.factor();
  }
  zoom.reset();
  for (let i = 0; i < 300; i++) zoom.update(1 / 60);
  assert.equal(offset().length(), 0);
});

test('partial outward reversals restore the displayed offset after changing aim', () => {
  for (const frames of [6, 7]) {
    const zoom = createCameraZoom();
    const offset = () => zoom.offset(12, [0, 0, 1], 38, 16 / 9);
    zoom.change(Math.log(1.1), [-1, 0]);
    zoom.update(0, true);
    zoom.change(Math.log(2 / 1.1), [1, -0.6]);
    for (let i = 0; i < frames; i++) zoom.update(1 / 60);
    const displayed = offset();
    const depth = 1 - zoom.factor();
    zoom.change(-Math.log(0.95) - zoom.goal);
    assert.deepEqual(offset(), displayed);
    for (let i = 0; i < 240; i++) {
      zoom.update(1 / 60);
      const scale = (1 - zoom.factor()) / depth;
      offset().forEach((value, j) => {
        assert.ok(
          Math.abs(value - displayed[j] * scale) < 1e-10,
          'outward travel cannot move farther sideways or cross the origin',
        );
      });
    }
  }
});

test('shortening pending inward travel keeps its current cursor ray', () => {
  const zoom = createCameraZoom();
  const offset = () => zoom.offset(12, [0, 0, 1], 38, 16 / 9);
  zoom.change(Math.log(1.1), [-1, 0]);
  zoom.update(0, true);
  zoom.change(Math.log(2 / 1.1), [1, -0.6]);
  for (let i = 0; i < 6; i++) zoom.update(1 / 60);
  const displayed = offset();
  const factor = zoom.factor();
  zoom.change(-0.1, [-1, 1]);
  assert.deepEqual(offset(), displayed);
  for (let i = 0; i < 240; i++) {
    zoom.update(1 / 60);
    const travel =
      12 * (factor - zoom.factor()) * Math.tan((38 * Math.PI) / 360);
    const next = offset();
    assert.ok(Math.abs(next[0] - displayed[0] - (travel * 16) / 9) < 1e-10);
    assert.ok(Math.abs(next[1] - displayed[1] + travel * 0.6) < 1e-10);
  }
});

test('a reversal that cancels pending depth cannot jump sideways or create nonfinite motion', () => {
  const zoom = createCameraZoom();
  const offset = () => zoom.offset(12, [0, 0, 1], 38, 16 / 9);
  zoom.change(Math.log(1.1), [-1, 0]);
  zoom.update(0, true);
  zoom.change(Math.log(2 / 1.1), [1, 0.5]);
  for (let i = 0; i < 6; i++) zoom.update(1 / 60);
  const before = offset();
  const requested = zoom.motion.value;
  zoom.change(requested - zoom.goal);
  assert.deepEqual(offset(), before);
  for (let i = 0; i < 240; i++) {
    zoom.update(1 / 60);
    assert.ok(offset().every(Number.isFinite));
  }
  offset().forEach((value, i) =>
    assert.ok(Math.abs(value - before[i]) < 1e-10),
  );
  zoom.reset();
  zoom.update(0, true);
  assert.equal(Math.hypot(...offset()), 0);
});

test('nearly cancelled pending zoom cannot amplify lateral travel', () => {
  const zoom = createCameraZoom();
  zoom.change(Math.log(1.1), [-1, 0]);
  zoom.update(0, true);
  zoom.change(Math.log(2 / 1.1), [1, 0]);
  for (let i = 0; i < 6; i++) zoom.update(1 / 60);
  zoom.change(zoom.motion.value + 1e-10 - zoom.goal);
  const unit = (12 * Math.tan((38 * Math.PI) / 360) * 16) / 9;
  let previousFactor = zoom.factor();
  let previousX = zoom.offset(12, [0, 0, 1], 38, 16 / 9)[0];
  for (let i = 0; i < 240; i++) {
    zoom.update(1 / 60);
    const x = zoom.offset(12, [0, 0, 1], 38, 16 / 9)[0];
    assert.ok(
      Math.abs(x - previousX) <=
        Math.abs(previousFactor - zoom.factor()) * unit + 1e-10,
    );
    previousFactor = zoom.factor();
    previousX = x;
  }
});

test('wheel pixels, lines, pages and trackpad pinch use consistent direction and units', () => {
  const wheel = (deltaY, deltaMode = 0, ctrlKey = false) =>
    wheelZoomDelta({ deltaY, deltaMode, ctrlKey }, 800);
  assert.equal(wheel(-48), wheel(-3, 1));
  assert.equal(wheel(-800), wheel(-1, 2));
  assert.equal(wheel(-10, 0, true), 0.1);
  assert.ok(wheel(-50) > 0);
  assert.ok(wheel(50) < 0);
});

class ElementFixture extends EventTarget {
  constructor(selector = '') {
    super();
    this.selector = selector;
  }
  closest(selector) {
    return this.selector && selector.includes(this.selector) ? this : null;
  }
  getBoundingClientRect() {
    return { left: 100, top: 50, width: 400, height: 800 };
  }
}
function inputFixture(t) {
  const original = globalThis.Element;
  globalThis.Element = ElementFixture;
  t.after(() => {
    if (original) globalThis.Element = original;
    else delete globalThis.Element;
  });
  const win = new EventTarget();
  const doc = new EventTarget();
  doc.defaultView = win;
  const el = new ElementFixture();
  el.ownerDocument = doc;
  el.clientHeight = 800;
  const state = {
    enabled: true,
    available: true,
    changes: [],
    aims: [],
    interrupts: 0,
    resets: 0,
  };
  const binding = bindCameraZoom(el, {
    enabled: () => state.enabled,
    available: () => state.available,
    change: (delta, point) => {
      state.changes.push(delta);
      state.aims.push(point);
    },
    reset: () => state.resets++,
    interrupt: () => state.interrupts++,
  });
  t.after(() => binding.dispose());
  const send = (type, props = {}, target = el) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, props);
    Object.defineProperty(event, 'target', { value: target });
    const recipient =
      type === 'keydown'
        ? doc
        : ['touchend', 'touchcancel', 'gestureend', 'blur'].includes(type)
          ? win
          : el;
    recipient.dispatchEvent(event);
    return event;
  };
  return { binding, state, send };
}

test('scene wheel is consumed at both bounds while ordinary content scrolling and editors stay native', (t) => {
  const { state, send, binding } = inputFixture(t);
  const wheel = { deltaY: -30, deltaMode: 0, ctrlKey: false };
  assert.equal(send('wheel', wheel).defaultPrevented, true);
  const surface = new ElementFixture('.world-surface');
  assert.equal(send('wheel', wheel, surface).defaultPrevented, false);
  assert.equal(
    send('wheel', { ...wheel, ctrlKey: true }, surface).defaultPrevented,
    true,
  );
  assert.equal(
    send('wheel', { ...wheel, ctrlKey: true }, new ElementFixture('textarea'))
      .defaultPrevented,
    false,
  );
  assert.equal(state.changes.length, 2);
  state.available = false;
  assert.equal(
    send('wheel', wheel).defaultPrevented,
    true,
    'travel cannot fall through to browser magnification',
  );
  assert.equal(state.changes.length, 2);
  state.enabled = false;
  assert.equal(send('wheel', wheel).defaultPrevented, false);
  binding.dispose();
  state.enabled = true;
  assert.equal(send('wheel', wheel).defaultPrevented, false);
});

test('two-finger zoom cancels dragging, handles extra fingers and waits for the final release', (t) => {
  const { state, send, binding } = inputFixture(t);
  const touches = (span) => [
    { clientX: 0, clientY: 0 },
    { clientX: span, clientY: 0 },
  ];
  send('touchstart', { touches: [touches(100)[0]] });
  assert.equal(binding.pinching, false);
  assert.equal(
    send('touchstart', { touches: touches(100) }).defaultPrevented,
    true,
  );
  assert.equal(binding.pinching, true);
  send('touchmove', { touches: touches(200) });
  assert.equal(state.changes[0], Math.log(2));
  send('touchstart', {
    touches: [...touches(200), { clientX: 250, clientY: 30 }],
  });
  send('touchend', { touches: touches(150) });
  send('touchmove', { touches: touches(120) });
  assert.equal(state.changes[1], Math.log(0.8));
  send('touchend', { touches: [touches(100)[0]] });
  assert.equal(binding.pinching, true);
  send('touchmove', { touches: [touches(100)[0]] });
  assert.equal(state.changes.length, 2);
  send('touchcancel', { touches: [] });
  assert.equal(binding.pinching, false);
  assert.ok(state.interrupts >= 4, 'release keeps click suppression active');
});

test('WebKit gestures avoid duplicate wheel/touch zoom and keyboard shortcuts respect native editing', (t) => {
  const { state, send, binding } = inputFixture(t);
  send('gesturestart', { scale: 1 });
  send('gesturechange', { scale: 1.2 });
  send('wheel', { deltaY: -10, deltaMode: 0, ctrlKey: true });
  assert.deepEqual(state.changes, [Math.log(1.2)]);
  send('gestureend');
  assert.equal(binding.pinching, false);
  assert.equal(
    send('keydown', { key: '+', metaKey: true }).defaultPrevented,
    true,
  );
  assert.equal(
    send('keydown', { key: '0', ctrlKey: true }).defaultPrevented,
    true,
  );
  assert.equal(state.resets, 1);
  assert.equal(
    send('keydown', { key: '+', metaKey: true }, new ElementFixture('input'))
      .defaultPrevented,
    false,
  );
  assert.equal(
    send(
      'keydown',
      { key: '-', ctrlKey: true },
      new ElementFixture('[data-rendering-controls]'),
    ).defaultPrevented,
    false,
  );
  send('gesturestart', { scale: 1 });
  send('blur');
  assert.equal(binding.pinching, false);
});

test('wheel, moving pinch midpoints and keyboard/WebKit cursor fallbacks carry viewport-relative aim', (t) => {
  const { state, send } = inputFixture(t);
  send('wheel', { deltaY: -20, deltaMode: 0, clientX: 400, clientY: 250 });
  assert.deepEqual(state.aims.at(-1), [0.5, 0.5]);
  send('touchstart', {
    touches: [
      { clientX: 120, clientY: 600 },
      { clientX: 220, clientY: 600 },
    ],
  });
  send('touchmove', {
    touches: [
      { clientX: 110, clientY: 650 },
      { clientX: 310, clientY: 650 },
    ],
  });
  assert.ok(Math.abs(state.aims.at(-1)[0] + 0.45) < 1e-12);
  assert.equal(state.aims.at(-1)[1], -0.5);
  send('touchmove', {
    touches: [
      { clientX: 120, clientY: 450 },
      { clientX: 420, clientY: 450 },
    ],
  });
  assert.ok(Math.abs(state.aims.at(-1)[0] + 0.15) < 1e-12);
  assert.equal(state.aims.at(-1)[1], 0);
  send('touchend', { touches: [] });
  send('pointermove', { pointerType: 'mouse', clientX: 180, clientY: 450 });
  send('gesturestart', { scale: 1 });
  send('gesturechange', { scale: 1.2 });
  assert.deepEqual(state.aims.at(-1), [-0.6, 0]);
  send('gesturechange', { scale: 1.4, clientX: 400, clientY: 650 });
  assert.deepEqual(state.aims.at(-1), [0.5, -0.5]);
  send('gestureend');
  send('keydown', { key: '+', ctrlKey: true });
  assert.deepEqual(state.aims.at(-1), [-0.6, 0]);
  send('pointerleave', {}, new ElementFixture());
  send('keydown', { key: '+', ctrlKey: true });
  assert.deepEqual(
    state.aims.at(-1),
    [-0.6, 0],
    'leaving a child hotspot keeps the cursor aim inside the scene',
  );
  send('pointerleave');
  send('keydown', { key: '+', ctrlKey: true });
  assert.equal(
    state.aims.at(-1),
    undefined,
    'keyboard zoom without a scene cursor defaults to the center',
  );
});
