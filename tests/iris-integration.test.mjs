import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import {
  requiredPortalIds,
  interlockLadderPortals,
} from '../lib/iris-navigation.ts';

test('Integrated hatches open on hover, close on departure, and preserve room lighting', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const portals = model.group.userData.portals;
  assert.equal(model.group.userData.irisHatches.length, 8);
  const parts = [];
  model.group.traverse((o) => parts.push(o.name, ...(o.userData.parts || [])));
  assert.ok(
    !parts.some((p) =>
      /flush-open-pressure-hatch-frame|open-hatch-wall-gasket|open-hatch-painted-route-trim/.test(
        p,
      ),
    ),
  );
  assert.ok(
    portals.every((p) => p.raisedDoorFrame === false && p.openProgress === 0),
  );
  model.update(1, 'about', true, {
    activeRoom: 'projects',
    hoveredPortal: 'about',
    openPortalIds: [],
  });
  const left = portals.find((p) => p.id === 'projects:about');
  assert.equal(left.highlight, 1);
  assert.equal(left.openProgress, 1, 'Hover opens the approached ladder door');
  assert.ok(portals.filter((p) => p !== left).every((p) => p.sealed));
  model.update(2, '', true, {
    activeRoom: 'projects',
    hoveredPortal: '',
    openPortalIds: [],
  });
  assert.ok(
    portals.every((p) => p.highlight === 0 && p.sealed),
    'Leaving restores neutral doors',
  );
  for (const hatch of model.group.userData.irisHatches) {
    assert.equal(
      hatch.children.filter((o) => o.userData.irisBladeIndex !== undefined)
        .length,
      6,
    );
    hatch.traverse((o) => {
      if (o.isMesh) assert.equal(o.castShadow, false);
    });
  }
});

test('Actual C-route interlocks ladder entrances, reverses smoothly, and settles closed', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const portals = model.group.userData.portals;
  const a = model.group.userData.roomAnchors;
  const via = portals.find((p) => p.id === 'projects:about').waypoints;
  const ids = requiredPortalIds(portals, [
    a.projects,
    ...via,
    a.about,
    a.contact,
  ]);
  assert.deepEqual(ids, [
    'projects:about',
    'about:projects',
    'about:contact',
    'contact:about',
  ]);
  let time = 0;
  const step = (openPortalIds) =>
    model.update((time += 1 / 60), '', false, {
      activeRoom: 'contact',
      travelling: true,
      transitRoom: 'projects',
      hoveredPortal: '',
      openPortalIds,
      delta: 1 / 60,
    });
  const hatchKey = (p) =>
    p.via === 'walkway' ? p.id : [p.from, p.to].sort().join(':');
  const assertOne = () =>
    assert.ok(
      new Set(
        portals
          .filter((p) => p.via === 'walkway' && p.openProgress > 0.001)
          .map(hatchKey),
      ).size <= 1,
      'Ladder entrances cannot overlap their opening intervals',
    );
  const assertPairedMotion = () => {
    const progress = new Map();
    for (const hatch of model.group.userData.irisHatches) {
      const key = hatch.userData.physicalHatch;
      if (progress.has(key))
        assert.equal(
          hatch.userData.openProgress,
          progress.get(key),
          'Both blade sets of a passage must move together',
        );
      progress.set(key, hatch.userData.openProgress);
    }
  };
  const legs = [
    ['projects:about'],
    [],
    ['about:projects'],
    ['about:contact', 'contact:about'],
  ];
  for (const wanted of legs) {
    let ready = false;
    for (let i = 0; i < 160; i++) {
      const gate = interlockLadderPortals(portals, wanted);
      step(gate.openPortalIds);
      assertOne();
      assertPairedMotion();
      if (!gate.waiting) {
        ready = true;
        break;
      }
    }
    assert.ok(ready, 'Each leg must eventually clear its interlock');
  }
  for (let i = 0; i < 120; i++) step([]);
  assert.ok(portals.every((p) => p.sealed && p.openProgress === 0));
  let openFrames = 0;
  do {
    step(['projects:about']);
    openFrames++;
  } while (
    !portals.find((p) => p.id === 'projects:about').open &&
    openFrames < 120
  );
  assert.ok(
    openFrames <= 34,
    `Opening should take about half a second, took ${openFrames / 60}s`,
  );
  for (let i = 0; i < 120; i++) step([]);
  for (let i = 0; i < 12; i++) step(['projects:about']);
  const before = portals.find((p) => p.id === 'projects:about').openProgress;
  step([]);
  const after = portals.find((p) => p.id === 'projects:about').openProgress;
  assert.ok(Math.abs(after - before) < 0.06, 'Reversal must not snap progress');
  for (let i = 0; i < 120; i++) step([]);
  model.update(++time, '', false, {
    openPortalIds: ['about:contact', 'contact:about'],
    immediateDoors: true,
  });
  assert.ok(
    portals
      .filter((p) => p.id === 'about:contact' || p.id === 'contact:about')
      .every((p) => p.open),
  );
  model.update(++time, '', false, { openPortalIds: [], immediateDoors: true });
  assert.ok(
    portals.every((p) => p.sealed),
    'Reduced motion/resize cannot retain an opening',
  );
});

