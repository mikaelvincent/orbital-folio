import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { thinChassisOutline } from '../../features/spacecraft/geometry/thin-chassis-outline.ts';
const model = createSpacecraft(THREE);
for (const [layout, scale] of [
  ['wide', 1.4],
  ['compact', 1],
]) {
  test(`${layout}: rear crowns have no ladder bulge and form one closed symmetric rear envelope`, () => {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const d = thinChassisOutline(THREE, { scale, bevel: 0 }).datums;
    const frame = model.group.getObjectByName(
      `${layout}-common-pressure-frame`,
    );
    const surfaces = [];
    frame.traverseVisible((object) => {
      if (object.isMesh && object.material.name === 'ceramic-hull')
        surfaces.push(object);
    });
    const data = model.group.userData.chassis.exteriorClosures;
    assert.equal(data.ladderRearZ, data.cabinRearZ);
    assert.ok(Math.abs(data.ladderRearExtension - 0.115) < 1e-8);
    for (const z of [-1.25, -1.18, -1.08, -0.92, -0.67, 0]) {
      const levels = [];
      for (const side of [-1, 1]) {
        const samples = [];
        for (const x of [
          d.bowTangentX + 0.04,
          d.stepStartX,
          d.stepEndX + 0.1,
          -0.31,
          0.27,
        ]) {
          const origin = new THREE.Vector3(
            x,
            side > 0 ? d.roof + 0.2 : d.keel - 0.2,
            z,
          );
          const hit = new THREE.Raycaster(
            origin,
            new THREE.Vector3(0, -side, 0),
            0,
            2,
          ).intersectObjects(surfaces, false)[0];
          assert.ok(
            hit,
            'Every depth through the rear cove has a real exterior surface',
          );
          samples.push(hit.point.y);
        }
        assert.ok(
          Math.max(...samples) - Math.min(...samples) < 2e-5,
          'The ladder and cabins share one crown at the same depth, without a hump',
        );
        levels.push(samples[0]);
      }
      assert.ok(
        Math.abs(levels[0] + levels[1] - 2 * d.ladderCenterY) < 2e-5,
        'Roof and keel use reflected exterior profiles',
      );
    }
    // The full rear plane replaces the earlier exposed pocket backs and separate
    // shallower ladder sheet. Probe its central span away from polygon edges.
    for (const x of [
      d.ladderX - 0.17 * scale,
      d.ladderX + 0.24 * scale,
      d.stepStartX + 0.07,
      -0.3,
      0.23,
    ])
      for (const y of [-0.46, 0.34]) {
        const hit = new THREE.Raycaster(
          new THREE.Vector3(x, y, -1.4),
          new THREE.Vector3(0, 0, 1),
          0,
          0.2,
        ).intersectObjects(surfaces, false)[0];
        assert.ok(hit, 'The rear pressure face remains closed');
        assert.ok(
          Math.abs(hit.point.z - data.cabinRearZ) < 2e-6,
          'Every rear module terminates on the same plane',
        );
      }
  });
}
