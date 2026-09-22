import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createModelPrimitives } from '../../features/spacecraft/geometry/model-primitives.ts';
import { buildAboutPersonalStudy } from '../../features/spacecraft/rooms/about-personal-study.ts';
import {
  notebookTurnPages,
  notebookPageLocation,
} from '../../features/spacecraft/notebook-turn-ink.ts';

test('Each physical leaf carries its own adjacent Markdown pages through multi-section jumps and reversal', () => {
  const journal = [
    { title: 'Story', pageCount: 3 },
    { title: 'Work', pageCount: 4 },
    { title: 'Beyond', pageCount: 1 },
  ];
  const root = new THREE.Group();
  const helpers = createModelPrimitives(THREE, root, undefined, { about: [] });
  buildAboutPersonalStudy(THREE, helpers, root, { journal });
  const notebook = root.userData.aboutNotebook;
  notebook.setActive(true);
  const expected = [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [1, 3],
    [2, 0],
  ];
  const check = () => {
    const { front, under } = notebookTurnPages(
      notebook.settledChapter,
      notebook.turnDirection,
    );
    assert.equal(under, front + 1);
    for (const absolute of [front, under]) {
      const location = notebookPageLocation(notebook.chapters, absolute);
      assert.deepEqual([location.section, location.page], expected[absolute]);
    }
    return front;
  };
  notebook.setChapter(7);
  const forward = [];
  while (notebook.turning) {
    forward.push(check());
    notebook.update(notebook.turnDuration);
  }
  assert.deepEqual(forward, [0, 1, 2, 3, 4, 5, 6]);
  notebook.setChapter(0);
  notebook.update(notebook.turnDuration / 3);
  const oldPair = notebookTurnPages(
    notebook.settledChapter,
    notebook.turnDirection,
  );
  notebook.setChapter(7);
  assert.deepEqual(
    notebookTurnPages(notebook.settledChapter, notebook.turnDirection),
    oldPair,
    'retargeting keeps the in-flight sheet content until that turn finishes',
  );
  notebook.update(notebook.turnDuration * 2);
  notebook.setChapter(0);
  const reverse = [];
  while (notebook.turning) {
    reverse.push(check());
    notebook.update(notebook.turnDuration);
  }
  assert.deepEqual(reverse, [6, 5, 4, 3, 2, 1, 0]);
});
