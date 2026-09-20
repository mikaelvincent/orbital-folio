import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  overviewCameraDirection,
  responsiveCameraFov,
  overviewCalloutGutter,
  fitPerspectiveFrame,
  fitPerspectiveDistance,
  cursorViewSamples,
  CAMERA_RANGES,
} from '../../features/spacecraft/navigation/scene-controls.ts';

const model = createSpacecraft(THREE, { layout: 'wide' });
const data = model.group.userData;
const axis = new THREE.Vector3(0, 0, 1);
const baseline = [-0.18, 0.14, 1];

// Independently project real assembly supports through Three at 169 angles;
// production chooses its containment distance using only 25 angle samples.
function fitOverview(width, height, candidate = true) {
  const fov = responsiveCameraFov(width / height);
  const portrait = height > width,
    roll = portrait ? Math.PI / 2 : 0;
  const direction = new THREE.Vector3(
    ...(candidate ? overviewCameraDirection(width / height) : baseline),
  ).normalize();
  const gutter = candidate
    ? overviewCalloutGutter(height, portrait ? 118 : 98, 80, portrait)
    : portrait
      ? 48
      : 72;
  const safe = {
    left: -1 + (2 * (portrait ? 36 : width < 700 ? 12 : 18)) / width,
    right: 1 - (2 * (portrait ? 36 : width < 700 ? 12 : 18)) / width,
    top: 1 - (2 * ((portrait ? 118 : 98) + gutter)) / height,
    bottom: -1 + (2 * (80 + gutter)) / height,
  };
  const points = data.overviewSupportPoints.map((p) =>
    new THREE.Vector3(...p).applyAxisAngle(axis, roll).toArray(),
  );
  const target = new THREE.Vector3(
    ...data.overviewBounds.center,
  ).applyAxisAngle(axis, roll);
  target.set(
    ...fitPerspectiveFrame(
      points,
      { target: target.toArray(), direction: direction.toArray() },
      fov,
      width / height,
      safe,
    ).target,
  );
  const anchors = Object.values(data.roomAnchors).map((a) =>
    new THREE.Vector3(...a).applyAxisAngle(axis, roll),
  );
  const offset = [
    Math.max(...anchors.map((a) => Math.abs(a.x - target.x))) * 0.022,
    Math.max(...anchors.map((a) => Math.abs(a.y - target.y))) * 0.022,
  ];
  const fitViews = cursorViewSamples(
    { target: target.toArray(), direction: direction.toArray() },
    4,
    CAMERA_RANGES.overview,
  );
  const distance =
    Math.max(
      ...fitViews.flatMap((v) =>
        [-1, 1].flatMap((sx) =>
          [-1, 1].map((sy) =>
            fitPerspectiveDistance(
              points,
              {
                ...v,
                target: [
                  v.target[0] + sx * offset[0],
                  v.target[1] + sy * offset[1],
                  v.target[2],
                ],
              },
              fov,
              width / height,
              safe,
            ),
          ),
        ),
      ),
    ) / 0.975;
  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.5, 500);
  const setCamera = (v, d = distance) => {
    camera.position
      .fromArray(v.target)
      .addScaledVector(new THREE.Vector3(...v.direction), d);
    camera.lookAt(new THREE.Vector3(...v.target));
    camera.updateMatrixWorld(true);
  };
  setCamera({ target: target.toArray(), direction: direction.toArray() });
  const projected = points.map((p) => new THREE.Vector3(...p).project(camera));
  const box = {
    left: Math.min(...projected.map((p) => p.x)),
    right: Math.max(...projected.map((p) => p.x)),
    top: Math.max(...projected.map((p) => p.y)),
    bottom: Math.min(...projected.map((p) => p.y)),
  };
  const coverage = [
    ((box.right - box.left) * width) / 2,
    ((box.top - box.bottom) * height) / 2,
  ];
  let outsidePixels = 0;
  for (const v of cursorViewSamples(
    { target: target.toArray(), direction: direction.toArray() },
    12,
    CAMERA_RANGES.overview,
  ))
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        setCamera(
          {
            ...v,
            target: [
              v.target[0] + sx * offset[0],
              v.target[1] + sy * offset[1],
              v.target[2],
            ],
          },
          distance * 0.975,
        );
        for (const p of points) {
          const q = new THREE.Vector3(...p).project(camera);
          outsidePixels = Math.max(
            outsidePixels,
            ((safe.left - q.x) * width) / 2,
            ((q.x - safe.right) * width) / 2,
            ((safe.bottom - q.y) * height) / 2,
            ((q.y - safe.top) * height) / 2,
          );
        }
      }
  return {
    width,
    height,
    candidate,
    direction: direction.toArray(),
    roll,
    distance,
    coverage,
    safe,
    restBox: box,
    outsidePixels,
    points: points.length,
    angleSamples: 169,
    hoverOffsetSamples: 4,
  };
}

