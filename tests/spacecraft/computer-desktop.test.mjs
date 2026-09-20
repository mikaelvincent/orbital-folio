import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

await test('full-glass desktops retain room ownership and replace idle graphics exclusively after batching', () => {
  const model = createSpacecraft(THREE);
  const projects = model.group.userData.projectScreens;
  const contact = model.group.userData.contactComputer;
  const displays = [...projects, contact];
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    for (const display of displays) {
      const section = display === contact ? 'contact' : 'projects';
      const idleBounds = new THREE.Box3().setFromObject(display.idleDisplay);
      const desktopBounds = new THREE.Box3().setFromObject(
        display.desktopDisplay,
      );
      assert.ok(idleBounds.min.distanceTo(desktopBounds.min) < 1e-8);
      assert.ok(idleBounds.max.distanceTo(desktopBounds.max) < 1e-8);
      display.desktopDisplay.traverse((object) => {
        if (!object.isMesh) return;
        assert.equal(object.userData.section, section);
        assert.equal(object.castShadow, false);
        assert.equal(
          object.material.isMeshBasicMaterial,
          true,
          'wallpaper remains self-lit regardless of room lights or shadow sampling',
        );
      });
      model.update(1, section, true, {
        activeRoom: section,
        reading: true,
        projectScreen: display.category,
      });
      assert.equal(display.idleDisplay.visible, false);
      assert.equal(display.desktopDisplay.visible, true);
      assert.ok(
        displays
          .filter((other) => other !== display)
          .every(
            (other) =>
              other.idleDisplay.visible && !other.desktopDisplay.visible,
          ),
      );
      model.update(2, section, true, { activeRoom: section, reading: false });
      assert.ok(
        displays.every(
          (other) => other.idleDisplay.visible && !other.desktopDisplay.visible,
        ),
      );
    }
  }
});
