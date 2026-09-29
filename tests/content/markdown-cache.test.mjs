import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { seeds } from '../../lib/content/seed.ts';

const bundled = await build({
  stdin: {
    contents: [
      "export * from './features/portfolio/project-markdown-content.ts';",
      "export * from './features/portfolio/project-markdown.tsx';",
      "export * from './features/portfolio/notebook-section-pages.tsx';",
    ].join('\n'),
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['react', 'react/jsx-runtime'],
  loader: { '.css': 'empty' },
  logLevel: 'silent',
});

function load(browser = true) {
  const loaded = { exports: {} };
  runInNewContext(bundled.outputFiles[0].text, {
    module: loaded,
    exports: loaded.exports,
    require: createRequire(import.meta.url),
    URL,
    ...(browser ? { window: {} } : {}),
  });
  return loaded.exports;
}
const render = (Component, props) =>
  renderToStaticMarkup(createElement(Component, props));
const json = (value) => JSON.parse(JSON.stringify(value));

test('browser parses use the complete body and soft-break option, including live edits', () => {
  const { parseProjectMarkdown: parse } = load();
  const body = '## A heading\n\nFirst line\nsecond line.';
  const ordinary = parse(body);
  assert.equal(parse(body, { preserveSoftBreaks: false }), ordinary);
  const notebook = parse(body, { preserveSoftBreaks: true });
  assert.notEqual(notebook, ordinary);
  assert.equal(parse(body, { preserveSoftBreaks: true }), notebook);
  assert.match(JSON.stringify(notebook.tokens), /"type":"br"/);
  assert.doesNotMatch(JSON.stringify(ordinary.tokens), /"type":"br"/);
  const edited = parse(body.replace('A heading', 'New heading'));
  assert.equal(edited.headings[0].id, 'project-new-heading');
  assert.notEqual(edited, ordinary);
  assert.equal(parse(body), ordinary);
  assert.equal(parse('').tokens.length, 0);
});

test('server invocations and separate browser documents do not share retained results', () => {
  const server = load(false);
  const body = '## Private preview\n\nDraft text';
  const first = server.parseProjectMarkdown(body);
  const second = server.parseProjectMarkdown(body);
  assert.notEqual(first, second);
  first.headings[0].text = 'Changed by a caller';
  assert.equal(second.headings[0].text, 'Private preview');
  const browser = load();
  assert.notEqual(browser.parseProjectMarkdown(body), first);
  assert.notEqual(
    load().parseProjectMarkdown(body),
    browser.parseProjectMarkdown(body),
  );
});

test('nested tokens, table cells, reference definitions and headings cannot poison later cache hits', () => {
  const { parseProjectMarkdown: parse } = load();
  const body =
    '## **Heading**\n\n- [x] Nested *task*\n\n| Name |\n| --- |\n| [Value][ref] |\n\n[ref]: https://example.com';
  const parsed = parse(body);
  const pending = [parsed];
  while (pending.length) {
    const item = pending.pop();
    assert.ok(Object.isFrozen(item));
    for (const value of Object.values(item))
      if (value && typeof value === 'object') pending.push(value);
  }
  const snapshot = JSON.stringify(parsed);
  const mutations = [
    () => parsed.tokens.push({ type: 'html', text: '<script>x</script>' }),
    () => {
      parsed.tokens[0].tokens[0].tokens[0].text = 'Poison';
    },
    () => {
      parsed.tokens.find((token) => token.type === 'list').items[0].checked =
        false;
    },
    () => {
      parsed.tokens.find(
        (token) => token.type === 'table',
      ).rows[0][0].tokens[0].href = 'javascript:x';
    },
    () => {
      parsed.tokens.links.ref.href = 'javascript:x';
    },
    () => {
      parsed.headings[0].id = 'poison';
    },
  ];
  for (const mutate of mutations)
    assert.throws(mutate, (error) => error.name === 'TypeError');
  assert.equal(JSON.stringify(parse(body)), snapshot);
});

test('LRU bounds entry count and keeps a recently used body', () => {
  const { parseProjectMarkdown: parse } = load();
  const entries = Array.from({ length: 16 }, (_, i) => parse(`## Story ${i}`));
  assert.equal(parse('## Story 0'), entries[0]);
  parse('## Story 16');
  assert.equal(parse('## Story 0'), entries[0]);
  assert.notEqual(parse('## Story 1'), entries[1]);
});

test('aggregate source budget includes both options and oversized bodies bypass retention', () => {
  const { parseProjectMarkdown: parse } = load();
  const body = 'a'.repeat(90_000);
  const first = parse(body);
  const soft = parse(body, { preserveSoftBreaks: true });
  parse('b'.repeat(30_000));
  assert.equal(parse(body, { preserveSoftBreaks: true }), soft);
  assert.notEqual(parse(body), first);
  const survivor = parse('## Keep this');
  const oversized = 'x'.repeat(200_001);
  assert.notEqual(parse(oversized), parse(oversized));
  assert.equal(parse('## Keep this'), survivor);
});

test('cached parses preserve all shipped stories and notebook heading/pagination markup', () => {
  const browser = load();
  const server = load(false);
  for (const seed of seeds.filter(
    (seed) => typeof seed.data.body === 'string',
  )) {
    const props = {
      body: seed.data.body,
      preserveSoftBreaks: seed.kind === 'journal',
    };
    const expected = render(server.ProjectMarkdown, props);
    assert.equal(render(browser.ProjectMarkdown, props), expected, seed.id);
    assert.equal(render(browser.ProjectMarkdown, props), expected, seed.id);
    assert.deepEqual(
      json(browser.parseProjectMarkdown(props.body).headings),
      json(server.parseProjectMarkdown(props.body).headings),
    );
  }
  const body =
    '[Alias](#final-note) [Canonical](#project-final-note)\n\n## Final note\n\nfirst\nsecond\n\n## Final note\n\n[Duplicate](#final-note-2)';
  for (const headingIdPrefix of ['public-', 'measure-', 'private-']) {
    const props = {
      title: 'Notebook',
      body,
      page: 2,
      spread: true,
      headingIdPrefix,
    };
    const expected = render(server.NotebookSectionPages, props);
    assert.equal(render(browser.NotebookSectionPages, props), expected);
    assert.equal(render(browser.NotebookSectionPages, props), expected);
    assert.match(
      expected,
      new RegExp(`href="#${headingIdPrefix}project-final-note-2"`),
    );
    assert.match(expected, /first<br\/>second/);
  }
});

test('warm parses still render current media, headings, table mode and safe URLs', () => {
  const { ProjectMarkdown } = load();
  const body =
    '## Section\n\n[Jump](#project-section)\n\n[Film](/media/film)\n\n![Picture](/media/photo)\n\n| Name |\n| --- |\n| Value |\n\n<script>alert(1)</script>\n\n[Bad](javascript:alert%281%29)';
  const initial = render(ProjectMarkdown, { body });
  const media = [
    {
      id: 'film',
      url: '/media/film',
      mime: 'video/mp4',
      posterMediaId: 'poster',
    },
    { id: 'poster', url: '/media/poster', mime: 'image/png' },
  ];
  const updated = render(ProjectMarkdown, {
    body,
    media,
    headingIdPrefix: 'preview-',
    headingLinks: { 'project-section': 'another-section' },
    paginated: true,
  });
  assert.doesNotMatch(initial, /<video/);
  assert.match(updated, /<video[^>]+poster="\/media\/poster"/);
  assert.match(updated, /id="preview-project-section"/);
  assert.match(updated, /href="#another-section"/);
  assert.match(initial, /aria-label="Scrollable table" tabindex="0"/);
  assert.match(updated, /aria-label="Table"/);
  assert.doesNotMatch(updated, /tabindex="0"|<script|href="javascript:/);
  assert.match(updated, /&lt;script&gt;/);
  assert.equal(render(ProjectMarkdown, { body }), initial);
});
