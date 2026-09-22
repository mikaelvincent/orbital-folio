import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const helpers = await build({
  stdin: {
    contents: [
      "export * from './lib/content/about-photos.ts';",
      "export * from './lib/content/about-photo-publication.ts';",
      "export * from './lib/content/social-links.ts';",
      "export * from './lib/content/validation.ts';",
      "export * from './lib/content/seed.ts';",
      "export * from './lib/content/types.ts';",
    ].join('\n'),
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const {
  DEFAULT_IMAGE_CROP,
  normalizeImageCrop,
  imageCropRect,
  imageCropStyle,
  resolveAboutPhotos,
  directAboutPhotoMediaIds,
  validateAboutPhotoPublication,
  resolveAboutSocials,
  resolveSocialScreens,
  socialLinkDraft,
  validateContent,
  seedSite,
  toPortfolio,
} = await import(
  'data:text/javascript;base64,' +
    Buffer.from(helpers.outputFiles[0].text).toString('base64')
);

const link = (id, extra = {}) => ({
  id,
  title: id,
  url: 'https://example.com/profile',
  order: 0,
  ...extra,
});
const record = (id, kind, draft, published = draft) => ({
  id,
  kind,
  draft,
  published,
  revision: 1,
  updatedAt: '2026-09-22T00:00:00Z',
});
const image = {
  title: 'Personal photo',
  alt: 'A mountain walk',
  url: '/media/photo',
  mime: 'image/jpeg',
};

test('photo framing fills landscape and portrait frames without stretching or exposing an image edge', () => {
  assert.deepEqual(imageCropRect(1600, 900, 1, undefined), {
    x: 350,
    y: 0,
    width: 900,
    height: 900,
  });
  assert.deepEqual(imageCropRect(900, 1600, 2, { x: 1, y: 1, zoom: 2 }), {
    x: 450,
    y: 1375,
    width: 450,
    height: 225,
  });
  for (const [width, height] of [
    [1600, 900],
    [900, 1600],
    [1000, 1000],
  ])
    for (const frame of [1, 1.55, 0.7])
      for (const zoom of [1, 1.5, 3])
        for (const x of [0, 0.5, 1])
          for (const y of [0, 0.5, 1]) {
            const crop = imageCropRect(width, height, frame, { x, y, zoom });
            assert.ok(crop.x >= 0 && crop.y >= 0);
            assert.ok(crop.x + crop.width <= width + 1e-10);
            assert.ok(crop.y + crop.height <= height + 1e-10);
            assert.ok(Math.abs(crop.width / crop.height - frame) < 1e-10);
          }
  assert.throws(() => imageCropRect(0, 100, 1, undefined), RangeError);
  assert.deepEqual(normalizeImageCrop({ x: -1, y: Infinity, zoom: 10 }), {
    x: 0,
    y: 0.5,
    zoom: 3,
  });
  assert.deepEqual(normalizeImageCrop(null), DEFAULT_IMAGE_CROP);
});

test('CSS preview and canvas crop use the same image coordinates for every position and zoom', () => {
  const close = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) < 1e-9);
  for (const [width, height] of [
    [1600, 900],
    [900, 1600],
  ])
    for (const zoom of [1, 1.7, 3])
      for (const x of [0, 0.3, 1])
        for (const y of [0, 0.6, 1]) {
          const frameW = 400,
            frameH = 300;
          const fitScale = Math.max(frameW / width, frameH / height);
          const crop = imageCropRect(width, height, frameW / frameH, {
            x,
            y,
            zoom,
          });
          const style = imageCropStyle({ x, y, zoom });
          const [positionX, positionY] = style.objectPosition
            .split(' ')
            .map(parseFloat);
          const [originX, originY] = style.transformOrigin
            .split(' ')
            .map(parseFloat);
          const scale = Number(style.transform.slice(6, -1));
          const paintedLeft = ((frameW - width * fitScale) * positionX) / 100;
          const paintedTop = ((frameH - height * fitScale) * positionY) / 100;
          const scaledLeft =
            paintedLeft * scale + ((1 - scale) * frameW * originX) / 100;
          const scaledTop =
            paintedTop * scale + ((1 - scale) * frameH * originY) / 100;
          close(-scaledLeft / (fitScale * scale), crop.x);
          close(-scaledTop / (fitScale * scale), crop.y);
        }
});

test('About assignments remain explicit, keep photo fields and do not disturb Contact placement', () => {
  const legacy = link('legacy', { screen: 'auto' });
  const left = link('chosen', {
    screen: 'list',
    aboutSlot: 'left',
    photoMediaId: 'photo',
    photoCrop: { x: 0.2, y: 0.8, zoom: 2 },
  });
  const records = [
    legacy,
    left,
    link('other', { screen: 'right', aboutSlot: 'center' }),
  ];
  const about = resolveAboutSocials(records);
  assert.equal(about.left.id, 'chosen');
  assert.equal(about.left.photoMediaId, 'photo');
  assert.deepEqual(about.left.photoCrop, left.photoCrop);
  assert.equal(about.center.id, 'other');
  assert.equal(about.right, null);
  assert.equal(resolveSocialScreens(records).left.id, 'legacy');
  assert.equal(resolveSocialScreens(records).right.id, 'other');
  assert.equal(socialLinkDraft(legacy).aboutSlot, 'off');
  assert.deepEqual(resolveAboutSocials([legacy]), {
    left: null,
    center: null,
    right: null,
  });
  for (const invalid of [
    link('bad', { aboutSlot: 'roof' }),
    link('bad', { aboutSlot: 'left', url: 'javascript:alert(1)' }),
    link('bad', { aboutSlot: 'left', title: '  ' }),
  ])
    assert.deepEqual(resolveAboutSocials([invalid]), {
      left: null,
      center: null,
      right: null,
    });
  assert.equal(
    resolveAboutSocials([
      link('z', { aboutSlot: 'right' }),
      link('a', { aboutSlot: 'right' }),
    ]).right.id,
    'a',
    'malformed legacy duplicates resolve deterministically',
  );
});

test('photo resolution keeps independent reading crops, authenticated drafts and published assets separate', () => {
  const crop = { x: 0, y: 0.2, zoom: 1.5 };
  const readingCrop = { x: 1, y: 0.8, zoom: 2 };
  const records = [
    record(
      'site',
      'site',
      {
        portraitMediaId: 'photo',
        portraitCrop: crop,
        portraitReadingCrop: readingCrop,
      },
      { portraitMediaId: '' },
    ),
    record('photo', 'media', image, null),
    record(
      'social',
      'link',
      link('social', {
        aboutSlot: 'left',
        photoMediaId: 'photo',
        photoCrop: crop,
      }),
      null,
    ),
  ];
  const preview = resolveAboutPhotos(toPortfolio(records, true));
  assert.deepEqual(preview.portrait.crop, crop);
  assert.deepEqual(preview.portrait.readingCrop, readingCrop);
  assert.deepEqual(preview.socials.left.photo.crop, crop);
  assert.equal(preview.portrait.media.url, '/media/photo');
  assert.deepEqual(resolveAboutPhotos(toPortfolio(records)), {
    portrait: null,
    socials: { left: null, center: null, right: null },
  });
  for (const invalid of [
    { ...image, mime: 'video/mp4' },
    { ...image, url: 'javascript:alert(1)' },
    { ...image, url: 'https://user:password@example.com/photo' },
  ]) {
    const resolved = resolveAboutPhotos(
      toPortfolio(
        [records[0], records[2], record('photo', 'media', invalid)],
        true,
      ),
    );
    assert.equal(resolved.portrait, null);
    assert.equal(
      resolved.socials.left.photo,
      null,
      'configured destination remains a platform card when its image is unusable',
    );
    assert.equal(resolved.socials.left.link.url, 'https://example.com/profile');
  }
});

test('validation round-trips optional photo settings and keeps older site exports valid', () => {
  assert.deepEqual(validateContent('site', seedSite), seedSite);
  const crop = { x: 0, y: 1, zoom: 3 };
  const site = {
    ...seedSite,
    portraitMediaId: 'photo-1',
    portraitCrop: crop,
    portraitReadingCrop: { x: 1, y: 0, zoom: 1 },
  };
  assert.deepEqual(validateContent('site', site), site);
  const social = {
    title: 'GitHub',
    url: 'https://github.com/example',
    aboutSlot: 'left',
    photoMediaId: 'photo-1',
    photoCrop: crop,
  };
  assert.deepEqual(validateContent('link', social), social);
  for (const bad of [
    null,
    [],
    {},
    { x: 0.5, y: 0.5, zoom: 0 },
    { x: 2, y: 0, zoom: 1 },
    { x: 0, y: NaN, zoom: 1 },
    { x: '0', y: 0, zoom: 1 },
    { ...crop, width: 3 },
  ]) {
    assert.throws(
      () => validateContent('site', { ...site, portraitCrop: bad }),
      /Photo position/,
    );
    assert.throws(
      () => validateContent('link', { ...social, photoCrop: bad }),
      /Photo position/,
    );
  }
  assert.throws(
    () => validateContent('link', { ...social, aboutSlot: 'ceiling' }),
    /About photo position/,
  );
  assert.throws(
    () => validateContent('link', { ...social, photoMediaId: '../private' }),
    /valid photoMediaId/,
  );
  assert.throws(
    () => validateContent('site', { ...site, portraitMediaId: '/media/photo' }),
    /valid portraitMediaId/,
  );
});

test('publishing photos requires published image metadata, uses the live MIME and prevents occupied About slots', () => {
  const selected = { portraitMediaId: 'photo' };
  assert.deepEqual(directAboutPhotoMediaIds('site', selected), ['photo']);
  assert.deepEqual(
    directAboutPhotoMediaIds('link', {
      photoMediaId: 'photo',
      aboutSlot: 'off',
    }),
    ['photo'],
  );
  assert.throws(
    () => validateAboutPhotoPublication('site', selected, []),
    /missing/,
  );
  assert.throws(
    () =>
      validateAboutPhotoPublication('site', selected, [
        record('photo', 'media', image, null),
      ]),
    /Publish the photo/,
  );
  const video = { ...image, mime: 'video/mp4' };
  assert.throws(
    () =>
      validateAboutPhotoPublication('site', selected, [
        record('photo', 'media', image, video),
      ]),
    /Choose image/,
  );
  assert.doesNotThrow(() =>
    validateAboutPhotoPublication('site', selected, [
      record('photo', 'media', video, image),
    ]),
  );
  const existing = record(
    'other',
    'link',
    link('other', { aboutSlot: 'off' }),
    link('other', { aboutSlot: 'center' }),
  );
  assert.throws(
    () =>
      validateAboutPhotoPublication(
        'link',
        { aboutSlot: 'center' },
        [existing],
        'new',
      ),
    /used by/,
  );
  assert.doesNotThrow(() =>
    validateAboutPhotoPublication(
      'link',
      { aboutSlot: 'center' },
      [existing],
      'other',
    ),
  );
});

test('published photos protect the actual uploaded source when imported metadata aliases a managed URL', () => {
  const selected = { portraitMediaId: 'alias' };
  const alias = record('alias', 'media', { ...image, url: '/media/photo' });
  const source = record('photo', 'media', image);
  assert.deepEqual(
    directAboutPhotoMediaIds('site', selected, [alias, source]),
    ['alias', 'photo'],
  );
  assert.throws(
    () => validateAboutPhotoPublication('site', selected, [alias]),
    /missing/,
  );
  assert.throws(
    () =>
      validateAboutPhotoPublication('site', selected, [
        alias,
        { ...source, published: null },
      ]),
    /Publish the photo/,
  );
  assert.throws(
    () =>
      validateAboutPhotoPublication('site', selected, [
        alias,
        { ...source, published: { ...image, mime: 'video/mp4' } },
      ]),
    /Choose image/,
  );
  assert.doesNotThrow(() =>
    validateAboutPhotoPublication('site', selected, [alias, source]),
  );
});
