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

test('site defaults use low detail and 4× softness while retaining device density/contact profiles', () => {
  assert.deepEqual(resolveRenderingSettings(defaults, desktop), {
    pixelDensity: 2,
    shadowSize: 512,
    shadowSoftness: 4,
    exteriorLight: 1,
    roomLight: 1,
    ladderLight: 1,
    roomWarmth: 0.85,
    roomSpread: 75,
    roomFill: 0.25,
    exteriorSpill: 0.05,
    contactShading: true,
    cacheAvailable: true,
  });
  assert.deepEqual(resolveRenderingSettings(defaults, phone), {
    pixelDensity: 1.75,
    shadowSize: 512,
    shadowSoftness: 4,
    exteriorLight: 1,
    roomLight: 1,
    ladderLight: 1,
    roomWarmth: 0.85,
    roomSpread: 75,
    roomFill: 0.25,
    exteriorSpill: 0.05,
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

test('explicit shadow detail survives a breakpoint while automatic detail remains selectable', () => {
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
    resolveRenderingSettings(
      { ...defaults, shadowSize: 'auto' },
      { ...desktop, maxTextureSize: 1024 },
    ).shadowSize,
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
    [NaN, 4],
    [Infinity, 4],
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
    shadowSize: 1024,
    shadowSoftness: 1,
    exteriorLight: 0,
    roomLight: 0.5,
    ladderLight: 2,
    roomWarmth: 0,
    roomSpread: 50,
    roomFill: 0,
    exteriorSpill: 1,
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

test('independent light levels include off and clamp invalid or excessive inputs', () => {
  for (const key of ['exteriorLight', 'roomLight', 'ladderLight']) {
    for (const [value, expected] of [
      [0, 0],
      [0.35, 0.35],
      [1.5, 1.5],
      [-1, 0],
      [3, 3],
      [5, 5],
      [10, 5],
      [NaN, 1],
      [Infinity, 1],
      [undefined, 1],
    ]) {
      const actual = resolveRenderingSettings(
        { ...defaults, [key]: value },
        desktop,
      );
      for (const name of ['exteriorLight', 'roomLight', 'ladderLight'])
        assert.equal(actual[name], name === key ? expected : 1);
    }
  }
});

test('the shared room profile is bounded, resettable and identical on desktop and phone', () => {
  for (const [key, min, max] of [
    ['roomWarmth', 0, 1],
    ['roomSpread', 35, 85],
    ['roomFill', 0, 1],
    ['exteriorSpill', 0, 1],
  ]) {
    for (const [value, expected] of [
      [min, min],
      [max, max],
      [-10, min],
      [1000, max],
      [NaN, defaults[key]],
      [undefined, defaults[key]],
      [Infinity, defaults[key]],
    ]) {
      for (const environment of [desktop, phone]) {
        const resolved = resolveRenderingSettings(
          { ...defaults, [key]: value },
          environment,
        );
        assert.equal(resolved[key], expected, `${key}: ${value}`);
        for (const other of [
          'roomWarmth',
          'roomSpread',
          'roomFill',
          'exteriorSpill',
        ].filter((name) => name !== key))
          assert.equal(resolved[other], defaults[other]);
      }
    }
  }
});
