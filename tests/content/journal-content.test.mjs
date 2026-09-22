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
      "export * from './lib/content/validation.ts';",
      "export * from './features/studio/project-editor-helpers.ts';",
      "export * from './lib/content/project-package-media.ts';",
    ].join('\n'),
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const {
  validateContent,
  projectAssetPublication,
  projectEditorDraft,
  validateProjectPublication,
} = await import(
  'data:text/javascript;base64,' +
    Buffer.from(helpers.outputFiles[0].text).toString('base64')
);
const chapter = {
  title: 'University life',
  slug: 'university-life',
  subtitle: 'Learning with others',
  body: '    keep this code indentation\n\nA **personal** story.\n',
  order: 2,
  sample: false,
};

test('journal Markdown preserves authored whitespace, ordering and sample metadata without changing existing drafts', () => {
  const before = structuredClone(chapter);
  assert.deepEqual(validateContent('journal', chapter), chapter);
  assert.deepEqual(chapter, before);
  assert.equal(
    validateContent('journal', { ...chapter, body: 'a'.repeat(100000) }).body
      .length,
    100000,
  );
  assert.throws(
    () => validateContent('journal', { ...chapter, body: 'a'.repeat(100001) }),
    /100,000/,
  );
  const first = projectEditorDraft({ ...chapter, slug: '' });
  assert.equal(first.slug, 'university-life');
  assert.equal(
    projectEditorDraft({ ...chapter, title: 'An updated chapter title' }).slug,
    chapter.slug,
  );
  assert.equal(first.body, chapter.body);
});

const mediaRecord = (id, draft, published = null) => ({
  id,
  kind: 'media',
  draft,
  published,
  revision: 1,
  updatedAt: '',
});

test('journal publication resolves only authored media and transitive video dependencies without publishing unrelated private files', () => {
  const records = [
    mediaRecord('portrait', { title: 'Portrait', mime: 'image/png' }),
    mediaRecord('captions', { title: 'Caption track', mime: 'text/vtt' }),
    mediaRecord('video', {
      title: 'Campus tour',
      mime: 'video/mp4',
      posterMediaId: 'portrait',
      captionsMediaId: 'captions',
    }),
    mediaRecord('private', { title: 'Private image', mime: 'image/png' }),
  ];
  const story = { ...chapter, body: '[Campus tour](/media/video)' };
  const previous = structuredClone(records);
  const publication = projectAssetPublication(story, records, 'journal');
  assert.equal(publication.error, '');
  assert.deepEqual(
    publication.pending.map((record) => record.id),
    ['portrait', 'captions', 'video'],
  );
  assert.deepEqual(records, previous);
  assert.throws(
    () => validateProjectPublication(story, records, 'notebook chapter'),
    /Publish the referenced/,
  );
  const published = records.map((record) => ({
    ...record,
    published: record.id === 'private' ? null : { ...record.draft },
  }));
  assert.deepEqual(
    validateProjectPublication(story, published, 'notebook chapter').map(
      (record) => record.id,
    ),
    ['portrait', 'captions', 'video'],
  );
  assert.deepEqual(
    projectAssetPublication(story, published, 'journal').pending,
    [],
  );
  assert.match(
    projectAssetPublication(story, [], 'journal').error,
    /missing from the library/,
  );
});

async function loadComponent(entryPoint) {
  const bundled = await build({
    entryPoints: [entryPoint],
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
    process: { env: { NODE_ENV: 'test' } },
    URL,
    URLSearchParams,
    Map,
    WeakMap,
  });
  return loaded.exports;
}
const render = (Component, props) =>
  renderToStaticMarkup(createElement(Component, props));

test('journal soft line breaks remain visible while code and default project/case-study Markdown keep their original semantics', async () => {
  const { ProjectMarkdown } = await loadComponent(
    'features/portfolio/project-markdown.tsx',
  );
  const body =
    'University:\nAn experience worth remembering.\n\n```text\nfirst line\nsecond line\n```';
  const journal = render(ProjectMarkdown, { body, preserveSoftBreaks: true });
  assert.match(
    journal,
    /<p>University:<br\/>An experience worth remembering\.<\/p>/,
  );
  assert.match(journal, /<code[^>]*>first line\nsecond line<\/code>/);
  assert.equal((journal.match(/<br\/>/g) || []).length, 1);
  const ordinary = render(ProjectMarkdown, { body });
  assert.equal(
    journal.match(/<pre>.*?<\/pre>/s)?.[0],
    ordinary.match(/<pre>.*?<\/pre>/s)?.[0],
  );
  assert.match(
    ordinary,
    /<p>University:\nAn experience worth remembering\.<\/p>/,
  );
  assert.doesNotMatch(ordinary, /<br\/>/);
  assert.equal(
    body,
    'University:\nAn experience worth remembering.\n\n```text\nfirst line\nsecond line\n```',
  );
});

