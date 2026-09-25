import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

const model = createSpacecraft(THREE);
const sections = ['projects', 'experience', 'about', 'contact'];
let time = 0;
function update(hover = '', state = {}) {
  model.update(++time, hover, true, {
    activeRoom: 'home',
    reading: false,
    travelling: false,
    hoveredObject: null,
    reducedMotion: true,
    ...state,
  });
}

// Probe the actual rendered partition from each cabin, including after batching.
// Checking dimmer metadata alone misses two faces sharing the wrong material.
function wallFaces() {
  const walls = [];
  model.group.updateMatrixWorld(true);
  model.group.traverseVisible((object) => {
    if (
      object.isMesh &&
      [object.name, ...(object.userData.parts || [])].some((name) =>
        name.startsWith('open-side-pressure-bulkhead'),
      )
    )
      walls.push(object);
  });
  return Object.fromEntries(
    sections.map((section) => {
      const [, y] = model.group.userData.roomAnchors[section];
      const left = section === 'projects' || section === 'about';
      const hits = new THREE.Raycaster(
        new THREE.Vector3(left ? -0.3 : 0.3, y + 0.24, 1.06),
        new THREE.Vector3(left ? 1 : -1, 0, 0),
        0,
        1,
      ).intersectObjects(walls, false);
      assert.ok(hits.length, `${section}: partition face must exist`);
      return [section, hits[0].object.material];
    }),
  );
}

for (const layout of ['wide', 'compact']) {
  test(`${layout}: hover, selection and transit brighten only their own partition face`, () => {
    model.setLayout(layout);
    update();
    const faces = wallFaces();
    const idle = Object.fromEntries(
      sections.map((s) => [s, faces[s].color.clone()]),
    );
    for (const target of sections) {
      for (const mode of ['hover', 'selected', 'transit']) {
        update(mode === 'hover' ? target : '', {
          activeRoom: mode === 'selected' ? target : 'home',
          travelling: mode === 'transit',
          transitRoom: mode === 'transit' ? target : null,
        });
        for (const section of sections) {
          const expected = idle[section]
            .clone()
            .multiplyScalar(section === target ? 2 : 1);
          assert.ok(
            faces[section].color.equals(expected),
            `${target} ${mode} must ${section === target ? 'brighten' : 'leave unchanged'} ${section}'s wall`,
          );
        }
      }
    }
    update();
    for (const section of sections)
      assert.ok(
        faces[section].color.equals(idle[section]),
        `${section}: leaving restores idle`,
      );
  });

  test(`${layout}: reader dimming and wall feedback stay on the current cabin face`, () => {
    model.setLayout(layout);
    const faces = wallFaces();
    // Projects, About and Contact readers do not need populated case-study data.
    for (const current of ['projects', 'about', 'contact']) {
      update('', { activeRoom: current });
      const normal = Object.fromEntries(
        sections.map((s) => [s, faces[s].color.clone()]),
      );
      update('', { activeRoom: current, reading: true });
      assert.ok(
        faces[current].color.r < normal[current].r,
        'The current wall dims for reading',
      );
      for (const section of sections.filter((s) => s !== current))
        assert.ok(
          faces[section].color.equals(normal[section]),
          `${current} reader must not dim ${section}`,
        );
      update('', {
        activeRoom: current,
        reading: true,
        hoveredObject: `${current}-room-dismiss`,
      });
      assert.ok(
        faces[current].color.r > normal[current].r,
        'The current wall previews dismissal',
      );
      for (const section of sections.filter((s) => s !== current))
        assert.ok(
          faces[section].color.equals(normal[section]),
          `${current} wall hover must not brighten ${section}`,
        );
    }
    assert.equal(
      faces.contact.userData.contactRoomWall,
      true,
      'Contact partition remains a dismiss target',
    );
    assert.ok(
      !faces.about.userData.contactRoomWall,
      'About side is not a Contact dismiss target',
    );
  });
}
