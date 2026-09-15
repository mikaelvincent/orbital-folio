import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { buildDockingShoulderEquipment } from '../components/docking-shoulder-equipment.ts';
import { ladderOpeningOutline } from '../components/ladder-opening-outline.ts';
import {
  LADDER_CENTER_Y,
  LADDER_HEIGHT,
  LADDER_SHOULDER_RUN,
  LADDER_SHOULDER_RISE,
  LADDER_RIGHT_RADIUS,
} from '../lib/spacecraft-wall-layout.ts';
const contour = ladderOpeningOutline(new THREE.Shape(), {
  width: 1.33,
  height: LADDER_HEIGHT,
  leftWidth: LADDER_SHOULDER_RUN,
  leftHeight: LADDER_SHOULDER_RISE,
  rightRadius: LADDER_RIGHT_RADIUS,
  rightEdge: 0.69,
})
  .getPoints(64)
  .map((p) => p.add(new THREE.Vector2(0, LADDER_CENTER_Y)));
const wallX = (y) => {
  let x = Infinity;
  for (let i = 0; i < contour.length; i++) {
    const a = contour[i],
      b = contour[(i + 1) % contour.length];
    if (
      Math.abs(a.y - b.y) < 1e-10 ||
      y < Math.min(a.y, b.y) ||
      y > Math.max(a.y, b.y)
    )
      continue;
    x = Math.min(x, a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
  }
  return x;
};
const equipment = (model) => {
  const root = model.group.getObjectByName(
    'docking-shoulder-maintenance-spanners',
  );
  assert(root);
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  return { root, meshes };
};

test('Both maintenance spanners have recognizable open jaws, substantial grasps and open retention clips', () => {
  const model = createSpacecraft(THREE),
    { root, meshes } = equipment(model),
    names = root.userData.layout.parts;
  assert.equal(root.userData.layout.tools.length, 2);
  for (const name of [
    'forged-open-jaw-spanner',
    'substantial-spanner-grasp',
    'spring-clip-release-tab',
    'retained-tool-tail-loop',
  ])
    assert.equal(names.filter((n) => n === name).length, 2);
  assert.equal(names.filter((n) => n === 'open-tool-retention-clip').length, 4);
  assert(
    !names.some((n) =>
      /cover|cassette|grille|vent|airfoil|torch|optic|lens/.test(n),
    ),
  );
  assert.equal(meshes.length, 3);
});

test('Spanners and open clips follow the curved wall and retain hatch, ladder and end-equipment clearance', () => {
  const model = createSpacecraft(THREE),
    { root, meshes } = equipment(model);
  for (const layout of ['wide', 'compact']) {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(root);
    assert(
      Math.abs(b.min.y + b.max.y - 2 * LADDER_CENTER_Y) < 1e-5,
      'One identical mirrored spanner is mounted per deck',
    );
    for (const mesh of meshes) {
      const p = mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i),
          projection = x - wallX(y),
          dy = Math.abs(y - LADDER_CENTER_Y);
        assert(Number.isFinite(x + y + z));
        assert(
          projection >= -0.006 && projection < 0.36,
          'Only the fitted anchors enter the wall; objects stay within the shoulder equipment envelope',
        );
        assert(
          dy > 1.11 && dy < 2.01,
          'The docking hatch and end fixtures remain clear',
        );
        assert(
          z > -0.26 && z < 0.3,
          'Keep clear of the rear ladder spine and front reveal',
        );
      }
    }
    for (const mount of root.userData.layout.mounts)
      assert(Math.abs(mount.skin[0] - wallX(mount.skin[1])) < 1e-8);
  }
});

test('Only bonded feet and post ends intersect the liner; tool bodies and open clips stand clear', () => {
  const parent = new THREE.Group();
  const h = {
    mesh(geometry, material, parent, name) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      parent.add(mesh);
      return mesh;
    },
    box(w, h, d, material, x, y, z, parent, _radius, name) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.name = name;
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
  };
  const root = buildDockingShoulderEquipment(
    THREE,
    h,
    parent,
    contour,
    LADDER_CENTER_Y,
  );
  for (const mesh of root.children) {
    const anchor = /clip-(bonded-mount-foot|rigid-post)$/.test(mesh.name),
      p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const offset = p.getX(i) - wallX(p.getY(i));
      assert(
        offset >= (anchor ? -0.006 : 0.07),
        `${mesh.name} keeps its designed stand-off; only anchor ends embed in the wall`,
      );
    }
  }
});

