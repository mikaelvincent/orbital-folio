import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { createSpacecraftPerformance } from '../lib/spacecraft-performance.ts';

const info = () => ({ calls: 0, triangles: 0, points: 0, lines: 0 });

test('Sustained recordings extend both timing and per-part count retention', () => {
  const { chair, renderer, profiler, render } = fixture();
  profiler.setWindowSize(14400);
  for (let i = 0; i < 2000; i++) {
    profiler.beginPass('spacecraft', renderer.info.render);
    render(chair, i < 1000 ? 1 : 3);
    profiler.endPass(renderer.info.render);
  }
  const full = profiler.snapshot().passes.spacecraft;
  assert.equal(full.samples, 2000);
  assert.equal(full.total.drawsPerPass, 2);
  profiler.setWindowSize(1000);
  const recent = profiler.snapshot().passes.spacecraft;
  assert.equal(recent.samples, 1000);
  assert.equal(recent.total.drawsPerPass, 3);
  assert.equal(full.samples, 2000);
  profiler.dispose();
});
function fixture(options = {}) {
  const root = new THREE.Group();
  const cabin = new THREE.Group();
  cabin.name = 'projects-assembly';
  cabin.userData.section = 'projects';
  root.add(cabin);
  const furniture = new THREE.Group();
  furniture.name = 'projects-workshop';
  cabin.add(furniture);
  const structure = new THREE.Group();
  structure.name = 'projects-pressure-structure';
  cabin.add(structure);
  const chair = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  chair.name = 'chair';
  furniture.add(chair);
  const wall = chair.clone();
  wall.name = 'wall';
  structure.add(wall);
  const renderer = { info: { render: info() } };
  const profiler = createSpacecraftPerformance(root, options);
  const render = (mesh, draws = 1, triangles = 12) => {
    if (!mesh.visible) return;
    mesh.onBeforeRender(
      renderer,
      root,
      null,
      mesh.geometry,
      mesh.material,
      null,
    );
    renderer.info.render.calls += draws;
    renderer.info.render.triangles += triangles;
    mesh.onAfterRender(
      renderer,
      root,
      null,
      mesh.geometry,
      mesh.material,
      null,
    );
  };
  return { root, chair, wall, renderer, profiler, render };
}

test('Per-part and room deltas count real draws while non-mesh pass work stays unattributed', () => {
  const { chair, wall, renderer, profiler, render } = fixture();
  profiler.beginPass('spacecraft', renderer.info.render);
  renderer.info.render.calls += 3; // Shadow draws have separate Three callbacks.
  renderer.info.render.triangles += 100;
  render(chair, 2, 24); // Double-sided rendering can submit two actual draws.
  render(wall);
  profiler.endPass(renderer.info.render);
  const report = profiler.snapshot().passes.spacecraft;
  assert.deepEqual(report.total, { drawsPerPass: 6, trianglesPerPass: 136 });
  assert.deepEqual(report.attributed, {
    drawsPerPass: 3,
    trianglesPerPass: 36,
  });
  assert.deepEqual(report.unattributed, {
    drawsPerPass: 3,
    trianglesPerPass: 100,
  });
  assert.equal(
    report.parts.find((part) => part.id === 'part:projects:furniture')
      .drawsPerPass,
    2,
  );
  assert.equal(
    report.rooms.find((room) => room.id === 'room:projects').drawsPerPass,
    3,
  );
  assert.equal(
    report.parts.reduce((sum, part) => sum + part.totalTriangles, 0),
    36,
  );
  render(chair, 99, 999);
  assert.equal(
    profiler.snapshot().passes.spacecraft.attributed.drawsPerPass,
    3,
    'draws outside a named pass are not collected',
  );
});

test('Callbacks preserve this, all arguments and original ordering, and restore on disposal', () => {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  root.add(mesh);
  const renderer = { info: { render: info() } };
  const args = [
    renderer,
    root,
    { camera: true },
    mesh.geometry,
    mesh.material,
    { start: 0 },
  ];
  let beforeCalls = 0,
    afterCalls = 0;
  const before = function (...actual) {
    assert.equal(this, mesh);
    assert.deepEqual(actual, args);
    beforeCalls += 1;
    renderer.info.render.calls += 2; // Original callback work is outside the mesh's own draw.
  };
  const after = function (...actual) {
    assert.equal(this, mesh);
    assert.deepEqual(actual, args);
    afterCalls += 1;
    renderer.info.render.calls += 3;
  };
  mesh.onBeforeRender = before;
  mesh.onAfterRender = after;
  const profiler = createSpacecraftPerformance(root);
  profiler.beginPass('ao-refresh', renderer.info.render);
  mesh.onBeforeRender(...args);
  renderer.info.render.calls += 1;
  renderer.info.render.triangles += 12;
  mesh.onAfterRender(...args);
  profiler.endPass(renderer.info.render);
  assert.equal(beforeCalls, 1);
  assert.equal(afterCalls, 1);
  assert.equal(
    profiler.snapshot().passes['ao-refresh'].attributed.drawsPerPass,
    1,
  );
  assert.equal(
    profiler.snapshot().passes['ao-refresh'].unattributed.drawsPerPass,
    5,
  );
  profiler.dispose();
  // Compare restored function identity without invoking either method.
  // oxlint-disable-next-line typescript/unbound-method
  assert.equal(mesh.onBeforeRender, before);
  // oxlint-disable-next-line typescript/unbound-method
  assert.equal(mesh.onAfterRender, after);
});

