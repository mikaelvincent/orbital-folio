import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createModelPrimitives } from '../../features/spacecraft/geometry/model-primitives.ts';
import { buildCaseStudyArchive } from '../../features/spacecraft/rooms/case-study-archive.ts';

await test('The archive terminal has a 16:9 display, clears the rack and retains attached supports and cable', () => {
  const previous = globalThis.document;
  const canvasDocument = {
    createElement() {
      const context = new Proxy(
        { createLinearGradient: () => ({ addColorStop() {} }) },
        {
          get: (target, key) => target[key] ?? (() => {}),
        },
      );
      return { getContext: () => context };
    },
  };
  globalThis.document = canvasDocument;
  try {
    const root = new THREE.Group();
    root.userData.section = 'experience';
    const primitives = createModelPrimitives(THREE, root, undefined, {
      experience: [],
    });
    buildCaseStudyArchive(THREE, primitives, root);
    root.updateMatrixWorld(true);
    const body = root.getObjectByName('case-archive-terminal-solid-enclosure');
    const glass = root.getObjectByName('case-archive-terminal-screen');
    glass.geometry.computeBoundingBox();
    const size = glass.geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.x / size.y - 16 / 9) < 1e-6);
    const bodyBounds = new THREE.Box3().setFromObject(body);
    const bottomCartridge = root.getObjectByName('case-archive-cartridge-4');
    assert.ok(bodyBounds.min.y > 0, 'enclosure stays above the floor');
    assert.ok(
      bodyBounds.max.y < new THREE.Box3().setFromObject(bottomCartridge).min.y,
      'the monitor does not hide the lowest cartridge from a frontal room view',
    );
    const rods = [];
    root.traverse((part) => {
      if (/case-archive-terminal-(front|rear)-strut$/.test(part.name))
        rods.push(part);
    });
    assert.equal(rods.length, 4);
    for (const rod of rods) {
      rod.geometry.computeBoundingBox();
      const end = rod.localToWorld(
        new THREE.Vector3(0, rod.geometry.boundingBox.max.y, 0),
      );
      assert.ok(
        bodyBounds.distanceToPoint(end) < 0.008,
        'every supporting strut reaches the rear of the narrowed tilted enclosure',
      );
    }
    const cable = root.getObjectByName('case-archive-terminal-service-loom');
    const socket = cable.localToWorld(
      cable.geometry.parameters.path.getPoint(0),
    );
    assert.equal(
      bodyBounds.containsPoint(socket),
      true,
      'the cable starts inside its enclosure',
    );
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});