test('The complete stowed tools and clips are true reflected copies with substantial forged head depth', () => {
  const parent = new THREE.Group();
  const root = buildDockingShoulderEquipment(
    THREE,
    {
      mesh(geometry, material, parent, name) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = name;
        parent.add(mesh);
        return mesh;
      },
    },
    parent,
    contour,
    LADDER_CENTER_Y,
  );
  const pairs = new Map();
  for (const mesh of root.children) {
    if (!pairs.has(mesh.name)) pairs.set(mesh.name, { upper: [], lower: [] });
    pairs.get(mesh.name)[mesh.userData.side > 0 ? 'upper' : 'lower'].push(mesh);
  }
  const points = (mesh, reflect) => {
    const p = mesh.geometry.attributes.position,
      result = [];
    for (let i = 0; i < p.count; i++)
      result.push([
        p.getX(i),
        reflect ? 2 * LADDER_CENTER_Y - p.getY(i) : p.getY(i),
        p.getZ(i),
      ]);
    return result;
  };
  // Reflected Float32 values can land on opposite decimal-rounding boundaries.
  // Match every vertex once within precision, rather than comparing string bins.
  const assertMirrored = (upper, lower, name) => {
    const expected = points(upper, true),
      actual = points(lower, false),
      bins = new Map(),
      cell = 2e-6;
    assert.equal(expected.length, actual.length, name);
    for (const point of actual) {
      const key = point.map((v) => Math.floor(v / cell)).join(',');
      if (!bins.has(key)) bins.set(key, []);
      bins.get(key).push(point);
    }
    for (const point of expected) {
      const base = point.map((v) => Math.floor(v / cell));
      let matched = false;
      for (let x = -1; x <= 1 && !matched; x++)
        for (let y = -1; y <= 1 && !matched; y++)
          for (let z = -1; z <= 1 && !matched; z++) {
            const bucket = bins.get(
              [base[0] + x, base[1] + y, base[2] + z].join(','),
            );
            if (!bucket) continue;
            const index = bucket.findIndex(
              (q) =>
                Math.hypot(q[0] - point[0], q[1] - point[1], q[2] - point[2]) <
                1e-6,
            );
            if (index >= 0) {
              bucket.splice(index, 1);
              matched = true;
            }
          }
      assert(
        matched,
        name + ' has an unmatched reflected vertex at ' + point.join(','),
      );
    }
  };
  for (const [name, { upper, lower }] of pairs) {
    assert.equal(upper.length, lower.length, name);
    for (let i = 0; i < upper.length; i++)
      assertMirrored(upper[i], lower[i], name);
  }
  for (const tool of root.userData.layout.tools) {
    const head = root.children.find(
      (o) =>
        o.name.endsWith('forged-open-jaw-spanner') &&
        o.userData.side === tool.side,
    );
    const origin = new THREE.Vector3(...tool.center),
      axis = new THREE.Vector3(...tool.axis),
      normal = new THREE.Vector3(...tool.normal);
    const p = head.geometry.attributes.position,
      depths = [];
    for (let i = 0; i < p.count; i++) {
      const local = new THREE.Vector3().fromBufferAttribute(p, i).sub(origin);
      if (local.dot(axis) > 0.17) depths.push(local.dot(normal));
    }
    assert(
      Math.max(...depths) - Math.min(...depths) > 0.05,
      'Forged cheeks have actual thickness rather than a flat icon face',
    );
  }
});

test('Open jaw throats remain empty while both thick forged cheeks are visible from the room', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  model.group.updateMatrixWorld(true);
  const { root, meshes } = equipment(model),
    ray = new THREE.Raycaster();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(root.matrixWorld);
  for (const tool of root.userData.layout.tools) {
    const n = new THREE.Vector3(...tool.normal)
      .applyMatrix3(normalMatrix)
      .normalize();
    const hit = (point) => {
      const p = new THREE.Vector3(...point).applyMatrix4(root.matrixWorld);
      ray.set(p.clone().addScaledVector(n, 0.4), n.clone().negate());
      ray.far = 0.55;
      return ray.intersectObjects(meshes, false);
    };
    assert.equal(
      hit(tool.jawGap).length,
      0,
      'A real open wrench throat replaces every optical head',
    );
    for (const face of tool.jawFaces) {
      const hits = hit(face);
      assert(hits.length > 0);
      assert.equal(
        hits[0].object.material.name,
        'docking-shoulder-tool-satin-alloy',
      );
    }
  }
});

test('Stowed tools remain passive, nonemissive and follow the walkway dimmer', () => {
  const model = createSpacecraft(THREE),
    { root, meshes } = equipment(model);
  model.update(1, '', true, { activeRoom: 'home', transitWalkway: false });
  const dim = meshes.map((m) => m.material.color.toArray());
  model.update(2, '', true, {
    activeRoom: 'about',
    travelling: true,
    transitWalkway: true,
  });
  for (const [i, m] of meshes.entries()) {
    assert(m.userData.excludePick);
    assert(!m.material.userData.exterior);
    assert.equal(m.material.emissive.getHex(), 0);
    assert.equal(m.material.map, null);
    m.material.color
      .toArray()
      .forEach((v, j) => assert(Math.abs(v - 2 * dim[i][j]) < 1e-8));
  }
  assert(!root.children.some((o) => o.isLight));
  const disposed = { materials: 0, geometries: 0 };
  for (const m of meshes) {
    m.material.addEventListener('dispose', () => disposed.materials++);
    m.geometry.addEventListener('dispose', () => disposed.geometries++);
    m.material.dispose();
    m.geometry.dispose();
  }
  assert.equal(disposed.materials, 3);
  assert.equal(disposed.geometries, 3);
});