test('Door opening takes about half the original duration across refresh rates, with unchanged closing', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const portal = model.group.userData.portals.find(
    (p) => p.id === 'projects:about',
  );
  let time = 0;
  for (const hz of [30, 60, 120]) {
    model.update(++time, '', true, {
      openPortalIds: [],
      immediateDoors: false,
    });
    for (const opening of [true, false]) {
      // Start each motion at rest, including closure after a fully open door.
      model.update(++time, '', true, {
        openPortalIds: opening ? [] : [portal.id],
      });
      let frames = 0;
      do {
        model.update((time += 1 / hz), '', false, {
          openPortalIds: opening ? [portal.id] : [],
          delta: 1 / hz,
        });
        frames++;
      } while (!(opening ? portal.open : portal.sealed) && frames < hz * 2);
      const duration = frames / hz;
      assert.ok(
        opening
          ? duration >= 0.48 && duration <= 0.6
          : duration >= 0.95 && duration <= 1.1,
        `${hz}Hz ${opening ? 'opening' : 'closing'} took ${duration}s`,
      );
    }
  }
});

test('Hover opens both faces of the first route door and transfers smoothly into travel', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const portals = model.group.userData.portals;
  let time = 0;
  const step = (state) =>
    model.update((time += 1 / 60), '', false, {
      activeRoom: 'experience',
      travelling: false,
      reading: false,
      hoveredPortal: '',
      openPortalIds: [],
      delta: 1 / 60,
      ...state,
    });
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    for (const target of ['projects', 'experience:projects', 'contact']) {
      for (let i = 0; i < 100; i++) step({ hoveredPortal: target });
      const opened = portals.filter((p) => p.open).map((p) => p.id);
      assert.deepEqual(
        opened,
        ['experience:projects', 'projects:experience'],
        'A destination or exact portal opens only the first physical doorway',
      );
      const before = portals.find((p) => p.id === opened[0]).openProgress;
      step({
        travelling: true,
        hoveredPortal: 'contact',
        openPortalIds: opened,
      });
      assert.ok(
        portals
          .filter((p) => opened.includes(p.id))
          .every((p) => p.openProgress >= before),
        'Clicking a hovered door must not send a closing pulse',
      );
      for (let i = 0; i < 120; i++) step({});
      assert.ok(
        portals.every((p) => p.sealed),
        'Hover departure settles every door closed',
      );
    }
    for (const state of [
      { activeRoom: 'home' },
      { reading: true },
      { travelling: true },
      { activeRoom: 'experience', hoveredPortal: 'experience' },
    ]) {
      for (let i = 0; i < 100; i++)
        step({ hoveredPortal: 'projects', ...state });
      assert.ok(
        portals.every((p) => p.sealed),
        'Inactive hover cannot open a door',
      );
    }
  }
});

test('Rapid ladder hover changes keep the two entrances interlocked in both layouts', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const portals = model.group.userData.portals;
  const ladder = portals.filter((p) => p.via === 'walkway');
  let time = 0;
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    for (const [activeRoom, hoveredPortal, frames] of [
      ['projects', 'about', 100],
      ['about', 'projects', 8],
      ['projects', 'about', 8],
      ['about', 'projects', 180],
      ['about', '', 120],
    ]) {
      for (let i = 0; i < frames; i++) {
        model.update((time += 1 / 60), '', false, {
          activeRoom,
          hoveredPortal,
          openPortalIds: [],
          delta: 1 / 60,
        });
        assert.ok(
          ladder.filter((p) => p.openProgress > 0.001).length <= 1,
          'Closing entrance and opening exit must never overlap, even on reversal',
        );
        for (const portal of ladder) {
          const faces = model.group.userData.irisHatches.filter(
            (h) => h.userData.physicalHatch === portal.id,
          );
          assert.equal(faces.length, 2);
          assert.equal(
            faces[0].userData.openProgress,
            faces[1].userData.openProgress,
          );
        }
      }
      if (frames >= 100 && hoveredPortal)
        assert.ok(
          ladder.find((p) => p.from === activeRoom).open,
          'Requested entrance eventually opens',
        );
    }
    assert.ok(portals.every((p) => p.sealed));
  }
});

