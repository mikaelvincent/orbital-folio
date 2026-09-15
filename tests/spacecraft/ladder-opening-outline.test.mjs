import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ladderOpeningOutline } from '../../features/spacecraft/geometry/ladder-opening-outline.ts';
import {
  LADDER_CENTER_Y,
  LADDER_HEIGHT,
  LADDER_RIGHT_RADIUS,
  LADDER_SHOULDER_RISE,
  LADDER_SHOULDER_RUN,
  PRESSURE_FACE_BEVEL,
} from '../../features/spacecraft/geometry/spacecraft-wall-layout.ts';

function contour(scale, offset = 0) {
  return ladderOpeningOutline(new THREE.Shape(), {
    width: 1.33 * scale + 2 * offset,
    height: LADDER_HEIGHT + 2 * offset,
    leftWidth: LADDER_SHOULDER_RUN * scale + offset,
    leftHeight: LADDER_SHOULDER_RISE + offset,
    rightRadius: LADDER_RIGHT_RADIUS * scale + offset,
    rightRadiusY: LADDER_RIGHT_RADIUS + offset,
    rightEdge: 0.69 * scale + offset,
    centerY: LADDER_CENTER_Y,
  });
}

test('Rounded ladder openings retain their extents, symmetry and convex contour at both layout scales', () => {
  for (const scale of [1, 1.4]) {
    for (const offset of [-0.08, -0.01, 0, PRESSURE_FACE_BEVEL]) {
      const path = contour(scale, offset);
      const points = path.getPoints(64);
      const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9);
      near(Math.min(...points.map((p) => p.x)), -0.665 * scale - offset);
      near(Math.max(...points.map((p) => p.x)), 0.69 * scale + offset);
      near(
        Math.min(...points.map((p) => p.y)),
        LADDER_CENTER_Y - LADDER_HEIGHT / 2 - offset,
      );
      near(
        Math.max(...points.map((p) => p.y)),
        LADDER_CENTER_Y + LADDER_HEIGHT / 2 + offset,
      );
      assert.equal(THREE.ShapeUtils.isClockWise(points), false);
      for (const p of points)
        assert.ok(
          points.some(
            (q) =>
              Math.abs(p.x - q.x) < 1e-9 &&
              Math.abs(p.y + q.y - 2 * LADDER_CENTER_Y) < 1e-9,
          ),
          'Upper and lower curves must be exact reflections',
        );

      // A folded shoulder produces a negative turn before it becomes a visible
      // protruding wedge. Every turn in this closed, CCW convex contour is left.
      points.pop();
      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        const c = points[(i + 2) % points.length];
        const turn = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
        assert.ok(turn >= -1e-10, 'No inward folds at any shoulder');
      }
    }
  }
});

test('All ladder aperture joins are tangent, including the enlarged right corners', () => {
  for (const scale of [1, 1.4]) {
    const path = contour(scale);
    const curves = path.curves;
    assert.equal(curves.length, 8);
    assert.equal(curves.filter((curve) => curve.isCubicBezierCurve).length, 4);
    for (let i = 0; i < curves.length; i++) {
      const current = curves[i];
      const next = curves[(i + 1) % curves.length];
      assert.ok(current.getPoint(1).distanceTo(next.getPoint(0)) < 1e-9);
      assert.ok(
        current.getTangent(1).dot(next.getTangent(0)) > 0.999999,
        'Every straight-to-curve join is C1 continuous',
      );
    }
    // The rounded jamb remains substantial in both layouts, rather than a
    // numerically smooth but visually square bevel-sized corner.
    const lowerRight = curves[1];
    assert.ok(lowerRight.getPoint(1).y - lowerRight.getPoint(0).y >= 0.249);
    assert.ok(lowerRight.getPoint(1).x - lowerRight.getPoint(0).x >= 0.249);
  }
});
