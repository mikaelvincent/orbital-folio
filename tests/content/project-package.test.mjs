import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { zipSync, strToU8 } from 'fflate';

const bundled = await build({
  stdin: {
    contents: `export * from './lib/content/project-package.ts'; export * from './lib/content/project-package-media.ts'; export * from './lib/content/project-content.ts'; export * from './lib/content/media-upload.ts'; export * from './lib/content/validation.ts'; export * from './lib/content/project-markdown.ts';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'esm',
  logLevel: 'silent',
});
const {
  parseProjectPackage,
  materializeProjectPackage,
  buildProjectPackage,
  readProjectArchive,
  projectCategories,
  projectBody,
  projectSlug,
  validateContent,
  validateMediaBytes,
  MEDIA_LIMITS,
  projectMediaClosure,
  validateProjectPublication,
  rewriteProjectMedia,
  projectMediaReferences,
} = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`
);
const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=',
    'base64',
  ),
);
const mp4 = new Uint8Array(32);
mp4.set([0, 0, 0, 32]);
mp4.set(strToU8('ftypisom'), 4);
const vtt = strToU8(
  'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nA project demonstration.\n',
);
const make = (
  metadata = '',
  body = '## Overview\n\nA useful project.',
  assets = {},
) =>
  zipSync({
    'project.md': strToU8(
      `---\nformat: orbital-project/v1\ntitle: Atlas\nsummary: A useful map\ncategories: [systems, interfaces]\n${metadata}---\n\n${body}`,
    ),
    ...assets,
  });

test('project metadata is explicit, bounded and legacy-compatible', () => {
  assert.deepEqual(
    projectCategories({ title: 'Interface system', category: 'Systems' }),
    [],
  );
  assert.deepEqual(
    projectCategories({
      categories: ['systems', 'systems', 'experiments', 'invalid'],
    }),
    ['systems', 'experiments'],
  );
  assert.equal(
    projectSlug('  Café / Atlas — Version 2  '),
    'cafe-atlas-version-2',
  );
  assert.equal(
    projectBody({ problem: 'An old problem', outcomes: 'An outcome' }),
    '## The problem\n\nAn old problem\n\n## Results\n\nAn outcome',
  );
  assert.equal(projectBody({ body: '', problem: 'Legacy' }), '');
  assert.doesNotThrow(() =>
    validateContent('project', {
      title: 'Legacy',
      slug: 'legacy',
      problem: 'Old story',
    }),
  );
  for (const categories of [[], ['unknown'], 'systems'])
    assert.throws(() =>
      validateContent('project', {
        title: 'New',
        slug: 'new',
        summary: 'Summary',
        categories,
      }),
    );
  assert.throws(
    () =>
      validateContent('project', {
        title: 'New',
        slug: 'new',
        categories: ['systems'],
      }),
    /description/,
  );
  const body = 'a'.repeat(50000);
  assert.equal(
    validateContent('project', {
      title: 'New',
      slug: 'new',
      summary: 'Summary',
      categories: ['systems'],
      body,
    }).body,
    body,
  );
  assert.throws(() =>
    validateContent('project', {
      title: 'New',
      slug: 'new',
      body: 'a'.repeat(100001),
    }),
  );
});

