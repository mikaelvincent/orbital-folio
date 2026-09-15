import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { thinChassisOutline } from '../components/thin-chassis-outline.ts';

const model = createSpacecraft(THREE, { layout: 'wide' });
const depths = [-0.5, 0, 0.7];

function selectHull(layout, scale) {
  model.setLayout(layout);
  model.group.updateMatrixWorld(true);
  const meshes = [];
  model.group.traverseVisible((object) => {
    if (object.isMesh) meshes.push(object);
  });
  return {
    meshes,
    datums: thinChassisOutline(THREE, { scale, bevel: 0 }).datums,
  };
}

function probeExterior(meshes, point, outward, label, tolerance = 1e-5) {
  const ray = new THREE.Raycaster(
    point.clone().addScaledVector(outward, 0.4),
    outward.clone().negate(),
    0,
    0.7,
  );
  // The newly fitted roof/shoulder covers are intentionally outside the skin.
  // Inspect the underlying pressure structure while retaining every structural
  // and interior mesh, so an unintended sheet or divider still fails below.
  const pressureMeshes = meshes.filter((object) => {
    for (let owner = object; owner; owner = owner.parent)
      if (owner.userData.equipmentKind === 'sealed-exterior-access-panels')
        return false;
    return true;
  });
  const hits = ray.intersectObjects(pressureMeshes, false);
  const first = hits[0];
  assert.ok(first, `${label}: the outside must be closed`);
  assert.ok(
    first.point.distanceTo(point) < tolerance,
    `${label}: the pressure skin must follow its contour, without a protruding panel (${first.point.toArray().join(',')})`,
  );
  const material = Array.isArray(first.object.material)
    ? first.object.material[first.face.materialIndex]
    : first.object.material;
  assert.equal(
    material.name,
    'ceramic-hull',
    `${label}: an interior divider must not show through the exterior finish`,
  );
  assert.equal(
    material.side,
    THREE.FrontSide,
    `${label}: shell faces must be oriented toward space`,
  );

  // A ray on a shared triangle edge can hit the same skin twice. Count surface
  // owners, so those harmless edge hits do not hide overlapping separate walls.
  const exteriorOwners = new Set(
    hits
      .filter((hit) => Math.abs(hit.distance - first.distance) < 1e-5)
      .map((hit) => hit.object.uuid),
  );
  assert.equal(
    exteriorOwners.size,
    1,
    `${label}: exactly one wall owns the outer surface; coincident panels flicker`,
  );
  return first;
}

