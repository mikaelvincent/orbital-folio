import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
const model = createSpacecraft(THREE);
for (const layout of ['wide', 'compact']) {
  test(`${layout}: complete corner backing footprints stay inside the curved exterior`, () => {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const outer = [],
      backings = [];
    model.group.traverseVisible((object) => {
      if (!object.isMesh) return;
      if (object.material.name === 'ceramic-hull') outer.push(object);
      if (
        [object.name, ...(object.userData.parts ?? [])].includes(
          'visible-neighbor-rear-corner-liner',
        )
      )
        backings.push(object);
    });
    assert.ok(backings.length >= 4);
    let checks = 0,
      minimum = Infinity;
    for (const mesh of backings) {
      const position = mesh.geometry.getAttribute('position');
      const footprints = new Map();
      let front = -Infinity,
        rear = Infinity;
      for (let i = 0; i < position.count; i++) {
        const p = new THREE.Vector3()
          .fromBufferAttribute(position, i)
          .applyMatrix4(mesh.matrixWorld);
        front = Math.max(front, p.z);
        rear = Math.min(rear, p.z);
        footprints.set(`${p.x.toFixed(7)}:${p.y.toFixed(7)}`, p);
      }
      assert.ok(
        Math.abs(front + 1.2275) < 2e-6,
        'The established front mounting face does not move',
      );
      assert.ok(
        Math.abs(rear + 1.24) < 2e-6,
        'Only concealed depth is reduced',
      );
      // Split material-batched backings by their separated X footprints,
      // then probe complete enclosing rectangles. This includes conservative
      // sharp bounding corners, both end edges and interior cove spans.
      const points = [...footprints.values()].sort((a, b) => a.x - b.x);
      const clusters = [];
      for (const point of points) {
        const last = clusters.at(-1);
        if (!last || point.x - last.at(-1).x > 0.6) clusters.push([point]);
        else last.push(point);
      }
      const probes = [];
      for (const cluster of clusters) {
        const bounds = new THREE.Box3().setFromPoints(cluster);
        for (const u of [0, 0.25, 0.5, 0.75, 1])
          for (const v of [0, 0.05, 0.25, 0.5, 0.75, 0.95, 1])
            probes.push(
              new THREE.Vector3(
                THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, u),
                THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, v),
                rear,
              ),
            );
      }
      for (const p of probes) {
        const hit = new THREE.Raycaster(
          new THREE.Vector3(p.x, p.y, -1.5),
          new THREE.Vector3(0, 0, 1),
          0,
          0.4,
        ).intersectObjects(outer, false)[0];
        assert.ok(
          hit,
          'A real ceramic skin covers the entire backing footprint',
        );
        const clearance = rear - hit.point.z;
        assert.ok(
          clearance > 0.008,
          `Backing stays ahead of the curved exterior at ${p.x},${p.y}: ${clearance}`,
        );
        minimum = Math.min(minimum, clearance);
        checks++;
      }
    }
    assert.ok(
      checks > 200,
      'Inspect full edge/corner vertex coverage across every backing',
    );
    assert.ok(minimum > 0.008);
    console.log(
      JSON.stringify({
        layout,
        footprintSamples: checks,
        minimumRearClearance: minimum,
      }),
    );
  });
}
