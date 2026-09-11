import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { thinChassisOutline } from '../components/thin-chassis-outline.ts';
import {
  LADDER_CENTER_Y,
  LADDER_HALF_STRAIGHT,
} from '../lib/spacecraft-wall-layout.ts';

const model = createSpacecraft(THREE, { layout: 'wide' });

for (const [layout, scale] of [
  ['wide', 1.4],
  ['compact', 1],
]) {
  test(`${layout} curved hull remains solid from exterior and grazing angles`, () => {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const frame = model.group.getObjectByName(
      `${layout}-common-pressure-frame`,
    );
    const { datums } = thinChassisOutline(THREE, { scale, bevel: 0 });
    const tangentX = datums.bowTangentX;
    const hulls = [];
    frame.traverse((object) => {
      if (
        object.isMesh &&
        [object.name, ...(object.userData.parts ?? [])].includes(
          'thin-continuous-bow-outer-skin',
        )
      )
        hulls.push(object);
    });
    assert.ok(hulls.length > 0, 'Inspect the actual batched pressure skin');
    const count = { upper: 0, lower: 0 };
    const probeCount = { upper: 0, lower: 0 };
    for (const hull of hulls) {
      assert.equal(
        hull.material.side,
        THREE.FrontSide,
        'Correct face orientation must not be hidden by two-sided rendering',
      );
      const geometry = hull.geometry;
      const positions = geometry.getAttribute('position');
      const normals = geometry.getAttribute('normal');
      const indices = geometry.index;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(
        hull.matrixWorld,
      );
      const vertex = (i) =>
        new THREE.Vector3()
          .fromBufferAttribute(positions, i)
          .applyMatrix4(hull.matrixWorld);
      for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
        const ids = [0, 1, 2].map((offset) =>
          indices ? indices.getX(i + offset) : i + offset,
        );
        const [a, b, c] = ids.map(vertex);
        const center = a
          .clone()
          .add(b)
          .add(c)
          .multiplyScalar(1 / 3);
        // Curved pressure-skin triangles span the full wall depth. The other
        // batched surfaces are short front extrusions or tessellated closures.
        if (
          Math.min(a.z, b.z, c.z) > -0.99 ||
          Math.max(a.z, b.z, c.z) < 1 ||
          center.x >= tangentX - 1e-5 ||
          Math.abs(center.y - LADDER_CENTER_Y) <= LADDER_HALF_STRAIGHT
        )
          continue;
        const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
        if (Math.abs(normal.z) > 1e-6) continue;
        const side = center.y > LADDER_CENTER_Y ? 'upper' : 'lower';
        const curveCenterY =
          LADDER_CENTER_Y + (side === 'upper' ? 1 : -1) * LADDER_HALF_STRAIGHT;
        const outward = new THREE.Vector3(
          center.x - tangentX,
          center.y - curveCenterY,
          0,
        ).normalize();
        assert.ok(
          normal.dot(outward) > 0.5,
          `${side} hull triangle at ${center.toArray().join(',')} must face outside`,
        );
        for (const id of ids) {
          const shadingNormal = new THREE.Vector3()
            .fromBufferAttribute(normals, id)
            .applyNormalMatrix(normalMatrix);
          assert.ok(
            shadingNormal.dot(outward) > 0.5,
            'Lighting normals must follow the exterior surface',
          );
        }
        count[side]++;
        if (count[side] % 8 !== 0) continue;
        // Raycast rendered faces at normal incidence and steep tilts in both
        // depth directions. This catches disappearing faces after batching.
        for (const degrees of [-75, -40, 0, 40, 75]) {
          const radians = THREE.MathUtils.degToRad(degrees);
          const direction = normal
            .clone()
            .multiplyScalar(Math.cos(radians))
            .addScaledVector(new THREE.Vector3(0, 0, 1), Math.sin(radians));
          const ray = new THREE.Raycaster(
            center.clone().addScaledVector(direction, 0.08),
            direction.negate(),
            0,
            0.1,
          );
          const hit = ray.intersectObjects(hulls, false)[0];
          assert.ok(
            hit && Math.abs(hit.distance - 0.08) < 1e-5,
            `${side} exterior must be closed at ${degrees} degrees`,
          );
          probeCount[side]++;
        }
      }
    }
    for (const side of ['upper', 'lower']) {
      assert.ok(count[side] > 100, `Cover the complete ${side} curve`);
      assert.ok(
        probeCount[side] >= 50,
        `Probe multiple points on the ${side} curve`,
      );
    }
  });
}