test('package roundtrip preserves Markdown, category choices, covers and video dependencies', () => {
  const original = make(
    `cover: assets/cover.png\nmedia:\n  - path: assets/cover.png\n    alt: Atlas map\n  - path: assets/demo.mp4\n    alt: Atlas demonstration\n    poster: assets/cover.png\n    captions: assets/demo.vtt\n  - path: assets/demo.vtt\n    alt: English captions\n`,
    '## Story\n\n![Map](assets/cover.png "Map title")\n\n[Watch the demo][clip]\n\n[clip]: assets/demo.mp4\n\n```md\n![Example](assets/cover.png)\n```\n',
    { 'assets/cover.png': png, 'assets/demo.mp4': mp4, 'assets/demo.vtt': vtt },
  );
  const parsed = parseProjectPackage(original);
  assert.equal(parsed.project.slug, 'atlas');
  let next = 0;
  const imported = materializeProjectPackage(parsed, () => 'id-' + ++next);
  assert.deepEqual(projectMediaReferences(imported.project.body), [
    '/media/id-1',
    '/media/id-2',
  ]);
  assert.ok(
    imported.project.body.includes('![Example](assets/cover.png)'),
    'fenced syntax examples remain untouched',
  );
  assert.equal(imported.project.mediaId, 'id-1');
  assert.equal(imported.media[1].data.posterMediaId, 'id-1');
  assert.equal(imported.media[1].data.captionsMediaId, 'id-3');
  // Human-facing captions are metadata, not regenerated UUID filenames.
  imported.media[0].data.title = 'Atlas map overview';
  imported.media[1].data.title = 'Tour of the map controls';
  imported.media[2].data.title = 'Tour captions in English';
  const exported = buildProjectPackage(imported.project, imported.media);
  const reparsed = parseProjectPackage(exported);
  assert.deepEqual(reparsed.project.categories, ['systems', 'interfaces']);
  assert.equal(reparsed.media.length, 3);
  const restored = materializeProjectPackage(
    reparsed,
    () => 'restored-' + ++next,
  );
  assert.deepEqual(
    restored.media.map((asset) => asset.data.title),
    imported.media.map((asset) => asset.data.title),
  );
  assert.deepEqual(
    reparsed.media.find((m) => m.mime === 'video/mp4').bytes,
    mp4,
  );
  assert.ok(reparsed.project.body.includes('[clip]: assets/id-2.mp4'));
  assert.ok(reparsed.project.body.includes('![Example](assets/cover.png)'));
});

test('Markdown rewriting retains reference definitions, prose and fenced examples', () => {
  const input =
    'Prose /media/id-1 stays.\n\n![Image][pic]\n\n[pic]: /media/id-1 "Image"\n\n~~~md\n![Example](/media/id-1)\n~~~\n';
  const result = rewriteProjectMedia(
    input,
    new Map([['/media/id-1', 'assets/photo.png']]),
  );
  assert.ok(result.includes('Prose /media/id-1 stays.'));
  assert.ok(result.includes('[pic]: assets/photo.png "Image"'));
  assert.ok(result.includes('![Example](/media/id-1)'));
});

test('media destination rewrites preserve inline, escaped and nested code examples exactly', () => {
  const examples = [
    '`![Example](/media/id-1)`',
    '!\\[Escaped](/media/id-1)',
    '> ```md\n> ![Example](/media/id-1)\n> ```',
    '- ```md\n  ![Example](/media/id-1)\n  ```',
    '> - ```md\n>   ![Example](/media/id-1)\n>   ```',
    '> `![Example](/media/id-1)`',
    '- `![Example](/media/id-1)`',
  ];
  for (const example of examples) {
    for (const newline of ['\n', '\r\n']) {
      const input = (
        '![Real](/media/id-1)\n\n' +
        example +
        '\n\n![After](/media/id-1)\n'
      ).replaceAll('\n', newline);
      const expected = (
        '![Real](assets/photo.png)\n\n' +
        example +
        '\n\n![After](assets/photo.png)\n'
      ).replaceAll('\n', newline);
      assert.equal(
        rewriteProjectMedia(
          input,
          new Map([['/media/id-1', 'assets/photo.png']]),
        ),
        expected,
        example,
      );
    }
  }
  const nested =
    '> ```md\n> ![Same](/media/id-1)\n> ```\n>\n> ![Same](/media/id-1)\n';
  assert.equal(
    rewriteProjectMedia(nested, new Map([['/media/id-1', 'assets/photo.png']])),
    '> ```md\n> ![Same](/media/id-1)\n> ```\n>\n> ![Same](assets/photo.png)\n',
  );
});

