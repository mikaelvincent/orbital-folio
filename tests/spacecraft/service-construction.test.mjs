import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

const sourceMeshes = new Map();
const roots = new Set(['aft-service-assembly']);
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
  test(`${layout}: the dish has seated support from the hull to its reflector and feed`, () => {
    const { named, joined } = partsForLayout(layout);
    for (const [part, support, message] of [
      [
        'communications-hull-saddle',
        'aft-service-pressure-hull',
        'Radio saddle reaches the actual curved pressure hull',
      ],
      [
        'communications-saddle-face',
        'communications-hull-saddle',
        'Saddle face seats on its load-bearing foot',
      ],
      [
        'communications-clevis-arm',
        'communications-saddle-face',
        'Both clevis arms reach their mounting face',
      ],
      [
        'communications-clevis-inset',
        'communications-clevis-arm',
        'Every inset is seated on its arm',
      ],
      [
        'communications-clevis-arm',
        'communications-elevation-axle',
        'Both clevis ends carry the elevation axle',
      ],
      [
        'communications-elevation-retainer',
        'communications-elevation-axle',
        'The captive retainer contacts its axle',
      ],
      [
        'communications-reflector-back-hub',
        'communications-elevation-axle',
        'The reflector back hub engages the elevation axle',
      ],
      [
        'double-skin-communications-dish',
        'communications-reflector-back-hub',
        'The real reflector shell reaches its back hub',
      ],
      [
        'communications-reflector-rim',
        'double-skin-communications-dish',
        'The continuous rim seats on the reflector',
      ],
      [
        'communications-feed-seat',
        'communications-reflector-back-hub',
        'The feed seat reaches the structural hub',
      ],
      [
        'communications-feed-stem',
        'communications-feed-seat',
        'The feed stem starts in its seat',
      ],
      [
        'communications-feed-horn',
        'communications-feed-stem',
        'The feed horn reaches its stem',
      ],
      [
        'communications-feed-cap',
        'communications-feed-horn',
        'The feed cap closes against its horn',
      ],
      [
        'communications-feed-stay',
        'double-skin-communications-dish',
        'Every feed stay seats on the real curved bowl',
      ],
      [
        'communications-feed-stay',
        'communications-feed-horn',
        'Every feed stay reaches the feed cluster',
      ],
    ])
      joined(named(part), named(support), message);
  });

  test(`${layout}: both solar booms have continuous hull, bearing and panel load paths`, () => {
    const { named, joined } = partsForLayout(layout);
    for (const [part, support, message] of [
      [
        'solar-boom-hull-saddle',
        'aft-service-pressure-hull',
        'Both boom saddles meet the actual hull',
      ],
      [
        'solar-boom-root-flange',
        'solar-boom-hull-saddle',
        'Both root flanges seat on their saddles',
      ],
      [
        'solar-inner-box-boom',
        'solar-boom-root-flange',
        'Each inner boom reaches its root flange',
      ],
      [
        'solar-inner-box-boom',
        'solar-drive-bearing',
        'Each inner boom reaches a real pivot bearing',
      ],
      [
        'solar-drive-bearing',
        'solar-outer-box-boom',
        'Every pivot bearing engages the outer boom',
      ],
      [
        'solar-drive-cover',
        'solar-drive-bearing',
        'Every bearing cover seats on its drum',
      ],
      [
        'solar-drive-captive-pin',
        'solar-drive-cover',
        'Every captive pin engages its bearing cover',
      ],
      [
        'solar-boom-root-tie',
        'solar-boom-hull-saddle',
        'Both root ties start on a supported saddle',
      ],
      [
        'solar-boom-root-tie',
        'solar-inner-box-boom',
        'Both root ties brace the inner boom',
      ],
      [
        'solar-panel-root-tang',
        'solar-drive-bearing',
        'Both panel root tangs engage a bearing',
      ],
      [
        'solar-panel-root-tang',
        'upright-solar-panel-chassis',
        'Both root tangs reach their panel structure',
      ],
    ])
      joined(named(part), named(support), message);
  });

  test(`${layout}: real photovoltaic instances, wiring and rear structure are seated on each panel`, () => {
    const { named, joined } = partsForLayout(layout);
    for (const [part, support, message] of [
      [
        'solar-cell-bonding-sheet',
        'upright-solar-panel-chassis',
        'Both dielectric sheets seat on the panel chassis',
      ],
      [
        'large-blue-photovoltaic-cells',
        'solar-cell-bonding-sheet',
        'Every real blue cell instance reaches its bonding sheet',
      ],
      [
        'alternate-blue-photovoltaic-cells',
        'solar-cell-bonding-sheet',
        'Every alternate cell instance reaches its bonding sheet',
      ],
      [
        'coarse-solar-conductor-grid',
        'solar-cell-bonding-sheet',
        'Every conductor instance is backed by the bonding sheet',
      ],
      [
        'satin-solar-panel-frame',
        'upright-solar-panel-chassis',
        'Every real frame instance meets the panel chassis',
      ],
      [
        'solar-panel-carbon-corner-shoes',
        'satin-solar-panel-frame',
        'Every corner shoe reaches its perimeter frame',
      ],
      [
        'solar-panel-rear-longeron',
        'upright-solar-panel-chassis',
        'Every rear longeron seats against the panel',
      ],
      [
        'solar-panel-rear-crossmember',
        'solar-panel-rear-longeron',
        'Every rear crossmember joins the longitudinal rails',
      ],
      [
        'solar-panel-power-raceway',
        'upright-solar-panel-chassis',
        'Both power raceways attach to their panel',
      ],
    ])
      joined(named(part), named(support), message);
    const wings = ['lower-solar-wing', 'upper-solar-wing'].map((name) => {
      const wing = model.group.getObjectByName(name);
      assert.ok(wing, 'Both physical wing assemblies exist');
      assert.ok(
        wing.matrixWorld.determinant() > 0,
        'Wing placement keeps ordinary outward winding',
      );
      return wing;
    });
    const instanceInventory = (wing) => {
      const counts = {};
      wing.traverseVisible((object) => {
        if (object.isInstancedMesh) counts[object.name] = object.count;
      });
      return counts;
    };
    assert.deepEqual(
      instanceInventory(wings[0]),
      instanceInventory(wings[1]),
      'The paired wings retain matching physical panel components',
    );
  });

  test(`${layout}: the nozzle closure reaches the actual bell and the dish front faces its feed`, () => {
    const { named, joined } = partsForLayout(layout);
    joined(
      named('engine-nozzle-seated-throat'),
      named('radiused-main-engine-nozzle'),
      'The dark throat closure reaches the real nozzle wall',
    );
    const throat = named('engine-nozzle-seated-throat')[0],
      nozzle = named('radiused-main-engine-nozzle')[0];
    const center = throat.bounds.getCenter(new THREE.Vector3());
    // Avoid exact polygon meridians where a ray can fall on a shared edge.
    for (const angle of [0.13, 0.75, 1.61, 3.24, 4.6]) {
      const ray = new THREE.Raycaster(
        center,
        new THREE.Vector3(0, Math.cos(angle), Math.sin(angle)),
        0,
        2,
      );
      const closure = ray.intersectObject(throat.mesh, false)[0];
      const bell = ray.intersectObject(nozzle.mesh, false)[0];
      assert.ok(
        closure && bell,
        'Actual closure rim and bell surfaces surround the engine axis',
      );
      assert.ok(
        closure.distance >= bell.distance - 1e-7,
        'The closure reaches the bell without a detached annular gap',
      );
    }
    const dish = named('double-skin-communications-dish')[0];
    const frame = model.group.getObjectByName(
      'service-mounted-communications-dish',
    ).matrixWorld;
    const forward = new THREE.Vector3(0, 0, 1).transformDirection(frame);
    const radius = dish.mesh.geometry.boundingBox.max.x;
    for (const fraction of [0.2, 0.5, 0.85]) {
      const origin = new THREE.Vector3(radius * fraction, 0, 1).applyMatrix4(
        frame,
      );
      const hit = new THREE.Raycaster(
        origin,
        forward.clone().negate(),
        0,
        2,
      ).intersectObject(dish.mesh, false)[0];
      assert.ok(hit, 'The concave reflector is exposed toward the feed');
      assert.ok(
        hit.face.normal.clone().transformDirection(frame).dot(forward) > 0.25,
        'The bowl front has outward geometric winding toward the feed',
      );
    }
  });
}
