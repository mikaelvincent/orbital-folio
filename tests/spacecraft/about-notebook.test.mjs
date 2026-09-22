import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createModelPrimitives } from '../../features/spacecraft/geometry/model-primitives.ts';
import { buildAboutPersonalStudy } from '../../features/spacecraft/rooms/about-personal-study.ts';
import { drawStudyArtwork } from '../../features/spacecraft/rooms/about-study-artwork.ts';
import {
  ABOUT_NOTEBOOK_LAYOUT,
  notebookWindowStart,
  NOTEBOOK_MARKER_LIMIT,
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
  const table = root.getObjectByName('personal-study-folding-desk-body');
  const center = notebook.root.getWorldPosition(new THREE.Vector3());
  close(
    center.x,
    table.getWorldPosition(new THREE.Vector3()).x,
    'book is centered on the desk',
  );
  const feet = [];
  root.traverse((object) => {
    if (object.name === 'personal-study-journal-cradle-front-foot')
      feet.push(object.getWorldPosition(new THREE.Vector3()).x);
  });
  close(
    feet.reduce((sum, x) => sum + x, 0) / feet.length,
    center.x,
    'paired cradle feet remain centered under the book',
  );
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

test('one to six section markers fit the book; later sections use another bank without losing records', () => {
  for (let count = 0; count <= 8; count++) {
    const journal = Array.from({ length: count }, (_, i) => ({
      title: `Section ${i + 1}`,
    }));
    const { root, notebook } = fixture(journal);
    assert.equal(notebook.flags.length, Math.min(count, NOTEBOOK_MARKER_LIMIT));
    for (let index = 0; index < count; index++) {
      notebook.setChapter(index);
      assert.equal(
        notebook.turning,
        false,
        'closed-book changes settle immediately',
      );
      const marker = notebook.flags.find((flag) => flag.index === index);
      assert.equal(marker?.title, journal[index].title);
      assert.ok(
        notebook.flags.every(
          (flag) =>
            flag.y >= 0 && flag.y + flag.height <= notebook.pixelsHeight,
        ),
      );
      for (const [slot, flag] of notebook.flags.entries()) {
        assert.equal(
          flag.y,
          45 + slot * 84,
          'markers descend from the top with a fixed gap at every count',
        );
        if (slot)
          assert.ok(
            flag.y > notebook.flags[slot - 1].y + flag.height,
            'markers have visible breathing room',
          );
      }
    }
    for (
      let slot = notebook.flags.length;
      slot < NOTEBOOK_MARKER_LIMIT;
      slot++
    ) {
      assert.equal(
        root.getObjectByName(`personal-study-tabbed-paper-leaf-${slot}`)
          .visible,
        false,
      );
    }
  }
  const { notebook } = fixture(
    Array.from({ length: 7 }, (_, i) => ({ title: `Section ${i + 1}` })),
  );
  notebook.setChapter(100);
  assert.equal(notebook.chapter, 6);
  assert.deepEqual(
    notebook.flags.map((flag) => flag.title),
    ['Section 7'],
  );
  notebook.setChapters([{ title: 'One' }, { title: 'Two' }]);
  assert.equal(notebook.chapter, 1);
  assert.equal(notebook.windowStart, 0);
  notebook.setChapters([]);
  assert.equal(notebook.available, false);
  assert.deepEqual(notebook.flags, []);
  assert.equal(notebookWindowStart(Number.NaN), 0);
  assert.equal(notebookWindowStart(-2), 0);
});

test('the reading leaf aligns with the indexed page stack and overlaps its flags', () => {
  const { root, notebook } = fixture();
  const page = root
    .getObjectByName('personal-study-right-paper-section')
    .getObjectByName('personal-study-printed-top-paper-leaf');
  const [[left], [right]] = pixelsOnSurface(page, notebook);
  for (const flag of notebook.flags) {
    assert.ok(right > flag.x, 'the printed top leaf covers the adhesive edge');
    close(right - flag.x, 30, 'adhesive overlap');
    const sheet = root.getObjectByName(
      `personal-study-separate-indexed-paper-sheet-${flag.slot}`,
    );
    const [[sheetLeft], [sheetRight]] = pixelsOnSurface(sheet, notebook);
    assert.ok(sheetLeft >= left - 0.01);
    assert.ok(
      sheetRight <= right && right - sheetRight < 5,
      'indexed paper edges align under the top leaf',
    );
  }
});

test('a two-page jump completes two discrete paper turns and moves each crossed marker to the left', () => {
  const { root, notebook } = fixture();
  const turn = root.getObjectByName('personal-study-turning-notebook-leaf');
  notebook.setActive(true);
  notebook.setChapter(2);
  assert.equal(notebook.turningSection, 0);
  assert.equal(notebook.update(0), false);
  notebook.update(0.18);
  close(turn.rotation.y, -Math.PI / 2, 'first half turn');
  const firstFlag = root.getObjectByName('personal-study-tabbed-paper-leaf-0');
  close(firstFlag.rotation.y, turn.rotation.y, 'flag travels with its leaf');
  notebook.update(0.18);
  assert.equal(notebook.settledChapter, 1);
  assert.equal(notebook.turning, true);
  assert.equal(notebook.turningSection, 1);
  close(firstFlag.rotation.y, -Math.PI, 'first section tab rests on left');
  notebook.update(0.36);
  assert.equal(notebook.settledChapter, 2);
  assert.equal(notebook.turning, false);
  assert.equal(turn.visible, false);
  assert.deepEqual(
    notebook.flags.map((flag) => flag.side),
    ['left', 'left', 'right'],
  );
});

test('rapid retargeting preserves the in-flight angle and then follows the newest destination', () => {
  const { root, notebook } = fixture();
  const turn = root.getObjectByName('personal-study-turning-notebook-leaf');
  notebook.setActive(true);
  notebook.setChapter(2);
  notebook.update(0.12);
  const angle = turn.rotation.y;
  notebook.setChapter(0);
  assert.equal(
    turn.rotation.y,
    angle,
    'retargeting does not teleport the turning sheet',
  );
  notebook.update(0.24);
  assert.equal(notebook.settledChapter, 1);
  assert.equal(notebook.turnDirection, -1);
  close(turn.rotation.y, -Math.PI, 'reverse begins at the finished left leaf');
  notebook.update(0.36);
  assert.equal(notebook.settledChapter, 0);
  assert.equal(notebook.turning, false);
  notebook.setChapter(1);
  notebook.update(0.06);
  notebook.setChapter(2);
  notebook.update(0.66);
  assert.equal(notebook.settledChapter, 2);
  assert.equal(notebook.turning, false);
});

test('within-section pages flip individually while only section boundaries carry their page markers', () => {
  const { root, notebook } = fixture([
    { title: 'Story', pageCount: 3 },
    { title: 'Work', pageCount: 2 },
    { title: 'Beyond', pageCount: 1 },
  ]);
  assert.equal(notebook.totalPages, 6);
  notebook.setActive(true);
  notebook.setChapter(4);
  assert.equal(notebook.section, 1);
  assert.equal(notebook.turningSection, -1);
  notebook.update(0.72);
  assert.equal(notebook.settledChapter, 2);
  assert.equal(notebook.settledSection, 0);
  assert.equal(notebook.turningSection, 0);
  notebook.update(0.18);
  close(
    root.getObjectByName('personal-study-tabbed-paper-leaf-0').rotation.y,
    -Math.PI / 2,
    'section boundary flag is carried',
  );
  notebook.update(0.18);
  assert.equal(notebook.settledChapter, 3);
  assert.equal(notebook.settledSection, 1);
  assert.equal(notebook.turningSection, -1);
  notebook.update(0.36);
  assert.equal(notebook.settledChapter, 4);
  assert.equal(notebook.turning, false);
  assert.deepEqual(
    notebook.flags.map((flag) => flag.side),
    ['left', 'right', 'right'],
  );
  notebook.setChapter(1);
  notebook.update(0.36);
  assert.equal(notebook.turningSection, 0);
  assert.equal(notebook.turnDirection, -1);
  notebook.update(0.72);
  assert.equal(notebook.settledSection, 0);
  assert.deepEqual(
    notebook.flags.map((flag) => flag.side),
    ['right', 'right', 'right'],
  );
});

test('long destinations preserve every crossed leaf within a bounded total turn time', () => {
  const { notebook } = fixture([{ title: 'A long section', pageCount: 160 }]);
  notebook.setActive(true);
  notebook.setChapter(159);
  let elapsed = 0;
  for (let page = 1; page <= 159; page++) {
    elapsed += notebook.turnDuration;
    notebook.update(notebook.turnDuration);
    assert.equal(
      notebook.settledChapter,
      page,
      'each crossed leaf settles in sequence',
    );
  }
  assert.ok(elapsed <= 2.4 + 1e-9, 'large jumps finish within 2.4 seconds');
  assert.equal(notebook.turning, false);
  notebook.setChapter(0);
  notebook.update(2.4);
  assert.equal(
    notebook.settledChapter,
    0,
    'a large frame consumes the complete reverse route',
  );
  assert.equal(notebook.turning, false);
});

test('left markers register to the same native plane with a readable reverse printed face', () => {
  const { root, notebook } = fixture();
  notebook.setChapter(2, true);
  root.updateMatrixWorld(true);
  const leftPage = root
    .getObjectByName('personal-study-left-paper-section')
    .getObjectByName('personal-study-printed-top-paper-leaf');
  const [[leftPaperEdge]] = pixelsOnSurface(leftPage, notebook);
  for (const flag of notebook.flags) {
    const front = root.getObjectByName(
      `personal-study-flag-printed-adhesive-face-${flag.slot}`,
    );
    const back = root.getObjectByName(
      `personal-study-flag-printed-adhesive-back-${flag.slot}`,
    );
    const printed = flag.side === 'left' ? back : front;
    const [[x, y], [endX, endY]] = pixelsOnSurface(printed, notebook);
    close(Math.min(x, endX), flag.x, 'registered marker left');
    close(Math.min(y, endY), flag.y, 'registered marker top');
    close(Math.abs(endX - x), flag.width, 'registered marker width');
    if (flag.side === 'left') {
      close(
        flag.x + flag.width - leftPaperEdge,
        30,
        'left adhesive overlap matches right',
      );
      assert.ok(
        leftPaperEdge - flag.x >= 120,
        'left title remains outside the reading paper',
      );
    }
    for (let i = 0; i < front.geometry.attributes.uv.count; i++) {
      close(
        back.geometry.attributes.uv.getX(i),
        1 - front.geometry.attributes.uv.getX(i),
        'reverse face UV avoids mirrored words',
      );
    }
    assert.ok(
      back.geometry.attributes.normal.getZ(0) < 0,
      'back printed face faces out of the turned leaf',
    );
    const sheet = root.getObjectByName(
      `personal-study-separate-indexed-paper-sheet-${flag.slot}`,
    );
    const transform = notebook.anchor.matrixWorld
      .clone()
      .invert()
      .multiply(sheet.matrixWorld);
    const point = new THREE.Vector3();
    for (let i = 0; i < sheet.geometry.attributes.position.count; i++) {
      point
        .fromBufferAttribute(sheet.geometry.attributes.position, i)
        .applyMatrix4(transform);
      assert.ok(
        point.z < 0,
        'rested indexed paper remains beneath the retained printed artwork',
      );
    }
  }
});

test('reduced motion and closure settle all pending leaves without moving the mounted book', () => {
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
  notebook.setChapter(2);
  notebook.update(0.08);
  assert.equal(notebook.update(0, true), true);
  assert.equal(notebook.turning, false);
  assert.equal(notebook.settledChapter, 2);
  assert.deepEqual(
    notebook.flags.map((flag) => flag.side),
    ['left', 'left', 'right'],
  );
  notebook.setChapter(0);
  notebook.setActive(false);
  assert.equal(turn.visible, false);
  assert.equal(notebook.settledChapter, 0);
  assert.equal(notebook.update(0.3), false);
  root.updateMatrixWorld(true);
  assert.deepEqual(notebook.root.matrixWorld.elements, before.elements);
  assert.deepEqual(leftPage.matrixWorld.elements, leftMatrix.elements);
  assert.deepEqual(notebook.framingAnchor.matrixWorld.elements, frame.elements);
  assert.equal(notebook.framingWidth, ABOUT_NOTEBOOK_LAYOUT.framingWidth);
});

test('settled frame updates leave paper textures untouched', () => {
  const previousDocument = globalThis.document;
  const canvasDocument = {
    createElement() {
      const canvas = { width: 0, height: 0 };
      const context = new Proxy(
        {
          canvas,
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
          measureText: (text) => ({ width: text.length * 12 }),
        },
        { get: (target, key) => target[key] ?? (() => {}) },
      );
      canvas.getContext = () => context;
      return canvas;
    },
  };
  globalThis.document = canvasDocument;
  try {
    const { root, notebook } = fixture();
    notebook.setActive(true);
    notebook.setChapter(2, true);
    const maps = new Set();
    root.traverse((object) => {
      if (object.material?.map?.isCanvasTexture) maps.add(object.material.map);
    });
    const versions = [...maps].map((map) => map.version);
    for (let frame = 0; frame < 120; frame++) {
      notebook.setChapter(2, frame % 2 === 0);
      notebook.update(1 / 60);
    }
    assert.deepEqual(
      [...maps].map((map) => map.version),
      versions,
    );
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
