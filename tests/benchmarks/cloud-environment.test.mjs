import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import * as THREE from 'three';
import {
  createCloudTexture,
  createCloudVolume,
  CLOUD_TOP_RADIUS,
  CLOUD_BOTTOM_RADIUS,
  CLOUD_FIELD_WIDTH,
  CLOUD_FIELD_HEIGHT,
  CLOUD_STEPS,
  CLOUD_ASSET,
} from '../../scripts/benchmarks/clouds/cloud-volume.ts';
import {
  createCloudFieldData,
  CLOUD_FIELD_VERSION,
} from '../../scripts/benchmarks/clouds/cloud-field.ts';
import { encodeCloudField } from '../../scripts/benchmarks/clouds/cloud-field-codec.ts';

// Bundle the retained satellite-volume reference/dependencies in memory to resolve
// extensionless application imports without a browser or emitted fixture files.
const artifact = resolve(
  process.env.ORBITAL_ENVIRONMENT_AUDIT_ARTIFACT ??
    new URL('../../scripts/benchmarks/satellite-volume-reference.ts', import.meta.url).pathname,
);
const bundled = await build({
  entryPoints: [artifact],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
const { createOrbitalEnvironment } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);
// Exercise production dimensions with an allocation, never a full-size field bake.
const field = new Uint8Array(CLOUD_FIELD_WIDTH * CLOUD_FIELD_HEIGHT * 4);
const mipBytes = (width, height) => {
  let bytes = 0;
  for (;;) {
    bytes += width * height * 4;
    if (width === 1 && height === 1) return bytes;
    width = Math.max(1, width >> 1);
    height = Math.max(1, height >> 1);
  }
};
const collect = (scene) => {
  const resources = new Set(),
    textures = new Set(),
    clouds = [];
  scene.traverse((object) => {
    if (object.geometry) resources.add(object.geometry);
    for (const material of object.material ? [object.material].flat() : []) {
      resources.add(material);
      for (const uniform of Object.values(material.uniforms ?? {})) {
        if (!uniform.value?.isTexture) continue;
        resources.add(uniform.value);
        textures.add(uniform.value);
      }
      if (material.uniforms?.cloudField) clouds.push(object);
    }
  });
  assert.equal(clouds.length, 1, 'One cloud volume');
  return { resources, textures, cloud: clouds[0] };
};
const watchDisposal = (resources) => {
  const counts = new Map([...resources].map((resource) => [resource, 0]));
  for (const resource of resources)
    resource.addEventListener('dispose', () =>
      counts.set(resource, counts.get(resource) + 1),
    );
  return () => {
    for (const [resource, count] of counts)
      assert.equal(
        count,
        1,
        `${resource.type ?? 'Texture'} disposed exactly once`,
      );
  };
};

test('Small cloud fields are deterministic, nonempty and encode wrapped slopes', () => {
  for (const [width, height] of [
    [8, 4],
    [32, 16],
  ]) {
    const a = createCloudFieldData({ width, height });
    const b = createCloudFieldData({ width, height });
    assert.deepEqual(a, b);
    assert.notEqual(a.data, b.data);
    assert.equal(a.version, CLOUD_FIELD_VERSION);
    assert.equal(a.channels, 4);
    assert.equal(a.data.byteLength, width * height * 4);
    assert.notDeepEqual(
      a.data,
      createCloudFieldData({ width, height, seed: 1 }).data,
    );
    const density = a.data.filter((_, i) => i % 4 === 0);
    assert.ok(density.some((v) => v > 0));
    assert.ok(density.some((v) => v === 0));
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        if (a.data[offset] > 0) assert.ok(a.data[offset + 1] > 0);
        // Even the first/last columns use neighbours across the longitude seam.
        const left = a.data[(y * width + ((x + width - 1) % width)) * 4 + 1];
        const right = a.data[(y * width + ((x + 1) % width)) * 4 + 1];
        const slope = a.data[offset + 2] - 127.5;
        if (Math.abs(slope) > 1 && Math.abs(right - left) > 1)
          assert.equal(Math.sign(slope), Math.sign(right - left));
      }
  }
  for (const [width, height] of [
    [4, 2],
    [8, 8],
    [8.5, 4],
    [NaN, 4],
    [8, 0],
  ])
    assert.throws(() => createCloudFieldData({ width, height }), /2:1 atlas/);
});

