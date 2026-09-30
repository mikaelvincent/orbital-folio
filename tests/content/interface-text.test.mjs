import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { seedSite } from '../../lib/content/seed.ts';
import { interfaceText } from '../../lib/content/interface-text.ts';
import { interfaceTextCatalog } from '../../lib/content/interface-text-catalog.ts';
import { validateContactDraft } from '../../features/portfolio/contact-flow.ts';
import { notebookPageLabel } from '../../lib/content/notebook-pages.ts';

async function components(entryPoint) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    external: ['react', 'react/jsx-runtime', '@base-ui/react/*'],
    loader: { '.css': 'empty' },
    logLevel: 'silent',
  });
  const loaded = { exports: {} };
  runInNewContext(result.outputFiles[0].text, {
    module: loaded,
    exports: loaded.exports,
    require: createRequire(import.meta.url),
    URL,
    URLSearchParams,
    Map,
    WeakMap,
  });
  return loaded.exports;
}
const { validateContent } = await components('lib/content/validation.ts');
const render = (component, props) =>
  renderToStaticMarkup(createElement(component, props)).replace(
    / tabindex="-1"/g,
    '',
  );

test('interface overrides are optional, plain text, and retain complete substitution tokens', () => {
  assert.equal(validateContent('site', seedSite).interfaceText, undefined);
  assert.equal(
    validateContent('site', { ...seedSite, interfaceText: {} }).interfaceText,
    undefined,
  );
  const site = validateContent('site', {
    ...seedSite,
    interfaceText: {
      'Read project: {title}': 'Inspect {title} <script>literal</script>',
      'Enter a valid email address.': 'Please check your email.',
      '{number} of {total}': 'Page {number} / {total}',
      ' Unattributed: {calls} calls.': ' Extra: {calls} draws.',
    },
  });
  assert.equal(
    interfaceText(site, 'Read project: {title}', { title: '$& {title}' }),
    'Inspect $& {title} <script>literal</script>',
  );
  assert.equal(interfaceText(site, 'Unedited message'), 'Unedited message');
  assert.equal(notebookPageLabel(2, 6, site), 'Page 2 / 6');
  assert.equal(
    validateContactDraft({ mode: 'message', email: 'bad' }, site),
    'Please check your email.',
  );
  assert.equal(site.interfaceText[' Unattributed: {calls} calls.'][0], ' ');
  for (const overrides of [
    { 'Unknown message': 'Not allowed' },
    { 'Read project: {title}': 'Missing title' },
    { 'Read project: {title}': '{title} {extra}' },
    { 'Enter a valid email address.': '' },
    { 'Enter a valid email address.': 'x'.repeat(2001) },
    JSON.parse('{"__proto__":"unsafe"}'),
  ])
    assert.throws(
      () => validateContent('site', { ...seedSite, interfaceText: overrides }),
      /supported|placeholders/,
    );
});

test('generated catalog covers content messages and excludes fixed tools and decorative labels', () => {
  execFileSync(process.execPath, [
    'scripts/sync-interface-text.mjs',
    '--check',
  ]);
  const keys = new Set(Object.values(interfaceTextCatalog).flat());
  for (const message of [
    'Watch video',
    'Schedule a call',
    'Let’s connect.',
    'Systems',
  ])
    assert.ok(keys.has(message), message);
  for (const message of [
    'Small',
    'Stay',
    'FR–{number}',
    'COM / {number}',
    'UPLINK',
    'VOICE',
    'Navigation',
    'context-lost',
    'Rendering',
    'Unassigned',
  ])
    assert.ok(!keys.has(message), message);
  assert.equal(
    interfaceText(
      {
        interfaceText: {
          UPLINK: 'Edited equipment',
          ' Unattributed: {calls} calls.': ' Extra: {calls} draws.',
        },
      },
      'UPLINK',
    ),
    'UPLINK',
  );
  assert.equal(
    interfaceText(
      {
        interfaceText: {
          ' Unattributed: {calls} calls.': ' Extra: {calls} draws.',
        },
      },
      ' Unattributed: {calls} calls.',
      { calls: 4 },
    ),
    ' Unattributed: 4 calls.',
  );
  assert.ok(
    !keys.has('All projects'),
    'dedicated site fields must not have competing message controls',
  );
});

