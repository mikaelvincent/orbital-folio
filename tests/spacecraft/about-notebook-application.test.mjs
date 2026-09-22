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

test('Front and reverse ink anchors stay centered on the physical leaf throughout batched forward and reverse turns', () => {
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
  let model;
  try {
    globalThis.document = canvasDocument;
    model = createSpacecraft(THREE, {
      journal: [{ title: 'First' }, { title: 'Second' }],
    });
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
  const notebook = model.group.userData.aboutNotebook;
  const leaf = notebook.turningLeaf;
  const [front, back] = notebook.turnAnchors;
  assert.equal(front.parent, leaf);
  assert.equal(back.parent, leaf);
  let paper;
  leaf.traverse((object) => {
    if (
      object.isMesh &&
      [object.material]
        .flat()
        .some((material) => material.name.includes('turning-notebook-paper'))
    )
      paper = object;
  });
  assert.ok(paper, 'the physical front sheet survives production batching');
  let fixedArtwork, reverseArtwork;
  notebook.root.traverse((object) => {
    if (!object.isMesh) return;
    for (const material of [object.material].flat()) {
      if (material.name.includes('left-page-ink')) fixedArtwork = material.map;
      if (material.name.includes('turning-notebook-artwork'))
        reverseArtwork = material.map;
    }
  });
  assert.ok(
    fixedArtwork?.isCanvasTexture,
    'the batched comparison includes the authored canvas artwork',
  );
  assert.equal(
    reverseArtwork,
    fixedArtwork,
    'batching and hover-material isolation keep one shared reverse illustration',
  );
  paper.geometry.computeBoundingBox();
  const paperCenter = paper.geometry.boundingBox.getCenter(new THREE.Vector3());
  const assertRegistration = () => {
    model.group.updateMatrixWorld(true);
    const inverseLeaf = leaf.matrixWorld.clone().invert();
    const point = new THREE.Vector3();
    for (const anchor of [front, back]) {
      anchor.getWorldPosition(point).applyMatrix4(inverseLeaf);
      assert.ok(
        Math.abs(point.x - paperCenter.x) < 1e-6,
        'ink is centered across the sheet width',
      );
      assert.ok(
        Math.abs(point.y - paperCenter.y) < 1e-6,
        'ink is centered down the sheet height',
      );
    }
    const frontNormal = new THREE.Vector3(0, 0, 1).transformDirection(
      front.matrixWorld,
    );
    const backNormal = new THREE.Vector3(0, 0, 1).transformDirection(
      back.matrixWorld,
    );
    const leafNormal = new THREE.Vector3(0, 0, 1).transformDirection(
      leaf.matrixWorld,
    );
    assert.ok(frontNormal.dot(leafNormal) > 1 - 1e-10);
    assert.ok(backNormal.dot(leafNormal) < -1 + 1e-10);
    assert.ok(
      frontNormal.dot(backNormal) < -1 + 1e-10,
      'front and reverse ink always face opposite sides',
    );
  };
  notebook.setActive(true);
  assertRegistration();
  notebook.setChapter(1);
  for (let step = 0; step < 4; step++) {
    notebook.update(0.09);
    assertRegistration();
  }
  notebook.setChapter(0);
  for (let step = 0; step < 4; step++) {
    notebook.update(0.09);
    assertRegistration();
  }
  assert.equal(notebook.settledChapter, 0);
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
        if (!pitch && !yaw) {
          const middle = notebook.framingAnchor
            .getWorldPosition(new THREE.Vector3())
            .project(camera);
          const pixelX = ((middle.x + 1) * width) / 2;
          const pixelY = ((1 - middle.y) * height) / 2;
          const safeMiddleY =
            ((1 - (frame.safe.top + frame.safe.bottom) / 2) * height) / 2;
          assert.ok(
            Math.abs(pixelX - width / 2) < 1e-6,
            'the close camera centers the spread horizontally',
          );
          assert.ok(
            Math.abs(pixelY - safeMiddleY) < 8,
            'vertical centering respects the reserved bottom controls',
          );
          assert.ok(pixelY < height / 2, 'the book sits above the dock');
        }
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

test('The notebook uses shared dim, hover and active-object lighting without changing its table', () => {
  const model = createSpacecraft(THREE);
  const notebook = model.group.userData.aboutNotebook;
  const materials = new Set();
  const rims = new Set();
  notebook.root.traverse((object) => {
    if (!object.isMesh) return;
    for (const material of [object.material].flat()) {
      if (material.name.endsWith('-hover-rim')) rims.add(material);
      else materials.add(material);
    }
  });
  assert.ok(
    materials.size > 5,
    'feedback includes paper, binding, clips and flags',
  );
  assert.ok(
    [...materials].every(
      (material) => material.userData.interactableId === 'about-notebook',
    ),
  );
  const update = (state) =>
    model.update(1, 'about', true, {
      activeRoom: 'about',
      reading: false,
      hoveredObject: null,
      ...state,
    });
  update({});
  assert.equal(notebook.root.userData.highlightLevel, 0.65);
  const idle = new Map(
    [...materials].map((material) => [material, material.color.clone()]),
  );
  const surroundings = new Map();
  model.group.traverse((object) => {
    if (!object.isMesh || object.userData.section !== 'about') return;
    for (const material of [object.material].flat())
      if (
        material.color &&
        material.userData.interactableId !== 'about-notebook'
      )
        surroundings.set(material, material.color.clone());
  });
  assert.ok(surroundings.size > 0);
  update({ hoveredObject: 'about-notebook' });
  assert.equal(notebook.root.userData.highlightLevel, 1.15);
  for (const [material, color] of idle) {
    const expected = color.clone().multiplyScalar(1.15 / 0.65);
    assert.ok(
      material.color
        .toArray()
        .every(
          (channel, index) =>
            Math.abs(channel - expected.toArray()[index]) < 1e-12,
        ),
      'all notebook materials brighten together',
    );
  }
  for (const [material, color] of surroundings)
    assert.ok(
      material.color.equals(color),
      'the desk and surrounding furniture retain their room lighting',
    );
  update({});
  assert.equal(notebook.root.userData.highlightLevel, 0.65);
  update({ travelling: true, hoveredObject: 'about-notebook' });
  assert.equal(
    notebook.root.userData.highlightLevel,
    0.65,
    'stale hover cannot brighten during travel',
  );
  update({ travelling: false, reading: true });
  assert.equal(
    notebook.root.userData.highlightLevel,
    1,
    'active reader retains normal brightness',
  );
  assert.equal(rims.size, 1);
  for (const rim of rims) assert.equal(rim.opacity, 0);
  update({ reading: false });
  assert.equal(notebook.root.userData.highlightLevel, 0.65);
});

test('The notebook hover rim follows its rounded physical cover instead of the larger click target', () => {
  const model = createSpacecraft(THREE);
  const notebook = model.group.userData.aboutNotebook;
  model.group.updateMatrixWorld(true);
  const rimBounds = new THREE.Box3();
  notebook.root.traverse((object) => {
    if (
      !object.isMesh ||
      ![object.material]
        .flat()
        .some((material) => material.name === 'about-notebook-hover-rim')
    )
      return;
    const transform = notebook.root.matrixWorld
      .clone()
      .invert()
      .multiply(object.matrixWorld);
    rimBounds.union(
      new THREE.Box3()
        .setFromBufferAttribute(object.geometry.attributes.position)
        .applyMatrix4(transform),
    );
  });
  assert.equal(rimBounds.isEmpty(), false);
  const size = rimBounds.getSize(new THREE.Vector3());
  const center = rimBounds.getCenter(new THREE.Vector3());
  assert.ok(Math.abs(size.x - notebook.cover.width) < 1e-6);
  assert.ok(Math.abs(size.y - notebook.cover.height) < 1e-6);
  assert.ok(Math.abs(center.x) < 1e-6 && Math.abs(center.y) < 1e-6);
  assert.ok(
    Math.abs(center.z - (notebook.cover.z + notebook.cover.depth / 2 + 0.001)) <
      1e-6,
    'rim sits at the cover face so perspective and clips remain physical',
  );
  assert.ok(size.x < notebook.openingWidth);
});

test('Batched section tabs retain their spacing and carry each new section marker to the left', () => {
  const model = createSpacecraft(THREE, {
    journal: Array.from({ length: 6 }, (_, index) => ({
      title: `Section ${index + 1}`,
    })),
  });
  const notebook = model.group.userData.aboutNotebook;
  notebook.setActive(true);
  notebook.setChapter(4);
  notebook.update(0.18);
  const first = notebook.root.getObjectByName(
    'personal-study-tabbed-paper-leaf-1',
  );
  assert.ok(Math.abs(first.rotation.y + Math.PI / 2) < 1e-6);
  assert.equal(
    notebook.root.getObjectByName('personal-study-tabbed-paper-leaf-0').rotation
      .y,
    -Math.PI,
  );
  notebook.update(1.26);
  assert.equal(notebook.settledChapter, 4);
  assert.equal(notebook.turning, false);
  assert.deepEqual(
    notebook.flags.map((flag) => flag.side),
    ['left', 'left', 'left', 'left', 'left', 'right'],
  );
  const anchorPosition = new THREE.Vector3();
  for (const flag of notebook.flags) {
    flag.anchor.getWorldPosition(anchorPosition);
    notebook.anchor.worldToLocal(anchorPosition);
    assert.ok(
      Math.abs(anchorPosition.x - (flag.side === 'left' ? -0.5375 : 0.5375)) <
        1e-6,
    );
    assert.ok(
      Math.abs(anchorPosition.y - (0.283 - (flag.y + flag.height / 2) / 1000)) <
        1e-6,
    );
    const depth = notebook.root.getObjectByName(
      `personal-study-indexed-paper-depth-${flag.slot}`,
    );
    const point = new THREE.Vector3();
    depth.traverse((object) => {
      if (!object.isMesh) return;
      object.updateWorldMatrix(true, false);
      for (let i = 0; i < object.geometry.attributes.position.count; i++) {
        point.fromBufferAttribute(object.geometry.attributes.position, i);
        object.localToWorld(point);
        notebook.anchor.worldToLocal(point);
        assert.ok(
          point.z < 0,
          'batched turned sheets cannot cover retained left artwork',
        );
      }
    });
  }
  notebook.setChapters([
    { title: 'Short', pageCount: 2 },
    { title: 'Next', pageCount: 3 },
  ]);
  assert.equal(notebook.flags.length, 2);
  for (const flag of notebook.flags) {
    const mount = notebook.root.getObjectByName(
      `personal-study-paper-flag-mount-${flag.slot}`,
    );
    assert.ok(
      mount.children.some((object) => object.isMesh),
      'flag artwork survives batching in a movable mount',
    );
    assert.equal(mount.position.y, 0.283 - (flag.y + flag.height / 2) / 1000);
  }
  for (let slot = 2; slot < 6; slot++) {
    assert.equal(
      notebook.root.getObjectByName(`personal-study-tabbed-paper-leaf-${slot}`)
        .visible,
      false,
    );
  }
});
