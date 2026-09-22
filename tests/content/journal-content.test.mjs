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
      "export * from './lib/content/notebook-pages.ts';",
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
  normalizeNotebookBody,
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
    validateContent('journal', {
      ...chapter,
      body: 'a'.repeat(100000),
    }).body.length,
    100000,
  );
  assert.throws(
    () =>
      validateContent('journal', {
        ...chapter,
        body: 'a'.repeat(100001),
      }),
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

test('legacy page markers become paragraph breaks while code and authored whitespace are preserved', () => {
  const pages = [
    '\n    preserve indentation\n\n',
    '## Next part\n\nA second part.\n',
  ];
  const legacy = pages.join('\n\n<!-- notebook-page -->\n\n');
  assert.equal(normalizeNotebookBody(legacy), pages.join('\n\n'));
  assert.equal(normalizeNotebookBody(chapter.body), chapter.body);
  const fenced = '```html\n<!-- notebook-page -->\n```\n';
  assert.equal(normalizeNotebookBody(fenced), fenced);
  const indentedCode = '    <!-- notebook-page -->\n';
  assert.equal(normalizeNotebookBody(indentedCode), indentedCode);
  const many = Array.from({ length: 40 }, () => 'A complete paragraph.').join(
    '\n\n<!-- notebook-page -->\n\n',
  );
  assert.equal(
    validateContent('journal', { ...chapter, body: many }).body,
    many,
  );
  assert.equal(
    normalizeNotebookBody(many).match(/A complete paragraph\./g).length,
    40,
  );
  assert.equal(
    validateContent('journal', { ...chapter, body: 'x'.repeat(8000) }).body
      .length,
    8000,
  );
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
  assert.match(markup, /Notebook section Markdown/);
  assert.match(markup, /    keep this code indentation/);
  assert.match(markup, /Preview/);
  assert.match(markup, /Upload to this section/);
  assert.match(markup, /Use existing media/);
  assert.match(markup, /Subtitle · optional/);
  assert.match(markup, /Display order/);
  assert.match(markup, /Sample content metadata/);
  assert.doesNotMatch(
    markup,
    /<legend>Categories|Short description|Cover image|My role|Tools \/ technology|Live project URL|Source repository URL|Search \/ social/,
  );
});

test('journal editor keeps one continuous Markdown field without manual page controls or fit-gated saving', async () => {
  const { StudioContentFields } = await loadComponent(
    'features/studio/studio-content-fields.tsx',
  );
  const markup = render(StudioContentFields, {
    kind: 'journal',
    data: {
      ...chapter,
      body: 'First part\n\n<!-- notebook-page -->\n\nSecond part',
    },
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
  assert.match(markup, /maxLength="100000"/);
  assert.match(markup, /First part\n\nSecond part/);
  assert.match(markup, /Pages are laid out automatically/);
  assert.doesNotMatch(
    markup,
    /Section pages|Add page|Remove page|Checking paper fit|1,800/,
  );
  assert.doesNotMatch(markup, /&lt;!-- notebook-page --&gt;/);
});

test('journal paper preview includes the biography from the prospective published notebook, ignoring unrelated private drafts', async () => {
  const { JournalPagePreview } = await loadComponent(
    'features/studio/journal-page-preview.tsx',
  );
  const records = [
    {
      id: 'site',
      kind: 'site',
      draft: { biography: 'Private biography draft' },
      published: { biography: 'The published biography' },
    },
    {
      id: 'private-first',
      kind: 'journal',
      draft: { order: -10 },
      published: null,
    },
    {
      id: 'other',
      kind: 'journal',
      draft: { order: -5 },
      published: { order: 5 },
    },
  ];
  const props = {
    records,
    recordId: 'current',
    data: { ...chapter, order: 1 },
    body: chapter.body,
    media: [],
  };
  const first = render(JournalPagePreview, props);
  assert.match(first, /The published biography/);
  assert.doesNotMatch(first, /Private biography draft/);
  const later = render(JournalPagePreview, {
    ...props,
    data: { ...chapter, order: 10 },
  });
  assert.doesNotMatch(later, /The published biography/);
  const mediaPreview = render(JournalPagePreview, {
    ...props,
    body: '[A photo](/media/photo)',
    records: [
      ...records,
      {
        id: 'photo',
        kind: 'media',
        draft: {
          mime: 'video/mp4',
          url: '/media/photo',
          alt: 'Private image edit',
        },
        published: {
          mime: 'video/mp4',
          url: '/media/published-photo',
          alt: 'Published image description',
        },
      },
    ],
    media: [
      {
        id: 'photo',
        mime: 'video/mp4',
        url: '/media/photo',
        alt: 'Private image edit',
      },
    ],
  });
  assert.match(mediaPreview, /src="\/media\/published-photo"/);
  assert.doesNotMatch(mediaPreview, /Private image edit/);
});

test('notebook Markdown accepts natural heading links and existing canonical anchors without changing other room readers', async () => {
  const { NotebookSectionPages } = await loadComponent(
    'features/portfolio/notebook-section-pages.tsx',
  );
  const body =
    '[Jump](#final-note) · [Canonical](#project-final-note)\n\n## Final note\n\nFirst ending.\n\n## Final note\n\n[Second](#final-note-2)';
  const paper = render(NotebookSectionPages, {
    title: 'A section',
    body,
    page: 0,
    headingIdPrefix: 'notebook-test-',
  });
  assert.equal(
    (paper.match(/href="#notebook-test-project-final-note"/g) || []).length,
    2,
  );
  assert.match(paper, /id="notebook-test-project-final-note"/);
  assert.match(paper, /href="#notebook-test-project-final-note-2"/);
  const { ProjectMarkdown } = await loadComponent(
    'features/portfolio/project-markdown.tsx',
  );
  const ordinary = render(ProjectMarkdown, { body });
  assert.match(ordinary, /href="#final-note"/);
  assert.match(ordinary, /href="#project-final-note"/);
});

test('mounted notebook shows page controls only for sections with multiple pages and has no Back button', async () => {
  const { AboutNotebook } = await loadComponent(
    'features/portfolio/about-notebook.tsx',
  );
  const data = {
    site: {
      name: 'Notebook owner',
      domain: 'https://example.com',
      aboutLabel: 'About',
      journalLabel: 'Personal log',
      inviteLabel: 'Contact me',
    },
    journal: [{ id: 'story', ...chapter }],
    links: [],
    media: [],
    projects: [],
    experience: [],
  };
  const props = {
    data,
    section: 0,
    page: 0,
    ready: true,
    pageCounts: [1],
    onSectionChange() {},
    onPageChange() {},
    onPageCount() {},
  };
  const one = render(AboutNotebook, props);
  assert.doesNotMatch(
    one,
    /Back to About|notebook-page-footer|Previous page in section|Next page in section/,
  );
  const several = render(AboutNotebook, { ...props, pageCounts: [3] });
  assert.match(several, /notebook-page-footer/);
  assert.match(several, /Previous page in section/);
  assert.match(several, /Next page in section/);
  assert.match(several, /Page 1 of 3/);
  assert.doesNotMatch(several, /Back to About/);
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