test('Rolling averages include zero for absent parts, remain bounded, and separate pass invocations', () => {
  const { chair, wall, renderer, profiler, render } = fixture({
    maxSamplesPerPass: 2,
  });
  for (let index = 0; index < 3; index += 1) {
    profiler.beginPass('spacecraft', renderer.info.render);
    if (index === 1) render(chair, 8, 96);
    render(wall);
    profiler.endPass(renderer.info.render);
  }
  profiler.beginPass('ao-refresh', renderer.info.render);
  render(chair, 1, 12);
  renderer.info.render.calls += 2;
  profiler.endPass(renderer.info.render);
  const report = profiler.snapshot();
  assert.equal(report.passes.spacecraft.samples, 2);
  assert.equal(
    report.passes.spacecraft.parts.find(
      (part) => part.id === 'part:projects:furniture',
    ).drawsPerPass,
    4,
  );
  assert.equal(report.passes['ao-refresh'].samples, 1);
  assert.equal(
    report.passes['ao-refresh'].parts.find(
      (part) => part.id === 'part:projects:furniture',
    ).drawsPerPass,
    1,
  );
  profiler.reset();
  assert.deepEqual(Object.keys(profiler.snapshot().passes), []);
  for (let index = 0; index < 10; index += 1) {
    profiler.beginPass(`pass-${index}`, renderer.info.render);
    profiler.endPass(renderer.info.render);
  }
  assert.equal(Object.keys(profiler.snapshot().passes).length, 8);
});

test('Filters change render-local visibility and never revive hidden variants', () => {
  const { chair, wall, profiler } = fixture();
  profiler.setFilter({ mode: 'hide', id: 'part:projects:furniture' });
  const restore = profiler.applyFilter();
  assert.equal(chair.visible, false);
  assert.equal(wall.visible, true);
  restore();
  restore();
  assert.equal(chair.visible, true);
  wall.visible = false;
  profiler.setFilter({ mode: 'only', id: 'part:projects:furniture' });
  const restoreOnly = profiler.applyFilter();
  assert.equal(chair.visible, true);
  assert.equal(wall.visible, false);
  restoreOnly();
  assert.equal(wall.visible, false);
  wall.visible = true;
  profiler.setFilter({ mode: 'hide', id: 'room:projects' });
  profiler.applyFilter();
  assert.equal(chair.visible, false);
  assert.equal(wall.visible, false);
  profiler.dispose();
  assert.equal(chair.visible, true);
  assert.equal(wall.visible, true);
});

test('Reset discards an incomplete draw and missing pass counters do not imply complete attribution', () => {
  const { root, chair, renderer, profiler, render } = fixture();
  profiler.beginPass('old', renderer.info.render);
  chair.onBeforeRender(
    renderer,
    root,
    null,
    chair.geometry,
    chair.material,
    null,
  );
  profiler.reset();
  profiler.beginPass('new');
  render(chair);
  profiler.endPass();
  const report = profiler.snapshot();
  assert.equal(report.passes.old, undefined);
  assert.equal(report.passes.new.attributed.drawsPerPass, 1);
  assert.equal(report.passes.new.unattributed, null);
  report.groups[0].label = 'mutated';
  report.batches[0].sourceParts.push('mutated');
  assert.notEqual(profiler.snapshot().groups[0].label, 'mutated');
  assert.equal(
    profiler.snapshot().batches[0].sourceParts.includes('mutated'),
    false,
  );
});

test('Real batched model retains semantic room, furniture, doors, utility and exterior groups without rebatching', () => {
  const model = createSpacecraft(THREE);
  let meshes = 0;
  model.group.traverse((object) => {
    if (object.isMesh) meshes += 1;
  });
  const profiler = createSpacecraftPerformance(model.group);
  const report = profiler.snapshot();
  const ids = new Set(report.groups.map((group) => group.id));
  for (const room of ['projects', 'experience', 'about', 'contact']) {
    for (const part of ['furniture', 'structure', 'utilities', 'doors']) {
      assert.equal(ids.has(`part:${room}:${part}`), true, `${room} ${part}`);
    }
  }
  for (const part of ['chassis', 'docking', 'service', 'solar']) {
    assert.equal(ids.has(`part:shared:${part}`), true, part);
  }
  assert.equal(report.batches.length, meshes);
  assert.equal(
    report.groups
      .filter((group) => group.kind === 'part')
      .reduce((sum, group) => sum + group.meshes, 0),
    meshes,
  );
  assert.ok(report.batches.some((batch) => batch.sourcePartsCount > 40));
  assert.ok(report.batches.every((batch) => batch.sourceParts.length <= 40));
  for (const hatch of model.group.userData.irisHatches) {
    hatch.traverse((object) => {
      if (!object.isMesh) return;
      const matching = report.batches.filter(
        (batch) => batch.name === object.name,
      );
      assert.ok(matching.length > 0);
      assert.ok(
        matching.every((batch) => batch.partId.endsWith(':doors')),
        object.name,
      );
    });
  }
  profiler.dispose();
});
