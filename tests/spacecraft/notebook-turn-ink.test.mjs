import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createModelPrimitives } from '../../features/spacecraft/geometry/model-primitives.ts';
import { buildAboutPersonalStudy } from '../../features/spacecraft/rooms/about-personal-study.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { fitAboutNotebook } from '../../features/spacecraft/navigation/about-notebook.ts';
import { createNotebookOcclusion } from '../../features/spacecraft/notebook-occlusion.ts';
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
    const frontSection = expected[front][0];
    const underSection = expected[under][0];
    assert.equal(
      notebook.turningSection,
      frontSection === underSection ? -1 : underSection,
      'the marker belongs to the higher section on either turn direction',
    );
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
  assert.deepEqual(
    notebook.flags.map((flag) => flag.side),
    ['left', 'left', 'left'],
  );
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
  assert.deepEqual(
    notebook.flags.map((flag) => flag.side),
    ['left', 'right', 'right'],
  );
});

test('carried tabs mask stationary native marker ink in forward and reverse turns after production batching', () => {
  const model = createSpacecraft(THREE, {
    journal: [
      { title: 'My story' },
      { title: 'How I work' },
      { title: 'Learning notes' },
    ],
  });
  const notebook = model.group.userData.aboutNotebook;
  const fit = fitAboutNotebook(THREE, notebook, 1440, 900, 38);
  const camera = new THREE.PerspectiveCamera(38, 1440 / 900, 0.08, 100);
  camera.position
    .fromArray(fit.target)
    .addScaledVector(
      new THREE.Vector3().fromArray(fit.direction),
      fit.distance,
    );
  camera.lookAt(new THREE.Vector3().fromArray(fit.target));
  camera.updateMatrixWorld(true);
  // Isolate this real moving assembly; scenery masks have separate coverage.
  const mask = createNotebookOcclusion(THREE, notebook.root, notebook);
  const ray = new THREE.Raycaster();
  const inPolygon = (polygon, x, y) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [ax, ay] = polygon[i],
        [bx, by] = polygon[j];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax)
        inside = !inside;
    }
    return inside;
  };
  notebook.setActive(true);
  for (const destination of [1, 0]) {
    notebook.setChapter(destination);
    let hidden = 0,
      clear = 0;
    for (let step = 0; step < 10; step++) {
      notebook.update(notebook.turnDuration * 0.095);
      model.group.updateMatrixWorld(true);
      assert.ok(
        notebook.turningMarker?.parent,
        'carried mount survives batching',
      );
      const meshes = [];
      notebook.turningMarker.traverse((object) => {
        if (object.isMesh) meshes.push(object);
      });
      assert.ok(
        meshes.length,
        'the retained mount owns live rendered geometry',
      );
      const result = mask.update(camera, `${destination}:${step}`);
      const polygons = [...result.path.matchAll(/M([^Z]+)Z/g)].map((match) =>
        match[1].split('L').map((point) => point.split(' ').map(Number)),
      );
      for (const flag of notebook.flags.filter(
        (flag) => flag.index !== notebook.turningSection,
      )) {
        for (
          let x = flag.exposedX + 6.371;
          x < flag.exposedX + flag.exposedWidth;
          x += 10
        )
          for (let y = flag.y + 4.613; y < flag.y + flag.height; y += 8) {
            const target = new THREE.Vector3(
              (x - notebook.pixelsWidth / 2) / 1000,
              (notebook.pixelsHeight / 2 - y) / 1000,
              0,
            ).applyMatrix4(notebook.anchor.matrixWorld);
            ray.set(
              camera.position,
              target.clone().sub(camera.position).normalize(),
            );
            ray.far = camera.position.distanceTo(target) - 0.000001;
            const physical = ray.intersectObjects(meshes, false).length > 0;
            const masked = polygons.some((polygon) => inPolygon(polygon, x, y));
            assert.equal(
              masked,
              physical,
              'native marker ink obeys carried-tab depth',
            );
            if (masked) hidden++;
            else clear++;
          }
      }
    }
    assert.ok(
      hidden > 0,
      'the carried tab actually overlaps stationary marker ink',
    );
    assert.ok(clear > 0, 'uncovered stationary labels remain visible');
    notebook.update(notebook.turnDuration);
    assert.equal(notebook.turningMarker, null);
    assert.equal(mask.update(camera, `settled:${destination}`).path, '');
  }
});
