import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { CABIN_FLOOR, CABIN_CEILING } from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

const vessel = createSpacecraft(THREE);
for (const section of ['contact', 'experience']) {
  test(`${section} outboard equipment stays mounted inside the cabin across layout changes and never becomes a pick target`, () => {
    const root = vessel.group.getObjectByName(`${section}-outboard-equipment`);
    assert.ok(root);
    for (const layout of ['wide', 'compact', 'wide']) {
      vessel.setLayout(layout);
      vessel.group.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(root);
      const anchor = vessel.group.userData.roomAnchors[section];
      const walls = [];
      vessel.group.traverseVisible((part) => {
        if (
          part.isMesh &&
          [part.name, ...(part.userData.parts || [])].some(
            (name) => name === `${section}-sealed-outboard-wall-interior`,
          )
        )
          walls.push(part);
      });
      assert.ok(
        walls.length > 0,
        'Test the rendered wall, not a nominal plane',
      );
      // Ray-cast behind the entire equipment footprint, including its corners.
      // This catches detached feet, exterior protrusions and curved-wall gaps.
      for (const y of [
        bounds.min.y,
        (bounds.min.y + bounds.max.y) / 2,
        bounds.max.y,
      ]) {
        for (const z of [
          bounds.min.z,
          (bounds.min.z + bounds.max.z) / 2,
          bounds.max.z,
        ]) {
          const hit = new THREE.Raycaster(
            new THREE.Vector3(bounds.min.x - 0.05, y, z),
            new THREE.Vector3(1, 0, 0),
            0,
            0.5,
          ).intersectObjects(walls, false)[0];
          assert.ok(hit, 'Equipment footprint needs continuous wall behind it');
          assert.ok(
            Math.abs(hit.point.x - bounds.max.x) < 1e-5,
            'Actual feet meet the wall, with all other parts inside the cabin',
          );
        }
      }
      assert.ok(bounds.min.y > anchor[1] + CABIN_FLOOR + 0.1);
      assert.ok(bounds.max.y < anchor[1] + CABIN_CEILING - 0.1);
      assert.ok(bounds.max.z < 1, 'Equipment stays behind the front collar');
      root.traverse((part) => {
        if (!part.isMesh) return;
        assert.equal(part.userData.excludePick, true);
        assert.ok(
          !vessel.targets.some((target) => target.object === part),
          'Even instanced screws must remain passive scenery',
        );
      });
    }
  });
}
