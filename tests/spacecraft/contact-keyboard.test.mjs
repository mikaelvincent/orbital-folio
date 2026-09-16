import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  buildContactKeyboard,
  CONTACT_KEY_LAYOUT,
  CONTACT_KEY_TRAVEL,
} from '../../features/spacecraft/rooms/contact-keyboard.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { coalesceStaticInstances } from '../../features/spacecraft/geometry/coalesce-static-instances.ts';

function fixture(materials = {}) {
  const deck = new THREE.Group();
  const keyboard = buildContactKeyboard(
    THREE,
    {
      instances(geometry, material, transforms, parent, name) {
        const mesh = new THREE.InstancedMesh(
          geometry,
          material,
          transforms.length,
        );
        mesh.name = name;
        const object = new THREE.Object3D();
        transforms.forEach((transform, index) => {
          object.position.fromArray(transform.p);
          object.scale.fromArray(transform.s);
          object.updateMatrix();
          mesh.setMatrixAt(index, object.matrix);
        });
        parent.add(mesh);
        return mesh;
      },
    },
    deck,
    materials,
  );
  return keyboard;
}

function height(keyboard, code) {
  const matrix = new THREE.Matrix4();
  keyboard.caps.getMatrixAt(
    keyboard.keys.findIndex((key) => key.code === code),
    matrix,
  );
  return matrix.elements[14];
}

test('Contact keyboard has a complete staggered typing layout and separated physical keys', () => {
  const keys = new Map(CONTACT_KEY_LAYOUT.map((key) => [key.code, key]));
  assert.equal(
    keys.size,
    CONTACT_KEY_LAYOUT.length,
    'Physical event codes are unique',
  );
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    assert.ok(keys.has(`Key${letter}`));
  for (const digit of '0123456789') assert.ok(keys.has(`Digit${digit}`));
  for (const key of [
    'Enter',
    'Space',
    'Tab',
    'Backspace',
    'ShiftLeft',
    'ShiftRight',
    'MetaLeft',
    'MetaRight',
    'ControlLeft',
    'ControlRight',
    'AltLeft',
    'AltRight',
    'ArrowLeft',
    'ArrowUp',
    'ArrowRight',
    'ArrowDown',
  ])
    assert.ok(keys.has(key));
  assert.ok(keys.get('KeyA').x > keys.get('KeyQ').x);
  assert.ok(keys.get('KeyZ').x > keys.get('KeyA').x);
  assert.ok(keys.get('Space').width > keys.get('KeyA').width * 6);
  for (let i = 0; i < CONTACT_KEY_LAYOUT.length; i++) {
    const a = CONTACT_KEY_LAYOUT[i];
    assert.ok(a.width > 0 && a.height > 0);
    for (const b of CONTACT_KEY_LAYOUT.slice(i + 1)) {
      const separated =
        Math.abs(a.x - b.x) > (a.width + b.width) / 2 ||
        Math.abs(a.y - b.y) > (a.height + b.height) / 2;
      assert.ok(separated, `${a.code} must not overlap ${b.code}`);
    }
  }
  assert.equal(keys.get('ArrowUp').x, keys.get('ArrowDown').x);
});

test('Shift+A depresses two independent keys, holds through repeats, and releases individually', () => {
  const keyboard = fixture();
  const rest = height(keyboard, 'KeyA');
  assert.equal(
    keyboard.update(1 / 60),
    false,
    'Idle keyboard needs no geometry updates',
  );
  assert.equal(keyboard.press('ShiftLeft'), true);
  assert.equal(keyboard.press('KeyA'), true);
  assert.equal(
    keyboard.press('KeyA'),
    false,
    'Auto-repeat cannot restart the key stroke',
  );
  assert.equal(keyboard.press('Unidentified'), false);
  keyboard.update(1 / 60);
  const partial = height(keyboard, 'KeyA');
  assert.ok(partial < rest && partial > rest - CONTACT_KEY_TRAVEL);
  for (let i = 0; i < 60; i++) keyboard.update(1 / 60);
  assert.ok(
    Math.abs(height(keyboard, 'KeyA') - (rest - CONTACT_KEY_TRAVEL)) < 1e-7,
  );
  assert.equal(height(keyboard, 'ShiftLeft'), height(keyboard, 'KeyA'));
  assert.equal(height(keyboard, 'KeyS'), rest);
  assert.equal(
    keyboard.update(1 / 60),
    false,
    'Held key must remain depressed without repeated buffer uploads',
  );
  keyboard.release('KeyA');
  for (let i = 0; i < 60; i++) keyboard.update(1 / 60);
  assert.ok(Math.abs(height(keyboard, 'KeyA') - rest) < 1e-7);
  assert.ok(height(keyboard, 'ShiftLeft') < rest - CONTACT_KEY_TRAVEL * 0.99);
});

