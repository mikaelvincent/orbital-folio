import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { pathFor } from '../../lib/paths.ts';
import { pageMetadata } from '../../lib/metadata.ts';

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
    URLSearchParams,
    Map,
    WeakMap,
  });
  return loaded.exports;
}

const { CaseStudyLibraryWindow, ReadingCaseStudyLibrary, CaseStudyStory } =
  await loadComponent('features/portfolio/case-study-library-window.tsx');
const { CaseStudyView } = await loadComponent(
  'features/portfolio/room-views.tsx',
);
const data = {
  site: {
    name: 'Portfolio owner',
    domain: 'https://portfolio.example',
    experienceLabel: 'Case studies',
    experienceIntro: 'A collection of stories.',
  },
  media: [],
  projects: [],
  journal: [],
  links: [],
  experience: [
    {
      id: 'older',
      slug: 'older-story',
      title: 'Older story',
      summary: 'Preserved without a category.',
      context: 'Original context.',
      decisions: 'Original decisions.',
      impact: 'Original impact.',
    },
    {
      id: 'system',
      slug: 'recovery',
      title: 'Designing recovery',
      summary: 'An explicit systems assignment.',
      categories: ['systems', 'research'],
      role: 'Engineer',
      organization: 'Studio',
      period: '2026',
      body: '## Recovery boundary\n\nThe **story**, in Markdown.',
    },
  ],
};
const windowProps = {
  data,
  category: 'systems',
  onCaseStudySelect() {},
  onBack() {},
  onClose() {},
};
const render = (Component, props) =>
  renderToStaticMarkup(createElement(Component, props));

test('physical category collections show assigned studies, accessible native links and one close control', () => {
  const markup = render(CaseStudyLibraryWindow, windowProps);
  assert.match(markup, /href="\/case-studies\/recovery\?category=systems"/);
  assert.doesNotMatch(markup, /older-story/);
  assert.match(markup, /aria-label="Read case study: Designing recovery"/);
  assert.match(markup, /aria-label="Case studies application content"/);
  assert.match(markup, /aria-label="Close Case studies application"/);
  assert.match(markup, /<ol class="case-study-archive-list">/);
  assert.match(markup, /<span>Studio<\/span>/);
  assert.match(markup, /<span>2026<\/span>/);
  assert.doesNotMatch(
    markup,
    /aria-pressed=|aria-label="Case study categories"/,
  );
  const all = render(CaseStudyLibraryWindow, {
    ...windowProps,
    category: 'all',
  });
  assert.match(all, /href="\/case-studies\/older-story"/);
  assert.match(all, /href="\/case-studies\/recovery"/);
});

test('reading collection exposes only populated categories and handles a wholly empty archive', () => {
  const markup = render(ReadingCaseStudyLibrary, {
    data,
    category: 'research',
  });
  assert.match(markup, /aria-label="Case study categories"/);
  assert.match(
    markup,
    /aria-pressed="true"[^>]*>.*?<span>Research &amp; experiments<\/span>/,
  );
  assert.doesNotMatch(
    markup,
    /Product engineering|Design &amp; interfaces|older-story/,
  );
  assert.match(markup, /href="\/case-studies\/recovery\?category=research"/);
  const empty = render(ReadingCaseStudyLibrary, {
    data: { ...data, experience: [] },
  });
  assert.match(empty, /No case studies are available yet/);
  assert.doesNotMatch(empty, /<button|<a /);
});

test('legacy case studies and optional metadata survive in both semantic and monitor detail', () => {
  const legacy = render(CaseStudyStory, {
    data,
    caseStudy: data.experience[0],
  });
  for (const text of [
    'Original context.',
    'Original decisions.',
    'Original impact.',
  ])
    assert.ok(legacy.includes(text));
  assert.doesNotMatch(legacy, /<dl|undefined|\/ \/|case-study-story-meta/);
  const detailed = render(CaseStudyLibraryWindow, {
    ...windowProps,
    caseStudy: data.experience[1],
  });
  assert.match(detailed, /Back to case studies/);
  assert.match(detailed, /<strong>story<\/strong>/);
  for (const text of ['Engineer', 'Studio', '2026'])
    assert.ok(detailed.includes(text));
  assert.doesNotMatch(detailed, /case-study-archive-list/);
  const reading = render(CaseStudyView, {
    data,
    caseStudy: data.experience[1],
    category: 'systems',
  });
  assert.match(reading, /href="\/case-studies\?category=systems"/);
  assert.match(reading, /href="#project-recovery-boundary"/);
  assert.match(reading, /id="project-recovery-boundary"/);
});

test('case studies reuse safe Markdown and managed image/video rendering without executable HTML', () => {
  const media = [
    {
      id: 'photo',
      url: '/media/photo',
      mime: 'image/webp',
      alt: 'System overview',
    },
    {
      id: 'tour',
      url: '/media/tour',
      mime: 'video/mp4',
      alt: 'Recovery walkthrough',
    },
  ];
  const caseStudy = {
    id: 'media',
    title: 'Media story',
    mediaId: 'photo',
    body: '## Results\n\n**Measured** changes.\n\n[Recovery walkthrough](/media/tour)\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert%281%29)',
  };
  const markup = render(CaseStudyLibraryWindow, {
    ...windowProps,
    data: { ...data, media },
    caseStudy,
  });
  assert.match(markup, /src="\/media\/photo" alt="System overview"/);
  assert.match(markup, /<video controls="" preload="none"/);
  assert.match(markup, /<source src="\/media\/tour" type="video\/mp4"/);
  assert.match(markup, /<strong>Measured<\/strong>/);
  assert.match(markup, /&lt;script&gt;alert/);
  assert.doesNotMatch(markup, /<script|href="javascript:/);
});

test('private case links retain the preview boundary and selected category', () => {
  const markup = render(CaseStudyLibraryWindow, {
    ...windowProps,
    data: { ...data, site: { ...data.site, _preview: true } },
  });
  const href = markup.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&');
  const url = new URL(href, data.site.domain);
  assert.equal(url.pathname, '/admin/preview');
  assert.equal(url.searchParams.get('section'), 'experience');
  assert.equal(url.searchParams.get('slug'), 'recovery');
  assert.equal(url.searchParams.get('category'), 'systems');
  assert.equal(
    pathFor('/experience/recovery?category=systems#project-results', {}),
    '/case-studies/recovery?category=systems#project-results',
  );
  const preview = new URL(
    pathFor('/case-studies/recovery?category=systems#project-results', {
      _preview: true,
    }),
    data.site.domain,
  );
  assert.equal(preview.hash, '#project-results');
  assert.equal(preview.searchParams.get('slug'), 'recovery');
  assert.equal(pathFor('/media/photo', {}), '/media/photo');
});

test('case detail metadata uses the canonical public URL and authored title, summary and overrides', () => {
  const entry = data.experience[1];
  const metadata = pageMetadata(data, 'experience', entry);
  assert.equal(metadata.title, 'Designing recovery — Portfolio owner');
  assert.equal(metadata.description, entry.summary);
  assert.equal(
    metadata.alternates.canonical,
    'https://portfolio.example/case-studies/recovery',
  );
  const override = pageMetadata(data, 'experience', {
    ...entry,
    seoTitle: 'Recovery case study',
    seoDescription: 'Search summary',
    sample: true,
  });
  assert.equal(override.title, 'Recovery case study');
  assert.equal(override.description, 'Search summary');
  assert.equal(override.robots.index, false);
});