test('inactive text overrides remain portable without returning to the Studio catalog', () => {
  const site = validateContent('site', {
    ...seedSite,
    interfaceText: { Unassigned: 'Saved legacy screen text' },
  });
  assert.equal(site.interfaceText.Unassigned, 'Saved legacy screen text');
  assert.equal(interfaceText(site, 'Unassigned'), 'Unassigned');
});

test('Studio omits legacy heading controls and navigation for Markdown stories, including search results', async () => {
  const { availableSiteSections } = await components(
    'features/studio/studio-site-schema.ts',
  );
  const { StudioSiteFields } = await components(
    'features/studio/studio-site-fields.tsx',
  );
  const { StudioNavigation } = await components(
    'features/studio/studio-navigation.tsx',
  );
  const records = [
    {
      kind: 'project',
      draft: { body: '## Authored heading', problem: 'Old problem' },
      published: { body: '', problem: 'Old public problem' },
    },
    {
      kind: 'experience',
      draft: { body: '', context: 'Old context' },
      published: { body: '## Authored context', impact: 'Old impact' },
    },
  ];
  const siteSections = availableSiteSections(records);
  assert.ok(!siteSections.some((section) => section.id === 'project-headings'));
  const messages = siteSections.flatMap((section) => section.messages || []);
  for (const message of ['Context', 'Key decisions', 'Impact', 'Unassigned'])
    assert.ok(!messages.includes(message), message);
  assert.ok(messages.includes('No case studies are available yet.'));
  assert.ok(messages.includes('Close notebook'));
  const markup = render(StudioSiteFields, {
    data: { ...seedSite, problemLabel: 'Dormant legacy heading' },
    records,
    siteGroup: 'projects',
    search: 'Dormant legacy heading',
    busy: false,
    setData() {},
  });
  assert.doesNotMatch(markup, /<(?:input|textarea)\b/);
  assert.match(markup, /No settings match/);
  const navigation = render(StudioNavigation, {
    site: seedSite,
    area: 'projects',
    kind: 'site',
    siteGroup: 'projects',
    siteSections,
    inboxCount: 0,
    onSelect() {},
  });
  assert.doesNotMatch(navigation, /Legacy section headings/);
  assert.match(navigation, /Page &amp; interface/);
});

test('legacy heading controls follow both saved snapshots without altering either', async () => {
  const { availableSiteSections } = await components(
    'features/studio/studio-site-schema.ts',
  );
  const records = [
    {
      kind: 'project',
      draft: { body: '', problem: 'Superseded draft' },
      published: { problem: 'Live problem', next: '   ' },
    },
    {
      kind: 'project',
      draft: { approach: 'Private approach' },
      published: null,
    },
    {
      kind: 'experience',
      draft: { body: 'Authored story', context: 'Superseded context' },
      published: { context: 'Live context', decisions: '\n' },
    },
    {
      kind: 'experience',
      draft: { impact: 'Private impact' },
      published: null,
    },
  ];
  const before = structuredClone(records);
  const sections = availableSiteSections(records);
  assert.deepEqual(
    [...sections.find((section) => section.id === 'project-headings').keys],
    ['problemLabel', 'approachLabel'],
  );
  const messages = sections.find(
    (section) => section.id === 'experience',
  ).messages;
  assert.ok(messages.includes('Context'));
  assert.ok(messages.includes('Impact'));
  assert.ok(!messages.includes('Key decisions'));
  assert.deepEqual(records, before);
  assert.ok(
    !availableSiteSections([]).some(
      (section) => section.id === 'project-headings',
    ),
  );
});

