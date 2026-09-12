import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import {
  CABIN_FLOOR,
  CABIN_CEILING,
  CABIN_HALF_WIDTH,
  LADDER_CENTER_Y,
  wallLayout,
} from '../lib/spacecraft-wall-layout.ts';
import { cursorViewSamples, CAMERA_RANGES } from '../lib/scene-controls.ts';

const model = createSpacecraft(THREE);
const rooms = ['projects', 'experience', 'about', 'contact'];
const visibleMeshes = (root) => {
  const result = [];
  root.traverseVisible((o) => {
    if (o.isMesh) result.push(o);
  });
  return result;
};

test('Furniture stays on the room centerline and secondary fittings retain their grid across layout changes', () => {
  const furniture = {
    projects: 'projects-workshop',
    experience: 'case-study-flight-recorder-archive',
    about: 'about-personal-study',
    contact: 'contact-flight-console',
  };
  const worldPosition = (name) =>
    model.group.getObjectByName(name).getWorldPosition(new THREE.Vector3());
  const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-5, message);
  for (const layout of ['wide', 'compact', 'wide']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    for (const [room, name] of Object.entries(furniture))
      close(
        worldPosition(name).x,
        model.group.userData.roomAnchors[room][0],
        `${room}/${layout}: primary furniture must share the room and heading centerline`,
      );

    const utilities = model.group.getObjectByName('projects-cabin-utilities');
    const variant = utilities.children.find((child) => child.visible);
    const fittingCenter = (name) => {
      const part = variant.userData.utilityParts.find(
        (part) => part.name === name,
      );
      return variant.localToWorld(
        new THREE.Vector3(
          (part.min[0] + part.max[0]) / 2,
          (part.min[1] + part.max[1]) / 2,
          (part.min[2] + part.max[2]) / 2,
        ),
      );
    };
    const topLeft = worldPosition('projects-workshop-module-all');
    const bottomLeft = worldPosition('projects-workshop-module-interfaces');
    const topRight = worldPosition('projects-workshop-module-systems');
    close(
      fittingCenter('underbench--1').x,
      topLeft.x,
      'Left drawer follows the left display column',
    );
    close(
      fittingCenter('underbench-1').x,
      topRight.x,
      'Right drawer follows the right display column',
    );
    for (const name of ['retained-tool-board', 'retained-diagnostic-lead'])
      close(
        fittingCenter(name).y,
        (topLeft.y + bottomLeft.y) / 2,
        `${name}: side equipment follows the bank midpoint`,
      );
  }
});

test('Cabin additions remain passive and inside the unchanged pressure shell in both layouts', () => {
  for (const [layout, scale] of [
    ['wide', 1.4],
    ['compact', 1],
  ]) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    for (const room of rooms) {
      const root = model.group.getObjectByName(`${room}-cabin-utilities`);
      const center = model.group.userData.roomAnchors[room];
      assert.equal(root.children.filter((o) => o.visible).length, 1);
      const walls = visibleMeshes(model.group).filter((o) =>
        o.userData.parts?.includes(`${room}-continuous-pressure-skin-interior`),
      );
      assert.ok(walls.length);
      for (const part of visibleMeshes(root)) {
        const bounds = new THREE.Box3().setFromObject(part);
        assert.ok(bounds.min.x > center[0] - CABIN_HALF_WIDTH * scale);
        assert.ok(bounds.max.x < center[0] + CABIN_HALF_WIDTH * scale);
        assert.ok(bounds.min.y > center[1] + CABIN_FLOOR + 0.03);
        assert.ok(bounds.max.y < center[1] + CABIN_CEILING - 0.1);
        assert.ok(
          bounds.max.z < -0.5,
          'New furniture leaves the circulation aisle clear',
        );
        assert.equal(part.userData.excludePick, true);
        assert.ok(!model.targets.some((t) => t.object === part));
        // Every solid vertex stays on the cabin side of the actual curved liner.
        // Contoured mounting feet embed only one millimeter to avoid seams.
        if (part.isInstancedMesh) continue;
        const positions = part.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) {
          const point = new THREE.Vector3()
            .fromBufferAttribute(positions, i)
            .applyMatrix4(part.matrixWorld);
          const hit = new THREE.Raycaster(
            new THREE.Vector3(point.x, point.y, 0),
            new THREE.Vector3(0, 0, -1),
            0,
            1.3,
          ).intersectObjects(walls, false)[0];
          assert.ok(hit, `${room}/${layout} needs a continuous rear wall`);
          assert.ok(
            point.z >= hit.point.z - 0.0011,
            `${room}/${layout}: fitting penetrates rear wall at ${point.toArray().join(',')}`,
          );
        }
      }
    }
  }
});

