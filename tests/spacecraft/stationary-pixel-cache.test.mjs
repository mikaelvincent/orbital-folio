/* eslint-disable typescript/unbound-method -- Tests compare preserved renderer method identity. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { createStationaryPixelCache } from '../../features/spacecraft/stationary-pixel-cache.ts';

function fixture(withDish = false, eligible = () => true, areaLight = false) {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera();
  const group = new THREE.Group();
  scene.add(group);
  group.userData.geometryRevision = 0;
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  const meter = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial(),
  );
  meter.material.userData.ambientColorAnimation = true;
  const ink = new THREE.Mesh(
    new THREE.PlaneGeometry(),
    new THREE.MeshBasicMaterial({ transparent: true }),
  );
  hull.add(ink);
  group.add(hull, meter);
  const light = areaLight
    ? new THREE.RectAreaLight()
    : new THREE.DirectionalLight();
  scene.add(light);
  let dish, ao;
  if (withDish) {
    dish = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial(),
    );
    dish.name = 'service-mounted-communications-dish';
    group.add(dish);
    dish.position.x = -2;
    hull.position.x = 2;
    group.userData.dishGeometryRevision = 0;
    camera.position.z = 8;
    camera.updateMatrixWorld();
    light.castShadow = true;
    light.position.z = 10;
    light.shadow.map = new THREE.WebGLRenderTarget(512, 512);
    ao = new GTAOPass(scene, camera, 100, 100);
    ao.updateGtaoMaterial({ radius: 0.32, thickness: 0.18 });
  }
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  let target = null,
    alpha = 1;
  const color = new THREE.Color(0x123456);
  const passes = [];
  const renderer = {
    shadowMap: {
      needsUpdate: true,
      enabled: true,
      type: THREE.PCFShadowMap,
      render() {
        this.needsUpdate = false;
      },
    },
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 0.95,
    outputColorSpace: THREE.SRGBColorSpace,
    getRenderTarget: () => target,
    setRenderTarget: (value) => {
      target = value;
    },
    getDrawingBufferSize: (value) => value.set(80, 60),
    getClearAlpha: () => alpha,
    getClearColor: (value) => value.copy(color),
    setClearColor: (value, a) => {
      color.set(value);
      alpha = a;
    },
    clear() {},
    render(root) {
      const shadows = this.shadowMap.needsUpdate;
      if (root === scene && this.shadowMap.needsUpdate)
        this.shadowMap.render([light], scene, camera);
      const meshes = [];
      root.traverseVisible((o) => {
        if (o.isMesh && o.layers.test(camera.layers)) meshes.push(o);
      });
      passes.push({
        target,
        meshes,
        shadows,
        root,
      });
      if (root === scene) this.shadowMap.needsUpdate = false;
    },
  };
  const original = renderer.render;
  const cache = createStationaryPixelCache({
    three: THREE,
    renderer,
    scene,
    camera,
    model: { group },
    key: withDish ? light : undefined,
    ao,
    eligible,
  });
  const frames = (n = 6) => {
    for (let i = 0; i < n; i++) renderer.render(scene, camera);
  };
  return {
    scene,
    camera,
    group,
    dish,
    ao,
    hull,
    meter,
    ink,
    light,
    renderer,
    original,
    passes,
    cache,
    frames,
  };
}

test('capture preserves complete shadow casters and live children of cached meshes', () => {
  const f = fixture();
  f.frames();
  assert.deepEqual(f.passes[0].meshes, [f.hull, f.ink, f.meter]);
  assert.equal(f.passes[0].shadows, true);
  const capture = f.passes.find((p) => p.target);
  assert.deepEqual(capture.meshes, [f.hull]);
  assert.equal(capture.shadows, false);
  assert.deepEqual(f.passes.at(-1).meshes, [f.ink, f.meter]);
  const composite = f.passes.find((p) => p.root.isMesh);
  assert.equal(composite.root.material.depthWrite, true);
  assert.equal(composite.root.material.depthFunc, THREE.AlwaysDepth);
  assert.equal(f.hull.layers.mask, 1);
  assert.equal(f.ink.layers.mask, 1);
  f.cache.dispose();
  assert.equal(f.renderer.render, f.original);
});

test('an ineligible quality path draws normally, releases storage and rebuilds on return', () => {
  let eligible = false;
  const f = fixture(false, () => eligible);
  f.frames();
  assert.equal(f.cache.stats().width, 1);
  assert.equal(f.cache.stats().builds, 0);
  assert.equal(f.cache.requiresOcclusion(), false);
  assert.ok(f.passes.every((p) => !p.target && p.root === f.scene));
  eligible = true;
  f.frames();
  assert.ok(f.cache.stats().hits > 0);
  const builds = f.cache.stats().builds;
  eligible = false;
  f.frames(1);
  assert.equal(f.cache.stats().width, 1);
  assert.equal(f.cache.stats().valid, false);
  assert.deepEqual(f.passes.at(-1).meshes, [f.hull, f.ink, f.meter]);
  eligible = true;
  f.frames();
  assert.equal(f.cache.stats().builds, builds + 1);
  f.cache.dispose();
});

test('camera, material, geometry, texture replacement and light changes invalidate the very next frame', () => {
  for (const mutate of [
    (f) => {
      f.camera.position.x++;
      f.camera.updateMatrixWorld();
    },
    (f) => {
      f.hull.material.color.set(0xabcdef);
    },
    (f) => {
      f.hull.geometry.attributes.position.needsUpdate = true;
    },
    (f) => {
      f.hull.material.map = new THREE.Texture();
    },
    (f) => {
      f.hull.geometry.setIndex(new THREE.Uint16BufferAttribute([0, 1, 2], 1));
    },
    (f) => {
      f.hull.material.bumpScale = 2;
    },
    (f) => {
      f.hull.position.x++;
      f.scene.updateMatrixWorld(true);
    },
    (f) => {
      f.light.intensity = 2;
    },
    (f) => {
      f.group.visible = false;
    },
  ]) {
    const f = fixture();
    f.frames();
    assert.ok(f.cache.stats().hits > 0);
    mutate(f);
    const start = f.passes.length;
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(f.passes.length - start, 1, 'immediate full-render fallback');
    assert.equal(f.passes.at(-1).target, null);
    f.cache.dispose();
  }
});

test('changing a ceiling emitter footprint invalidates cached illumination immediately', () => {
  for (const dimension of ['width', 'height']) {
    const f = fixture(false, undefined, true);
    f.frames();
    assert.ok(f.cache.stats().hits > 0);
    f.light[dimension] *= 2;
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(f.passes.at(-1).target, null);
    f.cache.dispose();
  }
});

test('opaque ambient colors remain live without invalidating stationary pixels', () => {
  const f = fixture();
  f.frames();
  const builds = f.cache.stats().builds;
  f.meter.material.color.set(0x00ff00);
  f.frames(1);
  assert.equal(f.cache.stats().builds, builds);
  assert.equal(f.cache.stats().valid, true);
  assert.ok(f.passes.at(-1).meshes.includes(f.meter));
  f.cache.dispose();
});

test('transitions, new objects and unsupported material states use complete rendering', () => {
  for (const mutate of [
    (f) => {
      f.group.userData.transitionActive = true;
    },
    (f) => {
      f.group.add(
        new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()),
      );
    },
    (f) => {
      f.hull.material.transparent = true;
    },
    (f) => {
      f.hull.material.alphaToCoverage = true;
    },
    (f) => {
      f.hull.material = new THREE.MeshStandardMaterial();
    },
  ]) {
    const f = fixture();
    f.frames();
    mutate(f);
    f.frames(5);
    assert.equal(f.cache.stats().valid, false);
    assert.equal(f.passes.at(-1).target, null);
    f.cache.dispose();
  }
});

test('rest releases attachments and wake-up recaptures before reuse', () => {
  const f = fixture();
  f.frames();
  const builds = f.cache.stats().builds;
  f.cache.release();
  assert.equal(f.cache.stats().width, 1);
  assert.equal(f.cache.stats().valid, false);
  f.frames(1);
  assert.equal(f.passes.at(-1).target, null);
  f.frames();
  assert.equal(f.cache.stats().builds, builds + 1);
  f.cache.dispose();
});

test('dish-only movement repairs shading while simultaneous hull changes invalidate the cache', () => {
  const f = fixture(true);
  f.frames();
  f.cache.occlusion(() => {}, true);
  const builds = f.cache.stats().builds,
    hits = f.cache.stats().hits;
  f.dish.rotation.y = 0.3;
  f.scene.updateMatrixWorld(true);
  f.group.userData.geometryRevision++;
  f.group.userData.dishGeometryRevision++;
  f.group.userData.shadowCasterChanged = true;
  f.renderer.shadowMap.needsUpdate = true;
  f.frames(1);
  assert.equal(f.cache.stats().builds, builds);
  assert.equal(f.cache.stats().hits, hits + 1);
  assert.equal(f.cache.stats().influence.shadowRepairs, 1);
  f.cache.occlusion(() => {}, true);
  assert.equal(f.cache.stats().influence.aoRepairs, 1);
  f.group.userData.geometryRevision += 2;
  f.group.userData.dishGeometryRevision++;
  f.renderer.shadowMap.needsUpdate = true;
  f.frames(1);
  assert.equal(f.cache.stats().valid, false);
  assert.equal(f.cache.requiresOcclusion(), true);
  assert.equal(f.cache.stats().influence.shadowRepairs, 1);
  f.cache.occlusion(() => {}, true);
  assert.equal(
    f.cache.stats().influence.aoRepairs,
    1,
    'a full AO refresh follows mixed geometry changes',
  );
  f.frames();
  assert.equal(f.cache.stats().valid, true);
  f.dish.geometry.attributes.position.needsUpdate = true;
  f.frames(1);
  assert.equal(
    f.cache.stats().valid,
    false,
    'dish geometry changes rebuild its swept bound',
  );
  f.cache.dispose();
  f.ao.dispose();
  f.light.shadow.map.dispose();
});

test('changes to the dish mount, scale, shadow intensity and softness invalidate cached shading', () => {
  for (const mutate of [
    (f) => {
      f.dish.position.x += 0.1;
    },
    (f) => {
      f.dish.scale.x = 1.1;
    },
    (f) => {
      f.light.shadow.intensity = 0.5;
    },
    (f) => {
      f.light.shadow.radius = 4;
    },
  ]) {
    const f = fixture(true);
    f.frames();
    assert.equal(f.cache.stats().valid, true);
    mutate(f);
    f.scene.updateMatrixWorld(true);
    f.frames(1);
    assert.equal(f.cache.stats().valid, false);
    f.cache.dispose();
    f.ao.dispose();
    f.light.shadow.map.dispose();
  }
});
