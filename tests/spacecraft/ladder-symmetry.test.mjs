import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { thinChassisOutline } from '../../features/spacecraft/geometry/thin-chassis-outline.ts';
import {
  buildLadderServiceSpine,
  getServiceSpineRecesses,
} from '../../features/spacecraft/equipment/ladder-service-spine.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  LADDER_CENTER_Y,
  LADDER_CONTENT_OFFSET,
  LADDER_CONTENT_SCALE,
  PRESSURE_FACE_BEVEL,
  wallLayout,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

const near = (actual, expected, label, tolerance = 2e-6) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${label}: expected ${expected}, received ${actual}`,
  );

test('The actual bow outline meets the cabin roof and keel without either raised shoulder', () => {
  for (const scale of [1, 1.4]) {
    const { outer, ladderHole, datums } = thinChassisOutline(THREE, { scale });
    const layout = wallLayout(scale);
    const points = outer.getPoints(128);
    near(
      Math.max(...points.map((p) => p.y)),
      layout.roof - PRESSURE_FACE_BEVEL,
      'Upper envelope',
    );
    near(
      Math.min(...points.map((p) => p.y)),
      layout.keel + PRESSURE_FACE_BEVEL,
      'Lower envelope',
    );

    // Sample the constructed curves, rather than relying on the exported
    // shoulder datums: a misplaced Bezier control point must fail this check.
    for (const side of [-1, 1]) {
      const expectedY = side > 0 ? datums.roof : datums.keel;
      const join = points.filter(
        (p) =>
          p.x >= datums.stepStartX - 1e-8 &&
          p.x <= datums.stepEndX + 1e-8 &&
          side * (p.y - LADDER_CENTER_Y) > 2,
      );
      assert.ok(
        join.length >= 100,
        'The entire shoulder transition is sampled',
      );
      for (const point of join)
        near(point.y, expectedY, 'Flat bow-to-cabin join');
    }

    for (const [label, path] of [
      ['pressure envelope', outer],
      ['ladder opening', ladderHole],
    ]) {
      const sampled = path.getPoints(128);
      for (const point of sampled) {
        const mirrorY = 2 * LADDER_CENTER_Y - point.y;
        assert.ok(
          sampled.some(
            (p) =>
              Math.abs(p.x - point.x) < 1e-8 && Math.abs(p.y - mirrorY) < 1e-8,
          ),
          `${label} must be vertically mirrored at ${point.x},${point.y}`,
        );
      }
    }
  }
});

// Exercise the real equipment builder with plain geometry helpers so named
// fixtures remain individually inspectable before production material batching.
function buildInspectableSpine() {
  const parent = new THREE.Group();
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
    cylinder(radius, length, material, x, y, z, into, axis) {
      const object = mesh(
        new THREE.CylinderGeometry(radius, radius, length, 16),
        material,
        into,
      );
      if (axis === 'x') object.rotation.z = Math.PI / 2;
      if (axis === 'z') object.rotation.x = Math.PI / 2;
      object.position.set(x, y, z);
      return object;
    },
    rod(a, b, radius, material, into) {
      const start = new THREE.Vector3(...a),
        end = new THREE.Vector3(...b);
      const direction = end.clone().sub(start);
      const object = mesh(
        new THREE.CylinderGeometry(radius, radius, direction.length(), 16),
        material,
        into,
      );
      object.position.copy(start.add(end).multiplyScalar(0.5));
      object.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      );
      return object;
    },
    instances(geometry, material, transforms, into, name) {
      const object = new THREE.InstancedMesh(
        geometry,
        material,
        transforms.length,
      );
      object.name = name;
      for (const [i, { p, s = [1, 1, 1] }] of transforms.entries())
        object.setMatrixAt(
          i,
          new THREE.Matrix4().compose(
            new THREE.Vector3(...p),
            new THREE.Quaternion(),
            new THREE.Vector3(...s),
          ),
        );
      into.add(object);
      return object;
    },
    fixtureMaterial: (material) => material,
  };
  const spine = buildLadderServiceSpine(
    THREE,
    h,
    parent,
    getServiceSpineRecesses(THREE),
  );
  spine.scale.y = LADDER_CONTENT_SCALE;
  spine.position.y = LADDER_CONTENT_OFFSET;
  parent.updateMatrixWorld(true);
  return spine;
}

test('Ladder lights, end anchors, rail grips and rungs are mirrored after fitting into the bow', () => {
  const spine = buildInspectableSpine();
  const byName = (name) =>
    spine.children.filter((o) => o.name === `service-spine-${name}`);
  const bounds = (object) => new THREE.Box3().setFromObject(object);
  const reflectedPair = (a, b, label) => {
    const first = bounds(a),
      second = bounds(b);
    near(first.min.x, second.min.x, `${label} left edge`);
    near(first.max.x, second.max.x, `${label} right edge`);
    near(first.min.z, second.min.z, `${label} rear depth`);
    near(first.max.z, second.max.z, `${label} front depth`);
    near(
      first.min.y + second.max.y,
      2 * LADDER_CENTER_Y,
      `${label} mirrored ends`,
    );
    near(
      first.max.y + second.min.y,
      2 * LADDER_CENTER_Y,
      `${label} mirrored starts`,
    );
  };
  for (const name of [
    'terminal-light-bezel',
    'terminal-light-diffuser',
    'bay-worklight-housing',
    'bay-worklight-diffuser',
    'service-feed-end-junction',
    'service-feed-junction-cover',
    'junction-captive-retainer',
    'outer-service-feed',
    'service-feed-inner-termination',
    'service-feed-termination-cap',
  ]) {
    const pair = byName(name);
    assert.equal(pair.length, 2, `Exactly two ${name} fixtures`);
    reflectedPair(...pair, name);
    assert.equal(pair[0].material, pair[1].material, 'Matching fixture finish');
    if (name.endsWith('diffuser'))
      assert.ok(
        pair[0].material.emissiveIntensity > 0,
        'Both matching lenses are lit',
      );
  }
  reflectedPair(
    byName('upper-terminal-anchor')[0],
    byName('lower-terminal-anchor')[0],
    'Terminal anchor',
  );

  for (const name of [
    'satin-rung',
    'rail-anchor-plate',
    'uniform-grip-sleeve',
    'amber-joint-marker',
  ]) {
    const fixtures = byName(name);
    assert.ok(fixtures.length > 0);
    for (const object of fixtures) {
      const center = bounds(object).getCenter(new THREE.Vector3());
      const counterpart = fixtures.find((other) => {
        const p = bounds(other).getCenter(new THREE.Vector3());
        return (
          Math.abs(p.x - center.x) < 1e-6 &&
          Math.abs(p.z - center.z) < 1e-6 &&
          Math.abs(p.y + center.y - 2 * LADDER_CENTER_Y) < 1e-6
        );
      });
      assert.ok(counterpart, `Every ${name} has a reflected counterpart`);
      reflectedPair(object, counterpart, name);
    }
  }
  const rungYs = byName('satin-rung')
    .map((o) => o.getWorldPosition(new THREE.Vector3()).y)
    .sort((a, b) => a - b);
  assert.equal(rungYs.length, 13);
  for (let i = 1; i < rungYs.length; i++)
    near(
      rungYs[i] - rungYs[i - 1],
      0.38 * LADDER_CONTENT_SCALE,
      'Uniform rung spacing',
    );
  const rails = byName('continuous-rail');
  assert.equal(rails.length, 2);
  for (const rail of rails)
    near(
      bounds(rail).getCenter(new THREE.Vector3()).y,
      LADDER_CENTER_Y,
      'Centered full-height rail',
    );
});

test('The fitted ladder preserves the existing cabin anchors and usable room bounds in both layouts', () => {
  const model = createSpacecraft(THREE, { layout: 'wide' });
  for (const { layout, halfPitch, width, aperture } of [
    { layout: 'wide', halfPitch: 2.087, width: 4.62, aperture: 3.416 },
    { layout: 'compact', halfPitch: 1.515, width: 3.3, aperture: 2.44 },
  ]) {
    model.setLayout(layout);
    const data = model.group.userData;
    for (const [section, x, y] of [
      ['projects', -halfPitch, 1.4725],
      ['experience', halfPitch, 1.4725],
      ['about', -halfPitch, -1.4725],
      ['contact', halfPitch, -1.4725],
    ]) {
      [x, y, 0.16].forEach((value, axis) =>
        near(
          data.roomAnchors[section][axis],
          value,
          `${section} preserved anchor`,
        ),
      );
      [width, 3.25, 2.8].forEach((value, axis) =>
        near(data.roomBounds[section].size[axis], value, `${section} framing`),
      );
      [aperture, 2.775, 0.04].forEach((value, axis) =>
        near(
          data.innerApertureBounds[section].size[axis],
          value,
          `${section} clear aperture`,
        ),
      );
    }
    const spine = model.group.getObjectByName('engineering-service-spine');
    near(spine.scale.y, LADDER_CONTENT_SCALE, 'Production ladder fit scale');
    near(
      spine.position.y,
      LADDER_CONTENT_OFFSET,
      'Production ladder fit offset',
    );
  }
});