test('Cloud texture preserves bytes, mip/seam settings and bounded volume material', () => {
  const texture = createCloudTexture(
    THREE,
    field,
    CLOUD_FIELD_WIDTH,
    CLOUD_FIELD_HEIGHT,
  );
  const material = createCloudVolume(THREE, texture);
  try {
    assert.equal(texture.image.data, field);
    assert.deepEqual([texture.image.width, texture.image.height], [2048, 1024]);
    assert.equal(texture.format, THREE.RGBAFormat);
    assert.equal(texture.type, THREE.UnsignedByteType);
    assert.equal(texture.colorSpace, THREE.NoColorSpace);
    assert.equal(texture.wrapS, THREE.RepeatWrapping);
    assert.equal(texture.wrapT, THREE.ClampToEdgeWrapping);
    assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter);
    assert.equal(texture.magFilter, THREE.LinearFilter);
    assert.equal(texture.generateMipmaps, true);
    assert.equal(texture.unpackAlignment, 1);
    assert.equal(texture.anisotropy, 4);
    assert.equal(material.uniforms.cloudField.value, texture);
    assert.equal(material.glslVersion, THREE.GLSL3);
    assert.equal(material.depthWrite, false);
    assert.equal(material.transparent, true);
    assert.equal(material.toneMapped, false);
    assert.ok(
      CLOUD_TOP_RADIUS > CLOUD_BOTTOM_RADIUS && CLOUD_BOTTOM_RADIUS > 180,
    );
    assert.ok(Number.isInteger(CLOUD_STEPS) && CLOUD_STEPS > 0);
    assert.ok(!/\b(?:NaN|Infinity|undefined)\b/.test(material.fragmentShader));
    assert.match(material.fragmentShader, /textureGrad\(/);
    const loop = material.fragmentShader.indexOf('for(int');
    assert.ok(loop > 0);
    assert.ok(material.fragmentShader.lastIndexOf('dFdx(') < loop);
    assert.ok(material.fragmentShader.lastIndexOf('dFdy(') < loop);
    assert.ok(material.fragmentShader.indexOf('discard') > loop);
  } finally {
    material.dispose();
    texture.dispose();
  }
});

for (const mobile of [false, true]) {
  test(`Cloud environment ${mobile ? 'compact' : 'wide'}: ready, placement, pause, memory and cleanup`, async (t) => {
    const fetch = t.mock.method(globalThis, 'fetch', () => {
      throw new Error('Injected field must not fetch');
    });
    let invalidations = 0;
    const env = createOrbitalEnvironment(THREE, () => invalidations++, {
      mobile,
      cloudFieldData: field,
    });
    t.after(() => env.dispose());
    const pending = collect(env.scene);
    const checkPlaceholder = watchDisposal(
      new Set([pending.cloud.material.uniforms.cloudField.value]),
    );
    assert.equal(env.getDiagnostics().cloudReady, false);
    assert.equal(pending.cloud.material.uniforms.readyOpacity.value, 0);
    await env.ready;
    checkPlaceholder();
    assert.equal(fetch.mock.callCount(), 0);
    assert.ok(invalidations >= 2, 'Atlas arrival requests a new frame');
    const { cloud, textures, resources } = collect(env.scene);
    const volume = cloud.material.uniforms.cloudField.value,
      version = volume.version;
    assert.equal(volume.image.data, field);
    assert.equal(textures.size, 2);
    assert.equal(env.getDiagnostics().cloudSource, 'injected-baked-field');
    for (const [width, height] of [
      [1440, 1000],
      [390, 844],
      [768, 1024],
      [2560, 600],
      [0, 0],
    ]) {
      env.resize(width, height, 2);
      for (const time of [0, 15, 900, 100000]) {
        env.update(time, true, -0.8, 0.75);
        env.scene.updateMatrixWorld(true);
        const motion = env.getDiagnostics();
        assert.ok(motion.cloudRotationRate > motion.earthRotationRate);
        assert.equal(
          cloud.rotation.y,
          (time * motion.cloudRotationRate) % (Math.PI * 2),
        );
        assert.equal(
          motion.earthRotation,
          (time * motion.earthRotationRate) % (Math.PI * 2),
        );
        const uniforms = cloud.material.uniforms;
        const expectedCamera = cloud.worldToLocal(env.camera.position.clone());
        assert.ok(
          uniforms.cameraLocal.value.distanceTo(expectedCamera) < 1e-10,
        );
        assert.ok(
          uniforms.cameraLocal.value.length() > 1,
          'Camera stays outside cloud shell',
        );
        const worldSun = uniforms.sunLocal.value
          .clone()
          .transformDirection(cloud.matrixWorld);
        assert.ok(
          worldSun.distanceTo(new THREE.Vector3(-120, 100, 120).normalize()) <
            1e-10,
        );
        assert.ok(Math.abs(uniforms.sunLocal.value.length() - 1) < 1e-10);
        assert.equal(uniforms.readyOpacity.value, 1);
        for (const value of [
          ...uniforms.cameraLocal.value,
          ...uniforms.sunLocal.value,
          ...env.camera.projectionMatrix.elements,
        ])
          assert.ok(Number.isFinite(value));
      }
    }
    const beforePause = env.getDiagnostics();
    const cameraBefore = cloud.material.uniforms.cameraLocal.value.clone();
    env.update(200000, false, -0.8, 0.75);
    assert.deepEqual(env.getDiagnostics(), beforePause);
    assert.deepEqual(cloud.material.uniforms.cameraLocal.value, cameraBefore);
    env.update(NaN, true, -0.8, 0.75);
    assert.equal(env.getDiagnostics().activeTime, beforePause.activeTime);
    env.update(0, true, 0, 0);
    assert.equal(env.getDiagnostics().cloudRotation, 0);
    assert.equal(
      volume.version,
      version,
      'Rotation does not reupload the baked field',
    );
    const d = env.getDiagnostics();
    assert.equal(d.externalTextureRequests, 0);
    assert.equal(d.cloudFieldSamples, CLOUD_STEPS);
    assert.equal(d.cloudSunProbes, 0);
    assert.equal(d.proceduralNoiseMipLevels, 12);
    assert.equal(
      d.proceduralNoiseMipBytes,
      mipBytes(CLOUD_FIELD_WIDTH, CLOUD_FIELD_HEIGHT),
    );
    assert.equal(
      d.proceduralTextureBytes,
      [...textures].reduce((sum, t) => sum + t.image.data.byteLength, 0),
    );
    assert.equal(
      d.proceduralTextureGpuBytes,
      [...textures].reduce(
        (sum, t) => sum + mipBytes(t.image.width, t.image.height),
        0,
      ),
    );
    const checkDisposal = watchDisposal(resources);
    env.dispose();
    env.dispose();
    checkDisposal();
    assert.equal(env.scene.children.length, 0);
    assert.equal(env.getDiagnostics().ready, false);
    const afterDispose = env.getDiagnostics();
    env.update(25, true, 1, 1);
    assert.deepEqual(env.getDiagnostics(), afterDispose);
  });
}

