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
    interrupts: 0,
    resets: 0,
  };
  const binding = bindCameraZoom(el, {
    enabled: () => state.enabled,
    available: () => state.available,
    change: (delta) => state.changes.push(delta),
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
