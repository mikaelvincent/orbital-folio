import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildIrisHatch } from '../components/iris-hatch.ts';

function build(radius = 0.92) {
  const materials = {
    bladeMaterial: new THREE.MeshStandardMaterial({ color: 0xd5cebb }),
    rimMaterial: new THREE.MeshStandardMaterial({ color: 0x263140 }),
    accentMaterial: new THREE.MeshStandardMaterial({ color: 0xffb035 }),
  };
  return { hatch: buildIrisHatch(THREE, { radius, ...materials }), materials };
}
function dispose(hatch, materials) {
  const geometries = new Set();
  hatch.group.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
  });
  geometries.forEach((g) => g.dispose());
  new Set([...Object.values(materials), ...hatch.materials]).forEach((m) =>
    m.dispose(),
  );
}

test('Closed iris covers the entire aperture from both sides, including its center', () => {
  const { hatch, materials } = build();
  const ray = new THREE.Raycaster();
  for (const direction of [-1, 1]) {
    for (let angle = 0; angle < 72; angle++) {
      for (let ring = 0; ring < 32; ring++) {
        const a = (angle / 72) * Math.PI * 2;
        const r = (ring / 32) * hatch.apertureRadius;
        ray.set(
          new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, -direction * 2),
          new THREE.Vector3(0, 0, direction),
        );
        assert.ok(
          ray.intersectObjects(hatch.leaves).length > 0,
          `No uncovered seal at radius ${r}, angle ${a}, side ${direction}`,
        );
      }
    }
  }
  dispose(hatch, materials);
});

test('Every fully retracted rigid blade clears the circular passage geometrically', () => {
  const edgeDistance = (a, b) => {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(1, -(a.x * dx + a.y * dy) / (dx * dx + dy * dy || 1)),
    );
    return Math.hypot(a.x + t * dx, a.y + t * dy);
  };
  for (const radius of [0.6, 0.92, 1.2]) {
    const { hatch, materials } = build(radius);
    hatch.setOpen(1);
    hatch.leaves.forEach((leaf, index) => {
      const vertices = leaf.geometry.attributes.position;
      const points = [
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ];
      for (let i = 0; i < vertices.count; i += 3) {
        points.forEach((p, j) =>
          p.fromBufferAttribute(vertices, i + j).applyMatrix4(leaf.matrixWorld),
        );
        const [a, b, c] = points;
        const cross = (u, v) => u.x * v.y - u.y * v.x;
        const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        const signs = [cross(a, b), cross(b, c), cross(c, a)];
        assert.ok(
          Math.abs(area) < 1e-12 ||
            !(signs.every((v) => v >= 0) || signs.every((v) => v <= 0)),
          `Triangle in blade ${index} must not contain the aperture center`,
        );
        // For a triangle not containing the center, its exact nearest point is
        // on an edge. This verifies every solid triangle, including storage wings.
        assert.ok(
          Math.min(edgeDistance(a, b), edgeDistance(b, c), edgeDistance(c, a)) >
            radius,
          `Blade ${index} must fully clear the circular passage`,
        );
      }
    });
    dispose(hatch, materials);
  }
});

test('Iris updates preserve geometry, scale, depth order, and six-fold rigid symmetry', () => {
  const { hatch, materials } = build();
  const geometry = hatch.leaves[0].geometry;
  const originalPositions = geometry.attributes.position.array.slice();
  const originalDepths = hatch.blades.map((b) => b.position.z);
  for (let step = 0; step <= 100; step++) {
    const p = step / 100;
    hatch.setOpen(p);
    hatch.blades.forEach((blade, index) => {
      assert.deepEqual(blade.scale.toArray(), [1, 1, 1]);
      assert.equal(blade.position.z, originalDepths[index]);
      assert.ok(
        Math.abs(
          blade.position.lengthSq() -
            blade.position.z ** 2 -
            (0.92 * (-0.006 + p * 1.061)) ** 2,
        ) < 1e-10,
      );
      assert.ok(
        Math.abs(blade.rotation.z - (index * Math.PI) / 3 + p * 0.58) < 1e-12,
      );
      assert.equal(hatch.leaves[index].geometry, geometry);
      assert.equal(hatch.leaves[index].castShadow, false);
    });
  }
  assert.deepEqual(geometry.attributes.position.array, originalPositions);
  assert.equal(hatch.group.userData.animated, true);
  hatch.setOpen(2);
  assert.equal(hatch.group.userData.openProgress, 1);
  hatch.setOpen(-1);
  assert.equal(hatch.group.userData.openProgress, 0);
  dispose(hatch, materials);
});

