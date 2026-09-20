import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  projectContentUrl,
  parseProjectMarkdown,
} from '../../features/portfolio/project-markdown-content.ts';

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
    URL,
    Map,
    WeakMap,
  });
  return loaded.exports;
}
const { ProjectMarkdown, ProjectMedia } = await loadComponent(
  'features/portfolio/project-markdown.tsx',
);
const render = (body, media = []) =>
  renderToStaticMarkup(createElement(ProjectMarkdown, { body, media }));

test('project content accepts only safe navigation and asset URLs', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,<script>x</script>',
    '//evil.example',
    'https://owner:secret@example.com',
    '\\evil.example',
    'java\nscript:alert(1)',
    'https://example.com\u0000/path',
    'file:///etc/passwd',
  ]) {
    assert.equal(projectContentUrl(url), undefined, url);
  }
  assert.equal(projectContentUrl('/projects/a'), '/projects/a');
  assert.equal(projectContentUrl('#project-system'), '#project-system');
  assert.equal(
    projectContentUrl('mailto:owner@example.com'),
    'mailto:owner@example.com',
  );
  assert.equal(projectContentUrl('/media/asset_1', 'media'), '/media/asset_1');
  assert.equal(projectContentUrl('/projects/a', 'media'), undefined);
  assert.equal(
    projectContentUrl('https://example.com/a.webp', 'media'),
    'https://example.com/a.webp',
  );
});

test('raw HTML and unsafe links cannot become executable elements', () => {
  const markup = render(
    '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert%281%29)\n\n![bad](data:image/svg+xml;base64,AAAA)\n\n**Safe** and [Good](https://example.com).',
  );
  assert.doesNotMatch(markup, /<script|<img|href="javascript:|onerror="/);
  assert.match(markup, /&lt;script&gt;alert/);
  assert.match(markup, /<strong>Safe<\/strong>/);
  assert.match(markup, /href="https:\/\/example.com"/);
  assert.match(markup, /rel="noopener noreferrer"/);
});

test('story headings stay accessible and receive unique, stable anchors including nested content', () => {
  const body =
    '# Overview\n\n## **Decisions**\n\n> ### Nested\n\n## Decisions\n\n```html\n<script>literal</script>\n```';
  const parsed = parseProjectMarkdown(body);
  assert.deepEqual(
    parsed.headings.map((heading) => heading.id),
    [
      'project-overview',
      'project-decisions',
      'project-nested',
      'project-decisions-2',
    ],
  );
  const markup = render(body);
  assert.match(markup, /<h2 id="project-overview">Overview<\/h2>/);
  for (const heading of parsed.headings)
    assert.ok(markup.includes(`id="${heading.id}"`));
  assert.match(
    markup,
    /<pre><code>&lt;script&gt;literal&lt;\/script&gt;<\/code><\/pre>/,
  );
});

test('managed video links render accessible native players with published poster/caption references', () => {
  const media = [
    {
      id: 'movie',
      url: '/media/movie',
      mime: 'video/mp4',
      title: 'A tour',
      alt: 'Walkthrough',
      posterMediaId: 'poster',
      captionsMediaId: 'captions',
    },
    { id: 'poster', url: '/media/poster', mime: 'image/webp', alt: 'Overview' },
    {
      id: 'captions',
      url: '/media/captions',
      mime: 'text/vtt',
      title: 'English captions',
    },
  ];
  const markup = render(
    '[Watch the tour](/media/movie)\n\nA related [video link](/media/movie).',
    media,
  );
  assert.equal((markup.match(/<video/g) || []).length, 1);
  assert.match(markup, /controls="" preload="none"/);
  assert.match(markup, /poster="\/media\/poster"/);
  assert.match(markup, /<track kind="captions" src="\/media\/captions"/);
  assert.match(markup, /<a href="\/media\/movie">video link<\/a>/);
  assert.doesNotMatch(markup, /autoplay|<p><figure/);
  const compact = renderToStaticMarkup(
    createElement(ProjectMedia, { item: media[0], media, compact: true }),
  );
  assert.doesNotMatch(compact, /<video/);
  assert.match(compact, /<img src="\/media\/poster"/);
});

test('unknown media references do not expose unpublished asset metadata', () => {
  const markup = render('[Walkthrough](/media/private-video)', []);
  assert.doesNotMatch(markup, /<video|poster=/);
  assert.match(markup, /href="\/media\/private-video"/);
});

test('reference-style links and images resolve without displaying their definitions', () => {
  const markup = render(
    '[Read the notes][notes]\n\n![System overview][diagram]\n\n[notes]: https://example.com/notes "Notes title"\n[diagram]: /media/diagram "Diagram title"',
  );
  assert.match(
    markup,
    /<a href="https:\/\/example.com\/notes"[^>]*>Read the notes<\/a>/,
  );
  assert.match(
    markup,
    /<img[^>]*src="\/media\/diagram"[^>]*alt="System overview"/,
  );
  assert.match(markup, /title="Diagram title"/);
  assert.doesNotMatch(markup, /\[notes\]:|\[diagram\]:|Notes title/);
});

test('character references render as text while code and raw HTML remain literal', () => {
  const markup = render(
    'Fish &amp; chips &copy; &#x1F680;\n\n`&amp;`\n\n&lt;script&gt;alert(1)&lt;/script&gt;',
  );
  assert.match(markup, /Fish &amp; chips © 🚀/);
  assert.match(markup, /<code>&amp;amp;<\/code>/);
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
});

test('library categories rely on explicit authored assignment and keep ordinary project links', async () => {
  const { ProjectLibraryWindow } = await loadComponent(
    'features/portfolio/project-library-window.tsx',
  );
  const data = {
    site: {},
    media: [],
    experience: [],
    journal: [],
    links: [],
    projects: [
      {
        id: 'legacy',
        slug: 'legacy-system',
        title: 'Legacy system',
        category: 'SYSTEM',
        summary: 'Existing content.',
      },
      {
        id: 'assigned',
        slug: 'real-system',
        title: 'Real system',
        categories: ['systems'],
        summary: 'Explicit assignment.',
      },
    ],
  };
  const props = {
    data,
    category: 'systems',
    onCategoryChange() {},
    onProjectSelect() {},
    onBack() {},
    onClose() {},
  };
  const markup = renderToStaticMarkup(
    createElement(ProjectLibraryWindow, props),
  );
  assert.match(markup, /href="\/projects\/real-system"/);
  assert.doesNotMatch(markup, /href="\/projects\/legacy-system"/);
  assert.match(markup, /aria-label="Projects application content"/);
  assert.match(markup, /aria-label="Close Projects application"/);
  assert.match(markup, /aria-pressed="true"/);
  const all = renderToStaticMarkup(
    createElement(ProjectLibraryWindow, { ...props, category: 'all' }),
  );
  assert.match(all, /href="\/projects\/legacy-system"/);
});
