import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { moveCameraAxis } from '../../features/spacecraft/navigation/flight.ts';
import { createVesselCameraFrame } from '../../features/spacecraft/navigation/vessel-camera.ts';
import {
  boundedCameraAngles,
  overviewCameraDirection,
  overviewCameraRange,
} from '../../features/spacecraft/navigation/scene-controls.ts';

const limits = { frequency: 8, speed: 3, acceleration: 12 };

test('input springs settle exactly at different cadences and retain re-grab velocity', () => {
  for (const hz of [30, 60, 120]) {
    const axis = { value: 1, velocity: 0 };
    for (let i = 0; i < 4 * hz; i++)
      moveCameraAxis(axis, 0, 1 / hz, { ...limits, settle: 1e-6 });
    assert.deepEqual(axis, { value: 0, velocity: 0 });
    moveCameraAxis(axis, 0, 1 / hz, { ...limits, settle: 1e-6 });
    assert.deepEqual(axis, { value: 0, velocity: 0 });
    const reference = { value: 0.4, velocity: -0.6 };
    const grabbed = { ...reference };
    for (let i = 0; i < hz / 3; i++) {
      moveCameraAxis(reference, 0.8, 1 / hz, limits);
      moveCameraAxis(grabbed, 0.8, 1 / hz, { ...limits, settle: 1e-6 });
      assert.deepEqual(
        grabbed,
        reference,
        'an active spring keeps its trajectory',
      );
    }
  }
  const held = { value: 1e-8, velocity: 1e-8 };
  moveCameraAxis(held, 0, 0, { ...limits, settle: 1e-6 });
  assert.deepEqual(
    held,
    { value: 1e-8, velocity: 1e-8 },
    'zero delta holds motion',
  );
  const crossing = { value: 0, velocity: 0.5 };
  moveCameraAxis(crossing, 0, 1 / 60, { ...limits, settle: 1e-6 });
  assert.notEqual(
    crossing.velocity,
    0,
    'passing the goal must not erase momentum',
  );
});

test('settling preserves projected overview landmarks within 0.01 CSS pixel', () => {
  for (const [width, height] of [
    [1280, 720],
    [900, 1200],
  ]) {
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 200);
    const frame = createVesselCameraFrame(THREE);
    const direction = new THREE.Vector3(
      ...overviewCameraDirection(width / height),
    ).normalize();
    const target = new THREE.Vector3();
    const landmarks = [-4, 0, 4].flatMap((x) =>
      [-2, 0, 2].map((y) => new THREE.Vector3(x, y, 0)),
    );
    const project = (value) => {
      const [pitch, yaw] = boundedCameraAngles(
        [value, 0],
        [0, 0],
        overviewCameraRange(width / height),
      );
      frame.apply(
        camera,
        target,
        direction.clone().applyEuler(new THREE.Euler(pitch, yaw, 0)),
        22,
        width < height ? Math.PI / 2 : 0,
      );
      return landmarks.map((point) => point.clone().project(camera));
    };
    const reference = { value: 1, velocity: 0 };
    const candidate = { ...reference };
    let settledFrames = 0;
    for (let i = 0; i < 600; i++) {
      moveCameraAxis(reference, 0, 1 / 60, limits);
      moveCameraAxis(candidate, 0, 1 / 60, { ...limits, settle: 1e-6 });
      const before = project(reference.value),
        after = project(candidate.value);
      for (let j = 0; j < before.length; j++)
        assert.ok(
          Math.hypot(
            ((before[j].x - after[j].x) * width) / 2,
            ((before[j].y - after[j].y) * height) / 2,
          ) < 0.01,
        );
      if (candidate.value === 0 && candidate.velocity === 0) settledFrames++;
    }
    assert.ok(
      settledFrames > 360,
      'exact camera caches can reuse most of the held interval',
    );
  }
});
