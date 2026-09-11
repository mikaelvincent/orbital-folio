import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { requiredPortalIds } from '../lib/iris-navigation.ts';

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

test('Actual C-route apertures open synchronously, reverse smoothly, and settle closed', () => {
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
  for (let i = 0; i < 12; i++) step(ids);
  const before = portals.find((p) => p.id === ids[0]).openProgress;
  assert.ok(before > 0 && before < 1);
  step([]);
  const after = portals.find((p) => p.id === ids[0]).openProgress;
  assert.ok(Math.abs(after - before) < 0.05, 'Reversal must not snap progress');
  for (let i = 0; i < 120; i++) step(ids);
  for (const portal of portals)
    assert.equal(portal.openProgress, ids.includes(portal.id) ? 1 : 0);
  for (let i = 0; i < 120; i++) step([]);
  assert.ok(portals.every((p) => p.sealed && p.openProgress === 0));
  model.update(++time, '', false, { openPortalIds: ids, immediateDoors: true });
  assert.ok(portals.filter((p) => ids.includes(p.id)).every((p) => p.open));
  model.update(++time, '', false, { openPortalIds: [], immediateDoors: true });
  assert.ok(
    portals.every((p) => p.sealed),
    'Reduced motion/resize cannot retain an opening',
  );
});
