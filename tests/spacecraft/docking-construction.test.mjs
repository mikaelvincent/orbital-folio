import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { LADDER_CENTER_Y } from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

const sourceMeshes = new Map();
const roots = new Set([
  'central-docking-assembly',
  'walkway-finished-inner-docking-hatch',
]);
function assemblyOf(object) {
  for (let parent = object; parent; parent = parent.parent)
    if (roots.has(parent.name)) return parent;
}
// Preserve the production source solids before material batching replaces them.
// Rebuild world transforms from their real retained parents for each layout.
class SourceMesh extends THREE.Mesh {
  removeFromParent() {
    const assembly = assemblyOf(this);
    if (this.parent && assembly && !this.userData.parts)
      sourceMeshes.set(this, {
        mesh: this,
        parent: this.parent,
        matrix: this.matrix.clone(),
        assembly,
      });
    return super.removeFromParent();
  }
}
const model = createSpacecraft({ ...THREE, Mesh: SourceMesh });
const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
function actualSolid(source, transform) {
  const mesh = new THREE.Mesh(source.geometry, material);
  mesh.matrixAutoUpdate = false;
  mesh.matrix.copy(transform);
  mesh.matrixWorld.copy(transform);
  mesh.geometry.computeBoundingBox();
  // Authored source geometry may be deformed before batching recomputes bounds.
  // Raycast its final vertices, rather than a cloned primitive's cached sphere.
  mesh.geometry.computeBoundingSphere();
  return {
    name: source.name,
    mesh,
    bounds: mesh.geometry.boundingBox.clone().applyMatrix4(transform),
  };
}
function containsPoint(part, point) {
  if (!part.bounds.clone().expandByScalar(1e-7).containsPoint(point))
    return false;
  const origin = point
    .clone()
    .lerp(part.bounds.getCenter(new THREE.Vector3()), 1e-6);
  const hits = new THREE.Raycaster(
    origin,
    new THREE.Vector3(0.819, 0.421, 0.386).normalize(),
    0,
    10,
  ).intersectObject(part.mesh, false);
  return (
    hits.filter(
      (hit, index) =>
        index === 0 || Math.abs(hit.distance - hits[index - 1].distance) > 1e-7,
    ).length %
      2 ===
    1
  );
}
function solidContact(a, b) {
  const overlap = a.bounds
    .clone()
    .expandByScalar(1e-7)
    .intersect(b.bounds.clone().expandByScalar(1e-7));
  if (overlap.isEmpty()) return false;
  const center = overlap.getCenter(new THREE.Vector3());
  if (containsPoint(a, center) && containsPoint(b, center)) return true;
  for (const [from, into] of [
    [a, b],
    [b, a],
  ]) {
    const positions = from.mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const point = new THREE.Vector3()
        .fromBufferAttribute(positions, i)
        .applyMatrix4(from.mesh.matrixWorld);
      if (containsPoint(into, point)) return true;
    }
  }
  return false;
}
function partsForLayout(layout) {
  model.setLayout(layout);
  model.update(0, 'home', true, {
    activeRoom: 'home',
    layout,
    delta: 0,
    immediateDoors: true,
  });
  model.group.updateMatrixWorld(true);
  const parts = [...sourceMeshes.values()].map(
    ({ mesh, parent, matrix, assembly }) => ({
      ...actualSolid(mesh, parent.matrixWorld.clone().multiply(matrix)),
      assembly: assembly.name,
    }),
  );
  for (const name of roots)
    model.group.getObjectByName(name).traverseVisible((mesh) => {
      if (!mesh.isInstancedMesh) return;
      for (let index = 0; index < mesh.count; index++) {
        const instance = new THREE.Matrix4();
        mesh.getMatrixAt(index, instance);
        parts.push({
          ...actualSolid(mesh, mesh.matrixWorld.clone().multiply(instance)),
          assembly: name,
        });
      }
    });
  const named = (name) => parts.filter((part) => part.name === name);
  const joined = (left, right, message) => {
    assert.ok(
      left.length && right.length,
      `${message}: actual source parts exist`,
    );
    for (const part of left)
      assert.ok(
        right.some((other) => solidContact(part, other)),
        `${message}: every actual solid contacts its support`,
      );
  };
  return { parts, named, joined };
}

