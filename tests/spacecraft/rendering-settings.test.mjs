import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RENDERING_SETTINGS as defaults,
  resolveRenderingSettings,
  renderingSettingsAreDefault,
} from '../../features/spacecraft/rendering-settings.ts';

const desktop = {
  width: 1280,
  height: 720,
  nativePixelRatio: 2,
  capableShading: true,
  contactShadingSupported: true,
  maxTextureSize: 16384,
};
const phone = { ...desktop, width: 390, height: 844, nativePixelRatio: 3 };

test('automatic lighting uses medium soft shadows and retains device density/contact profiles', () => {
  assert.deepEqual(resolveRenderingSettings(defaults, desktop), {
    pixelDensity: 2,
    shadowSize: 1024,
    shadowSoftness: 2,
    contactShading: true,
    cacheAvailable: true,
  });
  assert.deepEqual(resolveRenderingSettings(defaults, phone), {
    pixelDensity: 1.75,
    shadowSize: 1024,
    shadowSoftness: 2,
    contactShading: false,
    cacheAvailable: false,
  });
});

test('explicit contact shading permits phone comparisons without bypassing WebGL support', () => {
  const on = { ...defaults, contactShading: 'on' };
  assert.equal(
    resolveRenderingSettings(on, { ...phone, capableShading: false })
      .contactShading,
    true,
  );
  assert.equal(
    resolveRenderingSettings(on, { ...phone, contactShadingSupported: false })
      .contactShading,
    false,
  );
  assert.equal(
    resolveRenderingSettings(defaults, { ...desktop, capableShading: false })
      .contactShading,
    false,
  );
  assert.equal(
    resolveRenderingSettings({ ...defaults, contactShading: 'off' }, desktop)
      .contactShading,
    false,
  );
});

test('explicit density exceeds a low native density for comparison but keeps allocation limits', () => {
  assert.equal(
    resolveRenderingSettings(
      { ...defaults, pixelDensity: 2 },
      { ...desktop, nativePixelRatio: 1 },
    ).pixelDensity,
    2,
  );
  for (const pixelDensity of ['auto', 2, 20]) {
    const large = { ...desktop, width: 4000, height: 3000 };
    const actual = resolveRenderingSettings(
      { ...defaults, pixelDensity },
      large,
    ).pixelDensity;
    assert.ok(large.width * large.height * actual ** 2 <= 4_000_000 + 1e-6);
  }
  const tall = { ...desktop, width: 700, height: 10000, maxTextureSize: 2048 };
  const actual = resolveRenderingSettings(
    { ...defaults, pixelDensity: 2 },
    tall,
  ).pixelDensity;
  assert.ok(tall.height * actual <= tall.maxTextureSize);
  assert.equal(
    resolveRenderingSettings({ ...defaults, pixelDensity: NaN }, phone)
      .pixelDensity,
    1.75,
  );
});

test('explicit shadow detail survives a breakpoint while automatic detail adapts', () => {
  assert.equal(
    resolveRenderingSettings({ ...defaults, shadowSize: 2048 }, phone)
      .shadowSize,
    2048,
  );
  assert.equal(
    resolveRenderingSettings({ ...defaults, shadowSize: 512 }, desktop)
      .shadowSize,
    512,
  );
  assert.equal(
    resolveRenderingSettings(defaults, { ...desktop, maxTextureSize: 1024 })
      .shadowSize,
    1024,
  );
});

test('receiver caching is unavailable when its shading prerequisites are absent', () => {
  assert.equal(
    resolveRenderingSettings({ ...defaults, shadows: false }, desktop)
      .cacheAvailable,
    false,
  );
  assert.equal(
    resolveRenderingSettings({ ...defaults, contactShading: 'off' }, desktop)
      .cacheAvailable,
    false,
  );
  assert.equal(
    resolveRenderingSettings({ ...defaults, contactShading: 'on' }, phone)
      .cacheAvailable,
    false,
  );
});

test('additional cabin shadow lights make stationary caching unavailable without changing shading quality', () => {
  const supported = resolveRenderingSettings(defaults, desktop);
  const actual = resolveRenderingSettings(defaults, {
    ...desktop,
    stationaryCacheSupported: false,
  });
  assert.deepEqual(actual, { ...supported, cacheAvailable: false });
});

test('shadow softness is independent of resolution and bounded for cache filter padding', () => {
  for (const environment of [desktop, phone]) {
    for (const shadowSize of ['auto', 512, 1024, 2048]) {
      const settings = { ...defaults, shadowSize, shadowSoftness: 2 };
      const resolved = resolveRenderingSettings(settings, environment);
      assert.equal(resolved.shadowSoftness, 2);
      assert.equal(
        resolved.shadowSize,
        resolveRenderingSettings(
          { ...settings, shadowSoftness: 1 },
          environment,
        ).shadowSize,
      );
    }
  }
  for (const [shadowSoftness, expected] of [
    [0, 0],
    [-1, 0],
    [0.25, 0.25],
    [4, 4],
    [10, 4],
    [NaN, 2],
    [Infinity, 2],
  ]) {
    assert.equal(
      resolveRenderingSettings({ ...defaults, shadowSoftness }, desktop)
        .shadowSoftness,
      expected,
    );
  }
});

test('each independent override is identified and reset without changing shared defaults', () => {
  const overrides = {
    shadows: false,
    shadowSize: 512,
    shadowSoftness: 1,
    pixelDensity: 1,
    contactShading: 'off',
    background: false,
    spacecraftCache: false,
  };
  for (const [key, value] of Object.entries(overrides)) {
    assert.equal(
      renderingSettingsAreDefault({ ...defaults, [key]: value }),
      false,
    );
  }
  assert.equal(renderingSettingsAreDefault({ ...defaults }), true);
});