test('Responsive overview keeps the whole spacecraft inside the safe area across the drag and room-hover envelope', () => {
  for (const size of [
    [2560, 1080],
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [1024, 768],
    [844, 390],
    [768, 1024],
    [390, 844],
    [360, 800],
  ]) {
    const fit = fitOverview(...size);
    assert.ok(
      fit.outsidePixels < 0.5,
      `${size.join('×')}: ${fit.outsidePixels}px outside`,
    );
    assert.ok(Number.isFinite(fit.distance) && fit.distance > 0);
  }
});

test('Short landscape overviews recover useful vessel size without reducing callout space below42px', () => {
  const before = fitOverview(844, 390, false);
  const after = fitOverview(844, 390);
  assert.ok(after.coverage[0] > before.coverage[0] * 1.7);
  assert.ok(after.coverage[1] > before.coverage[1] * 1.7);
  assert.equal(overviewCalloutGutter(390, 98, 80, false), 42);
  assert.equal(overviewCalloutGutter(720, 98, 80, false), 72);
  assert.equal(overviewCalloutGutter(844, 118, 80, true), 48);
  // Responsive joins remain continuous within each layout. The sign changes
  // at square deliberately accompany the existing portrait roll switch.
  for (const aspect of [0.85, 0.9, 1.8]) {
    const left = new THREE.Vector3(
      ...overviewCameraDirection(aspect - 1e-5),
    ).normalize();
    const right = new THREE.Vector3(
      ...overviewCameraDirection(aspect + 1e-5),
    ).normalize();
    const separation = left.distanceTo(right);
    const closerLeft = new THREE.Vector3(
      ...overviewCameraDirection(aspect - 1e-6),
    ).normalize();
    const closerRight = new THREE.Vector3(
      ...overviewCameraDirection(aspect + 1e-6),
    ).normalize();
    assert.ok(separation < 0.00005);
    assert.ok(closerLeft.distanceTo(closerRight) < separation * 0.11);
  }
  for (const aspect of [1, 4 / 3, 16 / 9, 2.5]) {
    const t = Math.max(0, Math.min(1, (aspect - 0.9) / 0.9));
    const original = t * t * (3 - 2 * t);
    assert.deepEqual(overviewCameraDirection(aspect), [
      -0.1 - 0.18 * original,
      0.18 + 0.02 * original,
      1,
    ]);
  }
});

test('Portrait overview reveals the ceiling side across tall and nearly square screens', () => {
  for (const aspect of [0.2, 360 / 800, 390 / 844, 768 / 1024, 0.9, 0.9999]) {
    const direction = new THREE.Vector3(...overviewCameraDirection(aspect))
      .normalize()
      .applyAxisAngle(axis, -Math.PI / 2);
    assert.ok(
      direction.y < -0.09,
      `${aspect}: camera must look up toward ceilings`,
    );
    assert.ok(
      direction.z > 0.9,
      `${aspect}: keep a restrained frontal composition`,
    );
  }
});
