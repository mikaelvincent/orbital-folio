import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createExactMatrixInverse } from './exact-matrix-inverse-candidate.ts';

test('Six iris leaves reuse one exact inverse while source or result changes invalidate immediately', () => {
  const source = new THREE.Matrix4().compose(
    new THREE.Vector3(1, 2, 3),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0.6, -0.3)),
    new THREE.Vector3(0.9, 1.2, 1),
  );
  const destination = new THREE.Matrix4();
  const reference = new THREE.Matrix4();
  const update = createExactMatrixInverse(source, destination);
  let inversions = 0;
  destination.invert = function () {
    inversions++;
    return THREE.Matrix4.prototype.invert.call(this);
  };
  for (let frame = 0; frame < 120; frame++) {
    if (frame > 40 && frame < 80) source.elements[12] += 0.001;
    if (frame === 100) destination.elements[5] = 999;
    for (let leaf = 0; leaf < 6; leaf++) {
      update();
      reference.copy(source).invert();
      assert.deepEqual(destination.elements, reference.elements);
    }
  }
  assert.equal(
    inversions,
    41,
    'one initial, 39 moving frames, and one external result edit',
  );
});

test('Parent transforms, zero scales, negative zeros and direct matrix edits match native copy/invert', () => {
  const root = new THREE.Group(),
    hatch = new THREE.Group();
  root.add(hatch);
  const target = new THREE.Matrix4();
  const update = createExactMatrixInverse(hatch.matrixWorld, target);
  for (let frame = 0; frame < 100; frame++) {
    root.position.set(Math.sin(frame / 10), -1, 2);
    root.rotation.set(frame / 100, frame / 31, 0.1);
    hatch.position.set(0.2, frame / 35, 1);
    hatch.scale.set(frame % 7 === 0 ? 0 : 0.84, 1, 1.2);
    root.updateMatrixWorld(true);
    if (frame === 25) hatch.matrixWorld.elements[3] = -0;
    if (frame === 40) hatch.matrixWorld.elements[10] = 0.175;
    for (let sample = 0; sample < 6; sample++) {
      update();
      assert.deepEqual(
        target.elements,
        hatch.matrixWorld.clone().invert().elements,
      );
    }
  }
});

test('Aliased matrices retain repeated in-place inversion semantics', () => {
  const same = new THREE.Matrix4().makeTranslation(3, 4, 5);
  const reference = same.clone();
  const update = createExactMatrixInverse(same, same);
  for (let index = 0; index < 6; index++) {
    update();
    reference.invert();
    assert.deepEqual(same.elements, reference.elements);
  }
});
