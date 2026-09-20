import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundled = await build({
  stdin: {
    contents:
      "export * from './features/studio/project-editor-helpers.ts'; export * from './lib/content/project-content.ts';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const {
  projectEditorDraft,
  insertProjectMedia,
  projectAssetPublication,
  projectUploadError,
  projectBody,
} = await import(
  'data:text/javascript;base64,' +
    Buffer.from(bundled.outputFiles[0].text).toString('base64')
);

test('first save derives a URL while subsequent title edits preserve authored slugs and legacy story', () => {
  const original = {
    title: 'Café / Orbital Tools',
    slug: '',
    problem: 'A legacy problem.',
    system: 'Existing design.',
  };
  const first = projectEditorDraft(original);
  assert.equal(first.slug, 'cafe-orbital-tools');
  assert.equal(original.slug, '');
  assert.equal('body' in first, false);
  assert.match(projectBody(first), /A legacy problem/);
  assert.equal(
    projectEditorDraft({ ...first, title: 'A renamed project' }).slug,
    first.slug,
  );
  assert.equal(
    projectEditorDraft({ ...first, slug: 'custom-link' }).slug,
    'custom-link',
  );
});

test('media insertion replaces only the selected text and produces safe managed image/video references', () => {
  const body = 'Before selected after';
  const image = {
    id: 'image-1',
    mime: 'image/webp',
    alt: 'Dashboard [overview]',
  };
  const inserted = insertProjectMedia(body, image, 7, 15);
  assert.equal(
    inserted.body,
    'Before \n\n![Dashboard \\[overview\\]](/media/image-1)\n\n after',
  );
  assert.equal(inserted.body.slice(inserted.caret), ' after');
  assert.equal(
    insertProjectMedia('', {
      id: 'video-1',
      mime: 'video/mp4',
      alt: 'Product tour',
    }).body,
    '[Product tour](/media/video-1)',
  );
  assert.equal(
    insertProjectMedia('Keep this.', image).body.startsWith('Keep this.\n\n!['),
    true,
  );
});

const record = (id, draft, published = null) => ({
  id,
  kind: 'media',
  draft,
  published,
  revision: 1,
  updatedAt: '',
});
test('explicit media publication includes referenced dependencies in order and excludes unrelated private files', () => {
  const poster = record('poster', { mime: 'image/png', title: 'Poster' });
  const captions = record('captions', { mime: 'text/vtt', title: 'Captions' });
  const video = record('video', {
    mime: 'video/mp4',
    title: 'Tour',
    posterMediaId: 'poster',
    captionsMediaId: 'captions',
  });
  const privateFile = record('other', {
    mime: 'image/png',
    title: 'Do not publish',
  });
  const data = {
    title: 'Keep my unsaved title',
    body: '[Product tour](/media/video)',
  };
  const previous = structuredClone(data);
  const publication = projectAssetPublication(data, [
    video,
    privateFile,
    poster,
    captions,
  ]);
  assert.equal(publication.error, '');
  assert.deepEqual(
    publication.pending.map((r) => r.id),
    ['poster', 'captions', 'video'],
  );
  assert.deepEqual(data, previous);
  const publicRecords = [poster, captions, video].map((r) => ({
    ...r,
    published: { ...r.draft },
  }));
  assert.deepEqual(projectAssetPublication(data, publicRecords).pending, []);
  publicRecords[0].draft.alt = 'Changed poster description';
  assert.deepEqual(
    projectAssetPublication(data, publicRecords).pending.map((r) => r.id),
    ['poster'],
  );
});

test('missing references remain actionable instead of crashing the editor or reporting ready', () => {
  const result = projectAssetPublication(
    { body: '![Missing](/media/not-found)' },
    [],
  );
  assert.match(result.error, /missing/i);
  assert.deepEqual(result.pending, []);
});

test('upload limits distinguish images, video and captions before submitting', () => {
  assert.equal(
    projectUploadError({
      name: 'image.webp',
      type: 'image/webp',
      size: 5 * 1024 * 1024,
    }),
    null,
  );
  assert.match(
    projectUploadError({
      name: 'image.webp',
      type: 'image/webp',
      size: 5 * 1024 * 1024 + 1,
    }),
    /5 MiB/,
  );
  assert.equal(
    projectUploadError({
      name: 'demo.mp4',
      type: 'video/mp4',
      size: 12 * 1024 * 1024,
    }),
    null,
  );
  assert.match(
    projectUploadError({
      name: 'demo.webm',
      type: 'video/webm',
      size: 12 * 1024 * 1024 + 1,
    }),
    /12 MiB/,
  );
  assert.equal(
    projectUploadError({ name: 'captions.vtt', type: '', size: 256 * 1024 }),
    null,
  );
  assert.match(
    projectUploadError({
      name: 'captions.vtt',
      type: 'text/plain',
      size: 256 * 1024 + 1,
    }),
    /256 KiB/,
  );
  assert.match(
    projectUploadError({ name: 'script.html', type: 'text/html', size: 10 }),
    /Choose/,
  );
});
