import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { DEFAULT_ROOM_LIGHTING } from '../../features/spacecraft/rendering-settings.ts';

const model = createSpacecraft(THREE);
const sections = ['projects', 'experience', 'about', 'contact'];
let time = 0;
function update(hover = '', state = {}) {
  model.update(++time, hover, true, {
    activeRoom: 'home',
    reading: false,
    travelling: false,
    directRoomTravel: false,
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
  test(`${layout}: hover, selection, destination and transit brighten only their own partition face`, () => {
    model.setLayout(layout);
    update();
    const faces = wallFaces();
    const idle = Object.fromEntries(
      sections.map((s) => [s, faces[s].color.clone()]),
    );
    for (const target of sections) {
      for (const mode of ['hover', 'selected', 'destination', 'transit']) {
        update(mode === 'hover' ? target : '', {
          activeRoom: ['selected', 'destination'].includes(mode)
            ? target
            : 'home',
          travelling: ['destination', 'transit'].includes(mode),
          directRoomTravel: mode === 'destination',
          transitRoom: mode === 'transit' ? target : null,
        });
        for (const section of sections) {
          const expected = idle[section]
            .clone()
            .multiplyScalar(
              section === target ? 1 / DEFAULT_ROOM_LIGHTING.roomIdleLevel : 1,
            );
          assert.ok(
            // Scaling an observed idle color back to full brightness can round.
            ['r', 'g', 'b'].every(
              (channel) =>
                Math.abs(faces[section].color[channel] - expected[channel]) <
                1e-12,
            ),
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

  test(`${layout}: inactive brightness can soften or eliminate the overview-to-room change`, () => {
    model.setLayout(layout);
    const faces = wallFaces();
    for (const idle of [0.5, DEFAULT_ROOM_LIGHTING.roomIdleLevel, 1]) {
      model.setLighting(1, 1, DEFAULT_ROOM_LIGHTING.roomWarmth, {
        ...DEFAULT_ROOM_LIGHTING,
        roomIdleLevel: idle,
      });
      update();
      for (const room of sections) {
        assert.ok(
          faces[room].color.equals(
            faces[room].userData.baseColor.clone().multiplyScalar(idle),
          ),
        );
      }
      const overview = faces.projects.color.clone();
      update('projects');
      assert.ok(faces.projects.color.equals(faces.projects.userData.baseColor));
      if (idle === 1) assert.ok(faces.projects.color.equals(overview));
      update('', {
        activeRoom: 'projects',
        travelling: true,
        directRoomTravel: true,
      });
      assert.ok(faces.projects.color.equals(faces.projects.userData.baseColor));
      update('', { activeRoom: 'projects', travelling: false });
      assert.ok(faces.projects.color.equals(faces.projects.userData.baseColor));
    }
    model.setLighting(1, 1);
    update();
  });

  test(`${layout}: direct travel keeps destination walls and lamps bright from hover through arrival`, () => {
    model.setLayout(layout);
    const faces = wallFaces();
    const fixtures = new Map();
    model.group.traverse((object) => {
      for (const material of [object.material].flat().filter(Boolean))
        if (
          material.userData.lightFixture &&
          sections.includes(material.userData.section)
        )
          fixtures.set(material.userData.section, material);
    });
    assert.equal(fixtures.size, sections.length);

    for (const target of sections) {
      const circulation = model.group.userData.circulation;
      for (const from of [
        'home',
        ...circulation.filter(
          (room, index) => Math.abs(index - circulation.indexOf(target)) === 1,
        ),
      ]) {
        update(target, {
          activeRoom: from,
          transitRoom: '',
          transitWalkway: false,
        });
        const wall = faces[target].color.clone();
        const emission = fixtures.get(target).emissive.clone();
        // Travel clears hover before focus leaves the departure room. The
        // destination stays bright through the gap (or ladder) and arrival.
        for (const transitRoom of [
          from === 'home' ? '' : from,
          '',
          'walkway',
          target,
        ]) {
          for (let frame = 0; frame < 12; frame++) {
            model.update((time += 1 / 60), '', false, {
              activeRoom: target,
              travelling: true,
              directRoomTravel: true,
              transitRoom: transitRoom === 'walkway' ? '' : transitRoom,
              transitWalkway: transitRoom === 'walkway',
              delta: 1 / 60,
            });
            assert.ok(
              faces[target].color.equals(wall),
              `${from} → ${target} via ${transitRoom || 'outside'}: wall must stay bright`,
            );
            assert.ok(
              fixtures.get(target).emissive.equals(emission),
              `${from} → ${target} via ${transitRoom || 'outside'}: lamp face must stay bright`,
            );
            if (transitRoom)
              assert.equal(
                model.group.userData.lightingState[transitRoom].targetLevel,
                1,
                'The crossed room still brightens',
              );
          }
        }
        update('', {
          activeRoom: target,
          transitRoom: '',
          transitWalkway: false,
        });
        assert.ok(
          faces[target].color.equals(wall),
          'Arrival preserves wall brightness',
        );
        assert.ok(
          fixtures.get(target).emissive.equals(emission),
          'Arrival preserves lamp emission',
        );
      }
    }
    update('', { transitRoom: '', transitWalkway: false });
  });

  test(`${layout}: longer routes retain sequential lighting through intermediate cabins`, () => {
    model.setLayout(layout);
    const faces = wallFaces();
    for (const route of [
      ['contact', 'about', 'walkway', 'projects', 'experience'],
      ['experience', 'projects', 'walkway', 'about', 'contact'],
    ]) {
      const target = route.at(-1);
      update(target, { activeRoom: route[0] });
      for (const transit of route) {
        update('', {
          activeRoom: target,
          travelling: true,
          transitRoom: transit === 'walkway' ? '' : transit,
          transitWalkway: transit === 'walkway',
        });
        for (const room of sections) {
          const level =
            room === transit ? 1 : DEFAULT_ROOM_LIGHTING.roomIdleLevel;
          assert.ok(
            faces[room].color.equals(
              faces[room].userData.baseColor.clone().multiplyScalar(level),
            ),
            `${route[0]} → ${target}: only ${transit} lights up`,
          );
        }
        assert.equal(
          model.group.userData.lightingState.walkway.level,
          transit === 'walkway' ? 1 : 0.5,
        );
      }
      update('', {
        activeRoom: target,
        transitRoom: '',
        transitWalkway: false,
      });
      assert.equal(model.group.userData.lightingState[target].level, 1);
    }
    update('', { transitRoom: '', transitWalkway: false });
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