test('project and case study renderers share authored text and safe overrides in both views', async () => {
  const {
    ProjectStory,
    ProjectLibraryWindow,
    ProjectCollection,
    ReadingProjectLibrary,
  } = await components('features/portfolio/project-library-window.tsx');
  const { CaseStudyStory, CaseStudyLibraryWindow } = await components(
    'features/portfolio/case-study-library-window.tsx',
  );
  const { DossierView, CaseStudyView } = await components(
    'features/portfolio/room-views.tsx',
  );
  const site = {
    ...seedSite,
    codeLabel: 'Exact owner label',
    problemLabel: 'Edited legacy heading',
    interfaceText: {
      'Read project: {title}': 'Inspect {title} <script>literal</script>',
      Context: 'Edited context',
      Systems: 'Infrastructure',
    },
  };
  const project = {
    id: 'project',
    slug: 'project',
    title: 'Example',
    summary: 'One shared summary',
    categories: ['systems'],
    problem: 'Legacy body',
    sourceUrl: 'https://example.com/code',
  };
  const caseStudy = {
    id: 'case',
    slug: 'case',
    title: 'Case',
    context: 'Shared context',
    categories: ['research'],
  };
  const data = {
    site,
    projects: [project],
    experience: [caseStudy],
    journal: [],
    links: [],
    media: [],
  };
  const projectStory = render(ProjectStory, { data, project });
  assert.match(projectStory, /Edited legacy heading|Exact owner label/);
  assert.ok(render(DossierView, { data, project }).includes(projectStory));
  assert.ok(
    render(ProjectLibraryWindow, { data, project, category: 'all' })
      .replace(/ tabindex="-1"/g, '')
      .includes(projectStory),
  );
  const collection = render(ProjectCollection, { data, category: 'all' });
  assert.ok(render(ReadingProjectLibrary, { data }).includes(collection));
  assert.match(
    collection,
    /Inspect Example &lt;script&gt;literal&lt;\/script&gt;/,
  );
  assert.doesNotMatch(collection, /<script>/);
  const story = render(CaseStudyStory, { data, caseStudy });
  assert.match(story, /Edited context/);
  assert.ok(render(CaseStudyView, { data, caseStudy }).includes(story));
  assert.ok(
    render(CaseStudyLibraryWindow, { data, caseStudy, category: 'all' })
      .replace(/ tabindex="-1"/g, '')
      .includes(story),
  );
});

test('reading Contact exposes only the same assigned social screens and shared form', async () => {
  const { ContactView } = await components('features/portfolio/room-views.tsx');
  const { ContactForm } = await components(
    'features/portfolio/contact-form.tsx',
  );
  const site = {
    ...seedSite,
    contactHeading: 'Retired oversized heading',
    contactIntro: 'Retired form introduction',
    interfaceText: { 'Schedule a call': 'Discuss a project' },
  };
  const links = ['Left profile', 'Right profile', 'Hidden overflow'].map(
    (title, index) => ({
      id: String(index),
      title,
      url: `https://example.com/${index}`,
      screen: 'auto',
      order: index,
    }),
  );
  const data = {
    site,
    links,
    media: [],
    projects: [],
    experience: [],
    journal: [],
  };
  const markup = render(ContactView, { data });
  assert.ok(markup.includes(render(ContactForm, { site })));
  assert.match(markup, /Left profile|Right profile|Discuss a project/);
  assert.match(markup, /<h1>Let’s connect\.<\/h1>/);
  assert.doesNotMatch(markup, /Hidden overflow|Retired oversized|Retired form/);
});

test('Studio registers every supported message and exposes project subtitles and printed captions', async () => {
  const { siteSections } = await components(
    'features/studio/studio-site-schema.ts',
  );
  const exposed = new Set(
    siteSections.flatMap((section) => section.messages || []),
  );
  for (const message of Object.values(interfaceTextCatalog).flat())
    assert.ok(exposed.has(message), message);
  const { ProjectEditor } = await components(
    'features/studio/project-editor.tsx',
  );
  const markup = render(ProjectEditor, {
    data: {
      title: 'Example',
      slug: 'example',
      subtitle: 'Editable subtitle',
      category: 'Editable caption',
      summary: 'Summary',
      categories: ['systems'],
      body: 'Body',
    },
    records: [
      { id: 'site', kind: 'site', draft: seedSite, published: seedSite },
    ],
    busy: false,
    onChange() {},
    onUpload() {},
    onPublishAssets() {},
  });
  assert.match(
    markup,
    /Subtitle · optional<input[^>]*value="Editable subtitle"/,
  );
  assert.match(
    markup,
    /Category caption · optional<input[^>]*value="Editable caption"/,
  );
});