test('The wall aperture mask stays in hatch coordinates and does not mutate shared room materials', () => {
  const { hatch, materials } = build();
  const shader = {
    uniforms: {},
    vertexShader: '#include <project_vertex>',
    fragmentShader: '#include <clipping_planes_fragment>',
  };
  hatch.materials[0].onBeforeCompile(shader, null);
  assert.match(shader.vertexShader, /irisWorldToLocal \* modelMatrix/);
  assert.match(shader.fragmentShader, /discard;/);
  assert.equal(shader.uniforms.irisApertureRadius.value, 0.923);
  assert.notEqual(hatch.materials[0], materials.bladeMaterial);
  assert.equal(materials.bladeMaterial.userData.irisApertureMasked, undefined);
  hatch.group.position.set(2, -1, 0.3);
  hatch.group.rotation.set(0.1, 0.5, 0.7);
  hatch.group.updateMatrixWorld(true);
  hatch.leaves[0].onBeforeRender();
  const backToLocal = new THREE.Vector3(0.5, 0.25, 0)
    .applyMatrix4(hatch.group.matrixWorld)
    .applyMatrix4(shader.uniforms.irisWorldToLocal.value);
  assert.ok(backToLocal.distanceTo(new THREE.Vector3(0.5, 0.25, 0)) < 1e-12);
  dispose(hatch, materials);
});

test('Intermediate openings stay a single central component with a sealed outer circumference', () => {
  const { hatch, materials } = build();
  const ray = new THREE.Raycaster();
  const direction = new THREE.Vector3(0, 0, -1);
  const n = 71;
  let previousEmpty = 0;
  for (const progress of [0.1, 0.25, 0.5, 0.75, 0.9]) {
    hatch.setOpen(progress);
    const empty = new Set();
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const px = ((x / (n - 1)) * 2 - 1) * hatch.apertureRadius;
        const py = ((y / (n - 1)) * 2 - 1) * hatch.apertureRadius;
        if (px * px + py * py > hatch.apertureRadius ** 2) continue;
        ray.set(new THREE.Vector3(px, py, 2), direction);
        if (!ray.intersectObjects(hatch.leaves).length) empty.add(y * n + x);
      }
    const center = Math.floor(n / 2) * n + Math.floor(n / 2);
    assert.ok(
      empty.has(center),
      `Opening must start in the center at ${progress}`,
    );
    const seen = new Set([center]);
    const queue = [center];
    while (queue.length) {
      const v = queue.pop();
      for (const next of [v - 1, v + 1, v - n, v + n]) {
        if (empty.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    assert.equal(
      seen.size,
      empty.size,
      `No detached outer holes at ${progress}`,
    );
    assert.ok(
      empty.size > previousEmpty,
      'The central aperture grows monotonically',
    );
    previousEmpty = empty.size;
    for (let a = 0; a < 360; a++) {
      const angle = (a * Math.PI) / 180;
      const r = hatch.apertureRadius - 0.001;
      ray.set(
        new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 2),
        direction,
      );
      assert.ok(
        ray.intersectObjects(hatch.leaves).length,
        `Outer circumference remains covered at ${progress}, angle ${a}`,
      );
    }
  }
  dispose(hatch, materials);
});

test('Closed overlapping leaves remain sealed at the strongly oblique room-view angles', () => {
  const { hatch, materials } = build();
  const ray = new THREE.Raycaster();
  for (const angle of [75, 80])
    for (const side of [-1, 1]) {
      const radians = (angle * Math.PI) / 180;
      const direction = new THREE.Vector3(
        Math.sin(radians),
        0,
        Math.cos(radians) * side,
      );
      for (let i = 0; i < 5000; i++) {
        const a = i * 2.399963229728653;
        const r = hatch.apertureRadius * 0.8 * Math.sqrt((i + 0.5) / 5000);
        const point = new THREE.Vector3(
          Math.cos(a) * r,
          Math.sin(a) * r,
          -0.012,
        );
        ray.set(point.addScaledVector(direction, -2), direction);
        assert.ok(
          ray.intersectObjects(hatch.leaves).length,
          `Closed seal at ${angle} degrees, side ${side}, sample ${i}`,
        );
      }
    }
  dispose(hatch, materials);
});
