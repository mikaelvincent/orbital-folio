import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';

const bundled = await build({
  entryPoints: ['features/orbit/orbital-environment.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const { createOrbitalEnvironment } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);
const collect = (scene) => {
  const resources = new Set();
  scene.traverse((object) => {
    if (object.geometry) resources.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      resources.add(material);
      if (material.map) resources.add(material.map);
      for (const uniform of Object.values(material.uniforms ?? {}))
        if (uniform.value?.isTexture) resources.add(uniform.value);
    }
  });
  return resources;
};
const watch = (resources) => {
  const counts = new Map([...resources].map((value) => [value, 0]));
  for (const resource of resources)
    resource.addEventListener('dispose', () =>
      counts.set(resource, counts.get(resource) + 1),
    );
  return () => {
    for (const [resource, count] of counts)
      assert.equal(count, 1, resource.type ?? 'Texture');
  };
};

for (const mobile of [false, true])
  void test(`Satellite environment ${mobile ? 'compact' : 'wide'} preserves framing, active clock and owns resources`, async (t) => {
    const fetch = t.mock.method(globalThis, 'fetch', () => {
      throw new Error('No request expected with injected texture');
    });
    let closes = 0,
      invalidations = 0;
    const texture = new THREE.Texture({
      width: 2560,
      height: 1536,
      close() {
        closes++;
      },
    });
    const env = createOrbitalEnvironment(THREE, () => invalidations++, {
      mobile,
      earthTexture: texture,
    });
    t.after(() => env.dispose());
    const surface = env.scene.getObjectByName('satellite-earth-surface');
    const placeholderDisposed = watch(new Set([surface.material]));
    assert.equal(env.getDiagnostics().earthReady, false);
    await env.ready;
    placeholderDisposed();
    assert.equal(fetch.mock.callCount(), 0);
    assert.ok(invalidations >= 2);
    assert.equal(surface.material.map, texture);
    assert.equal(surface.material.isMeshBasicMaterial, true);
    assert.equal(surface.scale.x, 180);
    assert.equal(
      surface.parent.children.length,
      2,
      'Surface and one night atmosphere; no cloud volume',
    );
    assert.ok(
      ![...collect(env.scene)].some(
        (resource) => resource.uniforms?.cloudField,
      ),
    );
    const version = texture.version;
    let activeTime = 0;
    for (const [width, height] of [
      [1280, 720],
      [390, 844],
      [768, 4096],
      [2560, 600],
      [0, 0],
    ]) {
      env.resize(width, height, 2);
      for (const delta of [0, 15, 180, 900, 100000]) {
        activeTime += delta;
        env.update(activeTime, true, -0.8, 0.75);
        const d = env.getDiagnostics();
        assert.equal(d.earthRotation, (activeTime * 0.0045) % (Math.PI * 2));
        assert.equal(d.cloudRotation, d.earthRotation);
        assert.ok(
          [...env.camera.projectionMatrix.elements, ...d.earthPosition].every(
            Number.isFinite,
          ),
        );
        assert.ok(
          surface.parent.position.distanceTo(env.camera.position) > 181.5,
        );
      }
    }
    const paused = env.getDiagnostics();
    env.update(200000, false, -0.8, 0.75);
    assert.deepEqual(env.getDiagnostics(), paused);
    env.update(NaN, true, -0.8, 0.75);
    assert.equal(env.getDiagnostics().activeTime, paused.activeTime);
    assert.equal(texture.version, version, 'No texture upload on rotation');
    const d = env.getDiagnostics();
    assert.equal(d.earthReady, true);
    assert.equal(d.earthLoadError, null);
    assert.equal(d.earthSource, 'injected-satellite-texture');
    assert.equal(d.earthTextureBytes, 15728640);
    assert.equal(d.earthTextureGpuBytes, 20971512);
    assert.equal(d.cloudFieldSamples, 0);
    assert.equal(d.cloudTextureSize, 0);
    assert.deepEqual(d.earthTextureDimensions, [2560, 1536]);
    assert.equal(d.earthTextureSamples, 1);
    assert.equal(d.earthLoopSeconds, (Math.PI * 2 * 2560) / (0.0045 * 8192));
    assert.equal(d.earthTextureRepresentation, 'authored-regional-night-loop');
    assert.deepEqual(d.earthTextureSourceDimensions, [8192, 4096]);
    assert.deepEqual(d.earthRegionSourceOrigin, [3712, 384]);
    assert.deepEqual(d.earthTextureRepeat, [3.2, 8 / 3]);
    const disposed = watch(collect(env.scene));
    env.dispose();
    env.dispose();
    disposed();
    assert.equal(closes, 1);
    assert.equal(env.scene.children.length, 0);
    assert.equal(env.getDiagnostics().earthReady, false);
    const final = env.getDiagnostics();
    env.update(200001, true, 0, 0);
    assert.deepEqual(env.getDiagnostics(), final);
  });

void test('Disposal before injected texture installation releases it without invalidating', async () => {
  let closes = 0,
    invalidations = 0;
  const texture = new THREE.Texture({
    width: 2560,
    height: 1536,
    close() {
      closes++;
    },
  });
  const disposed = watch(new Set([texture]));
  const env = createOrbitalEnvironment(THREE, () => invalidations++, {
    earthTexture: texture,
  });
  env.dispose();
  const before = invalidations;
  await env.ready;
  assert.equal(invalidations, before);
  assert.equal(closes, 1);
  disposed();
  assert.equal(env.getDiagnostics().earthReady, false);
});

void test('The regional surface repeats each authored period without changing resources or motion rate', async (t) => {
  const texture = new THREE.Texture({ width: 2560, height: 1536 });
  const env = createOrbitalEnvironment(THREE, () => {}, {
    earthTexture: texture,
  });
  t.after(() => env.dispose());
  await env.ready;
  env.resize(1280, 720, 2);
  const surface = env.scene.getObjectByName('satellite-earth-surface');
  const resources = collect(env.scene);
  const textureVersion = texture.version;
  texture.updateMatrix();
  env.scene.updateMatrixWorld(true);
  const fixedWorldTargets = [
    [-5, 38],
    [12, 48],
    [35, 55],
  ].map(([longitude, latitude]) => {
    const a = THREE.MathUtils.degToRad(longitude),
      b = THREE.MathUtils.degToRad(latitude);
    return new THREE.Vector3(
      Math.cos(b) * Math.cos(a),
      Math.sin(b),
      -Math.cos(b) * Math.sin(a),
    ).applyMatrix4(surface.matrixWorld);
  });
  const sample = () => {
    env.scene.updateMatrixWorld(true);
    texture.updateMatrix(); // The renderer refreshes map transforms before drawing.
    return fixedWorldTargets.map((point) => {
      const ray = new THREE.Raycaster(
        env.camera.position,
        point.clone().sub(env.camera.position).normalize(),
      );
      const hit = ray.intersectObject(surface, false)[0];
      assert.ok(hit?.uv, 'The ray hits the visible Earth surface');
      return texture.transformUv(hit.uv.clone());
    });
  };
  const opening = sample();
  const period = env.getDiagnostics().earthLoopSeconds;
  for (const cycles of [1, 2, 3]) {
    env.update(period * cycles, true, 0, 0);
    const repeated = sample();
    repeated.forEach((uv, index) =>
      assert.ok(
        uv.distanceTo(opening[index]) < 1e-6,
        'Fixed world points sample the same texture after every authored cycle',
      ),
    );
    assert.deepEqual(
      collect(env.scene),
      resources,
      'No additional resources per cycle',
    );
    assert.equal(
      texture.version,
      textureVersion,
      'No texture upload per cycle',
    );
    assert.equal(env.getDiagnostics().earthRotationRate, 0.0045);
  }
  env.update(period * 3 + 10, true, 0, 0);
  assert.ok(
    sample().some((uv, index) => uv.distanceTo(opening[index]) > 0.001),
    'Normal forward motion continues between loop boundaries',
  );
});

void test('Failed asset keeps an inexpensive ocean and reports failure, without weather generation', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('missing', { status: 404 }),
  );
  const env = createOrbitalEnvironment(THREE, () => {}, { mobile: true });
  t.after(() => env.dispose());
  await env.ready;
  const d = env.getDiagnostics();
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(d.earthSource, 'ocean-fallback');
  assert.equal(d.earthReady, false);
  assert.match(d.earthLoadError, /404/);
  assert.equal(d.earthTextureGpuBytes, 0);
  assert.equal(
    env.scene.getObjectByName('satellite-earth-surface').material.map,
    null,
  );
});
