import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import {
  CABIN_CEILING,
  CABIN_FLOOR,
  CABIN_HALF_WIDTH,
  PASSAGE_CENTER_Y,
  PASSAGE_CABIN_Z,
  PASSAGE_LADDER_Z,
  DECK_HALF_PITCH,
  wallLayout,
} from '../lib/spacecraft-wall-layout.ts';

const model = createSpacecraft(THREE);
const radius = 0.08;
const wallParts =
  /continuous-pressure-skin-interior|open-side-pressure-bulkhead|sealed-outboard-wall-interior|walkway-(projects|about)-cabin-facing-wall/;

function visibleWalls(layout) {
  model.setLayout(layout);
  model.group.updateMatrixWorld(true);
  const walls = [];
  model.group.traverseVisible((object) => {
    if (
      object.isMesh &&
      [object.name, ...(object.userData.parts || [])].some((name) =>
        wallParts.test(name),
      )
    )
      walls.push(object);
  });
  return walls;
}

function checkSurface(walls, point, normal, label) {
  const ray = new THREE.Raycaster(
    point.clone().addScaledVector(normal, 0.045),
    normal.clone().negate(),
    0,
    0.075,
  );
  const hits = ray.intersectObjects(walls, false);
  assert.ok(hits.length, `${label}: the lining must remain closed`);
  assert.ok(
    hits[0].point.distanceTo(point) < 0.0007,
    `${label}: the corner must follow its rounded contour, without the old 90-degree junction`,
  );
  const shadingNormal = hits[0].normal
    .clone()
    .applyMatrix3(
      new THREE.Matrix3().getNormalMatrix(hits[0].object.matrixWorld),
    )
    .normalize();
  assert.ok(
    shadingNormal.dot(normal) > 0.995,
    `${label}: the rounded return must remain tangent to the wall finish`,
  );
  // Coplanar edges can report twice, but two interior triangle hits expose an
  // overlaid panel. Check barycentrics because production batching combines
  // different source surfaces into the same mesh.
  const interiors = hits.filter((hit) => {
    if (hit.distance > hits[0].distance + 1e-5) return false;
    const p = hit.object.geometry.getAttribute('position');
    const points = [hit.face.a, hit.face.b, hit.face.c].map((i) =>
      new THREE.Vector3()
        .fromBufferAttribute(p, i)
        .applyMatrix4(hit.object.matrixWorld),
    );
    const bary = new THREE.Triangle(...points).getBarycoord(
      hit.point,
      new THREE.Vector3(),
    );
    return bary && Math.min(...bary.toArray()) > 1e-5;
  });
  assert.ok(
    interiors.length <= 1,
    `${label}: a return must replace the flat edge, not overlap it`,
  );
}

for (const [layout, scale] of [
  ['wide', 1.4],
  ['compact', 1],
]) {
  test(`${layout}: all eight cabin side junctions have closed rounded rear, floor and ceiling returns`, () => {
    const walls = visibleWalls(layout);
    const d = wallLayout(scale);
    for (const [section, column, row] of [
      ['projects', -1, 1],
      ['experience', 1, 1],
      ['about', -1, -1],
      ['contact', 1, -1],
    ]) {
      const center = new THREE.Vector3(
        column * d.halfPitch,
        row * DECK_HALF_PITCH,
        0,
      );
      for (const side of [-1, 1]) {
        // Include samples close to both tangent joins as well as the middle.
        for (const angle of [0.035, 0.31, 0.67, 1.02, 1.535]) {
          const x =
            side *
            scale *
            (CABIN_HALF_WIDTH - radius + radius * Math.sin(angle));
          const offset = radius * (1 - Math.cos(angle));
          for (const y of [-0.48, 0.18, 0.76]) {
            const point = center
              .clone()
              .add(new THREE.Vector3(x, y, -1.1 + offset));
            const inward = new THREE.Vector3(
              (-side * Math.sin(angle)) / scale,
              0,
              Math.cos(angle),
            ).normalize();
            checkSurface(
              walls,
              point,
              inward,
              `${section} side ${side} rear angle ${angle}`,
            );
          }
          for (const [level, sign] of [
            [CABIN_FLOOR, 1],
            [CABIN_CEILING, -1],
          ]) {
            const point = center
              .clone()
              .add(new THREE.Vector3(x, level + sign * offset, 0.32));
            const inward = new THREE.Vector3(
              (-side * Math.sin(angle)) / scale,
              sign * Math.cos(angle),
              0,
            ).normalize();
            checkSurface(
              walls,
              point,
              inward,
              `${section} side ${side} ${sign > 0 ? 'floor' : 'ceiling'} angle ${angle}`,
            );
          }
        }
      }
    }
  });

  test(`${layout}: the rounded chassis preserves the real cabin and ladder door apertures`, () => {
    const walls = visibleWalls(layout);
    const d = wallLayout(scale);
    for (const [column, row] of [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ]) {
      for (const side of [-1, 1]) {
        if (column > 0 && side > 0) continue;
        const z = column < 0 && side < 0 ? PASSAGE_LADDER_Z : PASSAGE_CABIN_Z;
        const start = new THREE.Vector3(
          column * d.halfPitch + side * (d.halfWidth - 0.1),
          row * DECK_HALF_PITCH + PASSAGE_CENTER_Y,
          z,
        );
        const ray = new THREE.Raycaster(
          start,
          new THREE.Vector3(side, 0, 0),
          0,
          0.3,
        );
        assert.equal(
          ray.intersectObjects(walls, false).length,
          0,
          'The new return must not cover a doorway or extend into its opening',
        );
      }
    }
  });
}
