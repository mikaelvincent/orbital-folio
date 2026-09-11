import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { requiredPortalIds, interlockPortals } from '../lib/iris-navigation.ts';

test('Integrated hatches replace coamings, stay closed on hover, and preserve room lighting', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  const portals = model.group.userData.portals;
  assert.equal(model.group.userData.irisHatches.length, 6);
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
  assert.ok(
    portals.every((p) => p.openProgress === 0),
    'Hover cannot open a hatch',
  );
  model.update(2, '', true, {
    activeRoom: 'projects',
    hoveredPortal: '',
    openPortalIds: [],
  });
  assert.ok(
    portals.every((p) => p.highlight === 0),
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

test('Actual C-route opens one physical hatch at a time, reverses smoothly, and settles closed', () => {
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
      new Set(portals.filter((p) => p.openProgress > 0.001).map(hatchKey))
        .size <= 1,
      'Physical hatches cannot overlap their opening intervals',
    );
  const legs = [
    ['projects:about'],
    [],
    ['about:projects'],
    ['about:contact', 'contact:about'],
  ];
  for (const wanted of legs) {
    let ready = false;
    for (let i = 0; i < 160; i++) {
      const gate = interlockPortals(portals, wanted);
      step(gate.openPortalIds);
      assertOne();
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
    openFrames <= 50,
    `Opening should take at most 0.83s, took ${openFrames / 60}s`,
  );
  for (let i = 0; i < 120; i++) step([]);
  for (let i = 0; i < 12; i++) step(['projects:about']);
  const before = portals.find((p) => p.id === 'projects:about').openProgress;
  step([]);
  const after = portals.find((p) => p.id === 'projects:about').openProgress;
  assert.ok(Math.abs(after - before) < 0.06, 'Reversal must not snap progress');
  for (let i = 0; i < 120; i++) step([]);
  model.update(++time, '', false, { openPortalIds: ids, immediateDoors: true });
  assert.ok(portals.filter((p) => ids.includes(p.id)).every((p) => p.open));
  model.update(++time, '', false, { openPortalIds: [], immediateDoors: true });
  assert.ok(
    portals.every((p) => p.sealed),
    'Reduced motion/resize cannot retain an opening',
  );
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
