// Exact finite-triangle distance audit: vertex/face and edge/edge closest features,
// accelerated by triangle AABB trees. Positive Z separation rules out crossings.
import * as THREE from 'three';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { buildLadderEndcapEquipment } from '../../components/ladder-endcap-equipment.ts';
import { ladderOpeningOutline } from '../../components/ladder-opening-outline.ts';
import {
  LADDER_CENTER_Y as cy,
  LADDER_HEIGHT,
  LADDER_SHOULDER_RUN,
  LADDER_SHOULDER_RISE,
  LADDER_RIGHT_RADIUS,
} from '../../lib/spacecraft-wall-layout.ts';
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
  { navy: mat, metal: mat, amber: mat },
);
function trianglesFor(predicate, scale) {
  const list = [];
  root.traverse((o) => {
    if (!o.isMesh || !predicate(o)) return;
    const p = o.geometry.attributes.position,
      idx = o.geometry.index;
    for (let i = 0, n = idx?.count ?? p.count; i < n; i += 3) {
      const v = [0, 1, 2].map((j) =>
        new THREE.Vector3()
          .fromBufferAttribute(p, idx ? idx.getX(i + j) : i + j)
          .multiply(new THREE.Vector3(scale, 1, 1)),
      );
      const box = new THREE.Box3().setFromPoints(v);
      list.push({ v, box, name: o.name, triangle: new THREE.Triangle(...v) });
    }
  });
  return list;
}
function tree(tris) {
  const box = new THREE.Box3();
  for (const t of tris) box.union(t.box);
  if (tris.length <= 8) return { box, tris };
  const size = box.getSize(new THREE.Vector3()),
    axis =
      size.x > size.y && size.x > size.z ? 'x' : size.y > size.z ? 'y' : 'z';
  tris.sort(
    (a, b) =>
      a.box.min[axis] + a.box.max[axis] - b.box.min[axis] - b.box.max[axis],
  );
  const middle = Math.floor(tris.length / 2);
  return { box, a: tree(tris.slice(0, middle)), b: tree(tris.slice(middle)) };
}
function boxDistanceSq(a, b) {
  let d = 0;
  for (const axis of ['x', 'y', 'z'])
    d += Math.max(0, a.min[axis] - b.max[axis], b.min[axis] - a.max[axis]) ** 2;
  return d;
}
function segments(p1, q1, p2, q2) {
  const d1 = q1.clone().sub(p1),
    d2 = q2.clone().sub(p2),
    r = p1.clone().sub(p2),
    a = d1.lengthSq(),
    e = d2.lengthSq(),
    f = d2.dot(r);
  let s = 0,
    t = 0;
  if (a <= 1e-16 && e <= 1e-16) return [p1, p2];
  if (a <= 1e-16) t = THREE.MathUtils.clamp(f / e, 0, 1);
  else {
    const c = d1.dot(r);
    if (e <= 1e-16) s = THREE.MathUtils.clamp(-c / a, 0, 1);
    else {
      const b = d1.dot(d2),
        denom = a * e - b * b;
      if (denom !== 0) s = THREE.MathUtils.clamp((b * f - c * e) / denom, 0, 1);
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = THREE.MathUtils.clamp(-c / a, 0, 1);
      } else if (t > 1) {
        t = 1;
        s = THREE.MathUtils.clamp((b - c) / a, 0, 1);
      }
    }
  }
  return [p1.clone().addScaledVector(d1, s), p2.clone().addScaledVector(d2, t)];
}
function closest(as, bs) {
  const at = tree(as),
    bt = tree(bs);
  let best = Infinity,
    record,
    trianglePairs = 0;
  function consider(p, q, a, b) {
    const d = p.distanceToSquared(q);
    if (d < best) {
      best = d;
      record = { a: a.name, b: b.name, points: [p.toArray(), q.toArray()] };
    }
  }
  function visit(a, b) {
    if (boxDistanceSq(a.box, b.box) >= best) return;
    if (a.tris && b.tris) {
      for (const p of a.tris)
        for (const q of b.tris) {
          if (boxDistanceSq(p.box, q.box) >= best) continue;
          trianglePairs++;
          for (const v of p.v)
            consider(
              v,
              q.triangle.closestPointToPoint(v, new THREE.Vector3()),
              p,
              q,
            );
          for (const v of q.v)
            consider(
              p.triangle.closestPointToPoint(v, new THREE.Vector3()),
              v,
              p,
              q,
            );
          for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++) {
              const [x, y] = segments(
                p.v[i],
                p.v[(i + 1) % 3],
                q.v[j],
                q.v[(j + 1) % 3],
              );
              consider(x, y, p, q);
            }
        }
      return;
    }
    const pairs = a.tris
      ? [
          [a, b.a],
          [a, b.b],
        ]
      : b.tris
        ? [
            [a.a, b],
            [a.b, b],
          ]
        : [
            [a.a, b.a],
            [a.a, b.b],
            [a.b, b.a],
            [a.b, b.b],
          ];
    pairs.sort(
      (p, q) =>
        boxDistanceSq(p[0].box, p[1].box) - boxDistanceSq(q[0].box, q[1].box),
    );
    for (const [p, q] of pairs) visit(p, q);
  }
  visit(at, bt);
  return { distance: Math.sqrt(best), ...record, trianglePairs };
}
const results = [];
for (const [layout, scale] of [
  ['compact', 1],
  ['wide', 1.4],
])
  for (const side of [-1, 1]) {
    const onSide = (o) =>
      Math.sign(
        new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y - cy,
      ) === side;
    const grip = trianglesFor(
      (o) => onSide(o) && /handhold/.test(o.name),
      scale,
    );
    for (const [category, predicate] of Object.entries({
      reel: (n) => /tether|spool/.test(n) && !/carabiner|lead/.test(n),
      hook: (n) => /carabiner/.test(n) && !/lead/.test(n),
      lead: (n) => /safety-lead/.test(n),
    })) {
      const parts = trianglesFor((o) => onSide(o) && predicate(o.name), scale);
      const partBox = new THREE.Box3();
      for (const t of parts) partBox.union(t.box);
      const separatedZ = Math.min(
        ...grip.map((t) =>
          Math.max(partBox.min.z - t.box.max.z, t.box.min.z - partBox.max.z),
        ),
      );
      if (!(separatedZ > 0))
        throw new Error(
          'Intersection exclusion requires strictly separated depth bands',
        );
      results.push({
        layout,
        side,
        category,
        triangles: [parts.length, grip.length],
        separatedZ,
        ...closest(parts, grip),
      });
    }
  }
console.log(
  JSON.stringify(
    {
      method:
        'Minimum distance between rendered triangle surfaces; triangle AABB trees prune only pairs farther than the current known minimum. Every remaining pair evaluates all vertex/face and edge/edge features. Every equipment triangle has positive Z separation from every grab-bar triangle, ruling out intersections. Includes handhold shoes, alloy rail, thick grasp sleeve and amber collars. Coordinates use each layout X scale; common group translation/rotation cannot change distance.',
      sourceSha256: createHash('sha256')
        .update(
          fs.readFileSync(
            new URL(
              '../../components/ladder-endcap-equipment.ts',
              import.meta.url,
            ),
          ),
        )
        .digest('hex'),
      units:
        'scene units; visual clearance, not a certified engineering safety margin',
      results,
    },
    null,
    2,
  ),
);
