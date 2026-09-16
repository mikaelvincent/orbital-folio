import test from 'node:test';
import assert from 'node:assert/strict';
import {
  contactApplicationLayout,
  bindContactKeyboard,
} from '../../features/spacecraft/navigation/contact-computer.ts';

test('Portrait fits a readable application inside the fixed glass without stretching the monitor', () => {
  for (const [w, h] of [
    [320, 720],
    [390, 844],
    [900, 1200],
  ]) {
    const layout = contactApplicationLayout(w, h, 1.33, 1.01);
    assert.ok(layout.portrait);
    assert.ok(layout.width > 0 && layout.width < 1.33);
    assert.ok(layout.height < 1.01);
    assert.ok(layout.pixelsWidth >= 240 && layout.pixelsWidth <= w - 32);
    assert.ok(
      Math.abs(
        layout.width / layout.height - layout.pixelsWidth / layout.pixelsHeight,
      ) < 1e-12,
    );
  }
  const landscape = contactApplicationLayout(1280, 720, 1.33, 1.01);
  assert.equal(landscape.portrait, false);
  assert.equal(landscape.width, 1.29);
});

test('Keyboard observation preserves default events, handles held combinations and clears lost focus', () => {
  const doc = new EventTarget(),
    win = new EventTarget(),
    pressed = new Set();
  doc.hidden = false;
  let enabled = true,
    wakes = 0;
  const detach = bindContactKeyboard({
    document: doc,
    window: win,
    platform: 'Win32',
    active: () => enabled,
    contains: (t) => t === doc,
    keyboard: {
      press: (c) => pressed.add(c),
      release: (c) => pressed.delete(c),
      clear: () => pressed.clear(),
    },
    wake: () => wakes++,
  });
  const key = (type, code, extra = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code, getModifierState: () => false, ...extra });
    doc.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
  };
  key('keydown', 'ShiftLeft');
  key('keydown', 'KeyA');
  key('keydown', 'KeyA', { repeat: true });
  assert.deepEqual([...pressed], ['ShiftLeft', 'KeyA']);
  key('keyup', 'KeyA');
  assert.deepEqual([...pressed], ['ShiftLeft']);
  win.dispatchEvent(new Event('blur'));
  assert.equal(pressed.size, 0);
  key('keydown', 'KeyB');
  doc.hidden = true;
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(pressed.size, 0);
  doc.hidden = false;
  key('keydown', 'KeyC');
  key('keyup', 'MetaLeft', { key: 'Meta' });
  assert.equal(pressed.size, 0);
  key('keydown', 'KeyD', { isComposing: true });
  assert.equal(pressed.size, 0);
  enabled = false;
  key('keydown', 'KeyE');
  assert.equal(pressed.size, 0);
  enabled = true;
  detach();
  key('keydown', 'KeyF');
  assert.equal(pressed.size, 0);
  assert.ok(wakes > 0);
});

/** Synthetic platform event sequences; these do not exercise a native keyboard. */
function observeKeyboard(platform = 'MacIntel') {
  const doc = new EventTarget(),
    win = new EventTarget(),
    pressed = new Set();
  doc.hidden = false;
  const state = { enabled: true, inside: true, wakes: 0 };
  const detach = bindContactKeyboard({
    document: doc,
    window: win,
    platform,
    active: () => state.enabled,
    contains: (target) => state.inside && target === doc,
    wake: () => state.wakes++,
    keyboard: {
      press: (code) => pressed.add(code),
      release: (code) => pressed.delete(code),
      clear: () => pressed.clear(),
    },
  });
  const key = (type, code, caps = false, extra = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, {
      code,
      getModifierState: (modifier) => modifier === 'CapsLock' && caps,
      ...extra,
    });
    doc.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
  };
  return { doc, win, pressed, state, key, detach };
}