test('nested reference definitions survive export and reimport without managed URLs leaking into the package', () => {
  const examples = [
    '- [Download][asset]\n\n    [asset]: /media/id-1\n',
    '> [Download][asset]\n>\n> [asset]: /media/id-1\n',
    '- [Download][asset]\n\n    [asset]:\n      </media/id-1>\n',
  ];
  for (const body of examples) {
    const project = {
      title: 'Project',
      slug: 'project',
      summary: 'Summary',
      categories: ['systems'],
      body,
    };
    const exported = buildProjectPackage(project, [
      {
        id: 'id-1',
        data: { title: 'Cover', alt: 'Cover image', mime: 'image/png' },
        bytes: png,
      },
    ]);
    const parsed = parseProjectPackage(exported);
    assert.equal(
      parsed.project.body,
      body.replace('/media/id-1', 'assets/id-1.png'),
    );
    const imported = materializeProjectPackage(parsed, () => 'new-media');
    assert.deepEqual(projectMediaReferences(imported.project.body), [
      '/media/new-media',
    ]);
  }
  // Decoded escape syntax that cannot be mapped exactly must never produce a
  // successfully downloaded package with a stale managed URL.
  assert.throws(
    () =>
      buildProjectPackage(
        {
          title: 'Project',
          slug: 'project',
          summary: 'Summary',
          categories: ['systems'],
          body: '![Image](/media/id\\-1)',
        },
        [
          {
            id: 'id-1',
            data: { title: 'Cover', alt: 'Cover', mime: 'image/png' },
            bytes: png,
          },
        ],
      ),
    /unsupported Markdown/,
  );
});

test('packages reject unsafe paths, undeclared/missing assets and malformed metadata before any writes', () => {
  const cases = [
    zipSync({ '../project.md': strToU8('unsafe') }),
    zipSync({ 'project.md': strToU8('no frontmatter') }),
    make('title: Duplicate\n'),
    make('unexpected: value\n'),
    make('cover: https://example.com/x.png\n'),
    make('', '![Missing](assets/no.png)'),
    make('', '![External](https://example.com/private.png)'),
    make('', 'Story', { 'assets/extra.png': png }),
    make(
      'media: [{path: assets/a.html, alt: A}]\n',
      '[Download](assets/a.html)',
      { 'assets/a.html': strToU8('<script>bad</script>') },
    ),
    make(
      'media: [{path: assets/image.png, alt: A}]\n',
      '![A](assets/image.png)',
      { 'assets/image.png': strToU8('<html>not an image</html>') },
    ),
    make('media: [{path: assets/image.png, alt: A}]\n', 'Story', {
      'assets/image.png': png,
    }),
    make(
      'media: [{path: assets/image.png, alt: A, captions: assets/no.vtt}]\n',
      '![A](assets/image.png)',
      { 'assets/image.png': png },
    ),
    make('media: &assets [*assets]\n'),
  ];
  for (const bytes of cases) assert.throws(() => parseProjectPackage(bytes));
});

test('ZIP validation rejects duplicate names, symlinks, checksum damage and false expansion sizes', () => {
  const original = zipSync(
    {
      'project.md': strToU8('metadata'),
      'assets/a.png': png,
      'assets/b.png': png,
    },
    { level: 0 },
  );
  const duplicate = Uint8Array.from(
    Buffer.from(original)
      .toString('latin1')
      .replaceAll('assets/b.png', 'assets/a.png'),
    (c) => c.charCodeAt(0),
  );
  assert.throws(() => readProjectArchive(duplicate), /unique|repeated/);
  const symlink = original.slice();
  let firstCentral = -1;
  const view = new DataView(symlink.buffer);
  for (let i = 0; i < symlink.length - 4; i++)
    if (view.getUint32(i, true) === 0x02014b50) {
      firstCentral = i;
      break;
    }
  view.setUint32(firstCentral + 38, 0xa1ff0000, true);
  assert.throws(() => readProjectArchive(symlink), /links/);
  const corruption = original.slice();
  corruption[40] ^= 1;
  assert.throws(() => readProjectArchive(corruption), /checksum|ZIP/);
  const oversized = original.slice();
  new DataView(oversized.buffer).setUint32(
    firstCentral + 24,
    25 * 1024 * 1024,
    true,
  );
  assert.throws(() => readProjectArchive(oversized), /large/);
  const understatement = original.slice();
  new DataView(understatement.buffer).setUint32(firstCentral + 24, 1, true);
  assert.throws(() => readProjectArchive(understatement), /declared size/);
});

