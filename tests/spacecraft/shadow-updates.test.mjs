import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { createShadowUpdates } from '../../features/spacecraft/shadow-updates.ts';
import { createSpacecraft } from '../../features/spacecraft/spacecraft-model.ts';
import {
  applyCabinLighting,
  createExteriorLight,
} from '../../features/spacecraft/lighting.ts';

function fixture() {
  const root = new T.Group();
  Object.assign(root.userData, {
    geometryRevision: 0,
    dishGeometryRevision: 0,
  });
  const dish = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.1));
  dish.name = 'service-mounted-communications-dish';
  dish.position.set(4, 0, 0);
  const receiver = new T.Mesh(new T.BoxGeometry(1, 1, 0.1));
  receiver.position.z = -2;
  const lamp = new T.SpotLight();
  lamp.position.set(0, 0, 2);
  lamp.target.position.z = -2;
  lamp.distance = 7;
  lamp.shadow.radius = 4;
  lamp.shadow.mapSize.set(512, 512);
  const sun = createExteriorLight(T);
  root.add(dish, receiver, lamp, lamp.target, sun);
  const lights = [sun, lamp];
  const renderer = { shadowMap: { type: T.PCFShadowMap, needsUpdate: false } };
  const cache = createShadowUpdates({
    three: T,
    renderer,
    root,
    lights,
    receivers: () => new Map([[lamp, new Set([receiver])]]),
  });
  function frame() {
    root.updateMatrixWorld(true);
    cache.update();
    const dirty = lights.filter((light) => light.shadow.needsUpdate);
    // Model Three's successful shadow pass consuming both levels of dirty flag.
    lights.forEach((light) => {
      light.shadow.needsUpdate = false;
    });
    renderer.shadowMap.needsUpdate = false;
    return dirty;
  }
  function moveDish(x) {
    dish.position.x = x;
    root.userData.geometryRevision++;
    root.userData.dishGeometryRevision++;
    return frame();
  }
  return {
    root,
    dish,
    receiver,
    lamp,
    sun,
    lights,
    renderer,
    cache,
    frame,
    moveDish,
  };
}

test('unchanged maps survive camera movement; dish-only motion refreshes just relevant lights', () => {
  const f = fixture();
  assert.deepEqual(f.frame(), f.lights);
  assert.ok(f.lights.every((light) => !light.shadow.autoUpdate));
  const camera = new T.PerspectiveCamera();
  camera.position.set(2, 5, 10);
  camera.rotation.z = Math.PI / 2;
  camera.updateMatrixWorld();
  assert.deepEqual(f.frame(), []);
  assert.deepEqual(f.moveDish(3.5), [f.sun]);
  assert.deepEqual(f.frame(), []);
});

test('a dish entering or leaving a receiver ray volume refreshes its old and new shadows', () => {
  const f = fixture();
  f.frame();
  assert.deepEqual(f.moveDish(0), f.lights);
  assert.deepEqual(f.moveDish(4), f.lights);
  assert.deepEqual(f.moveDish(3.5), [f.sun]);
});

test('receiver movement refreshes all maps and recomputes relevance, including hidden receivers', () => {
  const f = fixture();
  f.frame();
  assert.deepEqual(f.moveDish(3.5), [f.sun]);
  f.receiver.position.x = 4;
  f.receiver.visible = false;
  f.root.userData.geometryRevision++;
  assert.deepEqual(f.frame(), f.lights);
  assert.deepEqual(f.moveDish(3.8), f.lights);
});

test('low-detail soft filter and normal bias retain blockers outside the exact receiver box', () => {
  const f = fixture();
  f.frame();
  // Receiver ends at x=.5, blocker starts at .60. The soft footprint reaches it.
  assert.deepEqual(f.moveDish(0.65), f.lights);
});

test('in-place receiver geometry changes rebuild previously cached local bounds', () => {
  const f = fixture();
  f.frame();
  const position = f.receiver.geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++)
    position.setX(i, position.getX(i) + 4);
  position.needsUpdate = true;
  f.root.userData.geometryRevision++;
  assert.deepEqual(f.frame(), f.lights);
  assert.deepEqual(f.moveDish(3.8), f.lights);
});

test('unsupported shadow filters and positive depth bias conservatively keep lamps live', () => {
  for (const setup of [
    (f) => {
      f.renderer.shadowMap.type = T.VSMShadowMap;
    },
    (f) => {
      f.lamp.shadow.bias = 0.1;
    },
  ]) {
    const f = fixture();
    setup(f);
    f.frame();
    assert.deepEqual(f.moveDish(3.5), f.lights);
  }
});

test('explicit quality/filter invalidation retains dirty flags until the maps actually render', () => {
  const f = fixture();
  f.frame();
  f.lamp.shadow.mapSize.set(2048, 2048);
  f.cache.invalidate();
  f.root.updateMatrixWorld(true);
  f.cache.update();
  f.cache.update();
  assert.ok(f.renderer.shadowMap.needsUpdate);
  assert.ok(f.lights.every((light) => light.shadow.needsUpdate));
  assert.deepEqual(f.frame(), f.lights);
  assert.deepEqual(f.frame(), []);
});

test('the authored wide ship reuses all cabin maps through a complete dish cycle and reduced-motion snap', () => {
  const model = createSpacecraft(T, { layout: 'wide' });
  const scene = new T.Scene();
  const linked = applyCabinLighting(T, model.group);
  const sun = createExteriorLight(T),
    lights = [sun, ...linked.lights];
  scene.add(model.group, sun);
  for (const light of lights) {
    light.shadow.radius = 4;
    light.shadow.mapSize.set(512, 512);
  }
  const renderer = { shadowMap: { type: T.PCFShadowMap, needsUpdate: false } };
  const cache = createShadowUpdates({
    three: T,
    renderer,
    root: model.group,
    lights,
    receivers: linked.shadowReceivers,
  });
  function frame(time, reducedMotion = false) {
    model.update(time, null, reducedMotion, { reducedMotion }, true);
    scene.updateMatrixWorld(true);
    cache.update();
    const dirty = lights.filter((light) => light.shadow.needsUpdate);
    lights.forEach((light) => {
      light.shadow.needsUpdate = false;
    });
    renderer.shadowMap.needsUpdate = false;
    return dirty;
  }
  assert.deepEqual(frame(0), lights);
  let sunFrames = 0;
  for (let i = 1; i <= 180; i++) {
    const dirty = frame(i / 10);
    assert.ok(dirty.every((light) => light === sun));
    sunFrames += dirty.length;
  }
  assert.ok(sunFrames > 80);
  assert.deepEqual(frame(3.25), [sun]);
  assert.deepEqual(frame(3.25, true), [sun]);
  assert.deepEqual(frame(3.25, true), []);
  model.setLayout('compact');
  assert.deepEqual(frame(3.25, true), lights);
});
