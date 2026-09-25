import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';

const sourceMeshes = new Map();
const roots = new Set([
  'wide-exterior-service-equipment',
  'compact-exterior-service-equipment',
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
  const parts = [...sourceMeshes.values()]
    .filter(
      ({ assembly }) =>
        assembly.name === layout + '-exterior-service-equipment',
    )
    .map(({ mesh, parent, matrix, assembly }) => ({
      ...actualSolid(mesh, parent.matrixWorld.clone().multiply(matrix)),
      assembly: assembly.name,
    }));
  for (const name of [layout + '-exterior-service-equipment'])
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
  const root = model.group.getObjectByName(
    layout + '-exterior-service-equipment',
  );
  const skin = [];
  model.group.traverseVisible((object) => {
    if (object.isMesh && object.material.name === 'ceramic-hull')
      skin.push(object);
  });
  return { parts, named, joined, root, skin };
}

for (const layout of ['wide', 'compact']) {
  test(`${layout}: both access routes have connected shoes, webs, rails and broad treads`, () => {
    const { named, joined } = partsForLayout(layout);
    for (const route of ['main', 'lower']) {
      const part = (name) => named(`exterior-eva-${route}-${name}`);
      for (const [name, support, message] of [
        [
          'load-spreading-shoe',
          'bonded-mount-foot',
          'Every alloy shoe seats on its bonded foot',
        ],
        [
          'tapered-support-web',
          'load-spreading-shoe',
          'Every support web reaches its load-spreading shoe',
        ],
        [
          'shoe-captive-fastener',
          'load-spreading-shoe',
          'Every captive fastener seats against its shoe',
        ],
        [
          'tapered-support-web',
          'split-rail-clamp',
          'Every support web reaches its rail saddle',
        ],
        [
          'split-rail-clamp',
          'continuous-rail',
          'Every saddle engages the continuous rail',
        ],
        [
          'rounded-rail-end',
          'continuous-rail',
          'Every rail end is closed by an attached cap',
        ],
        ['rung-socket', 'continuous-rail', 'Every rung socket reaches a rail'],
        ['rung-socket', 'open-rung', 'Every socket engages the real rung spar'],
        [
          'rung-grip-sleeve',
          'open-rung',
          'Every broad tread is carried by its alloy spar',
        ],
        [
          'tether-anchor-marker',
          'split-rail-clamp',
          'Every tether node is located on a structural saddle',
        ],
        [
          'tether-eye-neck',
          'split-rail-clamp',
          'Every tether neck reaches its rail saddle',
        ],
        [
          'open-tether-eye',
          'tether-eye-neck',
          'Every tether eye joins its support neck',
        ],
      ])
        joined(part(name), part(support), message);
    }
  });

  test(`${layout}: shoulder shoes are seated across their footprint and treads leave usable hull clearance`, (context) => {
    const { named, root, skin } = partsForLayout(layout);
    const backingSeparations = [],
      treadClearances = [];
    for (const route of ['main', 'lower']) {
      const mounts = root.userData.layout.mounts.filter(
        (m) => m.route === route,
      );
      for (const shoe of named(`exterior-eva-${route}-bonded-mount-foot`)) {
        const center = shoe.bounds.getCenter(new THREE.Vector3());
        const station = [...mounts].sort(
          (a, b) =>
            center.distanceToSquared(new THREE.Vector3(...a.skin)) -
            center.distanceToSquared(new THREE.Vector3(...b.skin)),
        )[0];
        const datum = new THREE.Vector3(...station.skin),
          outward = new THREE.Vector3(...station.normal);
        const positions = shoe.mesh.geometry.attributes.position,
          points = [];
        for (let i = 0; i < positions.count; i++)
          points.push(
            new THREE.Vector3()
              .fromBufferAttribute(positions, i)
              .applyMatrix4(shoe.mesh.matrixWorld),
          );
        const back = Math.min(
          ...points.map((p) => p.clone().sub(datum).dot(outward)),
        );
        const unique = new Map();
        for (const p of points)
          if (p.clone().sub(datum).dot(outward) < back + 0.002)
            unique.set(
              p
                .toArray()
                .map((v) => v.toFixed(6))
                .join(','),
              p,
            );
        const tangent = new THREE.Vector3().crossVectors(
          new THREE.Vector3(0, 0, 1),
          outward,
        );
        const vertices = [...unique.values()].sort(
          (a, b) => a.clone().sub(b).dot(tangent) || a.z - b.z,
        );
        const samples = [
          ...new Set(
            Array.from(
              { length: Math.min(8, vertices.length) },
              (_, i) =>
                vertices[
                  Math.round(
                    (i * (vertices.length - 1)) /
                      (Math.min(8, vertices.length) - 1),
                  )
                ],
            ),
          ),
        ];
        assert.ok(
          samples.length >= 4,
          'The real shoe supplies a broad backing surface',
        );
        // Inspect actual back-face vertices, including the ends of the long shoe.
        for (const point of samples) {
          const ray = new THREE.Raycaster(
            point.clone().addScaledVector(outward, 0.05),
            outward.clone().negate(),
            0,
            0.1,
          );
          const hit = ray.intersectObjects(skin, false)[0];
          assert.ok(
            hit,
            'Every sampled shoe-back point has actual pressure skin beneath it',
          );
          const separation = point.clone().sub(hit.point).dot(outward);
          backingSeparations.push(separation);
          assert.ok(
            separation <= 0.002 && separation >= -0.025,
            `Shoe backing must seat shallowly without floating at a curved shoulder (separation ${separation})`,
          );
        }
      }
      for (const tread of named(`exterior-eva-${route}-rung-grip-sleeve`)) {
        const center = tread.bounds.getCenter(new THREE.Vector3());
        const stations = root.userData.layout.routes.find(
          (r) => r.name === route,
        ).centerline;
        const station = [...stations].sort(
          (a, b) =>
            center.distanceToSquared(new THREE.Vector3(...a.p)) -
            center.distanceToSquared(new THREE.Vector3(...b.p)),
        )[0];
        const outward = new THREE.Vector3(...station.normal);
        const ray = new THREE.Raycaster(
          center.clone().addScaledVector(outward, 0.1),
          outward.clone().negate(),
          0,
          0.6,
        );
        const treadBack = ray.intersectObject(tread.mesh, false).at(-1),
          hull = ray.intersectObjects(skin, false)[0];
        assert.ok(
          treadBack && hull,
          'The real tread and hull faces are measurable',
        );
        const clearance = treadBack.point.clone().sub(hull.point).dot(outward);
        treadClearances.push(clearance);
        assert.ok(
          clearance > 0.12,
          `The broad tread leaves open hand/boot clearance above the pressure skin (${clearance})`,
        );
      }
    }
    context.diagnostic(
      JSON.stringify({
        shoeBackingSamples: backingSeparations.length,
        shoeBackingSeparation: [
          Math.min(...backingSeparations),
          Math.max(...backingSeparations),
        ],
        treadSamples: treadClearances.length,
        minimumTreadHullClearance: Math.min(...treadClearances),
      }),
    );
  });

  test(`${layout}: every tether eye retains a clear usable bore through its actual hardware`, () => {
    const { parts, root } = partsForLayout(layout),
      meshes = parts.map((p) => p.mesh),
      span = new THREE.Vector3(0, 0, 1);
    for (const route of root.userData.layout.routes)
      for (const eye of route.tetherEyes) {
        const center = new THREE.Vector3(...eye.center),
          axis = new THREE.Vector3(...eye.normal),
          across = new THREE.Vector3().crossVectors(axis, span).normalize();
        // A finite 0.07-wide central passage represents the clip opening. The old
        // neck ended at the ring center and blocked even the central axis.
        const offsets = [
          [0, 0],
          ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => [
            0.035 * Math.cos((i * Math.PI) / 4),
            0.035 * Math.sin((i * Math.PI) / 4),
          ]),
        ];
        for (const [u, v] of offsets) {
          const origin = center
            .clone()
            .addScaledVector(span, u)
            .addScaledVector(across, v)
            .addScaledVector(axis, 0.13);
          const hits = new THREE.Raycaster(
            origin,
            axis.clone().negate(),
            0,
            0.26,
          ).intersectObjects(meshes, false);
          assert.equal(
            hits.length,
            0,
            `The tether bore must not be occupied by its neck, rail, collar or ring (${hits[0]?.object.name})`,
          );
        }
      }
  });
}
