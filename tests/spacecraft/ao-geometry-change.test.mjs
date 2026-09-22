import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { resolveSocialScreens } from '../../lib/content/social-links.ts';

const model = createSpacecraft(THREE, {
  layout: 'wide',
  journal: [{ title: 'One' }, { title: 'Two' }],
  socials: resolveSocialScreens([
    {
      id: 'github',
      title: 'GitHub',
      url: 'https://github.com',
      screen: 'left',
      platform: 'github',
    },
  ]),
});
let time = 0;
const update = (state = {}, instant = false, hoveredRoom = '') =>
  model.update((time += 1 / 60), hoveredRoom, instant, {
    activeRoom: 'home',
    reading: false,
    travelling: false,
    hoveredPortal: '',
    hoveredObject: null,
    openPortalIds: [],
    immediateDoors: false,
    delta: 1 / 60,
    ...state,
  });
const revision = () => model.group.userData.geometryRevision;
const reset = () => update({}, true);

// These are actual renderable transforms/visibility, independent of the new
// cache metadata. Material color, emission and opacity are deliberately absent:
// GTAO replaces those materials with its shared normal/depth material.
function normalInputs() {
  const inputs = [];
  model.group.traverse((object) => {
    if (!object.isMesh) return;
    inputs.push([
      object.uuid,
      object.matrixWorld.toArray(),
      object.visible,
      object.layers.mask,
      object.geometry.getAttribute('position').version,
    ]);
  });
  return inputs;
}

void test('Room dimming and object feedback retain identical AO inputs and revision', () => {
  reset();
  const before = revision();
  const inputs = normalInputs();
  update({ activeRoom: 'contact', hoveredObject: 'contact-social-left' });
  assert.equal(
    model.group.userData.motionActive,
    true,
    'The established broad animation flag still includes material feedback',
  );
  assert.equal(model.group.userData.geometryChanged, false);
  const screen = model.group.userData.socialScreens[0];
  assert.ok(screen.root.userData.hoverProgress > 0);
  assert.ok(model.group.userData.lightingState.contact.level > 0.5);
  assert.equal(revision(), before);
  assert.deepEqual(normalInputs(), inputs);
  for (let i = 0; i < 90; i++)
    update({ activeRoom: 'contact', hoveredObject: 'contact-social-left' });
  assert.equal(screen.root.userData.hoverProgress, 1);
  assert.equal(model.group.userData.motionActive, false);
  assert.equal(revision(), before);
  for (let i = 0; i < 90; i++) update();
  assert.equal(revision(), before, 'Fading back also changes only materials');
  assert.deepEqual(normalInputs(), inputs);
});

void test('Every iris geometry change, including its final snap, invalidates AO', () => {
  reset();
  update({ activeRoom: 'about' }, true);
  const portal = model.group.userData.portals.find(
    (p) => p.id === 'about:contact',
  );
  let frames = 0;
  while (portal.openProgress !== 1 && frames++ < 240) {
    const before = revision();
    const previousOpening = portal.openProgress;
    update({ activeRoom: 'about', openPortalIds: [portal.id] });
    assert.ok(portal.openProgress > previousOpening);
    assert.ok(revision() > before);
    assert.equal(model.group.userData.geometryChanged, true);
  }
  assert.equal(portal.openProgress, 1);
  assert.equal(
    model.group.userData.motionActive,
    false,
    'Final geometry still invalidates even though motion has finished',
  );
  const opened = revision();
  update({ activeRoom: 'about', openPortalIds: [portal.id] });
  assert.equal(revision(), opened);
  assert.equal(model.group.userData.geometryChanged, false);
  update({ activeRoom: 'about', immediateDoors: true });
  assert.equal(portal.openProgress, 0);
  assert.ok(revision() > opened, 'Immediate sealing is also a geometry change');
  assert.equal(model.group.userData.geometryChanged, true);
  assert.equal(model.group.userData.motionActive, false);
});

void test('Mounted notebook turns, final leaf removal and reduced-motion cancellation invalidate AO', () => {
  reset();
  update({ activeRoom: 'about', reading: true, notebookChapter: 0 }, true);
  const book = model.group.userData.aboutNotebook;
  const mounted = book.root.matrixWorld.toArray();
  let before = revision();
  update({ activeRoom: 'about', reading: true, notebookChapter: 1 });
  assert.equal(book.turning, true);
  assert.ok(revision() > before);
  let frames = 0;
  while (book.turning && frames++ < 120) {
    before = revision();
    update({ activeRoom: 'about', reading: true, notebookChapter: 1 });
    assert.ok(
      revision() > before,
      'Moving and final hidden leaf both refresh occlusion',
    );
  }
  assert.equal(book.turning, false);
  assert.deepEqual(book.root.matrixWorld.toArray(), mounted);
  before = revision();
  update({ activeRoom: 'about', reading: true, notebookChapter: 1 });
  assert.equal(revision(), before);
  update({ activeRoom: 'about', reading: true, notebookChapter: 0 });
  assert.equal(book.turning, true);
  before = revision();
  update({ activeRoom: 'about', reading: true, notebookChapter: 0 }, true);
  assert.equal(book.turning, false);
  assert.ok(
    revision() > before,
    'Reduced motion must clear the cached moving leaf',
  );
  model.setReading('about', false, true);
  assert.equal(book.root.visible, true);
  assert.deepEqual(book.root.matrixWorld.toArray(), mounted);
});

void test('Layout changes survive until the renderer observes their revision', () => {
  reset();
  const wide = revision();
  model.setLayout('compact');
  assert.ok(revision() > wide);
  assert.equal(model.group.userData.geometryChanged, true);
  const compact = revision();
  update();
  assert.equal(
    revision(),
    compact,
    'A no-op update must not erase the revision',
  );
  assert.equal(
    model.group.userData.geometryChanged,
    false,
    'This flag describes only the latest update; consumers retain the revision',
  );
  model.setLayout('compact');
  assert.equal(
    revision(),
    compact,
    'Reapplying the same layout is not a new shape',
  );
  update({ layout: 'wide' }, true);
  assert.ok(revision() > compact);
  assert.equal(model.group.userData.geometryChanged, true);
});

void test('Metadata orientation and static catalog repainting do not invalidate AO', () => {
  reset();
  const before = revision();
  const inputs = normalInputs();
  model.setLabelOrientation(true);
  model.setProjects([{ title: 'Project', slug: 'project' }]);
  model.setProjectPage(1);
  model.setCaseStudies([{ title: 'Study', slug: 'study' }]);
  model.setCaseStudyPage(1);
  assert.equal(model.group.userData.labelPortrait, true);
  assert.equal(
    revision(),
    before,
    'Current static catalogs repaint their screens; legacy moving racks are absent',
  );
  assert.deepEqual(normalInputs(), inputs);
});

after(() => {
  const geometries = new Set();
  const materials = new Set();
  model.group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean))
      materials.add(material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
});
