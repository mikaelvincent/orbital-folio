import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { seedSite } from '../../lib/content/seed.ts';
import { pageMetadata } from '../../lib/metadata.ts';
import {
  searchMetadata,
  siteSearchFields,
} from '../../lib/content/search-metadata.ts';

const bundled = await build({
  stdin: {
    contents: [
      "export * from './lib/content/validation.ts';",
      "export * from './features/studio/studio-site-schema.ts';",
      "export * from './features/studio/studio-site-fields.tsx';",
    ].join('\n'),
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['react', 'react/jsx-runtime', '@base-ui/react/*'],
  loader: { '.css': 'empty' },
  logLevel: 'silent',
});
const loaded = { exports: {} };
runInNewContext(bundled.outputFiles[0].text, {
  module: loaded,
  exports: loaded.exports,
  require: createRequire(import.meta.url),
  URL,
  URLSearchParams,
  Map,
  WeakMap,
});
const { validateContent, siteSections, StudioSiteFields } = loaded.exports;
const site = {
  ...seedSite,
  name: 'Portfolio owner',
  title: 'Product engineer',
  projectsIntro: 'Useful products.',
  experienceIntro: 'Decisions behind the work.',
  biography: 'How I think and work.',
  privacyText: 'How messages are stored.',
  interfaceText: { 'Start a conversation': 'Discuss a project.' },
};
const publicMetadata = (site, section, record) =>
  pageMetadata({ site, media: [] }, section, record);

test('fresh metadata follows editable content without separate seeded descriptions', () => {
  for (const key of [
    'seoTitle',
    'seoDescription',
    'aboutIntro',
    'contactIntro',
  ])
    assert.equal(seedSite[key], '');
  const expected = {
    home: ['Portfolio owner — Product engineer', 'Product engineer'],
    projects: ['Projects — Portfolio owner', 'Useful products.'],
    experience: [
      'Case studies — Portfolio owner',
      'Decisions behind the work.',
    ],
    about: ['About — Portfolio owner', 'How I think and work.'],
    contact: ['Contact — Portfolio owner', 'Discuss a project.'],
    privacy: ['Privacy — Portfolio owner', 'How messages are stored.'],
  };
  for (const [section, [title, description]] of Object.entries(expected)) {
    const resolved = publicMetadata(site, section);
    assert.equal(resolved.title, title);
    assert.equal(resolved.description, description);
    assert.equal(resolved.openGraph.title, title);
    assert.equal(resolved.twitter.description, description);
    assert.equal(resolved.robots.index, false);
  }
});

test('page title and description overrides are independent, reversible and shared by every metadata surface', () => {
  for (const [section, [titleKey, descriptionKey]] of Object.entries(
    siteSearchFields,
  )) {
    const automatic = publicMetadata(site, section);
    const titleOnly = publicMetadata(
      { ...site, [titleKey]: 'Custom title' },
      section,
    );
    assert.equal(titleOnly.title, 'Custom title');
    assert.equal(titleOnly.description, automatic.description);
    const customized = {
      ...site,
      [titleKey]: 'Custom title',
      [descriptionKey]: 'Custom description',
    };
    const before = structuredClone(customized);
    const resolved = publicMetadata(customized, section);
    for (const surface of [resolved, resolved.openGraph, resolved.twitter]) {
      assert.equal(surface.title, 'Custom title');
      assert.equal(surface.description, 'Custom description');
    }
    const cleared = publicMetadata(
      { ...customized, [titleKey]: ' ', [descriptionKey]: '\n' },
      section,
    );
    assert.equal(cleared.title, automatic.title);
    assert.equal(cleared.description, automatic.description);
    assert.deepEqual(customized, before);
  }
});

test('entry metadata prefers its own summary or subtitle and never inherits a collection title override', () => {
  for (const section of ['projects', 'experience', 'about']) {
    const [titleKey, descriptionKey] = siteSearchFields[section];
    const editedSite = {
      ...site,
      [titleKey]: 'Collection title',
      [descriptionKey]: 'Collection description',
    };
    const entry = {
      title: 'An entry',
      slug: 'an-entry',
      summary: 'Entry summary',
      subtitle: 'Entry subtitle',
      sample: false,
    };
    assert.equal(
      publicMetadata(editedSite, section, entry).title,
      'An entry — Portfolio owner',
    );
    assert.equal(
      publicMetadata(editedSite, section, entry).description,
      'Entry summary',
    );
    assert.equal(
      publicMetadata(editedSite, section, { ...entry, summary: '' })
        .description,
      'Entry subtitle',
    );
    assert.equal(
      publicMetadata(editedSite, section, {
        ...entry,
        summary: '',
        subtitle: '',
      }).description,
      'Collection description',
    );
    const resolved = publicMetadata(editedSite, section, {
      ...entry,
      seoTitle: 'Entry search title',
      seoDescription: 'Entry search description',
    });
    assert.equal(resolved.title, 'Entry search title');
    assert.equal(resolved.description, 'Entry search description');
  }
});

test('automatic metadata follows later edits and empty page content falls back to shared editable text', () => {
  const changed = {
    ...site,
    name: 'New name',
    projectsIntro: 'Updated introduction',
  };
  assert.equal(
    searchMetadata(changed, 'projects').title,
    'Projects — New name',
  );
  assert.equal(
    searchMetadata(changed, 'projects').description,
    'Updated introduction',
  );
  for (const [section, contentKey] of [
    ['projects', 'projectsIntro'],
    ['experience', 'experienceIntro'],
    ['about', 'biography'],
    ['privacy', 'privacyText'],
  ]) {
    assert.equal(
      searchMetadata(
        { ...site, [contentKey]: '', seoDescription: 'Shared description' },
        section,
      ).description,
      'Shared description',
    );
    assert.equal(
      searchMetadata({ ...site, [contentKey]: '' }, section).description,
      site.title,
    );
  }
});

test('old saved descriptions and optional new fields survive validation without rewriting the input', () => {
  const saved = {
    ...site,
    seoTitle: 'Existing home title',
    seoDescription: 'Existing home description',
    aboutIntro: 'Existing About description',
    contactIntro: 'Existing Contact description',
  };
  const before = structuredClone(saved);
  const clean = validateContent('site', saved);
  for (const section of ['home', 'about', 'contact']) {
    const [titleKey, descriptionKey] = siteSearchFields[section];
    assert.equal(
      publicMetadata(clean, section).description,
      saved[descriptionKey],
    );
    if (saved[titleKey])
      assert.equal(publicMetadata(clean, section).title, saved[titleKey]);
  }
  assert.deepEqual(saved, before);
  for (const keys of Object.values(siteSearchFields)) {
    for (const key of keys) {
      assert.equal(
        validateContent('site', { ...site, [key]: '  Edited  ' })[key],
        'Edited',
      );
      assert.equal(validateContent('site', { ...site, [key]: '' })[key], '');
      assert.throws(
        () => validateContent('site', { ...site, [key]: {} }),
        /must be text/,
      );
    }
  }
  const journal = {
    title: 'Chapter',
    slug: 'chapter',
    body: 'Private draft',
    seoTitle: 'Chapter search title',
    seoDescription: 'Chapter search description',
  };
  const chapter = validateContent('journal', journal);
  assert.equal(chapter.seoTitle, journal.seoTitle);
  assert.equal(chapter.seoDescription, journal.seoDescription);
  assert.throws(
    () => validateContent('journal', { ...journal, seoDescription: 7 }),
    /must be text/,
  );
});

test('Studio exposes every saved site setting and each page override in exactly one section', () => {
  const exposed = siteSections.flatMap((section) => [
    ...section.keys,
    ...(section.metadata ? siteSearchFields[section.metadata] : []),
  ]);
  for (const key of new Set([
    ...Object.keys(seedSite),
    ...Object.values(siteSearchFields).flat(),
  ]))
    assert.equal(exposed.filter((field) => field === key).length, 1, key);
});

test('Studio shows blank overrides, their automatic values and the same effective preview as public metadata', () => {
  for (const section of siteSections.filter((section) => section.metadata)) {
    const props = {
      data: site,
      siteGroup: section.id,
      records: [],
      busy: false,
      search: '',
      setData() {},
      onUpload() {},
      onPublishAssets() {},
    };
    const markup = renderToStaticMarkup(createElement(StudioSiteFields, props));
    const resolved = searchMetadata(site, section.metadata);
    assert.ok(markup.includes(resolved.title));
    assert.ok(markup.includes(resolved.description));
    assert.match(markup, /Search \/ social title · optional/);
    assert.match(markup, /Search \/ social description · optional/);
    assert.match(markup, /placeholder="[^"]+"[^>]*value=""/);
    const [titleKey, descriptionKey] = siteSearchFields[section.metadata];
    const edited = renderToStaticMarkup(
      createElement(StudioSiteFields, {
        ...props,
        data: {
          ...site,
          [titleKey]: 'New search title',
          [descriptionKey]: 'New search description',
        },
      }),
    );
    assert.match(
      edited,
      /class="studio-search-preview-title">New search title/,
    );
    assert.match(edited, /<p>New search description<\/p>/);
  }
});
