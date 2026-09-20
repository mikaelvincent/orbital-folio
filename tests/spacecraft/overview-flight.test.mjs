import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  createOverviewFlight,
  sampleOverviewFlight,
} from '../../features/spacecraft/navigation/overview-flight.ts';
import { createVesselCameraFrame } from '../../features/spacecraft/navigation/vessel-camera.ts';
import {
  CAMERA_RANGES,
  cursorViewSamples,
  fitPerspectiveDistance,
  fitPerspectiveFrame,
  fitRoomCameraFrame,
  overviewCalloutGutter,
  overviewCameraDirection,
  responsiveCameraFov,
} from '../../features/spacecraft/navigation/scene-controls.ts';

const model = createSpacecraft(THREE, { layout: 'wide' });
const data = model.group.userData;
const zAxis = new THREE.Vector3(0, 0, 1);
const rooms = ['projects', 'experience', 'about', 'contact'];

// Public-content framing fixture: a 118px identity/header reservation, 80px
// navigation reservation and the actual runtime lens, architectural supports,
// drag envelope and room fit. Browser checks cover real DOM-measured insets.
function flightFixture(width, height, room) {
  const fov = responsiveCameraFov(width / height);
  const safeBounds = (home) => {
    const top = home ? 118 : 24;
    const gutter = home ? overviewCalloutGutter(height, top, 80, true) : 0;
    const side = home ? 36 : width < 700 ? 12 : 18;
    return {
      left: -1 + (2 * side) / width,
      right: 1 - (2 * side) / width,
      top: 1 - (2 * (top + gutter)) / height,
      bottom: -1 + (2 * (80 + gutter)) / height,
    };
  };
  function overview(roll, sweep = false) {
    const direction = new THREE.Vector3(
      ...overviewCameraDirection(width / height),
    ).normalize();
    const rolls = sweep
      ? Array.from({ length: 17 }, (_, i) => (i * Math.PI) / 32)
      : [roll];
    const points = rolls.flatMap((angle) =>
      data.overviewSupportPoints.map((point) =>
        new THREE.Vector3(...point).applyAxisAngle(zAxis, angle).toArray(),
      ),
    );
    const initialTarget = new THREE.Vector3(...data.overviewBounds.center)
      .applyAxisAngle(zAxis, roll)
      .toArray();
    const target = fitPerspectiveFrame(
      points,
      { target: initialTarget, direction: direction.toArray() },
      fov,
      width / height,
      safeBounds(true),
    ).target;
    const anchors = Object.values(data.roomAnchors).map((point) =>
      new THREE.Vector3(...point).applyAxisAngle(zAxis, roll),
    );
    const hover = [
      Math.max(...anchors.map((point) => Math.abs(point.x - target[0]))) *
        0.022,
      Math.max(...anchors.map((point) => Math.abs(point.y - target[1]))) *
        0.022,
    ];
    const views = cursorViewSamples(
      { target, direction: direction.toArray() },
      4,
      CAMERA_RANGES.overview,
    );
    const distance =
      Math.max(
        ...views.flatMap((view) =>
          [-1, 1].flatMap((x) =>
            [-1, 1].map((y) =>
              fitPerspectiveDistance(
                points,
                {
                  ...view,
                  target: [
                    view.target[0] + x * hover[0],
                    view.target[1] + y * hover[1],
                    view.target[2],
                  ],
                },
                fov,
                width / height,
                safeBounds(true),
              ),
            ),
          ),
        ),
      ) / 0.975;
    return { target, direction: direction.toArray(), distance, roll };
  }
  const roomTarget = [...data.roomAnchors[room]];
  roomTarget[1] = data.innerApertureBounds[room].center[1];
  const destination = {
    target: roomTarget,
    direction: [0, 0, 1],
    distance: fitRoomCameraFrame(
      data.roomCameraFrame,
      fov,
      width / height,
      safeBounds(false),
    ).chosenDistance,
    roll: 0,
  };
  const home = overview(Math.PI / 2);
  const outwardStart = overview(Math.PI / 2, true);
  const outwardEnd = overview(0, true);
  return {
    fov,
    home,
    destination,
    forward: createOverviewFlight(home, destination, outwardStart, outwardEnd),
    reverse: createOverviewFlight(destination, home, outwardEnd, outwardStart),
  };
}

const coordinates = (pose) => [
  ...pose.target,
  ...pose.direction,
  pose.distance,
  pose.roll,
];
function closePose(actual, expected, tolerance = 1e-10) {
  coordinates(actual).forEach((value, i) =>
    assert.ok(Math.abs(value - coordinates(expected)[i]) < tolerance),
  );
}

const phone = flightFixture(390, 844, 'contact');

test('Portrait overview flights preserve endpoints, clamp completion and reverse the same path', () => {
  for (const { forward, reverse, home, destination } of [phone]) {
    closePose(sampleOverviewFlight(forward, -1), home);
    closePose(sampleOverviewFlight(forward, 0), home);
    closePose(sampleOverviewFlight(forward, 1), destination);
    closePose(sampleOverviewFlight(forward, 2), destination);
    assert.equal(forward.duration, reverse.duration);
    for (let step = 0; step <= 100; step++) {
      const progress = step / 100;
      closePose(
        sampleOverviewFlight(forward, progress),
        sampleOverviewFlight(reverse, 1 - progress),
      );
    }
  }
});

