import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createModelPrimitives } from '../../features/spacecraft/geometry/model-primitives.ts';
import { buildProjectsWorkshop } from '../../features/spacecraft/rooms/projects-workshop.ts';

await test('all four monitors draw gallery-consistent counts for public, preview and empty collections', () => {
  const previousDocument = globalThis.document;
  const canvasDocument = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      const text = [];
      const context = new Proxy(
        {
          fillText(value) {
            text.push(String(value));
          },
          createLinearGradient() {
            return { addColorStop() {} };
          },
          createRadialGradient() {
            return { addColorStop() {} };
          },
        },
        { get: (target, key) => target[key] ?? (() => {}) },
      );
      return { text, getContext: () => context };
    },
  };
  globalThis.document = canvasDocument;
  try {
    const root = new THREE.Group();
    root.userData.section = 'projects';
    const primitives = createModelPrimitives(THREE, root, undefined, {
      projects: [],
    });
    const publicProjects = [
      { categories: ['systems', 'systems', 'unsupported'] },
      { categories: ['systems', 'interfaces'] },
      { category: 'Experiments' },
      { categories: null },
    ];
    const workshop = buildProjectsWorkshop(THREE, primitives, root, {
      projects: publicProjects,
    });
    const drawnCounts = () =>
      Object.fromEntries(
        workshop.screens.map((screen) => {
          const text = screen.screen.material.map.image.text;
          assert.equal(text.at(-2), screen.label);
          return [screen.category, text.at(-1)];
        }),
      );
    assert.deepEqual(drawnCounts(), {
      all: '4',
      systems: '2',
      interfaces: '1',
      experiments: '0',
    });

    // The caller supplies the same published or authenticated preview records
    // used by the app. Draft metadata must not be separately filtered here.
    const privatePreview = [
      ...publicProjects,
      { categories: ['experiments'], status: 'draft' },
    ];
    workshop.setProjects(privatePreview);
    assert.deepEqual(drawnCounts(), {
      all: '5',
      systems: '2',
      interfaces: '1',
      experiments: '1',
    });
    workshop.setProjects([]);
    assert.deepEqual(drawnCounts(), {
      all: '0',
      systems: '0',
      interfaces: '0',
      experiments: '0',
    });
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
