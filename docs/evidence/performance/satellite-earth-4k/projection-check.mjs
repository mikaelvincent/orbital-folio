/** Read-only analytic texture magnification check; no browser or GPU is used.
 * From the repository root:
 * node docs/evidence/performance/satellite-earth-4k/projection-check.mjs
 */
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import * as THREE from 'three';

const bundled = await build({
  entryPoints: [fileURLToPath(new URL('../../../../components/orbital-environment.ts', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const { createOrbitalEnvironment } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);
const environment = createOrbitalEnvironment(THREE, () => {}, {
  earthTexture: new THREE.Texture({ width: 4096, height: 2048, close() {} }),
});
await environment.ready;
const surface = environment.scene.getObjectByName('satellite-earth-surface');
const raycaster = new THREE.Raycaster();
const sphere = new THREE.Sphere();
const point = new THREE.Vector3();

try {
  for (const [width, height, dpr] of [[1280, 720, 2], [390, 844, 2]]) {
    environment.resize(width, height, dpr);
    environment.update(0, true, 0, 0);
    environment.scene.updateMatrixWorld(true);
    environment.camera.updateMatrixWorld(true);
    surface.getWorldPosition(sphere.center);
    sphere.radius = 180;

    const uvAt = (x, y) => {
      raycaster.setFromCamera(
        new THREE.Vector2(x / width * 2 - 1, 1 - y / height * 2),
        environment.camera,
      );
      if (!raycaster.ray.intersectSphere(sphere, point)) return null;
      const normal = surface.worldToLocal(point.clone()).normalize();
      // Constant offsets/signs from Three's UV convention do not affect density.
      return [Math.atan2(normal.z, normal.x) / (2 * Math.PI), Math.acos(normal.y) / Math.PI];
    };
    const samples = [];
    const rowMedians = {};
    for (let y = height * 0.78; y < height - 1; y += height * 0.02) {
      const row = [];
      for (let x = 1; x < width - 1; x += width / 60) {
        const a = uvAt(x, y);
        const b = uvAt(x + 1 / dpr, y);
        const c = uvAt(x, y + 1 / dpr);
        if (!a || !b || !c) continue;
        let duDx = b[0] - a[0];
        let duDy = c[0] - a[0];
        duDx -= Math.round(duDx);
        duDy -= Math.round(duDy);
        const dx = [duDx * 4096, (b[1] - a[1]) * 2048];
        const dy = [duDy * 4096, (c[1] - a[1]) * 2048];
        const aa = dx[0] ** 2 + dx[1] ** 2;
        const bb = dy[0] ** 2 + dy[1] ** 2;
        const ab = dx[0] * dy[0] + dx[1] * dy[1];
        const minor = Math.sqrt(Math.max(0,
          (aa + bb - Math.sqrt((aa - bb) ** 2 + 4 * ab * ab)) / 2,
        ));
        samples.push(minor);
        row.push(minor);
      }
      if (row.length) {
        row.sort((a, b) => a - b);
        rowMedians[(y / height).toFixed(2)] = row[Math.floor(row.length / 2)];
      }
    }
    samples.sort((a, b) => a - b);
    console.log(JSON.stringify({
      viewport: [width, height, dpr],
      activeSeconds: 0,
      earthPosition: sphere.center.toArray(),
      sampleCount: samples.length,
      fourKMinorTexelsPerPhysicalPixel: {
        p10: samples[Math.floor(samples.length * 0.1)],
        p50: samples[Math.floor(samples.length * 0.5)],
        p90: samples[Math.floor(samples.length * 0.9)],
      },
      rowMedians,
    }));
  }
} finally {
  environment.dispose();
}

for (const width of [2048, 4096, 8192, 16384]) {
  let bytes = 0;
  for (let w = width, h = width / 2; ; w = Math.max(1, w >> 1), h = Math.max(1, h >> 1)) {
    bytes += w * h * 4;
    if (w === 1 && h === 1) break;
  }
  console.log(JSON.stringify({ width, rgba8MipBytes: bytes, decimalMB: bytes / 1e6 }));
}
