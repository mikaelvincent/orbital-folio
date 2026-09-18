import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Matrix4, PerspectiveCamera, Quaternion, Euler, Vector3 } from 'three';

const bundled = await build({
  entryPoints: ['features/portfolio/contact-scroll-area.tsx'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const { projectedScrollFraction } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);

test('scroll thumb follows the pointer through independently projected scale, tilt and portrait roll', () => {
  const camera = new PerspectiveCamera(50, 1.8, 0.1, 100);
  camera.position.z = 6;
  camera.updateMatrixWorld();
  for (const rotation of [
    [0, 0, 0],
    [0.7, -0.35, 0.08],
    [-0.5, 0.2, Math.PI / 2],
  ]) {
    for (const scale of [0.5, 1, 2]) {
      const matrix = new Matrix4().compose(
        new Vector3(0.7, -0.3, 0),
        new Quaternion().setFromEuler(new Euler(...rotation)),
        new Vector3(scale, scale, scale),
      );
      const screenPoint = (fraction) => {
        const point = new Vector3(0.8, 1 - fraction * 2, 0)
          .applyMatrix4(matrix)
          .project(camera);
        return { x: (point.x + 1) * 640, y: (1 - point.y) * 360 };
      };
      const anchors = [0, 0.5, 1].map(screenPoint);
      for (const fraction of [0, 0.1, 0.25, 0.5, 0.8, 0.99, 1]) {
        assert.ok(
          Math.abs(
            projectedScrollFraction(anchors, screenPoint(fraction)) - fraction,
          ) < 1e-10,
        );
      }
      assert.equal(projectedScrollFraction(anchors, screenPoint(-0.1)), 0);
      assert.equal(projectedScrollFraction(anchors, screenPoint(1.1)), 1);
    }
  }
});

test('collapsed or temporarily unmeasurable rails produce a safe finite origin', () => {
  const origin = { x: 10, y: 20 };
  assert.equal(
    projectedScrollFraction([origin, origin, origin], { x: 100, y: 100 }),
    0,
  );
});
