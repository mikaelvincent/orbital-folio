import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import { buildLadderEndcapEquipment } from '../../features/spacecraft/equipment/ladder-endcap-equipment.ts';
import { getServiceSpineRecesses } from '../../features/spacecraft/equipment/ladder-service-spine.ts';
import { ladderOpeningOutline } from '../../features/spacecraft/geometry/ladder-opening-outline.ts';
import {
  LADDER_CENTER_Y as cy,
  LADDER_HEIGHT,
  LADDER_SHOULDER_RUN,
  LADDER_SHOULDER_RISE,
  LADDER_RIGHT_RADIUS,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

test('Ladder grilles and generic covers give way to open transfer equipment and connected service fittings', () => {
  const model = createSpacecraft(THREE),
    names = [];
  model.group.traverse((o) => {
    if (o.isMesh && o.userData.section === 'walkway')
      names.push(...(o.userData.parts || [o.name]));
  });
  assert(
    !names.some((n) =>
      /vent-louvre|captured-airfoil|protected-intake|air-plenum|upper-vent|lower-vent/.test(
        n,
      ),
    ),
  );
  assert.equal(
    names.filter((n) => n === 'service-spine-tethered-coupling-dust-cap')
      .length,
    2,
  );
  assert.equal(
    names.filter((n) => /^ladder-end-.*(tether|spool|carabiner)/.test(n))
      .length,
    0,
  );
  assert.equal(
    names.filter((n) => n === 'ladder-end-curved-transfer-handhold').length,
    4,
  );
  assert.equal(
    names.filter((n) => n === 'service-spine-connected-service-coupling-hose')
      .length,
    2,
  );
  assert(
    !names.some((n) =>
      /sealed-junction-lid|solid-access-cover|sealed-utility-cover/.test(n),
    ),
  );
  const recesses = getServiceSpineRecesses(THREE);
  assert.equal(recesses.length, 5);
  assert.equal(recesses.filter((r) => r.kind === 'junction').length, 2);
  for (const r of recesses.filter((r) => r.kind === 'junction')) {
    const box = new THREE.Box2().setFromPoints(r.shape.getPoints(32)),
      size = box.getSize(new THREE.Vector2());
    assert(
      Math.abs(size.x - 0.31) < 1e-8 && Math.abs(size.y - 0.24) < 1e-8,
      'Service couplings retain the existing backed pocket dimensions',
    );
  }
});

test('Circular handhold mounting shoes seat on the actual pressure curve through their whole backing faces', () => {
  const contour = ladderOpeningOutline(new THREE.Shape(), {
    width: 1.33,
    height: LADDER_HEIGHT,
    leftWidth: LADDER_SHOULDER_RUN,
    leftHeight: LADDER_SHOULDER_RISE,
    rightRadius: LADDER_RIGHT_RADIUS,
    rightEdge: 0.69,
  })
    .getPoints(64)
    .map((p) => p.add(new THREE.Vector2(0, cy)));
  const edge = (x, side) => {
    let y = side > 0 ? -Infinity : Infinity;
    for (let j = 0; j < contour.length; j++) {
      const a = contour[j],
        b = contour[(j + 1) % contour.length];
      if (
        Math.abs(a.x - b.x) < 1e-10 ||
        x < Math.min(a.x, b.x) ||
        x > Math.max(a.x, b.x)
      )
        continue;
      const q = a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
      y = side > 0 ? Math.max(y, q) : Math.min(y, q);
    }
    return y;
  };
  const root = new THREE.Group(),
    mat = new THREE.MeshStandardMaterial();
  buildLadderEndcapEquipment(
    THREE,
    {
      mesh(g, m, p, n) {
        const o = new THREE.Mesh(g, m);
        o.name = n;
        p.add(o);
        return o;
      },
    },
    root,
    contour,
    cy,
    { navy: mat, liner: mat, metal: mat, amber: mat },
  );
  let samples = 0,
    grips = 0,
    straightGrasps = 0;
  const distanceToLiner = (point) => {
    let distance = Infinity;
    for (let j = 0; j < contour.length; j++) {
      const a = contour[j],
        b = contour[(j + 1) % contour.length];
      const ab = b.clone().sub(a);
      if (ab.lengthSq() < 1e-12) continue;
      const t = Math.max(
        0,
        Math.min(
          1,
          new THREE.Vector2(point.x, point.y).sub(a).dot(ab) / ab.lengthSq(),
        ),
      );
      distance = Math.min(
        distance,
        new THREE.Vector2(point.x, point.y).distanceTo(
          a.clone().addScaledVector(ab, t),
        ),
      );
    }
    return distance;
  };
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === 'ladder-end-curved-transfer-handhold') {
      const path = o.geometry.parameters.path;
      const radius = o.geometry.parameters.radius;
      for (const t of [0.3, 0.4, 0.5, 0.6, 0.7])
        assert(
          distanceToLiner(path.getPointAt(t)) - radius > 0.065,
          'A real hand opening remains behind the middle of every grip',
        );
      for (const t of [0, 1])
        assert(
          distanceToLiner(path.getPointAt(t)) < 0.03,
          'Both ends return into their wall-mounted shoes',
        );
      if (path.getPointAt(0.5).z < 0) {
        const side = Math.sign(path.getPointAt(0.5).y - cy);
        const railTip = new THREE.Vector3(0.15, cy + side * 2.286, -0.69);
        const reach = Math.min(
          ...Array.from({ length: 41 }, (_, i) =>
            path.getPointAt(i / 40).distanceTo(railTip),
          ),
        );
        assert(
          reach < 0.63,
          'The first transfer grip remains within the nearby ladder-end reach',
        );
      }
      grips++;
    }
    if (o.name === 'ladder-end-rigid-handhold-grasp') {
      const path = o.geometry.parameters.path;
      const start = path.getPointAt(0),
        end = path.getPointAt(1);
      const line = new THREE.Line3(start, end);
      for (const t of [0.2, 0.4, 0.6, 0.8]) {
        const point = path.getPointAt(t);
        assert(
          point.distanceTo(
            line.closestPointToPoint(point, true, new THREE.Vector3()),
          ) < 1e-7,
          'The principal grasp is a rigid straight section, not an S-shaped hose',
        );
      }
      assert(
        o.geometry.parameters.radius > 0.035,
        'The grasp has a visible substantial sleeve',
      );
      straightGrasps++;
    }
    if (o.name !== 'ladder-end-liner-seated-handhold-shoe') return;
    const geometry = o.geometry.toNonIndexed(),
      p = geometry.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(p, i),
        b = new THREE.Vector3().fromBufferAttribute(p, i + 1),
        c = new THREE.Vector3().fromBufferAttribute(p, i + 2),
        n = b.clone().sub(a).cross(c.clone().sub(a)),
        side = Math.sign(a.y - cy);
      if (n.y * side <= 0) continue;
      const q = a.clone().add(b).add(c).divideScalar(3),
        gap = side * (edge(q.x, side) - q.y);
      assert(
        gap >= -0.0022 && gap <= 0.00001,
        'Every backing triangle seats on the curved liner, including the face interior',
      );
      samples++;
    }
    geometry.dispose();
  });
  assert.equal(grips, 4, 'Two open transfer grips at each end');
  assert.equal(straightGrasps, 4);
  assert(
    samples >= 1000,
    'Probe all eight small mounted faces, not only their corners',
  );
});