for (const layout of ['wide', 'compact']) {
  test(`${layout}: the docking pressure stack and both hatch wheels have continuous solid support`, () => {
    const { named, joined } = partsForLayout(layout);
    joined(
      named('docking-collar-mating-flange'),
      named('docking-collar-neck'),
      'The mating flange seats on the collar neck',
    );
    joined(
      named('docking-hatch-pressure-seal'),
      named('docking-collar-mating-flange'),
      'The pressure seal overlaps the actual annular flange',
    );
    joined(
      named('docking-exterior-pressure-leaf'),
      named('docking-hatch-pressure-seal'),
      'The pressure leaf seats on its seal',
    );
    joined(
      named('docking-exterior-wheel-boss'),
      named('docking-exterior-pressure-leaf'),
      'The exterior wheel boss reaches the leaf',
    );
    joined(
      named('docking-exterior-wheel-hub'),
      named('docking-exterior-wheel-boss'),
      'The exterior hub reaches its boss',
    );
    joined(
      named('docking-exterior-wheel-spoke'),
      named('docking-exterior-wheel-hub'),
      'Every exterior spoke reaches the hub',
    );
    joined(
      named('docking-exterior-wheel-spoke'),
      named('docking-exterior-wheel-rim'),
      'Every exterior spoke reaches the grip rim',
    );
    joined(
      named('inner-docking-closed-pressure-leaf'),
      named('inner-docking-continuous-gasket'),
      'The inner pressure leaf seats in its gasket',
    );
    joined(
      named('inner-docking-wheel-boss'),
      named('inner-docking-closed-pressure-leaf'),
      'The inner wheel boss reaches the leaf',
    );
    joined(
      named('inner-docking-wheel-spoke'),
      named('inner-docking-wheel-boss'),
      'Every inner wheel spoke reaches its boss',
    );
    joined(
      named('inner-docking-wheel-spoke'),
      named('inner-docking-wheel-rim'),
      'Every inner wheel spoke reaches the rim',
    );
    joined(
      named('inner-hatch-locking-dog'),
      named('inner-docking-closed-pressure-leaf'),
      'Both inner locking dogs reach the leaf',
    );
    joined(
      named('inner-hatch-lock-tab'),
      named('inner-hatch-locking-dog'),
      'Both inner lock tabs reach their dogs',
    );
  });

  test(`${layout}: every collar fastener, captive shoe and exterior handle foot reaches its support`, () => {
    const { named, joined } = partsForLayout(layout);
    joined(
      named('docking-collar-fasteners'),
      named('docking-collar-mating-flange'),
      'Every real fastener instance seats against the flange',
    );
    joined(
      named('docking-clamp-seat'),
      named('docking-collar-mating-flange'),
      'Every captive clamp seat reaches the flange',
    );
    joined(
      named('docking-captive-clamp-shoe'),
      named('docking-clamp-seat'),
      'Every captive shoe reaches its seat',
    );
    joined(
      named('docking-exterior-handle-foot'),
      named('docking-exterior-pressure-leaf'),
      'Every handle foot reaches the pressure leaf',
    );
    joined(
      named('docking-exterior-handle-return'),
      named('docking-exterior-handle-foot'),
      'Every handle return reaches a fitted foot',
    );
    joined(
      named('docking-exterior-handle-return'),
      named('docking-exterior-handle-grasp'),
      'Both ends of every grasp meet their returns',
    );
  });

  test(`${layout}: the service saddle follows the actual curved sleeve and its folding pull has continuous support`, () => {
    const { named, joined } = partsForLayout(layout);
    const saddles = named('docking-service-saddle'),
      sleeves = named('rounded-docking-pressure-sleeve');
    assert.ok(
      saddles.length && sleeves.length,
      'Actual saddle and sleeve surfaces exist',
    );
    for (const saddle of saddles) {
      // Test the back surface reached through the actual rounded saddle at a
      // spread of interior footprint points, not an assumed cylinder radius.
      for (const u of [0.08, 0.25, 0.5, 0.75, 0.92]) {
        for (const v of [0.08, 0.25, 0.5, 0.75, 0.92]) {
          const origin = new THREE.Vector3(
            THREE.MathUtils.lerp(saddle.bounds.min.x, saddle.bounds.max.x, u),
            THREE.MathUtils.lerp(saddle.bounds.min.y, saddle.bounds.max.y, v),
            saddle.bounds.max.z + 0.1,
          );
          // Avoid casting exactly down a shared meridian edge of the lathed
          // barrel, where floating-point triangle-edge ties can miss both faces.
          origin.y += 1e-6;
          const ray = new THREE.Raycaster(
            origin,
            new THREE.Vector3(0, 0, -1),
            0,
            0.5,
          );
          const back = ray.intersectObject(saddle.mesh, false).at(-1);
          const skin = ray.intersectObjects(
            sleeves.map(({ mesh }) => mesh),
            false,
          )[0];
          assert.ok(
            back && skin,
            'The sleeve lies under the sampled saddle footprint',
          );
          const separation = back.point.z - skin.point.z;
          assert.ok(
            separation >= -0.012 && separation <= 0.002,
            `The formed saddle seats shallowly against the actual sleeve (separation ${separation})`,
          );
        }
      }
    }
    joined(
      named('docking-service-cassette'),
      saddles,
      'The removable service hatch seats on its saddle',
    );
    joined(
      named('docking-service-grip-well'),
      named('docking-service-cassette'),
      'The grip well seats against the service hatch',
    );
    joined(
      named('docking-service-pull-foot'),
      named('docking-service-cassette'),
      'Every folding-pull foot reaches the hatch',
    );
    joined(
      named('docking-service-pull-return'),
      named('docking-service-pull-foot'),
      'Every pull return reaches a fitted foot',
    );
    joined(
      named('docking-service-pull-return'),
      named('docking-service-folded-pull'),
      'Every pull return reaches the continuous grasp',
    );
    joined(
      named('docking-service-pull-keeper'),
      named('docking-service-pull-foot'),
      'The captive keeper is supported by a fitted foot',
    );
    joined(
      named('docking-service-pull-keeper'),
      named('docking-service-folded-pull'),
      'The captive keeper engages the folded pull',
    );
  });

  test(`${layout}: pressure faces remain coaxial with the wall and close the center of the docking passage`, () => {
    const { named } = partsForLayout(layout);
    const parts = [
      'coaxial-docking-load-bearing-mount',
      'docking-collar-neck',
      'docking-collar-mating-flange',
      'docking-hatch-pressure-seal',
      'docking-exterior-pressure-leaf',
      'inner-docking-closed-pressure-leaf',
    ].map((name) => {
      const part = named(name)[0];
      assert.ok(part, `${name}: the actual pressure component exists`);
      const center = part.bounds.getCenter(new THREE.Vector3());
      assert.ok(
        Math.abs(center.y - LADDER_CENTER_Y) < 1e-6,
        `${name}: shared vertical pressure axis`,
      );
      assert.ok(
        Math.abs(center.z) < 1e-6,
        `${name}: shared fore/aft pressure axis`,
      );
      return part;
    });
    const outerLeaf = parts.at(-2),
      innerLeaf = parts.at(-1);
    assert.ok(
      outerLeaf.bounds.max.x < innerLeaf.bounds.min.x,
      'The separate hatch faces retain their inboard/outboard order',
    );
    for (const leaf of [outerLeaf, innerLeaf]) {
      for (const [y, z] of [
        [0, 0],
        [0.3, 0],
        [-0.3, 0],
        [0, 0.3],
        [0, -0.3],
      ]) {
        const hit = new THREE.Raycaster(
          new THREE.Vector3(leaf.bounds.min.x - 0.1, LADDER_CENTER_Y + y, z),
          new THREE.Vector3(1, 0, 0),
          0,
          leaf.bounds.max.x - leaf.bounds.min.x + 0.2,
        ).intersectObject(leaf.mesh, false)[0];
        assert.ok(
          hit,
          'The closed pressure leaf has a real face across the usable passage center',
        );
      }
    }
  });
}