test('Mac CapsLock stays down while enabled without timing out or disturbing held keys', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { key, pressed, state, detach } = observeKeyboard();
  t.after(detach);
  key('keydown', 'ShiftLeft');
  key('keydown', 'KeyA');
  key('keydown', 'CapsLock', true); // WebKit: toggle on.
  assert.deepEqual(pressed, new Set(['ShiftLeft', 'KeyA', 'CapsLock']));
  const wakes = state.wakes;
  t.mock.timers.tick(30_000);
  assert.deepEqual(pressed, new Set(['ShiftLeft', 'KeyA', 'CapsLock']));
  assert.equal(
    state.wakes,
    wakes,
    'Holding a key must not schedule timer work',
  );
  key('keyup', 'KeyA', true);
  assert.deepEqual(pressed, new Set(['ShiftLeft', 'CapsLock']));
  key('keyup', 'CapsLock', false); // WebKit: toggle off, not physical release.
  assert.deepEqual(pressed, new Set(['ShiftLeft']));

  // Other Mac engines can report both lock toggles as keydown events.
  key('keydown', 'CapsLock', true);
  assert.ok(pressed.has('CapsLock'));
  key('keyup', 'CapsLock', true);
  assert.ok(pressed.has('CapsLock'), 'Fallback follows status, not event type');
  key('keydown', 'CapsLock', false);
  assert.deepEqual(pressed, new Set(['ShiftLeft']));
  key('keyup', 'ShiftLeft');
  assert.equal(pressed.size, 0);
});

test('Mac CapsLock syncs preexisting status from ordinary keys and survives Command cleanup', (t) => {
  const { key, pressed, win, detach } = observeKeyboard();
  t.after(detach);
  key('keydown', 'KeyA', true); // Caps Lock was already enabled before entering.
  assert.deepEqual(pressed, new Set(['CapsLock', 'KeyA']));
  key('keydown', 'MetaLeft', true, { key: 'Meta' });
  key('keyup', 'MetaLeft', true, { key: 'Meta' });
  assert.deepEqual(pressed, new Set(['CapsLock']));
  win.dispatchEvent(new Event('blur'));
  assert.equal(pressed.size, 0);
  key('keyup', 'KeyA', true); // Next in-scope event restores known lock status.
  assert.deepEqual(pressed, new Set(['CapsLock']));
  key('keydown', 'KeyB', false); // Status changed while focus was elsewhere.
  assert.deepEqual(pressed, new Set(['KeyB']));
  key('keyup', 'KeyB', false);
  assert.equal(pressed.size, 0);
});

test('Mac lock fallback clears on lost focus or close and ignores out-of-scope input', () => {
  const { key, pressed, doc, win, state, detach } = observeKeyboard();
  key('keydown', 'KeyA', true);
  win.dispatchEvent(new Event('blur'));
  assert.equal(pressed.size, 0);
  key('keydown', 'KeyA', true);
  doc.hidden = true;
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(pressed.size, 0);
  doc.hidden = false;
  key('keydown', 'KeyA', true);
  state.inside = false;
  doc.dispatchEvent(new Event('focusin'));
  assert.equal(pressed.size, 0);
  for (const type of ['keydown', 'keyup']) {
    key(type, 'CapsLock', true);
    key(type, 'KeyA', true);
    key(type, 'MetaLeft', true, { key: 'Meta' });
    assert.equal(pressed.size, 0);
  }
  state.inside = true;
  state.enabled = false;
  for (const type of ['keydown', 'keyup']) {
    key(type, 'CapsLock', true);
    key(type, 'KeyA', true);
    key(type, 'MetaLeft', true, { key: 'Meta' });
    assert.equal(pressed.size, 0);
  }
  state.enabled = true;
  key('keydown', 'KeyA', true, { isComposing: true });
  key('keyup', 'KeyA', true, { isComposing: true });
  assert.equal(pressed.size, 0);
  key('keydown', 'CapsLock', true);
  assert.ok(pressed.has('CapsLock'));
  detach();
  assert.equal(pressed.size, 0);
  const wakes = state.wakes;
  key('keydown', 'CapsLock', true);
  key('keyup', 'CapsLock', true);
  assert.equal(pressed.size, 0);
  assert.equal(state.wakes, wakes);
});

test('Physical key presses remain held until release regardless of logical lock status', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const platform of ['Win32', 'Linux x86_64']) {
    const { key, pressed, state, detach } = observeKeyboard(platform);
    const codes = [
      'CapsLock',
      'NumLock',
      'ScrollLock',
      'ShiftLeft',
      'ControlLeft',
      'AltLeft',
      'KeyA',
      'Digit1',
      'ArrowLeft',
      'Space',
    ];
    for (const code of codes) key('keydown', code, true);
    const wakes = state.wakes;
    t.mock.timers.tick(30_000);
    assert.deepEqual(pressed, new Set(codes));
    assert.equal(state.wakes, wakes);
    key('keydown', 'KeyA', true, { repeat: true });
    assert.deepEqual(pressed, new Set(codes));
    for (const code of codes) {
      key('keyup', code, true); // Lock status can remain enabled after release.
      assert.equal(pressed.has(code), false);
    }
    assert.equal(pressed.size, 0);
    detach();
  }
});
