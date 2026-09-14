import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  PASSAGE_RADIUS,
  PASSAGE_WALL_RADIUS,
  CABIN_VISIBLE_REAR_Z,
} from '../lib/spacecraft-wall-layout.ts';
import { createSpacecraft } from '../components/spacecraft-model.ts';

const close = (actual, expected, message, tolerance = 2e-6) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${message}: expected ${expected}, received ${actual}`,
  );

function meshesMatching(root, pattern) {
  const meshes = [];
  root.traverseVisible((object) => {
    if (
      object.isMesh &&
      [object.name, ...(object.userData.parts || [])].some((name) =>
        pattern.test(name),
      )
    )
      meshes.push(object);
  });
  return meshes;
}

function wallFor(model, portal) {
  const pattern =
    portal.via === 'walkway'
      ? /walkway-(twin-open-room-wall-interior|(?:projects|about)-(?:cabin-facing-wall|doorway-reveal-interior))/
      : /open-side-pressure-bulkhead/;
  const meshes = meshesMatching(model.group, pattern).filter((mesh) => {
    const bounds = new THREE.Box3().setFromObject(mesh);
    return (
      portal.position[1] > bounds.min.y && portal.position[1] < bounds.max.y
    );
  });
  assert.ok(meshes.length, `${portal.id}: structural wall meshes exist`);
  const bounds = new THREE.Box3();
  for (const mesh of meshes) bounds.union(new THREE.Box3().setFromObject(mesh));
  return { meshes, bounds };
}

function hits(meshes, origin, direction, far) {
  return new THREE.Raycaster(origin, direction, 0, far).intersectObjects(
    meshes,
    false,
  );
}

function exposedWallDepth(model, portal, sampleY = portal.position[1]) {
  const ladder = portal.via === 'walkway';
  const meshes = meshesMatching(
    model.group,
    ladder
      ? /walkway-continuous-rear-liner/
      : new RegExp(`${portal.from}-continuous-pressure-skin-interior`),
  );
  assert.ok(meshes.length, `${portal.id}: exposed interior lining exists`);
  const bounds = new THREE.Box3();
  for (const mesh of meshes) bounds.union(new THREE.Box3().setFromObject(mesh));
  // At the requested height, sample the actual rear lining. The ladder's
  // rightmost cove meets its sidewall at the visible rear edge; the flat
  // panel behind it and the outer wall stock are not alignment datums.
  const origin = new THREE.Vector3(
    ladder
      ? bounds.max.x - 1e-8
      : portal.edge === 'right'
        ? bounds.max.x - 1e-8
        : bounds.min.x + 1e-8,
    sampleY,
    0,
  );
  const rear = hits(meshes, origin, new THREE.Vector3(0, 0, -1), 1.5)[0];
  assert.ok(rear, `${portal.id}: exposed rear boundary exists`);
  if (sampleY === portal.position[1])
    close(
      rear.point.z,
      ladder ? -0.975 : CABIN_VISIBLE_REAR_Z,
      `${portal.id}: rear boundary`,
    );
  close(bounds.max.z, 1.121, `${portal.id}: front throat boundary`);
  return { rear: rear.point.z, front: bounds.max.z };
}

test('Doors center on the visible wall with balanced margins; captions align directly above', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  for (const layout of ['wide', 'compact', 'wide']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const data = model.group.userData;
    for (const portal of data.portals) {
      const context = `${layout}/${portal.id}`;
      const hatch = data.irisHatches.find(
        (object) => object.userData.physicalHatch === portal.physicalHatch,
      );
      const guide = hatch.getObjectByName('recessed-iris-guide');
      const guideBounds = new THREE.Box3().setFromObject(guide);
      const guideCenter = guideBounds.getCenter(new THREE.Vector3());
      const caption = model.group.getObjectByName(
        `${portal.id}-above-door-wall-nameplate`,
      );
      assert.ok(caption, `${context}: the physical caption exists`);
      const captionBounds = new THREE.Box3().setFromObject(caption);
      const captionCenter = captionBounds.getCenter(new THREE.Vector3());
      const wall = wallFor(model, portal);
      const exposed = exposedWallDepth(model, portal);
      const wallCenterZ = (exposed.rear + exposed.front) / 2;
      close(guideCenter.z, wallCenterZ, `${context}: centered iris`);
      close(
        captionCenter.z,
        guideCenter.z,
        `${context}: caption shares door horizontal center`,
      );
      const rearGap = guideBounds.min.z - exposed.rear;
      const frontGap = exposed.front - guideBounds.max.z;
      assert.ok(rearGap > 0 && frontGap > 0, `${context}: clear iris margins`);
      close(rearGap, frontGap, `${context}: balanced exposed depth margins`);
      close(portal.position[1], guideCenter.y, `${context}: pick center Y`);
      close(portal.position[2], guideCenter.z, `${context}: pick center Z`);
      close(portal.labelPosition[1], captionCenter.y, `${context}: label Y`);
      close(portal.labelPosition[2], captionCenter.z, `${context}: label Z`);

      const room = data.innerApertureBounds[portal.from];
      close(
        guideBounds.min.y - room.min[1],
        room.max[1] - guideBounds.max.y,
        `${context}: equal vertical door margins`,
      );
      close(
        guideCenter.y,
        (room.min[1] + room.max[1]) / 2,
        `${context}: visible wall vertical center`,
      );
      const captionGap = captionBounds.min.y - guideBounds.max.y;
      const ceilingGap = room.max[1] - captionBounds.max.y;
      assert.ok(
        captionGap > 0.09 && ceilingGap > 0.09,
        `${context}: sign has breathing room`,
      );
      close(
        captionGap,
        ceilingGap,
        `${context}: caption balances available upper space`,
      );

      // Sample the whole plate footprint, including its corners. Bounding-box
      // containment alone would miss the sidewall's curved rear shoulder.
      const normal = new THREE.Vector3(...portal.labelNormal);
      const labelPosition = new THREE.Vector3(...portal.labelPosition);
      const wallHit = hits(
        wall.meshes,
        labelPosition.clone().addScaledVector(normal, 0.1),
        normal.clone().negate(),
        0.75,
      )[0];
      assert.ok(wallHit, `${context}: actual mounting wall face exists`);
      const standoff = labelPosition.clone().sub(wallHit.point).dot(normal);
      assert.ok(
        standoff >= 0 && standoff <= 0.033,
        `${context}: caption plane stays within 0.033 of the wall, received ${standoff}`,
      );
      const backing = meshesMatching(caption, /above-door-label-backing/);
      assert.ok(backing.length, `${context}: physical caption backing exists`);
      let rearSeparation = Infinity;
      for (const mesh of backing) {
        const positions = mesh.geometry.getAttribute('position');
        for (let index = 0; index < positions.count; index++) {
          const vertex = new THREE.Vector3()
            .fromBufferAttribute(positions, index)
            .applyMatrix4(mesh.matrixWorld);
          rearSeparation = Math.min(
            rearSeparation,
            vertex.sub(wallHit.point).dot(normal),
          );
        }
      }
      close(rearSeparation, 0, `${context}: backing rear seats against wall`);
      for (const y of [
        captionBounds.min.y,
        captionCenter.y,
        captionBounds.max.y,
      ])
        for (const z of [
          captionBounds.min.z,
          captionCenter.z,
          captionBounds.max.z,
        ]) {
          const origin = new THREE.Vector3(
            portal.labelPosition[0],
            y,
            z,
          ).addScaledVector(normal, 0.25);
          assert.ok(
            hits(wall.meshes, origin, normal.clone().negate(), 0.75).length,
            `${context}: caption footprint is supported by wall at Y=${y}, Z=${z}`,
          );
        }
    }
  }
});

test('Each wall aperture remains concentric with its iris through the full wall thickness', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const data = model.group.userData;
    for (const hatch of data.irisHatches) {
      const portal = data.portals.find(
        (entry) => entry.physicalHatch === hatch.userData.physicalHatch,
      );
      const context = `${layout}/${portal.id}`;
      const center = hatch.getWorldPosition(new THREE.Vector3());
      const guide = hatch.getObjectByName('recessed-iris-guide');
      const wall = wallFor(model, portal);
      for (let index = 0; index < 24; index++) {
        // Off-vertex angles also check the interpolated circular surfaces.
        const angle = ((index + 0.25) * Math.PI) / 12;
        const radial = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle));
        for (const fraction of [0.1, 0.5, 0.9]) {
          const origin = new THREE.Vector3(
            THREE.MathUtils.lerp(
              wall.bounds.min.x,
              wall.bounds.max.x,
              fraction,
            ),
            center.y,
            center.z,
          );
          const openingHit = hits(wall.meshes, origin, radial, 1.1)[0];
          assert.ok(openingHit, `${context}: wall reveal exists at ${angle}`);
          close(
            openingHit.distance,
            PASSAGE_WALL_RADIUS,
            `${context}: concentric wall hole`,
            0.001,
          );
          const guideHit = hits([guide], origin, radial, 1.1)[0];
          assert.ok(guideHit, `${context}: iris guide exists at ${angle}`);
          close(
            guideHit.distance,
            PASSAGE_RADIUS,
            `${context}: concentric iris guide`,
            0.001,
          );
        }
        // Both wall faces must retain a real opening, with pressure material
        // immediately outside it. These rays ignore the movable shutter stock.
        for (const side of [-1, 1])
          for (const radius of [
            PASSAGE_WALL_RADIUS - 0.015,
            PASSAGE_WALL_RADIUS + 0.015,
          ]) {
            const origin = center.clone().addScaledVector(radial, radius);
            origin.x =
              (side > 0 ? wall.bounds.min.x : wall.bounds.max.x) - side * 0.1;
            const crossed = hits(
              wall.meshes,
              origin,
              new THREE.Vector3(side, 0, 0),
              wall.bounds.max.x - wall.bounds.min.x + 0.2,
            );
            assert.equal(
              crossed.length > 0,
              radius > PASSAGE_WALL_RADIUS,
              `${context}: ${radius < PASSAGE_WALL_RADIUS ? 'clear hole' : 'solid wall'} from face ${side}, angle ${angle}`,
            );
          }
      }
    }
  }
});