for (const [layout, scale] of [
  ['wide', 1.4],
  ['compact', 1],
]) {
  test(`${layout} exterior service housing stays behind the cabin sidewall`, () => {
    const { meshes, datums: d } = selectHull(layout, scale);
    const insideX = d.right - d.thickness;
    const hulls = meshes.filter((object) =>
      [object.name, ...(object.userData.parts || [])].includes(
        'aft-service-pressure-hull',
      ),
    );
    assert.ok(hulls.length > 0, 'Inspect the actual rendered service housing');
    for (const hull of hulls) {
      const positions = hull.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const point = new THREE.Vector3()
          .fromBufferAttribute(positions, i)
          .applyMatrix4(hull.matrixWorld);
        assert.ok(
          point.x >= insideX + 0.0049,
          'The housing must terminate within the wall, never inside a cabin',
        );
      }
    }
    // Cover both rooms beside the bus. The old circular hull crossed the
    // pressure wall here, even though exterior-only ray tests were passing.
    // Intentional wall-mounted equipment now occupies this area. Its cabin
    // containment is checked separately; these rays inspect the underlying skin.
    const wallAndHull = meshes.filter((object) => {
      for (let owner = object; owner; owner = owner.parent)
        if (owner.userData.equipmentKind) return false;
      return true;
    });
    for (const side of [-1, 1])
      for (const y of [0.25, 0.45, 0.7])
        for (const z of [-0.4, 0, 0.4, 0.65]) {
          const ray = new THREE.Raycaster(
            new THREE.Vector3(insideX - 0.25, side * y, z),
            new THREE.Vector3(1, 0, 0),
            0,
            0.3,
          );
          const hit = ray.intersectObjects(wallAndHull, false)[0];
          assert.ok(hit, 'The inner pressure wall must remain closed');
          assert.ok(
            Math.abs(hit.point.x - insideX) < 2e-6,
            `The cabin wall must be flat, without service-hull intrusion: ${hit.point.toArray().join(',')}`,
          );
        }
  });

  test(`${layout} exterior roof and keel keep one continuous hull finish across the cabin divider`, () => {
    const { meshes, datums: d } = selectHull(layout, scale);
    for (const side of [-1, 1]) {
      const y = side > 0 ? d.roof : d.keel;
      for (const x of [-0.2, 0, 0.2])
        for (const z of depths)
          probeExterior(
            meshes,
            new THREE.Vector3(x, y, z),
            new THREE.Vector3(0, side, 0),
            `${layout} ${side > 0 ? 'roof' : 'keel'} divider x=${x}, z=${z}`,
          );
    }
  });

  test(`${layout} right exterior corners follow the rounded room envelope without rectangular overhangs`, () => {
    const { meshes, datums: d } = selectHull(layout, scale);
    const rx = 0.35 * scale + d.thickness;
    const ry = 0.35 + d.thickness;
    for (const side of [-1, 1])
      for (const u of [0.15, 0.3, 0.5, 0.7, 0.85])
        for (const z of depths) {
          const point = new THREE.Vector3(
            d.right - rx * (1 - u) ** 2,
            (side > 0 ? d.roof : d.keel) - side * ry * u ** 2,
            z,
          );
          const outward = new THREE.Vector3(
            ry * u,
            side * rx * (1 - u),
            0,
          ).normalize();
          probeExterior(
            meshes,
            point,
            outward,
            `${layout} ${side > 0 ? 'upper' : 'lower'} right corner u=${u}, z=${z}`,
            // The rendered quadratic is tessellated; this still rejects the
            // prior square walls, whose corner overhangs were visibly large.
            1e-4,
          );
        }
  });

  test(`${layout} bow joins have one flat skin with no overlapping shoulder sheets`, () => {
    const { meshes, datums: d } = selectHull(layout, scale);
    for (const side of [-1, 1])
      for (const fraction of [0.15, 0.5, 0.85])
        for (const z of depths)
          probeExterior(
            meshes,
            new THREE.Vector3(
              d.stepStartX + (d.stepEndX - d.stepStartX) * fraction,
              side > 0 ? d.roof : d.keel,
              z,
            ),
            new THREE.Vector3(0, side, 0),
            `${layout} ${side > 0 ? 'upper' : 'lower'} bow join fraction=${fraction}, z=${z}`,
          );
  });

  test(`${layout} retained ladder dividers stop at the rear pressure wall`, () => {
    const { meshes, datums: d } = selectHull(layout, scale);
    const rearZ = -0.985 - d.thickness;
    const panels = meshes.filter((object) =>
      [object.name, ...(object.userData.parts || [])].some((name) =>
        /walkway-twin-open-room-wall-interior|walkway-(projects|about)-cabin-facing-wall/.test(
          name,
        ),
      ),
    );
    assert.equal(
      panels.length,
      3,
      'Both cabin faces and the ladder face exist',
    );
    for (const panel of panels) {
      const positions = panel.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const point = new THREE.Vector3()
          .fromBufferAttribute(positions, i)
          .applyMatrix4(panel.matrixWorld);
        assert.ok(
          point.z >= rearZ - 2e-6,
          `${layout} divider sheet protrudes behind the rear shell: ${point.toArray().join(',')}`,
        );
      }
    }
  });

  test(`${layout} rear bow patches meet the curved rear wall without overlapping it`, () => {
    const { meshes, datums: d } = selectHull(layout, scale);
    const closure = model.group.userData.chassis.exteriorClosures;
    const contour = closure.rearBowContour.map(
      (point) => new THREE.Vector2(...point),
    );
    const rearZ = closure.ladderRearZ;
    let samples = 0;
    for (let i = 0; i + 1 < contour.length; i++) {
      const a = contour[i];
      const b = contour[i + 1];
      const midpoint = a.clone().lerp(b, 0.373);
      const side = midpoint.y > d.ladderCenterY ? 1 : -1;
      const endY = closure.rearCrownY[side > 0 ? 1 : 0];
      const gap = side * (endY - midpoint.y);
      // Sample both sides of the curved join, above the equipment recesses.
      // The old coarse wedge chords intruded below this exact bow boundary.
      if (
        midpoint.x <= d.bowTangentX ||
        midpoint.x >= d.stepStartX ||
        gap < 0.0003 ||
        gap > 0.15
      )
        continue;
      for (const offset of [-0.00012, 0.00012]) {
        const point = new THREE.Vector3(
          midpoint.x,
          midpoint.y + side * offset,
          rearZ,
        );
        const ray = new THREE.Raycaster(
          point.clone().add(new THREE.Vector3(0, 0, -0.03)),
          new THREE.Vector3(0, 0, 1),
          0,
          0.06,
        );
        const hits = ray
          .intersectObjects(meshes, false)
          .filter((hit) => Math.abs(hit.point.z - rearZ) < 2e-6);
        assert.ok(
          hits.length,
          'The rear curved join must have no open slivers',
        );
        // Static batching merges separate patches into one mesh. Count
        // triangle interiors rather than mesh owners to catch that overlap.
        const interiorHits = hits.filter((hit) => {
          const positions = hit.object.geometry.getAttribute('position');
          const vertices = [hit.face.a, hit.face.b, hit.face.c].map((index) =>
            new THREE.Vector3()
              .fromBufferAttribute(positions, index)
              .applyMatrix4(hit.object.matrixWorld),
          );
          const barycentric = new THREE.Triangle(...vertices).getBarycoord(
            hit.point,
            new THREE.Vector3(),
          );
          return barycentric && Math.min(...barycentric.toArray()) > 1e-5;
        });
        assert.ok(
          interiorHits.length <= 1,
          `${layout} overlapping rear bow triangles at ${point.toArray().join(',')}`,
        );
        assert.equal(hits[0].object.material.name, 'ceramic-hull');
        samples++;
      }
    }
    assert.ok(samples > 50, 'Both curved rear joins are densely inspected');
  });
}
