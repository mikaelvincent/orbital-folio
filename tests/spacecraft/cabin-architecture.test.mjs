import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PALETTE } from '../../lib/palette.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  CABIN_CEILING,
  CABIN_FLOOR,
  CABIN_HALF_WIDTH,
  CABIN_RETURN_RADIUS,
  PRESSURE_THROAT_START,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

const sections = ['projects', 'experience', 'about', 'contact'];
const sourceParts = new Map();
// Batching preserves the geometry but joins several fixtures into one mesh.
// Retain their real source transforms to check each lamp's physical attachment.
class SourceMesh extends THREE.Mesh {
  removeFromParent() {
    if (this.parent && !this.userData.parts)
      sourceParts.set(this, {
        mesh: this,
        parent: this.parent,
        matrix: this.matrix.clone(),
      });
    return super.removeFromParent();
  }
}
const model = createSpacecraft({ ...THREE, Mesh: SourceMesh });
const near = (actual, expected, message, tolerance = 2e-6) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, received ${actual}`,
  );

function lining(section) {
  const parts = [];
  model.group.traverseVisible((object) => {
    if (
      object.isMesh &&
      [object.name, ...(object.userData.parts || [])].some((name) =>
        name.startsWith(`${section}-continuous-pressure-skin-interior`),
      )
    )
      parts.push(object);
  });
  return parts;
}

function probeSurface(parts, point, inward, label) {
  const hits = new THREE.Raycaster(
    point.clone().addScaledVector(inward, 0.025),
    inward.clone().negate(),
    0,
    0.05,
  ).intersectObjects(parts, false);
  assert.ok(hits.length, `${label}: the pressure lining must remain closed`);
  assert.ok(
    hits[0].point.distanceTo(point) < 0.0007,
    `${label}: the finish must follow the pressure surface without a raised layer`,
  );
  assert.equal(
    (
      hits[0].object.material.userData.baseColor ||
      hits[0].object.material.color
    ).getHexString(),
    new THREE.Color(PALETTE.carbon).getHexString(),
    `${label}: the usable floor and its lower returns keep the dark finish`,
  );
  const normal = hits[0].normal
    .clone()
    .applyNormalMatrix(
      new THREE.Matrix3().getNormalMatrix(hits[0].object.matrixWorld),
    );
  assert.ok(normal.dot(inward) > 0.99, `${label}: smooth cove shading remains`);

  // A ray on a triangle edge can produce two hits on a single surface. Count
  // triangle interiors separately, and also reject distinct raised/back layers.
  const interiors = hits.filter((hit) => {
    const position = hit.object.geometry.getAttribute('position');
    const triangle = new THREE.Triangle(
      ...[hit.face.a, hit.face.b, hit.face.c].map((index) =>
        new THREE.Vector3()
          .fromBufferAttribute(position, index)
          .applyMatrix4(hit.object.matrixWorld),
      ),
    );
    const barycentric = triangle.getBarycoord(hit.point, new THREE.Vector3());
    return barycentric && Math.min(...barycentric.toArray()) > 1e-5;
  });
  assert.ok(interiors.length <= 1, `${label}: no coincident finish sheet`);
  assert.ok(
    hits.every((hit) => Math.abs(hit.distance - hits[0].distance) < 0.0001),
    `${label}: no separate floor plane above the original pressure skin`,
  );
}

function sourceBounds(section, name) {
  return [...sourceParts.values()]
    .filter(
      ({ mesh }) => mesh.userData.section === section && mesh.name === name,
    )
    .map(({ mesh, parent, matrix }) => {
      mesh.geometry.computeBoundingBox();
      return mesh.geometry.boundingBox
        .clone()
        .applyMatrix4(parent.matrixWorld.clone().multiply(matrix));
    });
}

for (const [layout, scale] of [
  ['wide', 1.4],
  ['compact', 1],
]) {
  test(`${layout}: the dark deck follows the original floor through the opening and rounded returns`, () => {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    for (const section of sections) {
      const parts = lining(section);
      const center = new THREE.Vector3(
        ...model.group.userData.roomAnchors[section],
      );
      center.z = 0;
      const label = `${layout}/${section}`;
      assert.ok(parts.length, `${label}: cabin lining exists`);
      for (const x of [-0.913, 0.173, 0.887])
        for (const z of [-0.431, 0.243, 0.811, PRESSURE_THROAT_START - 0.012])
          probeSurface(
            parts,
            center.clone().add(new THREE.Vector3(x * scale, CABIN_FLOOR, z)),
            new THREE.Vector3(0, 1, 0),
            `${label} floor at ${x}, ${z}`,
          );

      for (const side of [-1, 1])
        for (const angle of [0.17, 0.58, 1.07, 1.43])
          for (const z of [0.237, PRESSURE_THROAT_START - 0.017]) {
            const point = center
              .clone()
              .add(
                new THREE.Vector3(
                  side *
                    scale *
                    (CABIN_HALF_WIDTH -
                      CABIN_RETURN_RADIUS +
                      CABIN_RETURN_RADIUS * Math.sin(angle)),
                  CABIN_FLOOR + CABIN_RETURN_RADIUS * (1 - Math.cos(angle)),
                  z,
                ),
              );
            const normal = new THREE.Vector3(
              (-side * Math.sin(angle)) / scale,
              Math.cos(angle),
              0,
            ).normalize();
            probeSurface(
              parts,
              point,
              normal,
              `${label} side ${side} cove ${angle}`,
            );
          }

      // Established rear floor cove: quadratic from (.67, floor) through
      // (1.1, floor) to (1.1, -.61). Probe inside its dark lower portion.
      for (const t of [0.13, 0.23, 0.31]) {
        const rearZ = -(0.67 + 0.86 * t - 0.43 * t * t);
        const y = CABIN_FLOOR + (-0.61 - CABIN_FLOOR) * t * t;
        const normal = new THREE.Vector3(
          0,
          0.86 * (1 - t),
          2 * (-0.61 - CABIN_FLOOR) * t,
        ).normalize();
        probeSurface(
          parts,
          center.clone().add(new THREE.Vector3(0.173 * scale, y, rearZ)),
          normal,
          `${label} rear floor cove ${t}`,
        );
      }
    }
  });

  test(`${layout}: ceiling light cases seat to the ceiling and capture their diffusers`, () => {
    model.setLayout(layout);
    model.group.updateMatrixWorld(true);
    for (const section of sections) {
      const cases = sourceBounds(section, 'ceiling-light-bezel');
      const seals = sourceBounds(section, 'ceiling-light-seal');
      const diffusers = sourceBounds(section, 'warm-ceiling-light');
      assert.ok(cases.length > 0, `${section}: ceiling light cases exist`);
      assert.equal(
        diffusers.length,
        cases.length,
        `${section}: every case has a diffuser`,
      );
      const ceiling =
        model.group.userData.roomAnchors[section][1] + CABIN_CEILING;
      for (const diffuser of diffusers) {
        const center = diffuser.getCenter(new THREE.Vector3());
        const body = cases.find(
          (bounds) =>
            bounds.min.x < center.x &&
            bounds.max.x > center.x &&
            bounds.min.z < center.z &&
            bounds.max.z > center.z,
        );
        assert.ok(body, `${section}: the diffuser belongs to a physical case`);
        const seal = seals.find(
          (bounds) =>
            bounds.min.x < center.x &&
            bounds.max.x > center.x &&
            bounds.min.z < center.z &&
            bounds.max.z > center.z,
        );
        assert.ok(seal, `${section}: the case has a ceiling attachment`);
        near(seal.max.y, ceiling, `${section}: seal meets the actual ceiling`);
        assert.ok(
          body.max.y >= seal.min.y - 2e-6 && body.min.y < seal.min.y,
          `${section}: case seats into its ceiling seal without a gap`,
        );
        assert.ok(
          diffuser.max.y >= body.min.y - 2e-6 && diffuser.min.y < body.min.y,
          `${section}: diffuser seats into the case without the old air gap`,
        );
        for (const axis of ['x', 'z']) {
          assert.ok(
            diffuser.min[axis] > body.min[axis] &&
              diffuser.max[axis] < body.max[axis],
            `${section}: the diffuser is captured within both ${axis} edges`,
          );
          near(
            center[axis],
            body.getCenter(new THREE.Vector3())[axis],
            `${section}: diffuser centers on its case in ${axis}`,
          );
        }
      }
    }
  });
}
