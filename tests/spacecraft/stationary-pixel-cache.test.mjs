/* eslint-disable typescript/unbound-method -- Tests compare preserved renderer method identity. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createStationaryPixelCache } from '../../features/spacecraft/stationary-pixel-cache.ts';

function fixture() {
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
  const light = new THREE.DirectionalLight();
  scene.add(light);
  camera.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  let target = null,
    alpha = 1;
  const color = new THREE.Color(0x123456);
  const passes = [];
  const renderer = {
    shadowMap: { needsUpdate: true, enabled: true, type: THREE.PCFShadowMap },
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
      const meshes = [];
      root.traverseVisible((o) => {
        if (o.isMesh && o.layers.test(camera.layers)) meshes.push(o);
      });
      passes.push({
        target,
        meshes,
        shadows: this.shadowMap.needsUpdate,
        root,
      });
      this.shadowMap.needsUpdate = false;
    },
  };
  const original = renderer.render;
  const cache = createStationaryPixelCache({
    three: THREE,
    renderer,
    scene,
    camera,
    model: { group },
  });
  const frames = (n = 6) => {
    for (let i = 0; i < n; i++) renderer.render(scene, camera);
  };
  return {
    scene,
    camera,
    group,
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
