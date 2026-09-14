import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import {
  PRESSURE_THROAT_START,
  LADDER_CENTER_Y,
  LADDER_HEIGHT,
  LADDER_RIGHT_RADIUS,
  wallLayout,
} from '../lib/spacecraft-wall-layout.ts';
const model = createSpacecraft(THREE);
for (const [layout, scale] of [
  ['wide', 1.4],
  ['compact', 1],
]) {
  test(`${layout}: ladder partitions terminate at the reveal and both hatches clear its rounded corners`, () => {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const d = wallLayout(scale);
    const walls = [];
    const visible = [];
    model.group.traverseVisible((object) => {
      if (!object.isMesh) return;
      visible.push(object);
      if (
        [object.name, ...(object.userData.parts || [])].some((name) =>
          /walkway-twin-open-room-wall-interior|walkway-(projects|about)-cabin-facing-wall/.test(
            name,
          ),
        )
      )
        walls.push(object);
    });
    assert.equal(walls.length, 3);
    for (const wall of walls) {
      const p = wall.geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const point = new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .applyMatrix4(wall.matrixWorld);
        assert.ok(
          point.z <= PRESSURE_THROAT_START + 2e-6,
          'Side walls stop at the reveal rather than occupying its plane',
        );
      }
    }
    const lowerWall = LADDER_CENTER_Y - LADDER_HEIGHT / 2 + LADDER_RIGHT_RADIUS;
    const upperWall = LADDER_CENTER_Y + LADDER_HEIGHT / 2 - LADDER_RIGHT_RADIUS;
    const guides = model.group.userData.irisHatches
      .filter((h) =>
        ['projects:about', 'about:projects'].includes(h.userData.physicalHatch),
      )
      .map((h) =>
        new THREE.Box3().setFromObject(
          h.getObjectByName('recessed-iris-guide'),
        ),
      );
    assert.equal(guides.length, 2);
    assert.ok(
      Math.min(...guides.map((b) => b.min.y)) - lowerWall > 0.19,
      'Lower shutter has real clearance above curved jamb',
    );
    assert.ok(
      upperWall - Math.max(...guides.map((b) => b.max.y)) > 0.19,
      'Upper shutter has equal real clearance below curved jamb',
    );
    for (const y of [-0.53, 0.41, 1.83])
      for (const z of [1.145, 1.231]) {
        const origin = new THREE.Vector3(d.ladderRightWall - 0.05, y, z);
        const hits = new THREE.Raycaster(
          origin,
          new THREE.Vector3(1, 0, 0),
          0,
          0.06,
        ).intersectObjects(visible, false);
        const interiors = hits.filter((hit) => {
          const p = hit.object.geometry.getAttribute('position');
          const vertices = [hit.face.a, hit.face.b, hit.face.c].map((i) =>
            new THREE.Vector3()
              .fromBufferAttribute(p, i)
              .applyMatrix4(hit.object.matrixWorld),
          );
          const bary = new THREE.Triangle(...vertices).getBarycoord(
            hit.point,
            new THREE.Vector3(),
          );
          return bary && Math.min(...bary.toArray()) > 1e-5;
        });
        assert.equal(
          interiors.length,
          1,
          'Exactly one triangle owns the visible front jamb: no depth-fighting sheets',
        );
        assert.ok(
          Math.abs(interiors[0].point.x - d.ladderRightWall) < 2e-6,
          'The flush window reveal remains on its existing contour',
        );
      }
  });
}