test('Every physical passage has two opposing blade assemblies and one continuous dark liner', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  for (const layout of ['wide', 'compact', 'wide']) {
    model.setLayout(layout);
    const pairs = new Map();
    for (const hatch of model.group.userData.irisHatches) {
      const id = hatch.userData.physicalHatch;
      pairs.set(id, [...(pairs.get(id) || []), hatch]);
    }
    assert.equal(pairs.size, 4);
    assert.equal(model.group.userData.passageLinings.length, 4);
    for (const [id, hatches] of pairs) {
      assert.equal(hatches.length, 2, `${id} needs blades on both faces`);
      const positions = hatches
        .map((h) => h.getWorldPosition(new THREE.Vector3()))
        .sort((a, b) => a.x - b.x);
      const normals = hatches.map((h) =>
        new THREE.Vector3(0, 0, 1).transformDirection(h.matrixWorld),
      );
      assert.ok(
        normals[0].dot(normals[1]) < -0.9999,
        'The two guides face their respective cabins',
      );
      assert.ok(
        Math.abs(positions[0].y - positions[1].y) < 1e-6 &&
          Math.abs(positions[0].z - positions[1].z) < 1e-6,
      );
      const center = positions[0].clone().add(positions[1]).multiplyScalar(0.5);
      const liner = model.group.userData.passageLinings.find(
        (g) =>
          g.getWorldPosition(new THREE.Vector3()).distanceTo(center) < 0.001,
      );
      assert.ok(liner, `${id} must have a centered continuous liner`);
      const box = new THREE.Box3().setFromObject(liner);
      assert.ok(Math.abs(box.min.x - positions[0].x - 0.004) < 1e-5);
      assert.ok(Math.abs(box.max.x - positions[1].x + 0.004) < 1e-5);
      const materials = new Set();
      // Radial rays within the actual sleeve detect any missing surface or seam.
      // The endpoint assertions above verify its overlap with both guide rings.
      for (const fraction of [0.04, 0.25, 0.5, 0.75, 0.96]) {
        const x = THREE.MathUtils.lerp(box.min.x, box.max.x, fraction);
        for (let i = 0; i < 24; i++) {
          const angle = (i * Math.PI) / 12;
          const ray = new THREE.Raycaster(
            new THREE.Vector3(x, center.y, center.z),
            new THREE.Vector3(0, Math.cos(angle), Math.sin(angle)),
            0,
            1.1,
          );
          const hit = ray.intersectObject(liner, true)[0];
          assert.ok(hit, `${id} liner must cover every angle and depth`);
          assert.ok(Math.abs(hit.distance - 0.924) < 0.001);
          materials.add(hit.object.material);
        }
      }
      assert.equal(
        materials.size,
        1,
        'The tunnel must not split into differently lit sections',
      );
      const material = [...materials][0];
      assert.equal(material.userData.baseColor.getHex(), 0x2b3948);
      assert.equal(material.userData.exterior, false);
      const [a, b] = material.userData.linkedRooms;
      model.update(1, '', true, { activeRoom: a, transitWalkway: false });
      const fromA = material.color.clone();
      model.update(2, '', true, {
        activeRoom: b === 'walkway' ? '' : b,
        transitWalkway: b === 'walkway',
      });
      assert.ok(
        fromA.equals(material.color),
        'The finish cannot swap when the viewing room changes',
      );
      assert.equal(material.emissive.getHex(), 0);
    }
  }
});

test('Both wall faces use cabin paint and both blade faces share white non-emissive paint', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const walls = new Set();
  model.group.traverse((o) => {
    if (!o.isMesh) return;
    const names = [o.name, ...(o.userData.parts || [])];
    if (
      names.some((n) =>
        /(?:open-side-pressure-bulkhead|walkway-twin-open-room-wall).*interior$/.test(
          n,
        ),
      )
    )
      for (const m of [].concat(o.material)) walls.add(m);
  });
  assert.ok(walls.size > 0);
  for (const m of walls) {
    assert.equal(m.userData.baseColor.getHex(), 0xe1d6c2);
    assert.equal(m.roughness, 0.82);
    assert.equal(m.metalness, 0);
    assert.equal(m.userData.exterior, false);
  }
  model.update(1, '', true, { activeRoom: 'projects', transitWalkway: true });
  for (const hatch of model.group.userData.irisHatches)
    hatch.traverse((o) => {
      if (o.isMesh && o.material.name.startsWith('iris-enamel-')) {
        assert.equal(o.material.userData.baseColor.getHex(), 0xffffff);
        assert.equal(o.material.metalness, 0);
        assert.equal(o.material.emissive.getHex(), 0);
        assert.equal(o.material.userData.linkedRooms.length, 2);
      }
    });
});
