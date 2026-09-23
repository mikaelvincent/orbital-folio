import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createModelPrimitives } from '../../features/spacecraft/geometry/model-primitives.ts';
import { buildProjectsWorkshop } from '../../features/spacecraft/rooms/projects-workshop.ts';

// Use production rounded geometry before static batching removes part names.
const floorRoot = new THREE.Group();
floorRoot.userData.section = 'projects';
const helpers = createModelPrimitives(THREE, floorRoot, undefined, {
  projects: [],
});
const workshop = buildProjectsWorkshop(THREE, helpers, floorRoot);
const part = (name) => floorRoot.getObjectByName(`projects-workshop-${name}`);
const bounds = (object) => new THREE.Box3().setFromObject(object);
const near = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-6, message);

test('Thin worktop remains seated on its apron and preserves the usable working plane', () => {
  floorRoot.updateMatrixWorld(true);
  const top = bounds(part('solid-worktop'));
  const seal = bounds(part('worktop-seal'));
  const apron = bounds(part('continuous-bench-apron'));
  near(top.max.y, 0.731, 'The established work height stays fixed');
  near(apron.min.y, 0.4985, 'The underbench clearance stays fixed');
  assert.ok(top.max.y - top.min.y < 0.03, 'The surface has a slim edge');
  assert.ok(seal.min.y <= apron.max.y + 1e-6, 'Gasket contacts the apron');
  assert.ok(seal.max.y >= top.min.y, 'Gasket supports the work surface');
  for (const axis of ['x', 'z']) {
    assert.ok(top.min[axis] > apron.min[axis]);
    assert.ok(top.max[axis] < apron.max[axis]);
    assert.ok(seal.min[axis] > top.min[axis]);
    assert.ok(seal.max[axis] < top.max[axis]);
  }
});

test('Both retained worktop clamps contact the surface while every monitor clears it', () => {
  floorRoot.updateMatrixWorld(true);
  const top = bounds(part('solid-worktop'));
  const clamps = [];
  floorRoot.traverse((object) => {
    if (object.name === 'projects-workshop-worktop-retaining-base')
      clamps.push(bounds(object));
  });
  assert.equal(clamps.length, 2);
  for (const clamp of clamps) {
    near(clamp.min.y, top.max.y, 'Retaining base sits on the working plane');
    for (const axis of ['x', 'z']) {
      assert.ok(clamp.min[axis] > top.min[axis]);
      assert.ok(clamp.max[axis] < top.max[axis]);
    }
  }
  for (const screen of workshop.screens)
    assert.ok(
      bounds(screen.root).min.y > top.max.y + 0.03,
      `${screen.category} retains space above the worktop`,
    );
});