test('Malformed injection rejects and disposal prevents a queued installation', async () => {
  const invalid = createOrbitalEnvironment(THREE, () => {}, {
    cloudFieldData: new Uint8Array(4),
    mobile: true,
  });
  await assert.rejects(invalid.ready, /cloud field length/);
  invalid.dispose();
  let invalidations = 0;
  const env = createOrbitalEnvironment(THREE, () => invalidations++, {
    cloudFieldData: field,
    mobile: true,
  });
  const checkDisposal = watchDisposal(collect(env.scene).resources);
  env.dispose();
  const beforeReady = invalidations;
  await env.ready;
  assert.equal(invalidations, beforeReady);
  assert.equal(env.getDiagnostics().cloudReady, false);
  checkDisposal();
});

for (const compressed of [false, true]) {
  test(`HTTP ${compressed ? 'gzip archive' : 'already decompressed'} CFD1 becomes the exact cloud texture`, async (t) => {
    const packet = encodeCloudField({
      data: field,
      width: CLOUD_FIELD_WIDTH,
      height: CLOUD_FIELD_HEIGHT,
    });
    const body = compressed ? gzipSync(packet) : packet;
    const fetch = t.mock.method(globalThis, 'fetch', (url, options) => {
      assert.equal(url, CLOUD_ASSET);
      assert.equal(options.signal.aborted, false);
      return Promise.resolve(
        new Response(
          body,
          compressed
            ? { headers: { 'Content-Length': String(body.byteLength) } }
            : undefined,
        ),
      );
    });
    const env = createOrbitalEnvironment(THREE, () => {}, { mobile: true });
    t.after(() => env.dispose());
    await env.ready;
    assert.equal(fetch.mock.callCount(), 1);
    const d = env.getDiagnostics();
    assert.equal(d.cloudReady, true);
    assert.equal(d.cloudSource, 'developer-baked-atlas');
    assert.equal(d.cloudLoadError, null);
    assert.equal(d.cloudFieldGenerationMs, 0);
    assert.equal(d.cloudResponseBytes, body.byteLength);
    assert.equal(
      d.cloudEncodedBytes,
      compressed ? body.byteLength : null,
      'Missing transfer metadata is unknown, not zero or decoded byte count',
    );
    assert.deepEqual(
      collect(env.scene).cloud.material.uniforms.cloudField.value.image.data,
      field,
    );
  });
}

test('Pending fetch aborts and late rejection does not generate or invalidate', async (t) => {
  let rejectFetch, signal;
  t.mock.method(globalThis, 'fetch', (url, options) => {
    assert.equal(url, CLOUD_ASSET);
    signal = options.signal;
    return new Promise((_, reject) => {
      rejectFetch = reject;
    });
  });
  let invalidations = 0;
  const env = createOrbitalEnvironment(THREE, () => invalidations++, {
    mobile: true,
  });
  const checkDisposal = watchDisposal(collect(env.scene).resources);
  env.dispose();
  assert.equal(signal.aborted, true);
  const beforeReady = invalidations;
  rejectFetch(new Error('Request aborted'));
  await env.ready;
  assert.equal(invalidations, beforeReady);
  assert.equal(env.getDiagnostics().cloudReady, false);
  assert.equal(env.getDiagnostics().cloudFieldGenerationMs, 0);
  checkDisposal();
});
