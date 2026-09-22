import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { fitAboutNotebook } from '../../features/spacecraft/navigation/about-notebook.ts';
import {
  responsiveCameraFov,
  CAMERA_RANGES,
} from '../../features/spacecraft/navigation/scene-controls.ts';

test('The batched mounted notebook keeps its physical anchor and cabin framing through reading and turns', () => {
  const model = createSpacecraft(THREE, {
    journal: [{ title: 'Story' }, { title: 'University' }],
  });
  const notebook = model.group.userData.aboutNotebook;
  assert.equal(
    model.group.getObjectByName('about-deployable-reader'),
    undefined,
  );
  assert.equal(model.readerSurfaces.about, notebook.anchor);
  const framing = structuredClone(model.group.userData.roomCameraFrame);
  const mounted = notebook.root.matrixWorld.toArray();
  const paper = notebook.anchor.matrixWorld.toArray();
  model.update(1, 'about', true, { activeRoom: 'about', reading: true });
  model.update(1.02, 'about', false, {
    activeRoom: 'about',
    reading: true,
    notebookChapter: 1,
    delta: 0.02,
  });
  assert.equal(notebook.turning, true);
  const leaf = notebook.root.getObjectByName(
    'personal-study-turning-notebook-leaf',
  );
  assert.ok(
    leaf.children.some((part) => part.isMesh),
    'The animated leaf survives static batching',
  );
  model.update(2, 'about', true, { activeRoom: 'about', reading: false });
  assert.equal(notebook.turning, false);
  assert.deepEqual(notebook.root.matrixWorld.toArray(), mounted);
  assert.deepEqual(notebook.anchor.matrixWorld.toArray(), paper);
  assert.deepEqual(model.group.userData.roomCameraFrame, framing);
});

test('Desktop and portrait fit the same whole book and flags without scaling paper or changing the layout', () => {
  const model = createSpacecraft(THREE);
  const notebook = model.group.userData.aboutNotebook;
  const matrix = notebook.anchor.matrixWorld.toArray();
  for (const [width, height] of [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [1024, 768],
    [390, 844],
    [360, 800],
  ]) {
    const fov = responsiveCameraFov(width / height);
    const frame = fitAboutNotebook(THREE, notebook, width, height, fov);
    const target = new THREE.Vector3(...frame.target);
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.08, 80);
    for (const pitch of [
      -CAMERA_RANGES.computer.pitch,
      0,
      CAMERA_RANGES.computer.pitch,
    ])
      for (const yaw of [
        -CAMERA_RANGES.computer.yaw,
        0,
        CAMERA_RANGES.computer.yaw,
      ]) {
        const direction = new THREE.Vector3(...frame.direction).applyEuler(
          new THREE.Euler(pitch, yaw, 0),
        );
        camera.position.copy(target).addScaledVector(direction, frame.distance);
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        for (const x of [-notebook.framingWidth / 2, notebook.framingWidth / 2])
          for (const y of [
            -notebook.framingHeight / 2,
            notebook.framingHeight / 2,
          ]) {
            const corner = notebook.framingAnchor
              .localToWorld(new THREE.Vector3(x, y, 0))
              .project(camera);
            assert.ok(
              corner.x >= -1 && corner.x <= 1,
              `${width}×${height}: book/flag horizontal clipping`,
            );
            assert.ok(
              corner.y <= 1 && corner.y >= frame.safe.bottom,
              `${width}×${height}: book overlaps dock`,
            );
            assert.ok(
              corner.z > -1 && corner.z < 1,
              'Paper stays in front of near plane',
            );
          }
      }
  }
  assert.deepEqual(notebook.anchor.matrixWorld.toArray(), matrix);
});
