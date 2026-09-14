import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { wallLayout, PRESSURE_WALL } from '../lib/spacecraft-wall-layout.ts';
const model = createSpacecraft(THREE);
for (const [layout, scale] of [
  ['wide', 1.4],
  ['compact', 1],
]) {
  test(`${layout}: both rear side edges are quarter-round and interior returns remain enclosed`, () => {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const d = wallLayout(scale),
      outer = [],
      inner = [],
      all = [];
    model.group.traverseVisible((object) => {
      if (!object.isMesh) return;
      all.push(object);
      if (object.material.name === 'ceramic-hull') outer.push(object);
      if (
        [object.name, ...(object.userData.parts ?? [])].some((name) =>
          /continuous-pressure-skin-interior|walkway-continuous-rear-liner/.test(
            name,
          ),
        )
      )
        inner.push(object);
    });
    for (const side of [-1, 1])
      for (const y of [-0.46, 0.34])
        for (const angle of [0.05, 0.31, 0.73, 1.17, 1.51]) {
          const x =
            side < 0
              ? d.dockingOuterWall + PRESSURE_WALL * (1 - Math.cos(angle))
              : d.rightX - PRESSURE_WALL * (1 - Math.cos(angle));
          const point = new THREE.Vector3(
            x,
            y,
            -1.1 - PRESSURE_WALL * Math.sin(angle),
          );
          const normal = new THREE.Vector3(
            side * Math.cos(angle),
            0,
            -Math.sin(angle),
          );
          const hit = new THREE.Raycaster(
            point.clone().addScaledVector(normal, 0.04),
            normal.clone().negate(),
            0,
            0.08,
          ).intersectObjects(outer, false)[0];
          assert.ok(hit, 'Every rear return has a visible exterior face');
          assert.ok(
            hit.point.distanceTo(point) < 0.0001,
            'Rear edges follow a physical quarter-round, not a sharp extrusion',
          );
          const shadingNormal = hit.normal
            .clone()
            .applyNormalMatrix(
              new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld),
            );
          assert.ok(
            shadingNormal.dot(normal) > 0.999,
            'The rounded return retains tangent shading normals',
          );
        }
    let probes = 0,
      minimum = Infinity;
    for (const mesh of inner) {
      const g = mesh.geometry,
        p = g.getAttribute('position'),
        n = g.getAttribute('normal'),
        index = g.index;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(
          mesh.matrixWorld,
        ),
        eligible = [];
      for (let i = 0; i < (index?.count ?? p.count); i += 3) {
        const ids = [0, 1, 2].map((offset) =>
          index ? index.getX(i + offset) : i + offset,
        );
        const vertices = ids.map((id) =>
          new THREE.Vector3()
            .fromBufferAttribute(p, id)
            .applyMatrix4(mesh.matrixWorld),
        );
        const center = vertices
          .reduce((sum, v) => sum.add(v), new THREE.Vector3())
          .multiplyScalar(1 / 3);
        if (center.z > -0.67) continue;
        const normal = ids
          .map((id) => new THREE.Vector3().fromBufferAttribute(n, id))
          .reduce((sum, v) => sum.add(v), new THREE.Vector3())
          .applyNormalMatrix(normalMatrix);
        if (normal.length() < 0.9) continue;
        if (!mesh.name.includes('walkway')) {
          // Shared partitions/middeck faces lead into another cabin rather
          // than the exterior; inspect the real roof, keel and rear coves.
          if (Math.abs(normal.x) > 0.1) continue;
          const upper =
            mesh.name.startsWith('projects') ||
            mesh.name.startsWith('experience');
          if ((upper ? normal.y > 0 : normal.y < 0) && normal.z < 0.9) continue;
        }
        eligible.push({ center, normal });
      }
      const stride = Math.max(1, Math.floor(eligible.length / 100));
      for (let i = 0; i < eligible.length; i += stride) {
        const { center, normal } = eligible[i];
        const hit = new THREE.Raycaster(
          center.clone().addScaledVector(normal, -0.7),
          normal,
          0,
          0.7,
        ).intersectObjects(outer, false)[0];
        assert.ok(
          hit,
          'The outer rear shape remains outside each sampled interior triangle',
        );
        const clearance = 0.7 - hit.distance;
        assert.ok(
          clearance > 0.09,
          'Rounded outer profiles retain real clearance around the unchanged interior',
        );
        minimum = Math.min(minimum, clearance);
        probes++;
      }
    }
    assert.ok(
      probes > 450,
      'Cover both rear coves and the full ladder lining in every layout',
    );
    assert.ok(minimum > 0.09);
    for (const section of ['projects', 'about'])
      for (const sign of [-1, 1]) {
        const anchor = model.group.userData.roomAnchors[section];
        const hit = new THREE.Raycaster(
          new THREE.Vector3(
            anchor[0] + sign * 1.365 * scale,
            anchor[1] + 0.04,
            -1.4,
          ),
          new THREE.Vector3(0, 0, 1),
          0,
          0.3,
        ).intersectObjects(all, false)[0];
        assert.ok(hit);
        assert.equal(
          hit.object.material.name,
          'ceramic-hull',
          'Interior corner backing must never protrude through the rear paint',
        );
      }
  });
}
