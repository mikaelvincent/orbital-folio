import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildProjectPayloadModule } from '../../features/spacecraft/rooms/projects-payload-module.ts';
import { buildAboutPersonalStudy } from '../../features/spacecraft/rooms/about-personal-study.ts';
import { measureHardwareGeometry } from '../../scripts/measure-hardware-geometry.mjs';

// Leave explicit component geometry inspectable before the real model batches it.
// Ordinary rounded furniture is irrelevant here and uses simple helper cuboids.
function fixture(builder) {
  const root = new THREE.Group();
  const mesh = (geometry, material, into, name = '') => {
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    into.add(object);
    return object;
  };
  const h = {
    mesh,
    box(w, height, depth, material, x, y, z, into, _radius, name) {
      const object = mesh(
        new THREE.BoxGeometry(w, height, depth),
        material,
        into,
        name,
      );
      object.position.set(x, y, z);
      return object;
    },
    cylinder(
      radius,
      length,
      material,
      x,
      y,
      z,
      into,
      axis,
      top = radius,
      segments = 24,
    ) {
      const object = mesh(
        new THREE.CylinderGeometry(top, radius, length, segments),
        material,
        into,
      );
      object.position.set(x, y, z);
      if (axis === 'x') object.rotation.z = Math.PI / 2;
      if (axis === 'z') object.rotation.x = Math.PI / 2;
      return object;
    },
    rod(a, b, radius, material, into) {
      const start = new THREE.Vector3(...a),
        end = new THREE.Vector3(...b);
      const object = mesh(
        new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 16),
        material,
        into,
      );
      object.position.copy(start.clone().add(end).multiplyScalar(0.5));
      object.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        end.sub(start).normalize(),
      );
      return object;
    },
    instances(geometry, material, transforms, into, name) {
      if (!transforms.length) return null;
      const object = new THREE.InstancedMesh(
        geometry,
        material,
        transforms.length,
      );
      object.name = name;
      for (const [
        i,
        { p, s = [1, 1, 1], r = [0, 0, 0] },
      ] of transforms.entries())
        object.setMatrixAt(
          i,
          new THREE.Matrix4().compose(
            new THREE.Vector3(...p),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
            new THREE.Vector3(...s),
          ),
        );
      into.add(object);
      return object;
    },
  };
  builder(THREE, h, root);
  root.updateMatrixWorld(true);
  return root;
}

function validClosedSolid(geometry) {
  const positions = geometry.attributes.position;
  const indices =
    geometry.index?.array ??
    Array.from({ length: positions.count }, (_, i) => i);
  const vertex = (i) => new THREE.Vector3().fromBufferAttribute(positions, i);
  const key = (v) =>
    v
      .toArray()
      .map((value) => Math.round(value * 1e7))
      .join(',');
  const edges = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]].map(vertex);
    assert.ok(
      a.toArray().concat(b.toArray(), c.toArray()).every(Number.isFinite),
    );
    assert.ok(
      new THREE.Vector3()
        .subVectors(b, a)
        .cross(new THREE.Vector3().subVectors(c, a))
        .lengthSq() > 1e-24,
      'No degenerate triangles',
    );
    for (const [from, to] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const endpoints = [key(from), key(to)]
        .sort((a, b) => a.localeCompare(b))
        .join('|');
      edges.set(endpoints, (edges.get(endpoints) ?? 0) + 1);
    }
  }
  assert.ok(
    [...edges.values()].every((count) => count === 2),
    'Every physical edge meets two faces: no cracks or open backs',
  );
  for (const value of geometry.attributes.normal.array)
    assert.ok(Number.isFinite(value));
}

const near = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) < 2e-7,
    `${actual} differs from ${expected}`,
  );

test('Projects reduced hardware retains closed openings, exact size and useful geometry budgets', () => {
  const root = fixture((T, h, into) =>
    buildProjectPayloadModule(T, h, into, {
      label: 'All projects',
      kind: 'all',
    }),
  );
  /** @type {Array<[string, number, number, number, number, number]>} */
  const specs = [
    ['bezel-edge-ring', 1.174, 0.722, 0.021, 0.003, 1248],
    ['ivory-bezel-ring', 1.16, 0.708, 0.047, 0.006, 1248],
    ['recessed-screen-gasket', 1.046, 0.604, 0.026, 0.0015, 1248],
    ['side-grab-loop', 0.075, 0.294, 0.031, 0.002, 576],
  ];
  for (const [name, width, height, depth, bevel, budget] of specs) {
    const object = root.getObjectByName(`projects-workshop-${name}`);
    const geometry = object.geometry;
    assert.equal(geometry.attributes.position.count / 3, budget, name);
    validClosedSolid(geometry);
    geometry.computeBoundingBox();
    /** @type {Array<['x' | 'y', number]>} */
    const extents = [
      ['x', width / 2],
      ['y', height / 2],
    ];
    for (const [axis, half] of extents) {
      near(geometry.boundingBox.min[axis], -half - bevel);
      near(geometry.boundingBox.max[axis], half + bevel);
    }
    near(geometry.boundingBox.min.z, -bevel);
    near(geometry.boundingBox.max.z, depth + bevel);
    const center = object.localToWorld(new THREE.Vector3(0, 0, 1));
    const ray = new THREE.Raycaster(center, new THREE.Vector3(0, 0, -1));
    assert.equal(
      ray.intersectObject(object).length,
      0,
      `${name} must retain its real open center`,
    );
  }
});

test('About retains all fine paper layers at their original positions using shared closed cuboids', () => {
  const root = fixture(buildAboutPersonalStudy);
  const edges = [];
  root.traverse((object) => {
    if (/^personal-study-(lower|outer)-page-edge$/.test(object.name))
      edges.push(object);
  });
  assert.equal(edges.length, 20);
  assert.equal(new Set(edges.map((object) => object.geometry)).size, 2);
  for (const edge of edges) {
    const lower = edge.name.includes('lower');
    const side = edge.parent.name.includes('left') ? -1 : 1;
    assert.equal(edge.geometry.index.count / 3, 12);
    validClosedSolid(edge.geometry);
    edge.geometry.computeBoundingBox();
    const size = edge.geometry.boundingBox.getSize(new THREE.Vector3());
    near(size.x, lower ? 0.449 : 0.0012);
    near(size.y, lower ? 0.0012 : 0.56);
    near(size.z, 0.0013);
    near(edge.position.x, side * (lower ? 0.231 : 0.457));
    near(edge.position.y, lower ? -0.28 : 0);
    assert.ok(
      Array.from({ length: 5 }, (_, i) => -0.01 + i * 0.0056).some(
        (z) => Math.abs(edge.position.z - z) < 1e-9,
      ),
    );
    assert.equal(edge.material.name, 'personal-study-page-edge-shadow');
  }
});

test('Geometry savings survive production material batching in both spacecraft layouts', async () => {
  const report = await measureHardwareGeometry();
  for (const layout of Object.values(report.layouts)) {
    // The approved sealed docking pads replace the old display vent slots,
    // adding 1,920 triangles without restoring the removed tiny bezel detail.
    assert.equal(layout.furniture.projects.triangles, 146396);
    // About's approved berth redesign also removes the pleated divider. Keep
    // the hardware budget without tying later art changes to the old room total.
    assert.ok(layout.furniture.about.triangles <= 70954);
    assert.ok(layout.furniture.projects.attributeBytes < 5_500_000);
    assert.ok(layout.furniture.about.attributeBytes < 2_100_000);
  }
});
