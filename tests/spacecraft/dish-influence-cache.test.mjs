import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import {
  createDishInfluenceCache,
  projectedBox,
} from '../../features/spacecraft/dish-influence-cache.ts';

function fixture() {
  const scene = new T.Scene(),
    group = new T.Group();
  scene.add(group);
  const camera = new T.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 8;
  camera.updateMatrixWorld();
  const key = new T.DirectionalLight();
  key.position.z = 10;
  key.castShadow = true;
  scene.add(key, key.target);
  Object.assign(key.shadow.camera, {
    left: -5,
    right: 5,
    top: 5,
    bottom: -5,
    near: 0.1,
    far: 30,
  });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.mapSize.set(512, 512);
  key.shadow.map = new T.WebGLRenderTarget(512, 512);
  const mesh = (x, z) => {
    const o = new T.Mesh(
      new T.BoxGeometry(0.4, 0.4, 0.4),
      new T.MeshStandardMaterial(),
    );
    o.position.set(x, 0, z);
    o.castShadow = true;
    group.add(o);
    return o;
  };
  const dish = new T.Group();
  dish.name = 'service-mounted-communications-dish';
  group.add(dish);
  const moving = mesh(-1, 0);
  dish.add(moving);
  const receiver = mesh(-1, -2),
    occluder = mesh(-1, 2),
    outside = mesh(3, 0);
  const proxy = mesh(-1, 1);
  proxy.visible = false;
  const instances = new T.InstancedMesh(
    new T.BoxGeometry(0.2, 0.2, 0.2),
    new T.MeshStandardMaterial(),
    1,
  );
  instances.setMatrixAt(0, new T.Matrix4().makeTranslation(-1, 0, -3));
  group.add(instances);
  scene.updateMatrixWorld(true);
  const ao = new GTAOPass(scene, camera, 100, 100);
  ao.updateGtaoMaterial({ radius: 0.32, thickness: 0.18 });
  ao.updatePdMaterial({ radius: 9 });
  const renderer = {
    shadowMap: { type: T.PCFShadowMap, autoUpdate: false, render() {} },
  };
  const cache = createDishInfluenceCache({
    three: T,
    renderer,
    scene,
    camera,
    model: { group },
    key,
    ao,
  });
  cache.prepare();
  return {
    cache,
    group,
    key,
    ao,
    renderer,
    camera,
    receiver,
    occluder,
    outside,
    proxy,
    instances,
    moving,
  };
}

test('near-plane crossings conservatively cover the complete viewport', () => {
  const camera = new T.PerspectiveCamera(50, 1, 0.1, 100);
  camera.updateMatrixWorld();
  assert.deepEqual(
    projectedBox(
      T,
      new T.Box3(new T.Vector3(-1, -1, -1), new T.Vector3(1, 1, 1)),
      camera,
    ),
    [0, 0, 1, 1],
  );
});

test('a full rotation envelope keeps receivers and intervening static casters live', () => {
  const f = fixture();
  assert.equal(f.cache.contains(f.receiver), true);
  assert.equal(f.cache.contains(f.occluder), true);
  assert.equal(f.cache.contains(f.instances), true);
  assert.equal(f.cache.contains(f.outside), false);
  const r = f.cache.stats();
  assert.ok(r.radius >= 1.2);
  assert.ok(r.aoRect[0] < r.normalRect[0]);
  assert.ok(r.denoiseRect[0] < r.aoRect[0]);
  assert.ok(r.denoiseRect[2] > r.aoRect[2]);
  f.ao.dispose();
  f.key.shadow.map.dispose();
});

test('nonuniform or sheared ancestry disables regional repairs, uniform rotated scale remains supported', () => {
  const f = fixture();
  f.group.scale.set(2, 1, 1);
  f.group.updateMatrixWorld(true);
  assert.equal(f.cache.supported(), false);
  f.cache.prepare();
  assert.equal(f.cache.canRepairShadow(), false);
  f.group.scale.setScalar(2);
  f.group.rotation.set(0.3, 0.7, -0.2);
  f.group.updateMatrixWorld(true);
  assert.equal(f.cache.supported(), true);
  f.cache.prepare();
  assert.equal(f.cache.canRepairShadow(), true);
  f.group.matrixWorld.elements[4] += 0.5;
  assert.equal(f.cache.supported(), false);
  f.ao.dispose();
  f.key.shadow.map.dispose();
});

test('softer shadows expand the repaired region and keep newly affected receivers live', () => {
  const f = fixture();
  const original = f.cache.stats().shadowRect;
  const edge = new T.Vector3(original[2] * 2 - 1, 0, 0).unproject(
    f.key.shadow.camera,
  ).x;
  // This box begins just beyond the original filtered shadow footprint.
  f.outside.position.x = edge + 0.2 + 0.01;
  f.group.updateMatrixWorld(true);
  f.cache.prepare();
  assert.equal(f.cache.contains(f.outside), false);
  f.key.shadow.radius = 4;
  f.cache.prepare();
  const softened = f.cache.stats().shadowRect;
  assert.ok(softened[0] < original[0]);
  assert.ok(softened[2] > original[2]);
  assert.equal(f.cache.contains(f.outside), true);
  f.ao.dispose();
  f.key.shadow.map.dispose();
});

test('shadow repair retains overlapping static occluders, restores target and masks on failure', () => {
  const f = fixture(),
    original = f.key.shadow.map.scissor.clone();
  f.renderer.shadowMap.render = () => {
    assert.equal(f.key.shadow.map.scissorTest, true);
    assert.ok(f.key.shadow.map.scissor.z < 512);
    assert.equal(f.receiver.layers.mask, 1);
    assert.equal(f.occluder.layers.mask, 1);
    assert.equal(f.outside.layers.mask, 0);
    throw new Error('test failure');
  };
  assert.throws(
    () => f.cache.shadow(() => f.renderer.shadowMap.render()),
    /test failure/,
  );
  assert.deepEqual(f.key.shadow.map.scissor, original);
  assert.equal(f.key.shadow.map.scissorTest, false);
  assert.equal(f.outside.layers.mask, 1);
  f.ao.dispose();
  f.key.shadow.map.dispose();
});

test('AO repairs include hidden proxies and background, and restore all three scissors', () => {
  const f = fixture();
  const targets = [
    f.ao.normalRenderTarget,
    f.ao.gtaoRenderTarget,
    f.ao.pdRenderTarget,
  ];
  const original = targets.map((t) => t.scissor.clone());
  f.proxy.visible = true;
  assert.throws(
    () =>
      f.cache.occlusion(() => {
        assert.ok(targets.every((t) => t.scissorTest));
        assert.equal(f.proxy.layers.mask, 1);
        assert.equal(f.receiver.layers.mask, 1);
        assert.equal(f.occluder.layers.mask, 1);
        assert.equal(f.outside.layers.mask, 0);
        throw new Error('test failure');
      }),
    /test failure/,
  );
  targets.forEach((t, i) => {
    assert.deepEqual(t.scissor, original[i]);
    assert.equal(t.scissorTest, false);
  });
  assert.equal(f.outside.layers.mask, 1);
  f.cache.invalidate();
  let full = false;
  f.cache.occlusion(() => {
    full = true;
  });
  assert.equal(full, true);
  f.ao.dispose();
  f.key.shadow.map.dispose();
});