test('media upload signature and size rules cover video and captions as well as images', () => {
  assert.doesNotThrow(() => validateMediaBytes(png, 'image/png'));
  assert.doesNotThrow(() => validateMediaBytes(mp4, 'video/mp4'));
  assert.doesNotThrow(() => validateMediaBytes(vtt, 'text/vtt'));
  assert.throws(
    () => validateMediaBytes(strToU8('<html>'), 'video/mp4'),
    /contents/,
  );
  assert.throws(
    () => validateMediaBytes(strToU8('not VTT'), 'text/vtt'),
    /contents/,
  );
  assert.throws(
    () =>
      validateMediaBytes(new Uint8Array(MEDIA_LIMITS.video + 1), 'video/mp4'),
    /larger/,
  );
  assert.throws(() => validateMediaBytes(png, 'image/svg+xml'), /Use/);
});

const record = (id, data, published = data) => ({
  id,
  kind: 'media',
  draft: data,
  published,
  revision: 1,
  updatedAt: 'now',
});
test('publication follows only referenced published media and never exposes unrelated drafts', () => {
  const image = {
    title: 'Cover',
    alt: 'Cover',
    mime: 'image/png',
    url: '/media/cover',
  };
  const captions = {
    title: 'Captions',
    alt: 'Captions',
    mime: 'text/vtt',
    url: '/media/captions',
  };
  const video = {
    title: 'Video',
    alt: 'Video',
    mime: 'video/mp4',
    url: '/media/video',
    posterMediaId: 'cover',
    captionsMediaId: 'captions',
  };
  const records = [
    record('cover', image),
    record('captions', captions),
    record('video', { ...video, posterMediaId: 'private' }, video),
    record('private', image, null),
    record('unrelated', image, null),
  ];
  const project = { mediaId: 'cover', body: '[Demo](/media/video)' };
  assert.deepEqual(
    validateProjectPublication(project, records).map((r) => r.id),
    ['cover', 'captions', 'video'],
  );
  assert.deepEqual(
    projectMediaClosure(project, records).map((r) => r.id),
    ['cover', 'private', 'captions', 'video'],
  );
  assert.throws(
    () =>
      validateProjectPublication(
        { body: '![Private](/media/private)' },
        records,
      ),
    /Publish/,
  );
  assert.throws(
    () =>
      validateProjectPublication(
        { body: '![Missing](/media/missing)' },
        records,
      ),
    /missing/,
  );
  assert.throws(
    () => validateProjectPublication({ mediaId: 'video' }, records),
    /image/,
  );
  assert.throws(
    () =>
      projectMediaClosure({ body: '[Video](/media/cycle)' }, [
        record('cycle', { ...video, posterMediaId: 'cycle' }),
      ]),
    /poster|cycle/,
  );
});

test('export applies import document-byte and generated-story limits before creating a ZIP', () => {
  const project = {
    title: 'Project',
    slug: 'project',
    summary: 'Summary',
    categories: ['systems'],
  };
  assert.throws(
    () => buildProjectPackage({ ...project, body: '海'.repeat(100000) }, []),
    /256 KiB document limit/,
  );
  const legacy = {
    title: 'Legacy',
    slug: 'legacy',
    problem: 'a'.repeat(20000),
    approach: 'b'.repeat(20000),
    system: 'c'.repeat(20000),
    decisions: 'd'.repeat(20000),
    outcomes: 'e'.repeat(20000),
    next: 'f'.repeat(20000),
  };
  assert.throws(() => buildProjectPackage(legacy, []), /100,000 characters/);
  const supported = { ...project, body: '海'.repeat(80000) };
  assert.equal(
    parseProjectPackage(buildProjectPackage(supported, [])).project.body,
    supported.body,
  );
});

