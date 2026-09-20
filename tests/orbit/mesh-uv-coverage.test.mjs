import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  clipTriangleUv,
  maximumSameLatitudeSpan,
  meshUvCoverage,
} from '../../scripts/benchmarks/mesh-uv-coverage.mjs';

void test('Homogeneous clipping retains exact boundary UVs and excludes triangles outside the frustum', () => {
  const polygon = clipTriangleUv([
    [-2, 0, 0, 1, 0, 0],
    [0, -0.5, 0, 1, 1, 0],
    [0, 0.5, 0, 1, 1, 1],
  ]);
  assert.equal(polygon.length, 4);
  assert.equal(Math.min(...polygon.map((v) => v[4])), 0.5);
  assert.equal(Math.max(...polygon.map((v) => v[4])), 1);
  assert.ok(polygon.every((p) => p[0] >= -p[3] && p[0] <= p[3]));
  assert.deepEqual(
    clipTriangleUv([
      [-3, 0, 0, 1, 0, 0],
      [-2, 1, 0, 1, 1, 0],
      [-2, -1, 0, 1, 1, 1],
    ]),
    [],
  );
});

void test('Shared-latitude repeat bound distinguishes a diagonal footprint from its longitude envelope', () => {
  const polygon = [
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0.2, 0],
    [0, 0, 0, 1, 1, 1],
    [0, 0, 0, 1, 0.8, 1],
  ];
  const coverage = maximumSameLatitudeSpan([polygon]);
  assert.ok(Math.abs(coverage.span - 0.2) < 1e-10);
});

void test('Mesh UV certificate contains raycast fragment coordinates under perspective, rotation and nonuniform framing', () => {
  const geometry = new THREE.SphereGeometry(1, 32, 20);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.rotation.set(0.4, 0.8, -0.2);
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 10);
  camera.position.set(0.4, 0.15, 2.7);
  camera.lookAt(0.2, -0.2, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  mesh.updateMatrixWorld(true);
  const coverage = meshUvCoverage(mesh, camera);
  assert.ok(coverage.visiblePolygons > 0);
  const ray = new THREE.Raycaster();
  let hits = 0;
  for (let y = 0; y <= 60; y++)
    for (let x = 0; x <= 80; x++) {
      ray.setFromCamera(new THREE.Vector2(x / 40 - 1, y / 30 - 1), camera);
      const hit = ray.intersectObject(mesh)[0];
      if (!hit) continue;
      hits++;
      assert.ok(
        hit.uv.x >= coverage.u[0] - 1e-10 && hit.uv.x <= coverage.u[1] + 1e-10,
      );
      assert.ok(
        hit.uv.y >= coverage.v[0] - 1e-10 && hit.uv.y <= coverage.v[1] + 1e-10,
      );
    }
  assert.ok(hits > 1000);
  geometry.dispose();
  mesh.material.dispose();
});

void test('Expanded frustum certificate contains neighboring camera poses, including newly exposed silhouette triangles', () => {
  const geometry = new THREE.SphereGeometry(1, 48, 32);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  mesh.rotation.set(0.15, 0.4, -0.3);
  const reference = new THREE.PerspectiveCamera(42, 1.3, 0.1, 10);
  reference.position.set(0.1, 0, 2.8);
  reference.lookAt(0, -0.4, 0);
  reference.updateMatrixWorld(true);
  const certificate = meshUvCoverage(mesh, reference, {
    positionTolerance: 0.05,
    angularTolerance: 0.08,
  });
  const axis = new THREE.Vector3(1, 0.5, 0.1).normalize();
  for (const t of [-1, -0.5, 0, 0.5, 1]) {
    const camera = reference.clone();
    camera.position.addScaledVector(
      new THREE.Vector3(0.2, 0.4, -0.5).normalize(),
      t * 0.049,
    );
    camera.quaternion.multiply(
      new THREE.Quaternion().setFromAxisAngle(axis, t * 0.079),
    );
    camera.updateMatrixWorld(true);
    const actual = meshUvCoverage(mesh, camera);
    for (const key of ['u', 'v']) {
      assert.ok(actual[key][0] >= certificate[key][0] - 1e-10);
      assert.ok(actual[key][1] <= certificate[key][1] + 1e-10);
    }
  }
  geometry.dispose();
  mesh.material.dispose();
});

void test('A wider portrait projection audits newly exposed texture rows rather than reusing the narrow-lens footprint', () => {
  const geometry = new THREE.SphereGeometry(1, 48, 32);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  const camera = new THREE.PerspectiveCamera(38, 390 / 844, 0.1, 10);
  camera.position.set(0, 0, 2);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const narrow = meshUvCoverage(mesh, camera);
  camera.fov = 73.384;
  camera.updateProjectionMatrix();
  const wide = meshUvCoverage(mesh, camera);
  assert.ok(wide.sourcePixelRows[0] < narrow.sourcePixelRows[0] - 100);
  assert.ok(wide.sourcePixelRows[1] > narrow.sourcePixelRows[1] + 100);
  geometry.dispose();
  mesh.material.dispose();
});
