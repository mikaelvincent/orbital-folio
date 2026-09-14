import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../components/spacecraft-model.ts';
import { updateRenderSceneMatrices } from '../lib/scene-matrices.ts';

const nodes = (root) => {
  const result = [];
  root.traverse((object) => result.push(object));
  return result;
};

function fixture(manual) {
  const model = createSpacecraft(THREE);
  const scene = new THREE.Scene();
  const light = new THREE.DirectionalLight();
  light.position.set(-7, 10, 12);
  scene.add(model.group, light);
  scene.matrixWorldAutoUpdate = !manual;
  const objects = nodes(scene);
  let compositions = 0;
  for (const object of objects) {
    const update = object.updateMatrix;
    object.updateMatrix = function () {
      compositions++;
      return update.call(this);
    };
  }
  return { model, scene, objects, compositions: () => compositions };
}

function frame(fixture, number, state, manual) {
  const { scene, model } = fixture;
  // The production scene root is identity. Exercise a transformed root too so
  // future scene composition cannot accidentally leave its descendants stale.
  scene.position.x = Math.sin(number / 37) * 0.4;
  scene.rotation.y = number / 800;
  model.group.rotation.z = number / 170;
  model.update(number / 60, state.activeRoom, false, state, manual);
  for (const anchor of Object.values(model.readerSurfaces))
    anchor.parent.scale.y *= 1.12;
  if (manual) updateRenderSceneMatrices(scene);
  else model.group.updateMatrixWorld(true);
  // Same update policy used by Three's renderer for both the main and AO pass.
  for (let pass = 0; pass < 2; pass++) {
    if (scene.matrixWorldAutoUpdate) scene.updateMatrixWorld();
    for (const hatch of model.group.userData.irisHatches)
      hatch.userData.setOcclusionPass(pass === 0);
  }
}

test('One scene synchronization preserves every animated transform, reader surface, light and door pick', () => {
  const baseline = fixture(false);
  const optimized = fixture(true);
  assert.equal(baseline.objects.length, optimized.objects.length);
  const states = [
    { activeRoom: 'home', hoveredPortal: null, reading: false },
    { activeRoom: 'projects', hoveredPortal: 'projects:experience' },
    {
      activeRoom: 'projects',
      travelling: true,
      transitRoom: 'projects',
      hoveredPortal: null,
      openPortalIds: ['projects:about'],
    },
    {
      activeRoom: 'about',
      travelling: true,
      transitRoom: null,
      transitWalkway: true,
      openPortalIds: ['about:projects'],
    },
    {
      activeRoom: 'contact',
      travelling: false,
      transitWalkway: false,
      openPortalIds: [],
      hoveredObject: 'contact-social-left',
    },
    { activeRoom: 'contact', reading: true, hoveredObject: null },
    { activeRoom: 'contact', reading: false },
  ];
  let number = 0;
  for (const state of states)
    for (let index = 0; index < 14; index++) {
      number++;
      frame(baseline, number, { delta: 1 / 60, ...state }, false);
      frame(optimized, number, { delta: 1 / 60, ...state }, true);
      for (let i = 0; i < baseline.objects.length; i++) {
        const before = baseline.objects[i],
          after = optimized.objects[i];
        assert.deepEqual(
          after.matrixWorld.elements,
          before.matrixWorld.elements,
          `${before.name || before.type}: same world transform on frame ${number}`,
        );
        assert.equal(after.visible, before.visible);
      }
      assert.deepEqual(
        optimized.model.group.userData.portals.map((p) => [
          p.id,
          p.openProgress,
          p.highlight,
        ]),
        baseline.model.group.userData.portals.map((p) => [
          p.id,
          p.openProgress,
          p.highlight,
        ]),
      );
    }
  for (let i = 0; i < baseline.model.portalTargets.length; i++) {
    const before = baseline.model.portalTargets[i].object;
    const after = optimized.model.portalTargets[i].object;
    before.geometry.computeBoundingBox();
    const center = before.geometry.boundingBox
      .getCenter(new THREE.Vector3())
      .applyMatrix4(before.matrixWorld);
    const direction = new THREE.Vector3(-1, 0, 0).transformDirection(
      before.matrixWorld,
    );
    const ray = new THREE.Raycaster(
      center.clone().addScaledVector(direction, -3),
      direction,
    );
    const oldHits = ray.intersectObject(before, false);
    const newHits = ray.intersectObject(after, false);
    assert.ok(oldHits.length > 0, 'Door picking fixture must hit its target');
    assert.deepEqual(
      newHits.map((hit) => hit.distance),
      oldHits.map((hit) => hit.distance),
    );
  }
  assert.ok(
    optimized.compositions() < baseline.compositions() * 0.5,
    `Per-frame composition work should be removed: ${optimized.compositions()} vs ${baseline.compositions()}`,
  );
});

test('Scene synchronization restores ownership flags even if a consumer throws', () => {
  const scene = new THREE.Scene();
  scene.matrixWorldAutoUpdate = false;
  scene.position.set(3, 2, 1);
  updateRenderSceneMatrices(scene);
  assert.deepEqual(
    new THREE.Vector3().setFromMatrixPosition(scene.matrixWorld).toArray(),
    [3, 2, 1],
  );
  assert.equal(scene.matrixWorldAutoUpdate, false);
  scene.updateMatrixWorld = () => {
    throw new Error('consumer failed');
  };
  assert.throws(() => updateRenderSceneMatrices(scene), /consumer failed/);
  assert.equal(scene.matrixWorldAutoUpdate, false);
});

test('Standalone model updates still immediately synchronize world matrices by default', () => {
  const model = createSpacecraft(THREE);
  const anchor = Object.values(model.readerSurfaces)[0];
  model.group.rotation.z = Math.PI / 2;
  model.update(1, 'projects', true, { activeRoom: 'projects' });
  const snapshot = anchor.matrixWorld.clone();
  model.group.updateMatrixWorld(true);
  assert.deepEqual(anchor.matrixWorld.elements, snapshot.elements);
});
