import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const built = await build({
  entryPoints: ['features/studio/social-icon-upload.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const {
  SOCIAL_ICON_LIMITS,
  socialIconFileKind,
  validatePngIcon,
  assertLocalSvgResources,
  normalizeSvgIconSource,
  socialIconRasterSize,
  svgIconViewport,
} = await import(
  'data:text/javascript;base64,' +
    Buffer.from(built.outputFiles[0].text).toString('base64')
);

const png = () =>
  new Uint8Array(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==',
      'base64',
    ),
  );

test('downloaded PNG/SVG files work when the browser omits their MIME type', () => {
  assert.equal(socialIconFileKind({ name: 'brand.PNG', type: '' }), 'png');
  assert.equal(
    socialIconFileKind({ name: 'brand.svg', type: 'application/octet-stream' }),
    'svg',
  );
  assert.equal(socialIconFileKind({ name: 'brand', type: 'image/png' }), 'png');
  assert.throws(
    () => socialIconFileKind({ name: 'portrait.jpg', type: 'image/jpeg' }),
    /PNG or SVG/,
  );
});

test('PNG preflight rejects renamed files and excessive decode dimensions before browser decoding', () => {
  assert.deepEqual(validatePngIcon(png()), { width: 1, height: 1 });
  assert.throws(
    () => validatePngIcon(new TextEncoder().encode('<svg/>')),
    /valid PNG/,
  );
  const tooWide = png();
  new DataView(tooWide.buffer).setUint32(16, 9000);
  assert.throws(() => validatePngIcon(tooWide), /8192/);
  const tooManyPixels = png();
  new DataView(tooManyPixels.buffer).setUint32(16, 6000);
  new DataView(tooManyPixels.buffer).setUint32(20, 6000);
  assert.throws(() => validatePngIcon(tooManyPixels), /16 megapixels/);
  const emptyImage = png();
  new DataView(emptyImage.buffer).setUint32(20, 0);
  assert.throws(() => validatePngIcon(emptyImage), /8192/);
});

test('ordinary downloaded SVG markup keeps styles, local definitions, transforms and namespace metadata', () => {
  const source = `<?xml version="1.0"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "https://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
<defs><linearGradient id="brand"><stop stop-color="#888"/></linearGradient><path id="mark" d="M0 0h24v24H0Z"/><clipPath id="clip"><circle r="12"/></clipPath></defs>
<style>.mark {fill:url(#brand);stroke:currentColor;fill-rule:evenodd}</style>
<g transform="translate(1 1)" clip-path="url('#clip')"><use class="mark" xlink:href="#mark"/></g></svg>`;
  const normalized = normalizeSvgIconSource(source);
  assert.doesNotMatch(normalized, /DOCTYPE|<\?xml/);
  assert.match(normalized, /linearGradient/);
  assert.match(normalized, /xlink:href="#mark"/);
  assert.match(normalized, /currentColor/);
  assert.doesNotThrow(() =>
    assertLocalSvgResources('http://www.w3.org/2000/svg', 'xmlns'),
  );
  assert.doesNotThrow(() => assertLocalSvgResources('#mark', 'href'));
});

test('SVG resources cannot point to remote files, data images or imported fonts', () => {
  for (const value of [
    'https://example.com/icon.svg#mark',
    '//example.com/icon.svg',
    'data:image/png;base64,AAAA',
  ])
    assert.throws(
      () => assertLocalSvgResources(value, 'href'),
      /self-contained/,
    );
  for (const value of [
    'url(https://example.com/icon.png)',
    String.raw`u\72l(https://example.com/icon.png)`,
    String.raw`\75\72\6c(data:image/png;base64,AAAA)`,
    '@import "https://example.com/font.css"',
    String.raw`@\69mport "font.css"`,
    '@font-face {font-family:example;src:local(example)}',
  ])
    assert.throws(() => assertLocalSvgResources(value), /self-contained/);
  assert.throws(
    () => assertLocalSvgResources('https://example.com/', 'base'),
    /self-contained/,
  );
});

test('SVG processing instructions, active content, entities and oversized source are rejected', () => {
  for (const source of [
    '<svg><script>alert(1)</script></svg>',
    '<svg><s:script/></svg>',
    '<svg><foreignObject/></svg>',
    '<svg><animate attributeName="fill"/></svg>',
    '<?xml-stylesheet href="https://example.com/x.css"?><svg/>',
  ])
    assert.throws(() => normalizeSvgIconSource(source), /static SVG/);
  assert.throws(
    () => normalizeSvgIconSource('<!DOCTYPE svg [<!ENTITY x "large">]><svg/>'),
    /entities/,
  );
  assert.throws(
    () =>
      normalizeSvgIconSource(
        '<svg>' + ' '.repeat(SOCIAL_ICON_LIMITS.svgBytes) + '</svg>',
      ),
    /1 MiB/,
  );
  assert.throws(
    () => normalizeSvgIconSource('<svg>' + '<path/>'.repeat(10001) + '</svg>'),
    /too complex/,
  );
});

test('icon raster bounds preserve rectangular proportions without introducing transparent square padding', () => {
  assert.deepEqual(socialIconRasterSize(1024, 512), {
    width: 512,
    height: 256,
  });
  assert.deepEqual(socialIconRasterSize(256, 1024), {
    width: 128,
    height: 512,
  });
  assert.deepEqual(socialIconRasterSize(64, 32), { width: 64, height: 32 });
  assert.deepEqual(socialIconRasterSize(1024, 1024, 384), {
    width: 384,
    height: 384,
  });
  assert.throws(() => socialIconRasterSize(0, 12), /invalid dimensions/);
  assert.throws(() => socialIconRasterSize(Infinity, 12), /invalid dimensions/);
});

test('static SVG upload rejects CSS animation including escaped property and keyframe names', () => {
  for (const value of [
    '@keyframes spin {to {transform:rotate(360deg)}}',
    '.mark {animation:spin 1s infinite}',
    'animation-name:spin',
    String.raw`@\6b eyframes spin {}`,
    String.raw`\61nimation:spin 1s`,
    '.mark {-webkit-animation-duration:1s}',
    'transition:fill 1s',
  ])
    assert.throws(() => assertLocalSvgResources(value), /without animation/);
});

test('SVG explicit dimensions preserve letterboxing while missing dimensions follow the viewBox ratio', () => {
  assert.deepEqual(svgIconViewport('200', '100', '0 0 24 24'), {
    width: 200,
    height: 100,
    hasViewBox: true,
  });
  assert.deepEqual(svgIconViewport('200px', null, '0 0 24 12'), {
    width: 200,
    height: 100,
    hasViewBox: true,
  });
  assert.deepEqual(svgIconViewport(null, '100px', '0 0 24 12'), {
    width: 200,
    height: 100,
    hasViewBox: true,
  });
  assert.deepEqual(svgIconViewport(null, null, '0 0 24 12'), {
    width: 24,
    height: 12,
    hasViewBox: true,
  });
  assert.deepEqual(svgIconViewport('1in', '36pt', null), {
    width: 96,
    height: 48,
    hasViewBox: false,
  });
});
