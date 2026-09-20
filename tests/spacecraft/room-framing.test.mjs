import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { thinChassisOutline } from '../../features/spacecraft/geometry/thin-chassis-outline.ts';
import {
  PRESSURE_FACE_BEVEL,
  PRESSURE_FACE_FRONT,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';
import {
  fitRoomCameraFrame,
  responsiveCameraFov,
  cursorViewSamples,
  CAMERA_RANGES,
} from '../../features/spacecraft/navigation/scene-controls.ts';

const model = createSpacecraft(THREE, { layout: 'wide' });
const data = model.group.userData;
const roomTarget = (room) =>
  new THREE.Vector3(
    data.roomAnchors[room][0],
    data.innerApertureBounds[room].center[1],
    data.roomAnchors[room][2],
  );

void test('Shared room framing preserves the same projected architecture and visible navigation across viewports', () => {
  for (const [width, height] of [
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
    const inset = width < 760 ? 12 : 18;
    const safe = {
      left: -1 + (2 * inset) / width,
      right: 1 - (2 * inset) / width,
      top: 1 - 48 / height,
      bottom: -1 + 160 / height,
    };
    const fov = responsiveCameraFov(width / height);
    const fit = fitRoomCameraFrame(
      data.roomCameraFrame,
      fov,
      width / height,
      safe,
    );
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.5, 80);
    let reference;
    for (const room of ['projects', 'experience', 'about', 'contact']) {
      const target = roomTarget(room);
      const points = data.requiredFramingPoints[room]
        .filter((p) => p.kind === 'header' || p.kind === 'portal-plate')
        .map((p) => new THREE.Vector3(...p.position));
      if (room === 'contact') {
        for (const screen of data.socialScreens)
          for (const sx of [-1, 1])
            for (const sy of [-1, 1])
              points.push(
                screen.anchor.localToWorld(
                  new THREE.Vector3(
                    (sx * screen.width) / 2,
                    (sy * screen.height) / 2,
                    0,
                  ),
                ),
              );
      }
      const projections = [];
      for (const view of cursorViewSamples(
        {
          target: target.toArray(),
          direction: [0, 0, 1],
        },
        8,
        CAMERA_RANGES.room,
      )) {
        camera.position
          .copy(target)
          .addScaledVector(
            new THREE.Vector3(...view.direction),
            fit.chosenDistance,
          );
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        // Compare actual cabin openings, not furniture or a copied fit result.
        const aperture = data.innerApertureBounds[room];
        for (const sx of [-1, 1])
          for (const sy of [-1, 1])
            projections.push(
              new THREE.Vector3(
                aperture.center[0] + (sx * aperture.size[0]) / 2,
                aperture.center[1] + (sy * aperture.size[1]) / 2,
                aperture.center[2],
              )
                .project(camera)
                .toArray(),
            );
        for (const point of points) {
          const p = point.clone().project(camera);
          assert.ok(
            p.x >= safe.left - 1e-5 &&
              p.x <= safe.right + 1e-5 &&
              p.y >= safe.bottom - 1e-5 &&
              p.y <= safe.top + 1e-5 &&
              p.z < 1,
            `${room} navigation leaves the safe area at ${width}×${height}: ${p.toArray()}`,
          );
        }
      }
      if (reference) {
        assert.ok(
          projections.every((p, i) =>
            p.every((v, j) => Math.abs(v - reference[i][j]) < 1e-10),
          ),
          `${room} changes the room's apparent scale or angle at ${width}×${height}`,
        );
      } else reference = projections;
    }
  }
});

void test('Adding or rearranging furniture cannot change the shared room framing', () => {
  const before = structuredClone(data.roomCameraFrame);
  const console = model.group.getObjectByName('contact-flight-console');
  const decoration = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  decoration.position.set(0, -3, 2);
  console.add(decoration);
  model.setLayout('compact');
  model.setLayout('wide');
  assert.deepEqual(data.roomCameraFrame, before);
  console.remove(decoration);
  decoration.geometry.dispose();
  decoration.material.dispose();
});

void test('Overview pointers use the true front-opening edge midpoints in both layouts', () => {
  const sections = ['about', 'projects', 'contact', 'experience'];
  for (const [layout, scale] of [
    ['wide', 1.4],
    ['compact', 1],
  ]) {
    model.setLayout(layout);
    const outline = thinChassisOutline(THREE, { scale });
    for (const [index, hole] of outline.roomHoles.entries()) {
      const bounds = new THREE.Box2().setFromPoints(hole.getPoints(64));
      const center = bounds.getCenter(new THREE.Vector2());
      // The straight reveal closes the sampled outline by the bevel width.
      const expected = {
        top: [
          center.x,
          bounds.max.y - PRESSURE_FACE_BEVEL,
          PRESSURE_FACE_FRONT - 0.025,
        ],
        bottom: [
          center.x,
          bounds.min.y + PRESSURE_FACE_BEVEL,
          PRESSURE_FACE_FRONT - 0.025,
        ],
        left: [
          bounds.min.x + PRESSURE_FACE_BEVEL,
          center.y,
          PRESSURE_FACE_FRONT - 0.025,
        ],
        right: [
          bounds.max.x - PRESSURE_FACE_BEVEL,
          center.y,
          PRESSURE_FACE_FRONT - 0.025,
        ],
      };
      for (const edge of Object.keys(expected))
        assert.ok(
          data.calloutEdges[sections[index]][edge].every(
            (v, axis) => Math.abs(v - expected[edge][axis]) < 1e-10,
          ),
          `${layout}/${sections[index]}/${edge}: pointer must meet the aperture midpoint`,
        );
    }
  }
  model.setLayout('wide');
});
