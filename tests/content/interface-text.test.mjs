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
import { pageMetadata } from '../../lib/metadata.ts';

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
    },
  });
  assert.equal(
    interfaceText(site, 'Read project: {title}', { title: '$& {title}' }),
    'Inspect $& {title} <script>literal</script>',
  );
  assert.equal(interfaceText(site, 'Unedited message'), 'Unedited message');
  assert.equal(notebookPageLabel(2, 6, site), 'Page 2 / 6');
  assert.equal(
    validateContactDraft({ name: 'A Visitor', email: 'bad' }, site),
    'Please check your email.',
  );
  for (const overrides of [
    null,
    [],
    'Not an object',
    { 'Enter a valid email address.': 1 },
    { 'Read project: {title}': 'Missing title' },
    { 'Read project: {title}': '{title} {extra}' },
    { 'Enter a valid email address.': '' },
    { 'Enter a valid email address.': 'x'.repeat(2001) },
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
    'Send message',
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
    'Schedule a call',
    'Send a message',
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

test('obsolete fields are removed from old site records while active metadata and copy survive', () => {
  const obsoleteFields = [
    'availability',
    'headline',
    'intro',
    'location',
    'brand',
    'sampleNotice',
    'exploreLabel',
    'inviteLabel',
    'projectCta',
    'heroEyebrow',
    'shipCaption',
    'sceneHelp',
    'pauseLabel',
    'resumeLabel',
    'resetLabel',
    'contactHeading',
    'projectsRoom',
    'experienceRoom',
    'aboutRoom',
    'contactRoom',
    'sampleLabel',
    'featuredLabel',
    'dossierLabel',
    'closeReaderLabel',
    'interviewLabel',
    'inquiryLabel',
    'sendLabel',
    'sendingLabel',
    'sentHeading',
    'sentMessage',
    'contactError',
    'contactPrivacy',
    'sampleContact',
    'footerText',
    'connectionLabel',
    'readAllLabel',
    'periodLabel',
  ];
  const original = {
    ...seedSite,
    ...Object.fromEntries(obsoleteFields.map((key) => [key, 'Removed copy'])),
    aboutIntro: 'Description used when sharing About',
    contactIntro: 'Description used when sharing Contact',
  };
  const before = structuredClone(original);
  const site = validateContent('site', original);
  for (const key of obsoleteFields) {
    assert.ok(!Object.hasOwn(seedSite, key), key);
    assert.ok(!Object.hasOwn(site, key), key);
  }
  const data = { site, media: [] };
  for (const section of ['about', 'contact']) {
    const metadata = pageMetadata(data, section);
    assert.equal(metadata.description, original[section + 'Intro']);
    assert.equal(metadata.openGraph.description, original[section + 'Intro']);
    assert.equal(metadata.robots.index, false);
  }
  assert.deepEqual(original, before);
});

test('old and unknown overrides are discarded without mutating the original record', () => {
  const original = {
    ...seedSite,
    interfaceText: JSON.parse(`{
      "Unassigned": "Saved legacy screen text",
      "Schedule a call": "Saved legacy call label",
      "Unknown message": 42,
      "__proto__": {"polluted": true},
      "constructor": "Unsupported",
      "Send message": "Discuss a project"
    }`),
  };
  const before = structuredClone(original);
  const site = validateContent('site', original);
  assert.deepEqual(Object.entries(site.interfaceText), [
    ['Send message', 'Discuss a project'],
  ]);
  assert.equal(Object.getPrototypeOf(site.interfaceText), null);
  assert.equal(interfaceText(site, 'Send message'), 'Discuss a project');
  assert.equal(interfaceText(original, 'Unassigned'), 'Unassigned');
  assert.equal(interfaceText(original, 'Schedule a call'), 'Schedule a call');
  assert.deepEqual(original, before);
  assert.equal(
    validateContent('site', {
      ...seedSite,
      interfaceText: { Unassigned: 'Old copy' },
    }).interfaceText,
    undefined,
  );
});

test('Studio omits removed availability fields while keeping supported legacy headings editable', async () => {
  const { StudioSiteFields } = await components(
    'features/studio/studio-site-fields.tsx',
  );
  const { StudioNavigation } = await components(
    'features/studio/studio-navigation.tsx',
  );
  const records = [
    {
      kind: 'project',
      draft: { body: '## Authored heading' },
      published: null,
    },
  ];
  const props = {
    records,
    siteGroup: 'identity',
    search: '',
    busy: false,
    setData() {},
  };
  for (const sampleMode of [true, false]) {
    const data = {
      ...seedSite,
      sampleMode,
      availability: 'Obsolete availability',
      problemLabel: 'Editable legacy heading',
    };
    assert.doesNotMatch(
      render(StudioSiteFields, { ...props, data }),
      /Availability message|Obsolete availability/,
    );
    assert.doesNotMatch(
      render(StudioSiteFields, {
        ...props,
        data,
        search: 'Obsolete availability',
      }),
      /<(?:input|textarea)\b/,
    );
    assert.match(
      render(StudioSiteFields, {
        ...props,
        data,
        siteGroup: 'project-headings',
      }),
      /value="Editable legacy heading"/,
    );
  }
  const navigation = render(StudioNavigation, {
    site: seedSite,
    area: 'projects',
    kind: 'site',
    siteGroup: 'projects',
    inboxCount: 0,
    onSelect() {},
  });
  assert.match(navigation, /Legacy section headings/);
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

test('reading overview uses authored room headings and retains reading and preview links', async () => {
  const { HomeView } = await components('features/portfolio/home-view.tsx');
  const site = {
    ...seedSite,
    domain: 'https://owner.example',
    title: 'An authored role',
    readLabel: 'A quiet view',
    projectsHeading: 'Owner projects',
    experienceHeading: 'Owner stories',
    aboutHeading: 'Owner notebook',
    interfaceText: { 'Let’s connect.': 'Owner conversation' },
  };
  const markup = render(HomeView, { data: { site } });
  for (const text of [
    'owner.example',
    site.title,
    site.readLabel,
    site.projectsHeading,
    site.experienceHeading,
    site.aboutHeading,
    'Owner conversation',
  ])
    assert.ok(markup.includes(text), text);
  for (const path of ['projects', 'case-studies', 'about', 'contact']) {
    assert.ok(markup.includes(`href="/${path}?view=reading"`));
  }
  assert.doesNotMatch(markup, /Let’s connect\./);
  const preview = render(HomeView, {
    data: { site: { ...site, _preview: true } },
  });
  assert.match(
    preview,
    /href="\/admin\/preview\?view=reading&amp;section=experience"/,
  );
  assert.doesNotMatch(preview, /href="\/(projects|case-studies|about|contact)/);
});

test('reading Contact exposes only the same assigned social screens and shared form', async () => {
  const { ContactView } = await components('features/portfolio/room-views.tsx');
  const { ContactForm } = await components(
    'features/portfolio/contact-form.tsx',
  );
  const site = {
    ...seedSite,
    contactHeading: 'Retired oversized heading',
    contactIntro: 'Metadata-only contact description',
    interfaceText: {
      'Send message': 'Discuss a project',
      'Start a conversation': 'The owner’s monitor subtitle',
    },
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
  // React useId values depend on where the shared form sits in the tree.
  const normalizeIds = (html) => html.replace(/_R_[a-zA-Z0-9]+_/g, '_R_id_');
  assert.ok(
    normalizeIds(markup).includes(normalizeIds(render(ContactForm, { site }))),
  );
  assert.match(markup, /Left profile/);
  assert.match(markup, /Right profile/);
  assert.match(markup, /Discuss a project/);
  assert.match(markup, /The owner’s monitor subtitle/);
  assert.match(markup, /<h1>Let’s connect\.<\/h1>/);
  assert.doesNotMatch(
    markup,
    /Hidden overflow|Retired oversized|Metadata-only contact|OPEN A CONVERSATION/,
  );
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
