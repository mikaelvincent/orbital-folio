import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createProjectedSurface } from '../../features/spacecraft/projected-surface.ts';

function fakeElement() {
  const writes = [];
  const style = new Proxy(
    {},
    {
      set(target, property, value) {
        writes.push([property, value]);
        target[property] = value;
        return true;
      },
    },
  );
  return { element: { style }, writes };
}

function cssMatrix(element) {
  const values = element.style.transform.slice(9, -1).split(',').map(Number);
  assert.equal(values.length, 16);
  assert.ok(values.every(Number.isFinite));
  return new THREE.Matrix4().fromArray(values);
}

function close(actual, expected, label, tolerance = 1e-7) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

await test('native surface projects every sampled pixel like the physical plane across camera and viewport states', () => {
  const { element } = fakeElement();
  const surface = createProjectedSurface(THREE, element);
  const logicalWidth = 960;
  const logicalHeight = 515.3684210526316;
  const plane = new THREE.Object3D();
  const states = [
    { position: [0, 0, 0], rotation: [0, 0, 0], scale: [0.001, 0.001, 0.001] },
    {
      position: [2.4, -1.7, 0.35],
      rotation: [0.2, -0.3, 0.07],
      scale: [0.0015, 0.0011, 0.002],
    },
    {
      position: [-3, 2, -0.4],
      rotation: [-0.15, 0.24, Math.PI / 2],
      scale: [0.0007, 0.0013, 0.0008],
    },
  ];
  const viewports = [
    [390, 844],
    [768, 1024],
    [1470, 900],
    [1920, 1080],
    [844, 390],
  ];
  let samples = 0;
  for (const [width, height] of viewports) {
    for (const state of states) {
      plane.position.set(...state.position);
      plane.rotation.set(...state.rotation);
      plane.scale.set(...state.scale);
      plane.updateMatrixWorld(true);
      for (const roll of [0, Math.PI / 2, -0.13]) {
        const camera = new THREE.PerspectiveCamera(
          38,
          width / height,
          0.08,
          80,
        );
        camera.position
          .copy(plane.position)
          .add(new THREE.Vector3(0.27, -0.18, 2.2));
        camera.lookAt(
          plane.position.clone().add(new THREE.Vector3(0.08, 0.13, 0)),
        );
        camera.rotateZ(roll);
        // An asymmetric frustum exercises the complete projection matrix,
        // rather than assuming its optical center is the viewport midpoint.
        camera.setViewOffset(
          width * 1.2,
          height * 1.15,
          width * 0.04,
          height * 0.08,
          width,
          height,
        );
        camera.updateMatrixWorld(true);
        surface.update(
          camera,
          plane.matrixWorld,
          logicalWidth,
          logicalHeight,
          width,
          height,
          true,
        );
        const matrix = cssMatrix(element);
        assert.notEqual(
          matrix.determinant(),
          0,
          'native pointer mapping requires an invertible transform',
        );
        const inverse = matrix.clone().invert();
        for (const x of [0, 0.13, 0.5, 0.81, 1]) {
          for (const y of [0, 0.2, 0.5, 0.77, 1]) {
            const pixel = new THREE.Vector3(
              x * logicalWidth,
              y * logicalHeight,
              0,
            );
            const actual = pixel.clone().applyMatrix4(matrix);
            const expected = new THREE.Vector3(
              pixel.x - logicalWidth / 2,
              logicalHeight / 2 - pixel.y,
              0,
            )
              .applyMatrix4(plane.matrixWorld)
              .project(camera);
            close(actual.x, ((expected.x + 1) * width) / 2, 'viewport x');
            close(actual.y, ((1 - expected.y) * height) / 2, 'viewport y');
            close(actual.z, expected.z, 'camera depth');
            const restored = actual.clone().applyMatrix4(inverse);
            close(restored.x, pixel.x, 'inverse native x');
            close(restored.y, pixel.y, 'inverse native y');
            close(restored.z, 0, 'inverse native plane');
            samples++;
          }
        }
      }
    }
  }
  assert.equal(samples, 1125);
});

await test('surface visibility and resize do not retain stale projection or repeat unchanged style writes', () => {
  const { element, writes } = fakeElement();
  const surface = createProjectedSurface(THREE, element);
  const camera = new THREE.PerspectiveCamera(38, 1.6, 0.08, 80);
  camera.position.z = 3;
  camera.updateMatrixWorld(true);
  const plane = new THREE.Matrix4().makeScale(0.001, 0.001, 0.001);
  const update = (visible, width = 1280, height = 800) => {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    surface.update(camera, plane, 960, 515, width, height, visible);
  };
  assert.equal(element.style.position, 'absolute');
  assert.equal(element.style.left, '0px');
  assert.equal(element.style.top, '0px');
  assert.equal(element.style.transformOrigin, '0 0');
  assert.equal(element.style.display, 'none');
  update(true);
  const firstTransform = element.style.transform;
  const count = writes.length;
  update(true);
  assert.equal(
    writes.length,
    count,
    'settled surfaces must not rewrite styles',
  );
  update(false);
  assert.equal(element.style.display, 'none');
  const hiddenCount = writes.length;
  update(false, 390, 844);
  assert.equal(
    writes.length,
    hiddenCount,
    'hidden surfaces need no projection work',
  );
  update(true, 390, 844);
  assert.equal(element.style.display, '');
  assert.notEqual(
    element.style.transform,
    firstTransform,
    'resuming must use the resized viewport',
  );
  surface.update(camera, plane, 0, 515, 390, 844, true);
  assert.equal(
    element.style.display,
    'none',
    'transient invalid dimensions cannot expose malformed CSS',
  );
  update(true);
  assert.equal(element.style.display, '');
  assert.equal(
    element.style.transform,
    firstTransform,
    'landscape restoration must use the original geometry',
  );
});
