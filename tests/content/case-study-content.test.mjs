import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const helpers = await build({
  stdin: {
    contents: [
      "export * from './lib/content/case-study-content.ts';",
      "export * from './lib/content/case-study-media.ts';",
      "export * from './lib/content/validation.ts';",
      "export * from './features/studio/project-editor-helpers.ts';",
    ].join('\n'),
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const {
  CASE_STUDY_CATEGORIES,
  caseStudyBody,
  caseStudyCategories,
  caseStudyCategoryCount,
  directCaseStudyMediaIds,
  validateCaseStudyPublication,
  validateContent,
  projectAssetPublication,
  projectEditorDraft,
} = await import(
  'data:text/javascript;base64,' +
    Buffer.from(helpers.outputFiles[0].text).toString('base64')
);

const legacy = {
  title: 'Existing reliability story',
  slug: 'existing-story',
  organization: 'A team',
  period: '2024–2025',
  role: 'Engineer',
  summary: 'Existing authored summary.',
  context: 'Existing context.',
  decisions: 'Existing decisions.',
  impact: 'Existing impact.',
};

test('archive assignments are explicit, allow multiple categories and retain uncategorized legacy stories in All', () => {
  const assigned = { ...legacy, categories: ['systems', 'product', 'systems'] };
  assert.deepEqual(caseStudyCategories(assigned), ['product', 'systems']);
  assert.deepEqual(caseStudyCategories(legacy), []);
  assert.deepEqual(caseStudyCategories({ categories: 'systems' }), []);
  assert.equal(caseStudyCategoryCount([legacy, assigned], 'all'), 2);
  assert.equal(caseStudyCategoryCount([legacy, assigned], 'systems'), 1);
  assert.equal(caseStudyCategoryCount([legacy, assigned], 'research'), 0);
});

test('legacy story and metadata survive editing while an explicit Markdown body wins without mutating data', () => {
  const before = structuredClone(legacy);
  assert.equal(
    caseStudyBody(legacy),
    '## Context\n\nExisting context.\n\n## Key decisions\n\nExisting decisions.\n\n## Impact\n\nExisting impact.',
  );
  const first = projectEditorDraft({ ...legacy, slug: '' });
  assert.equal(first.slug, 'existing-reliability-story');
  assert.equal(first.context, legacy.context);
  assert.equal('body' in first, false);
  assert.equal(caseStudyBody({ ...legacy, body: '' }), '');
  assert.equal(caseStudyBody({ ...legacy, body: '    code\n' }), '    code\n');
  assert.deepEqual(legacy, before);
});

test('case-study validation accepts Markdown and media without dropping legacy fields or changing authored whitespace', () => {
  assert.deepEqual(validateContent('experience', legacy), legacy);
  const content = {
    ...legacy,
    categories: ['product', 'systems'],
    body: '    preserve indentation\n\n',
    mediaId: 'cover-image',
    seoTitle: 'A case study',
    seoDescription: 'Search description',
  };
  assert.deepEqual(validateContent('experience', content), content);
  assert.equal(
    validateContent('experience', { ...content, body: 'a'.repeat(100000) }).body
      .length,
    100000,
  );
  assert.throws(
    () =>
      validateContent('experience', { ...content, body: 'a'.repeat(100001) }),
    /100,000/,
  );
  for (const categories of [['experiments'], ['all'], [], 'systems'])
    assert.throws(() =>
      validateContent('experience', { ...content, categories }),
    );
  assert.throws(
    () => validateContent('project', { ...content, categories: ['product'] }),
    /Choose Systems/,
  );
  assert.throws(
    () => validateContent('experience', { ...content, mediaId: '../private' }),
    /valid mediaId/,
  );
});

const mediaRecord = (id, draft, published = draft) => ({
  id,
  kind: 'media',
  draft,
  published,
  revision: 1,
  updatedAt: '',
});

test('case-study media checks include legacy Markdown, cover and video dependencies while preserving private drafts', () => {
  const cover = mediaRecord('cover', { title: 'Cover', mime: 'image/png' });
  const captions = mediaRecord('captions', {
    title: 'Captions',
    mime: 'text/vtt',
  });
  const video = mediaRecord('video', {
    title: 'Walkthrough',
    mime: 'video/mp4',
    posterMediaId: 'cover',
    captionsMediaId: 'captions',
  });
  const unrelated = mediaRecord('private', { mime: 'image/png' }, null);
  const study = {
    ...legacy,
    mediaId: 'cover',
    context: '[Walkthrough](/media/video)',
  };
  assert.deepEqual(directCaseStudyMediaIds(study), ['cover', 'video']);
  assert.deepEqual(
    validateCaseStudyPublication(study, [
      video,
      captions,
      cover,
      unrelated,
    ]).map((r) => r.id),
    ['cover', 'captions', 'video'],
  );
  const unpublished = [cover, captions, video].map((r) => ({
    ...r,
    published: null,
  }));
  assert.throws(
    () => validateCaseStudyPublication(study, unpublished),
    /Publish the referenced/,
  );
  assert.deepEqual(
    projectAssetPublication(
      study,
      [...unpublished, unrelated],
      'experience',
    ).pending.map((r) => r.id),
    ['cover', 'captions', 'video'],
  );
  assert.throws(
    () =>
      validateCaseStudyPublication({ ...study, mediaId: 'video' }, [
        video,
        captions,
        cover,
      ]),
    /image for the case study cover/,
  );
  assert.throws(() => validateCaseStudyPublication(study, []), /missing/);
  assert.deepEqual(directCaseStudyMediaIds({ ...study, body: '' }), ['cover']);
});

test('the shared Studio editor gives case studies their categories, metadata and legacy story without project-only fields', async () => {
  const bundled = await build({
    entryPoints: ['features/studio/project-editor.tsx'],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['react', 'react/jsx-runtime'],
    loader: { '.css': 'empty' },
    logLevel: 'silent',
  });
  const loaded = { exports: {} };
  runInNewContext(bundled.outputFiles[0].text, {
    require: createRequire(import.meta.url),
    module: loaded,
    exports: loaded.exports,
    URL,
  });
  const { ProjectEditor } = loaded.exports;
  const render = (kind) =>
    renderToStaticMarkup(
      createElement(ProjectEditor, {
        kind,
        data: legacy,
        records: [],
        busy: false,
        onChange() {},
        async onUpload() {
          return null;
        },
        async onPublishAssets() {},
      }),
    );
  const study = render('experience');
  assert.match(study, /Case study Markdown/);
  assert.match(study, /## Context\n\nExisting context/);
  assert.match(study, /Organization \/ team · optional/);
  assert.match(study, /Period · optional/);
  assert.match(study, /All case studies/);
  for (const { label } of CASE_STUDY_CATEGORIES)
    assert.ok(study.includes(label.replaceAll('&', '&amp;')), label);
  assert.doesNotMatch(
    study,
    /Live project URL|Tools \/ technology|Source repository URL/,
  );
  const project = render('project');
  assert.match(project, /Project Markdown/);
  assert.match(project, /Live project URL/);
  assert.doesNotMatch(
    project,
    /Organization \/ team · optional|Period · optional/,
  );
});