test('Focus-loss clearing restores every key and reduced-motion changes can settle immediately', () => {
  const keyboard = fixture();
  const rest = height(keyboard, 'KeyA');
  keyboard.press('KeyA');
  keyboard.press('ControlLeft');
  keyboard.update(0, true);
  keyboard.clear(true);
  assert.equal(
    keyboard.update(0),
    true,
    'Immediate clear still reports a geometry change to AO invalidation',
  );
  assert.equal(height(keyboard, 'KeyA'), rest);
  assert.equal(height(keyboard, 'ControlLeft'), rest);
  assert.equal(keyboard.update(Number.NaN), false);
  assert.equal(keyboard.release('KeyA'), false);
  keyboard.press('Space');
  keyboard.update(1, true);
  keyboard.clear();
  for (let i = 0; i < 90; i++) keyboard.update(1 / 60);
  assert.equal(height(keyboard, 'Space'), rest);
  assert.equal(keyboard.update(1 / 60), false);
});

test('Printed legends share one atlas and follow the cap motion without moving other labels', () => {
  const previous = globalThis.document;
  const canvasDocument = {
    createElement() {
      return { getContext: () => ({ fillText() {} }) };
    },
  };
  globalThis.document = canvasDocument;
  try {
    const keyboard = fixture({ ink: new THREE.MeshStandardMaterial() });
    assert.ok(keyboard.legends);
    assert.equal(keyboard.legends.material.map.image.width, 1024);
    assert.equal(keyboard.legends.material.map.image.height, 512);
    assert.equal(keyboard.legends.count, keyboard.caps.count);
    assert.equal(keyboard.legends.castShadow, false);
    assert.equal(keyboard.legends.instanceMatrix.usage, THREE.DynamicDrawUsage);
    const before = new THREE.Matrix4(),
      after = new THREE.Matrix4();
    const index = keyboard.keys.findIndex((key) => key.code === 'KeyA');
    keyboard.legends.getMatrixAt(index, before);
    keyboard.press('KeyA');
    keyboard.update(0, true);
    keyboard.legends.getMatrixAt(index, after);
    assert.ok(
      Math.abs(before.elements[14] - after.elements[14] - CONTACT_KEY_TRAVEL) <
        1e-7,
    );
    assert.equal(before.elements[12], after.elements[12]);
    assert.equal(before.elements[13], after.elements[13]);
    keyboard.clear(true);
    keyboard.update(0);
    keyboard.legends.getMatrixAt(index, after);
    assert.deepEqual(after.elements, before.elements);
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});

test('Keyboard instances and the computer application anchor survive model batching and layout changes', () => {
  const model = createSpacecraft(THREE);
  const console = model.group.getObjectByName('contact-flight-console');
  const computer = console.userData.contactComputer;
  assert.ok(computer.anchor.parent);
  assert.ok(Math.abs(computer.width - 1.33) < 1e-12);
  assert.ok(Math.abs(computer.height - 1.01) < 1e-12);
  assert.ok(
    computer.idleDisplay.children.length,
    'Idle graphics remain attached after material batching',
  );
  computer.setActive(true);
  assert.equal(computer.idleDisplay.visible, false);
  computer.setActive(false);
  assert.equal(computer.idleDisplay.visible, true);
  const caps = computer.keyboard.caps;
  assert.equal(caps.instanceMatrix.usage, THREE.DynamicDrawUsage);
  assert.equal(
    caps.castShadow,
    false,
    'Keys cannot leave stale shadows in the static cache',
  );
  assert.equal(caps.parent, computer.keyboard.root);
  coalesceStaticInstances(THREE, model.group);
  assert.equal(caps.parent, computer.keyboard.root);
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    assert.ok(
      computer.anchor
        .getWorldPosition(new THREE.Vector3())
        .toArray()
        .every(Number.isFinite),
    );
    const rest = height(computer.keyboard, 'Enter');
    computer.keyboard.press('Enter');
    assert.equal(computer.keyboard.update(0, true), true);
    assert.ok(height(computer.keyboard, 'Enter') < rest);
    computer.keyboard.clear(true);
    computer.keyboard.update(0);
  }
});
