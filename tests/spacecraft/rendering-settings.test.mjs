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

test('automatic controls preserve the existing wide and small-screen profiles', () => {
  assert.deepEqual(resolveRenderingSettings(defaults, desktop), {
    pixelDensity: 2,
    shadowSize: 2048,
    contactShading: true,
    cacheAvailable: true,
  });
  assert.deepEqual(resolveRenderingSettings(defaults, phone), {
    pixelDensity: 1.75,
    shadowSize: 1024,
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

test('each independent override is identified and reset without changing shared defaults', () => {
  const overrides = {
    shadows: false,
    shadowSize: 512,
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
