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
    Object.assign(event, { code, ...extra });
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
