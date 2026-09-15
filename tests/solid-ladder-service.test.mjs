import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { buildLadderEndcapEquipment } from '../components/ladder-endcap-equipment.ts';
import { getServiceSpineRecesses } from '../components/ladder-service-spine.ts';
import { ladderOpeningOutline } from '../components/ladder-opening-outline.ts';
import {
  LADDER_CENTER_Y as cy,
  LADDER_HEIGHT,
  LADDER_SHOULDER_RUN,
  LADDER_SHOULDER_RISE,
  LADDER_RIGHT_RADIUS,
} from '../lib/spacecraft-wall-layout.ts';

test('Every ladder grille is replaced by sealed equipment while existing service pocket geometry remains', () => {
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
    names.filter((n) => n === 'service-spine-sealed-junction-lid').length,
    2,
  );
  assert.equal(
    names.filter((n) => n === 'ladder-end-crown-solid-access-cover').length,
    2,
  );
  const recesses = getServiceSpineRecesses(THREE);
  assert.equal(recesses.length, 5);
  assert.equal(recesses.filter((r) => r.kind === 'junction').length, 2);
  for (const r of recesses.filter((r) => r.kind === 'junction')) {
    const box = new THREE.Box2().setFromPoints(r.shape.getPoints(32)),
      size = box.getSize(new THREE.Vector2());
    assert(
      Math.abs(size.x - 0.31) < 1e-8 && Math.abs(size.y - 0.24) < 1e-8,
      'Junction lids retain the existing closed pocket dimensions',
    );
  }
});

test('Crown panel backing faces follow the pressure curve between vertices instead of floating above it', () => {
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
    { navy: mat, liner: mat, metal: mat },
  );
  let samples = 0;
  root.traverse((o) => {
    if (!o.isMesh || o.name !== 'ladder-end-crown-seated-gasket') return;
    const p = o.geometry.attributes.position;
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
        gap >= -0.00201 && gap <= 0.00001,
        'Each backing triangle seats on the real wall, including face interiors',
      );
      samples++;
    }
  });
  assert(samples >= 300, 'Probe both broad mounted faces, not just corners');
});
