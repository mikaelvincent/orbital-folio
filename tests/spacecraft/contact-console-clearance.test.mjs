import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  CAMERA_RANGES,
  fitPerspectiveFrame,
} from '../../features/spacecraft/navigation/scene-controls.ts';
import { contactApplicationLayout } from '../../features/spacecraft/navigation/contact-computer.ts';

function corners(bounds) {
  return [bounds.min.x, bounds.max.x].flatMap((x) =>
    [bounds.min.y, bounds.max.y].flatMap((y) =>
      [bounds.min.z, bounds.max.z].map((z) => new THREE.Vector3(x, y, z)),
    ),
  );
}

test('The Contact application clears every keyboard key throughout landscape hover and entry views', () => {
  const model = createSpacecraft(THREE);
  const computer = model.group.userData.contactComputer;
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const points = [computer.root, computer.keyboard.root].flatMap((root) =>
      corners(new THREE.Box3().setFromObject(root)).map((p) => p.toArray()),
    );
    const keyBounds = new THREE.Box3().setFromObject(computer.keyboard.root);
    const origin = computer.anchor.getWorldPosition(new THREE.Vector3());
    for (const [width, height] of [
      [640, 360],
      [1280, 720],
      [1920, 1080],
      [1024, 768],
    ]) {
      const application = contactApplicationLayout(
        width,
        height,
        computer.width,
        computer.height,
      );
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 80);
      const direction = new THREE.Vector3(0, 0.12, 1).normalize();
      const frame = fitPerspectiveFrame(
        points,
        { target: origin.toArray(), direction: direction.toArray() },
        camera.fov,
        camera.aspect,
        {
          left: -1 + 32 / width,
          right: 1 - 32 / width,
          top: 1 - 40 / height,
          bottom: -1 + 160 / height,
        },
      );
      // The neutral close view and every hover extreme are checked at the
      // delivered fit. More distant frontal views cover the approach from the
      // room: the HTML screen is visible before its camera flight finishes.
      for (const distanceScale of [1.06, 1.5, 2.5]) {
        for (const basePitch of [0, 0.06, 0.12]) {
          for (const pitch of [-1, 0, 1]) {
            for (const yaw of [-1, 0, 1]) {
              const view = new THREE.Vector3(0, basePitch, 1)
                .normalize()
                .applyEuler(
                  new THREE.Euler(
                    pitch * CAMERA_RANGES.hover.pitch,
                    yaw * CAMERA_RANGES.hover.yaw,
                    0,
                  ),
                );
              camera.position
                .fromArray(frame.target)
                .addScaledVector(view, frame.distance * distanceScale);
              camera.lookAt(...frame.target);
              camera.updateMatrixWorld(true);
              const screenBottom = Math.min(
                ...[-application.width / 2, application.width / 2].map(
                  (x) =>
                    computer.anchor
                      .localToWorld(
                        new THREE.Vector3(x, -application.height / 2, 0),
                      )
                      .project(camera).y,
                ),
              );
              const keyboardTop = Math.max(
                ...corners(keyBounds).map((p) => p.project(camera).y),
              );
              const clearance = ((screenBottom - keyboardTop) * height) / 2;
              assert.ok(
                clearance >= 2,
                `${layout} ${width}×${height}, distance ${distanceScale}, pitch ${basePitch}/${pitch}, yaw ${yaw}: ${clearance}px keyboard clearance`,
              );
            }
          }
        }
      }
    }
  }
});
