import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createContactDisplaySurface } from '../../features/spacecraft/rooms/contact-display-surface.ts';

await test('Contact apertures reveal the glass and maintain a uniform border through all four corners', () => {
  for (const [width, height] of [
    [1.33, 1.01],
    [0.62, 0.77],
  ]) {
    const surface = createContactDisplaySurface(THREE, width, height);
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const frame = new THREE.Mesh(surface.frame, material);
    const glass = new THREE.Mesh(surface.glass, material);
    glass.position.z = surface.glassZ;
    glass.updateMatrixWorld();
    frame.updateMatrixWorld();
    const hit = (x, y) =>
      new THREE.Raycaster(
        new THREE.Vector3(x, y, 1),
        new THREE.Vector3(0, 0, -1),
      ).intersectObjects([frame, glass])[0]?.object;
    assert.equal(hit(0, 0), glass, 'no solid trim box obscures the display');
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        const cx = sx * (width / 2 - 0.035),
          cy = sy * (height / 2 - 0.035);
        for (let degrees = 0; degrees <= 90; degrees += 5) {
          const angle = (degrees * Math.PI) / 180;
          const at = (r) =>
            hit(cx + sx * r * Math.cos(angle), cy + sy * r * Math.sin(angle));
          assert.equal(at(0.032), glass, `glass visible at ${degrees}°`);
          // Sample the entire strip rather than only its axis-aligned bounds:
          // an undersized corner radius would fail these diagonal samples.
          for (const radius of [0.034, 0.041, 0.048])
            assert.equal(
              at(radius),
              frame,
              `continuous border at ${degrees}° / ${radius}`,
            );
          assert.equal(at(0.05), undefined, 'no protruding second trim layer');
        }
      }
    frame.geometry.computeBoundingBox();
    assert.ok(
      frame.geometry.boundingBox.min.z < 0.09,
      'frame seats into the enclosure front',
    );
    assert.ok(
      surface.glassZ < frame.geometry.boundingBox.max.z,
      'glass is recessed',
    );
    assert.ok(
      surface.interfaceZ > frame.geometry.boundingBox.max.z,
      'interaction plane clears trim',
    );
    const uv = glass.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      assert.ok(uv.getX(i) >= -1e-7 && uv.getX(i) <= 1 + 1e-7);
      assert.ok(uv.getY(i) >= -1e-7 && uv.getY(i) <= 1 + 1e-7);
    }
  }
});