test('New fittings do not obscure main signs, door labels, or screens through the normal camera range', () => {
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    for (const room of rooms) {
      const root = model.group.getObjectByName(`${room}-cabin-utilities`);
      const additions = visibleMeshes(root);
      const a = model.group.userData.roomAnchors[room];
      const target = [
        a[0],
        model.group.userData.innerApertureBounds[room].center[1],
        a[2],
      ];
      const points = model.group.userData.requiredFramingPoints[room]
        .filter((p) => p.kind === 'header' || p.kind === 'portal-plate')
        .map((p) => new THREE.Vector3(...p.position));
      // Use rendered screen meshes (including the tilted archive terminal), not
      // a nominal rectangle that can silently diverge from the actual display.
      for (const part of visibleMeshes(model.group)) {
        if (part.userData.section !== room) continue;
        const names = [part.name, ...(part.userData.parts || [])];
        if (
          !part.material.userData.displaySize &&
          !names.some((n) => n === 'case-archive-terminal-screen')
        )
          continue;
        part.geometry.computeBoundingBox();
        const b = part.geometry.boundingBox,
          c = b.getCenter(new THREE.Vector3());
        for (const x of [b.min.x, c.x, b.max.x])
          for (const y of [b.min.y, c.y, b.max.y])
            points.push(
              new THREE.Vector3(x, y, b.max.z).applyMatrix4(part.matrixWorld),
            );
      }
      for (const screen of room === 'contact'
        ? model.group.userData.socialScreens
        : [])
        for (const sx of [-1, 0, 1])
          for (const sy of [-1, 0, 1])
            points.push(
              screen.anchor.localToWorld(
                new THREE.Vector3(
                  (sx * screen.width) / 2,
                  (sy * screen.height) / 2,
                  0,
                ),
              ),
            );
      for (const view of cursorViewSamples(
        { target, direction: [0, 0, 1] },
        8,
        CAMERA_RANGES.room,
      )) {
        const camera = new THREE.Vector3(...target).addScaledVector(
          new THREE.Vector3(...view.direction),
          5,
        );
        for (const point of points) {
          const direction = point.clone().sub(camera);
          const distance = direction.length();
          const hits = new THREE.Raycaster(
            camera,
            direction.normalize(),
            0,
            distance - 0.004,
          ).intersectObjects(additions, false);
          assert.equal(
            hits.length,
            0,
            `${room}/${layout}: utility fitting obscures primary text at ${point.toArray()}`,
          );
        }
      }
    }
  }
});

test('Ladder web equipment is wall-mounted, centered, and clear of both iris apertures', () => {
  const root = model.group.getObjectByName('ladder-wall-isolation-cassette');
  for (const [layout, scale] of [
    ['wide', 1.4],
    ['compact', 1],
  ]) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(root),
      w = wallLayout(scale);
    assert.ok(Math.abs(b.max.x - w.ladderRightWall) < 1e-6);
    assert.ok(Math.abs((b.min.y + b.max.y) / 2 - LADDER_CENTER_Y) < 1e-6);
    assert.ok(b.max.x - b.min.x < 0.11);
    for (const part of visibleMeshes(root)) {
      assert.equal(part.userData.excludePick, true);
      assert.ok(!model.targets.some((t) => t.object === part));
      const positions = part.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const p = new THREE.Vector3()
          .fromBufferAttribute(positions, i)
          .applyMatrix4(part.matrixWorld);
        for (const door of model.group.userData.portals.filter(
          (p) => p.via === 'walkway',
        ))
          assert.ok(
            Math.hypot(p.y - door.position[1], p.z - door.position[2]) > 0.99,
            'Service cassette must stay clear of moving blades and passage',
          );
      }
    }
  }
});
