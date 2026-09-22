import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createModelPrimitives } from '../../features/spacecraft/geometry/model-primitives.ts';
import { buildAboutPersonalStudy } from '../../features/spacecraft/rooms/about-personal-study.ts';
import { drawStudyArtwork } from '../../features/spacecraft/rooms/about-study-artwork.ts';
import {
  ABOUT_NOTEBOOK_LAYOUT,
  notebookWindowStart,
} from '../../features/spacecraft/rooms/about-notebook-layout.ts';

function fixture(journal) {
  const root = new THREE.Group();
  root.userData.section = 'about';
  const helpers = createModelPrimitives(THREE, root, undefined, { about: [] });
  buildAboutPersonalStudy(THREE, helpers, root, { journal });
  root.updateMatrixWorld(true);
  return { root, notebook: root.userData.aboutNotebook };
}

function pixelsOnSurface(object, notebook) {
  const transform = notebook.anchor.matrixWorld
    .clone()
    .invert()
    .multiply(object.matrixWorld);
  const bounds = new THREE.Box3().setFromBufferAttribute(
    object.geometry.attributes.position,
  );
  const corners = [
    new THREE.Vector3(bounds.min.x, bounds.max.y, 0),
    new THREE.Vector3(bounds.max.x, bounds.min.y, 0),
  ].map((point) => point.applyMatrix4(transform));
  return corners.map((point) => [
    (point.x / notebook.width + 0.5) * notebook.pixelsWidth,
    (0.5 - point.y / notebook.height) * notebook.pixelsHeight,
  ]);
}

function close(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 0.01,
    `${message}: ${actual} vs ${expected}`,
  );
}

test('left artwork prints the current identity within its paper margin and blank active paper has no old copy', () => {
  const text = [];
  const ctx = new Proxy(
    {
      canvas: { width: 1024, height: 1280 },
      fillText: (...args) => text.push(args),
      createLinearGradient: () => ({ addColorStop() {} }),
    },
    { get: (target, key) => target[key] ?? (() => {}) },
  );
  drawStudyArtwork(ctx, 'journal-left', { notebookName: 'Avery Mendoza' });
  assert.ok(text.some(([value]) => value === 'Avery Mendoza'));
  assert.ok(text.every(([value]) => value !== 'Mikael Vincent'));
  const name = text.find(([value]) => value === 'Avery Mendoza');
  assert.ok(
    name[1] + name[3] <= 768 - 72,
    'identity fits within the page margin',
  );
  text.length = 0;
  drawStudyArtwork(ctx, 'journal-blank');
  assert.deepEqual(
    text,
    [],
    'active page leaves text to the attached native content',
  );
  drawStudyArtwork(ctx, 'journal-right');
  assert.ok(text.some(([value]) => value === 'How I work'));
});

test('native page and chapter targets remain registered to the retained paper geometry', () => {
  const { root, notebook } = fixture();
  const paper = root
    .getObjectByName('personal-study-right-paper-section')
    .getObjectByName('personal-study-printed-top-paper-leaf');
  const [[left, top], [right, bottom]] = pixelsOnSurface(paper, notebook);
  close(left, notebook.page.x, 'page left');
  close(top, notebook.page.y, 'page top');
  close(right - left, notebook.page.width, 'page width');
  close(bottom - top, notebook.page.height, 'page height');
  for (const flag of notebook.flags) {
    const printed = root.getObjectByName(
      `personal-study-flag-printed-adhesive-face-${flag.slot}`,
    );
    const [[x, y], [endX, endY]] = pixelsOnSurface(printed, notebook);
    close(x, flag.x, 'flag left');
    close(y, flag.y, 'flag top');
    close(endX - x, flag.width, 'flag width');
    close(endY - y, flag.height, 'flag height');
  }
  // Scaling the entire furniture assembly preserves its content registration.
  root.scale.setScalar(0.84);
  root.position.set(-3, -2, -0.2);
  root.rotation.z = 0.17;
  root.updateMatrixWorld(true);
  const transformed = pixelsOnSurface(paper, notebook);
  close(transformed[0][0], notebook.page.x, 'scaled page left');
  close(transformed[1][1], notebook.page.height, 'scaled page bottom');
});

test('chapter windows reach every record, clamp stale selections and leave unused markers passive', () => {
  const journal = Array.from({ length: 7 }, (_, i) => ({
    title: `Chapter ${i + 1}`,
  }));
  const { notebook } = fixture(journal);
  for (let index = 0; index < journal.length; index++) {
    notebook.setChapter(index);
    assert.equal(
      notebook.turning,
      false,
      'changing closed-book selection does not animate',
    );
    const marker = notebook.flags.find((flag) => flag.index === index);
    assert.equal(marker?.title, journal[index].title);
    assert.equal(marker?.available, true);
  }
  assert.deepEqual(
    notebook.flags.map((flag) => flag.available),
    [true, false, false],
  );
  assert.deepEqual(
    notebook.flags.map((flag) => flag.title),
    ['Chapter 7', '', ''],
  );
  notebook.setChapter(100);
  assert.equal(notebook.chapter, 6);
  notebook.setChapters(journal.slice(0, 2));
  assert.equal(notebook.chapter, 1);
  assert.equal(notebook.windowStart, 0);
  notebook.setChapters([]);
  assert.equal(notebook.available, false);
  assert.ok(notebook.flags.every((flag) => !flag.available && !flag.title));
  assert.equal(notebookWindowStart(Number.NaN), 0);
  assert.equal(notebookWindowStart(-2), 0);
});

test('page turns finish, reverse, and stop immediately for reduced motion without moving the mounted book', () => {
  const { root, notebook } = fixture();
  const before = notebook.root.matrixWorld.clone();
  const leftPage = root.getObjectByName('personal-study-left-paper-section');
  const leftMatrix = leftPage.matrixWorld.clone();
  const frame = notebook.framingAnchor.matrixWorld.clone();
  const turn = root.getObjectByName('personal-study-turning-notebook-leaf');
  const surface = turn.getObjectByName('personal-study-turning-paper-surface');
  assert.equal(
    surface.castShadow,
    false,
    'moving leaf stays outside cached shadows',
  );
  assert.equal(surface.receiveShadow, false);
  notebook.setActive(true);
  notebook.setChapter(1);
  assert.equal(notebook.turning, true);
  assert.equal(turn.visible, true);
  assert.equal(notebook.update(0), false);
  assert.equal(notebook.update(0.22), true);
  assert.ok(Math.abs(turn.rotation.y + Math.PI / 2) < 1e-6);
  notebook.update(0.22);
  assert.equal(notebook.turning, false);
  assert.equal(turn.visible, false);
  notebook.setChapter(0);
  assert.equal(notebook.turnDirection, -1);
  assert.equal(turn.rotation.y, -Math.PI);
  assert.equal(notebook.update(0, true), true);
  assert.equal(notebook.turning, false);
  notebook.setChapter(2, true);
  assert.equal(notebook.turning, false);
  notebook.setChapter(1);
  notebook.setActive(false);
  assert.equal(turn.visible, false);
  assert.equal(notebook.update(0.3), false);
  root.updateMatrixWorld(true);
  assert.deepEqual(notebook.root.matrixWorld.elements, before.elements);
  assert.deepEqual(leftPage.matrixWorld.elements, leftMatrix.elements);
  assert.deepEqual(notebook.framingAnchor.matrixWorld.elements, frame.elements);
  assert.equal(notebook.framingWidth, ABOUT_NOTEBOOK_LAYOUT.framingWidth);
});