test('Studio journal editing uses shared Markdown preview and managed media controls while retaining only journal fields', async () => {
  const { StudioContentFields } = await loadComponent(
    'features/studio/studio-content-fields.tsx',
  );
  const markup = render(StudioContentFields, {
    kind: 'journal',
    data: chapter,
    records: [],
    selected: 'chapter-1',
    siteGroup: 'profile',
    search: '',
    busy: false,
    setData() {},
    async onUpload() {
      return null;
    },
    async onPublishAssets() {},
  });
  assert.match(markup, /Notebook chapter Markdown/);
  assert.match(markup, /    keep this code indentation/);
  assert.match(markup, /Preview/);
  assert.match(markup, /Upload to this chapter/);
  assert.match(markup, /Use existing media/);
  assert.match(markup, /Subtitle · optional/);
  assert.match(markup, /Display order/);
  assert.match(markup, /Sample content metadata/);
  assert.doesNotMatch(
    markup,
    /<legend>Categories|Short description|Cover image|My role|Tools \/ technology|Live project URL|Source repository URL|Search \/ social/,
  );
});

test('About Reading view exposes complete Markdown chapters and media safely with distinct per-chapter heading anchors', async () => {
  const { AboutView } = await loadComponent(
    'features/portfolio/room-views.tsx',
  );
  const commonBody =
    '## Highlights\n\n[Jump to highlights](#project-highlights)\n\n- One thing\n- **Another** thing';
  const data = {
    site: {
      name: 'Notebook owner',
      domain: 'https://example.com',
      aboutLabel: 'About',
      journalLabel: 'Personal log',
      biography: 'A brief introduction.',
      inviteLabel: 'Contact me',
    },
    journal: [
      {
        ...chapter,
        id: 'university',
        body:
          'University:\nAn experience worth remembering.\n\n' +
          commonBody +
          '\n\n![Campus](/media/campus)\n\n[Tour](/media/tour)\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert)',
      },
      {
        ...chapter,
        id: 'career',
        slug: 'career',
        title: 'Career',
        body: commonBody,
      },
    ],
    projects: [],
    experience: [],
    links: [],
    media: [
      {
        id: 'campus',
        mime: 'image/png',
        url: '/media/campus',
        alt: 'The campus courtyard',
      },
      {
        id: 'tour',
        mime: 'video/mp4',
        url: '/media/tour',
        alt: 'A campus tour',
        posterMediaId: 'campus',
        captionsMediaId: 'captions',
      },
      {
        id: 'captions',
        mime: 'text/vtt',
        url: '/media/captions',
        title: 'Captions',
      },
    ],
  };
  const markup = render(AboutView, { data });
  assert.match(markup, /href="#university-life"/);
  assert.match(markup, /href="#career"/);
  assert.match(markup, /<strong>Another<\/strong>/);
  assert.match(
    markup,
    /<p>University:<br\/>An experience worth remembering\.<\/p>/,
  );
  assert.match(markup, /<ul>/);
  assert.match(markup, /id="journal-university-project-highlights"/);
  assert.match(markup, /href="#journal-university-project-highlights"/);
  assert.match(markup, /id="journal-career-project-highlights"/);
  assert.match(markup, /href="#journal-career-project-highlights"/);
  assert.match(markup, /<img[^>]*src="\/media\/campus"/);
  assert.match(markup, /<video[^>]*controls=""[^>]*poster="\/media\/campus"/);
  assert.match(markup, /<track[^>]*src="\/media\/captions"/);
  assert.doesNotMatch(markup, /<script>|href="javascript:/);
  assert.match(markup, /&lt;script&gt;/);
  assert.match(markup, /href="\/contact"/);
});
