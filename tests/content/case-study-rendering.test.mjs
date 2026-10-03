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
    external: ['react', 'react/jsx-runtime', '@base-ui/react/dialog'],
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
  assert.match(markup, /01<small>study<\/small>/);
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
  assert.match(all, /02<small>studies<\/small>/);

  const authored = {
    ...data,
    site: {
      ...data.site,
      interfaceText: { study: 'case study', studies: 'case studies' },
    },
  };
  for (const [category, label] of [
    ['systems', 'case study'],
    ['all', 'case studies'],
  ]) {
    for (const [Component, props] of [
      [CaseStudyLibraryWindow, windowProps],
      [ReadingCaseStudyLibrary, {}],
    ])
      assert.ok(
        render(Component, { ...props, data: authored, category }).includes(
          `<small>${label}</small>`,
        ),
        'both collection views use the Studio count labels',
      );
  }
});

test('reading controls hide empty categories and stale selections return to All', () => {
  const markup = render(ReadingCaseStudyLibrary, {
    data,
    category: 'research',
  });
  assert.match(markup, /aria-label="Case study categories"/);
  assert.match(
    markup,
    /aria-pressed="true"[^>]*>.*?<span>Research &amp; experiments<\/span>/,
  );
  assert.match(markup, /Systems &amp; reliability/);
  assert.doesNotMatch(
    markup,
    /Product engineering|Design &amp; interfaces|href="[^"]*older-story/,
  );
  assert.match(markup, /href="\/case-studies\/recovery\?category=research"/);
  const stale = render(ReadingCaseStudyLibrary, { data, category: 'product' });
  assert.match(
    stale,
    /aria-pressed="true"[^>]*>.*?<span>All case studies<\/span>/,
  );
  assert.match(stale, /href="\/case-studies\/older-story"/);
  assert.equal((stale.match(/<button/g) || []).length, 3);
  const empty = render(ReadingCaseStudyLibrary, {
    data: { ...data, experience: [] },
    category: 'product',
  });
  assert.match(empty, /No case studies are available yet/);
  assert.match(empty, /00<small>studies<\/small>/);
  assert.doesNotMatch(empty, /<button|<a /);
  // A stale direct monitor selection remains an explicit empty collection;
  // no physical target or reading control can newly select it.
  const monitor = render(CaseStudyLibraryWindow, {
    ...windowProps,
    category: 'product',
  });
  assert.match(monitor, /No case studies have been added to this category yet/);
  assert.doesNotMatch(monitor, /Read case study:/);
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
  assert.doesNotMatch(reading, /Contents/); // No exclusive reading sidebar.
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