test('story limits hold after media URL rewriting in both import and export directions', () => {
  const project = {
    title: 'Project',
    slug: 'project',
    summary: 'Summary',
    categories: ['systems'],
  };
  const asset = {
    id: 'id-1',
    data: { title: 'Image', alt: 'Image', mime: 'image/png' },
    bytes: png,
  };
  const story = (length, url) => {
    const image = `![Image](${url})`;
    return 'a'.repeat(length - image.length - 2) + '\n\n' + image;
  };
  assert.throws(
    () =>
      buildProjectPackage({ ...project, body: story(100000, '/media/id-1') }, [
        asset,
      ]),
    /after media paths/,
  );
  assert.throws(
    () =>
      buildProjectPackage({ ...project, body: story(99980, '/media/id-1') }, [
        asset,
      ]),
    /when its media is imported/,
  );
  const nearLimit = parseProjectPackage(
    make(
      'media: [{path: assets/a.png, alt: Image}]\n',
      story(100000, 'assets/a.png'),
      { 'assets/a.png': png },
    ),
  );
  assert.throws(
    () =>
      materializeProjectPackage(
        nearLimit,
        () => '01234567-89ab-4def-8123-456789abcdef',
      ),
    /body must be text under 100,000/,
  );
  const valid = buildProjectPackage(
    { ...project, body: story(99950, '/media/id-1') },
    [asset],
  );
  const imported = materializeProjectPackage(
    parseProjectPackage(valid),
    () => '01234567-89ab-4def-8123-456789abcdef',
  );
  assert.ok(imported.project.body.length <= 100000);
  assert.doesNotThrow(() => validateContent('project', imported.project));
});

test('project Markdown preserves leading indented code and surrounding whitespace on save and package roundtrip', () => {
  for (const body of [
    '    const answer = 42;\n',
    '\n\n    const answer = 42;\n\n',
  ]) {
    const data = {
      title: ' Project ',
      slug: 'project',
      summary: ' Summary ',
      categories: ['systems'],
      body,
    };
    const saved = validateContent('project', data);
    assert.equal(saved.body, body);
    assert.equal(saved.title, 'Project');
    assert.equal(saved.summary, 'Summary');
    const parsed = parseProjectPackage(buildProjectPackage(saved, []));
    assert.equal(parsed.project.body, body);
    assert.equal(
      materializeProjectPackage(parsed, () => 'unused').project.body,
      body,
    );
    assert.equal(projectBody(parsed.project), body);
  }
});

test('export preflights its exact metadata and asset manifest through the importer', () => {
  const project = {
    title: 'Project',
    slug: 'project',
    summary: 'Summary',
    categories: ['systems'],
    body: '![Image](/media/id-1)',
  };
  // Older generic media validation accepted longer alt text than package metadata.
  assert.throws(
    () =>
      buildProjectPackage(project, [
        {
          id: 'id-1',
          data: { title: 'Image', alt: 'a'.repeat(1001), mime: 'image/png' },
          bytes: png,
        },
      ]),
    /alt text/,
  );
  // A never-classified empty legacy stub needs classification before it can be
  // an authored portable project; do not emit a ZIP the importer will reject.
  assert.throws(
    () =>
      buildProjectPackage(
        { title: 'Legacy stub', slug: 'legacy-stub', body: 'A story' },
        [],
      ),
    /category/,
  );
});

test('export never fetches external URLs or silently drops a missing managed asset', () => {
  const project = {
    title: 'Project',
    slug: 'project',
    summary: 'Summary',
    categories: ['systems'],
  };
  assert.throws(
    () =>
      buildProjectPackage(
        { ...project, body: '![Remote](https://example.com/private.png)' },
        [],
      ),
    /never downloaded/,
  );
  assert.throws(
    () =>
      buildProjectPackage(
        { ...project, body: '![Missing](/media/missing)' },
        [],
      ),
    /never downloaded/,
  );
});