test('The camera eases only at the endpoints while rotation remains continuous through the clearance arc', () => {
  for (const path of [phone.forward, phone.reverse]) {
    const sign = Math.sign(path.controls[3].roll - path.controls[0].roll);
    let previous = sampleOverviewFlight(path, 0);
    for (let step = 1; step <= 200; step++) {
      const current = sampleOverviewFlight(path, step / 200);
      assert.ok(coordinates(current).every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(...current.direction) - 1) < 1e-12);
      assert.ok((current.roll - previous.roll) * sign > 0);
      previous = current;
    }
    // At the old internal stops (middle of each half), travel must still have
    // appreciable angular velocity, even when outward distance reverses sign.
    for (const progress of [0.25, 0.4, 0.5, 0.6, 0.75]) {
      const before = sampleOverviewFlight(path, progress - 0.0001);
      const after = sampleOverviewFlight(path, progress + 0.0001);
      const radiansPerSecond =
        ((after.roll - before.roll) * sign) / (0.0002 * path.duration);
      assert.ok(radiansPerSecond > 0.12, `Angular speed ${radiansPerSecond}`);
    }
    // Finite differences at decreasing intervals approach rest smoothly.
    for (const edge of [0, 1]) {
      const endpoint = sampleOverviewFlight(path, edge);
      const speed = (dt) => {
        const nearby = sampleOverviewFlight(path, edge === 0 ? dt : 1 - dt);
        return (
          Math.hypot(
            ...coordinates(nearby).map(
              (value, i) => value - coordinates(endpoint)[i],
            ),
          ) /
          (dt * path.duration)
        );
      };
      assert.ok(speed(0.001) < speed(0.01) * 0.02);
      assert.ok(speed(0.001) < 0.001);
    }
  }
});

test('Sampled portrait flights keep the eye and complete near plane ahead of the actual vessel', () => {
  const rig = createVesselCameraFrame(THREE);
  const frontmost = Math.max(
    ...data.overviewSupportPoints.map((point) => point[2]),
  );
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 500);
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [768, 1024],
    [768, 4096],
    [1280, 1281],
  ]) {
    for (const room of rooms) {
      const fixture = flightFixture(width, height, room);
      camera.fov = fixture.fov;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      for (let step = 0; step <= 80; step++) {
        const pose = sampleOverviewFlight(fixture.forward, step / 80);
        // Drag/hover retains its existing bounded return spring during travel.
        for (const pitch of [-1, 0, 1])
          for (const yaw of [-1, 0, 1]) {
            const direction = new THREE.Vector3(...pose.direction).applyEuler(
              new THREE.Euler(
                pitch * CAMERA_RANGES.overview.pitch,
                yaw * CAMERA_RANGES.overview.yaw,
                0,
              ),
            );
            rig.apply(
              camera,
              new THREE.Vector3(...pose.target),
              direction,
              pose.distance * 0.975,
              pose.roll,
            );
            const label = `${width}×${height}/${room}/${step}/drag${pitch},${yaw}`;
            assert.ok(
              camera.position.z > frontmost,
              `${label}: eye intersects vessel`,
            );
            for (const x of [-1, 1])
              for (const y of [-1, 1]) {
                const nearCorner = new THREE.Vector3(x, y, -1).unproject(
                  camera,
                );
                assert.ok(
                  nearCorner.z > frontmost,
                  `${label}: near plane intersects vessel`,
                );
              }
          }
      }
    }
  }
});

test('An interrupted flight carries its incoming velocity, then rests exactly at its new destination', () => {
  for (const progress of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    const original = phone.forward;
    const epsilon = 1e-6;
    const start = sampleOverviewFlight(original, progress);
    const before = sampleOverviewFlight(original, progress - epsilon);
    const after = sampleOverviewFlight(original, progress + epsilon);
    const dt = 2 * epsilon * original.duration;
    const velocity = {
      target: after.target.map((v, i) => (v - before.target[i]) / dt),
      direction: after.direction.map((v, i) => (v - before.direction[i]) / dt),
      distance: (after.distance - before.distance) / dt,
      roll: (after.roll - before.roll) / dt,
    };
    const interrupted = createOverviewFlight(
      start,
      phone.home,
      original.controls[2],
      original.controls[1],
      velocity,
    );
    closePose(sampleOverviewFlight(interrupted, 0), start);
    closePose(sampleOverviewFlight(interrupted, 1), phone.home);
    const immediate = sampleOverviewFlight(interrupted, epsilon);
    const incoming = coordinates(velocity);
    coordinates(immediate).forEach((v, i) => {
      const measured =
        (v - coordinates(start)[i]) / (epsilon * interrupted.duration);
      assert.ok(
        Math.abs(measured - incoming[i]) < 0.002,
        'History reversal must not discard motion at its start',
      );
    });
    const end = sampleOverviewFlight(interrupted, 1 - epsilon);
    coordinates(end).forEach((v, i) =>
      assert.ok(Math.abs(v - coordinates(phone.home)[i]) < 1e-8),
    );
  }
});
