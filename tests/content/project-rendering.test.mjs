import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { seeds } from '../../lib/content/seed.ts';
import { sampleProjectData } from '../../lib/content/sample-projects.mjs';
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
const { ProjectMarkdown } = await loadComponent(
  'features/portfolio/project-markdown.tsx',
);
const render = (body, media = []) =>
  renderToStaticMarkup(createElement(ProjectMarkdown, { body, media }));

await test('project content accepts only safe navigation and asset URLs', () => {
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

await test('raw HTML and unsafe links cannot become executable elements', () => {
  const markup = render(
    '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert%281%29)\n\n![bad](data:image/svg+xml;base64,AAAA)\n\n**Safe** and [Good](https://example.com).',
  );
  assert.doesNotMatch(markup, /<script|<img|href="javascript:|onerror="/);
  assert.match(markup, /&lt;script&gt;alert/);
  assert.match(markup, /<strong>Safe<\/strong>/);
  assert.match(markup, /href="https:\/\/example.com"/);
  assert.match(markup, /rel="noopener noreferrer"/);
});

await test('story headings stay accessible and receive unique, stable anchors including nested content', () => {
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

await test('managed video links render accessible native players with published poster/caption references', () => {
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
});

await test('unknown media references do not expose unpublished asset metadata', () => {
  const markup = render('[Walkthrough](/media/private-video)', []);
  assert.doesNotMatch(markup, /<video|poster=/);
  assert.match(markup, /href="\/media\/private-video"/);
});

await test('the populated Relay story renders its complete media and Markdown showcase', async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL(
        '../../scripts/assets/project-demos/manifest.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const ids = Object.fromEntries(
    manifest.assets.map((asset) => [asset.key, 'demo-' + asset.key]),
  );
  const media = manifest.assets.map((asset) => ({
    id: ids[asset.key],
    url: '/media/' + ids[asset.key],
    mime: asset.mime,
    title: asset.title,
    alt: asset.alt,
    ...(asset.poster ? { posterMediaId: ids[asset.poster] } : {}),
    ...(asset.captions ? { captionsMediaId: ids[asset.captions] } : {}),
  }));
  const relay = sampleProjectData(
    seeds.find((seed) => seed.id === 'project-relay').data,
    ids,
  );
  const markup = render(relay.body, media);
  assert.match(markup, /<img[^>]*src="\/media\/demo-relay"/);
  assert.match(markup, /<img[^>]*src="\/media\/demo-relay-motion"/);
  assert.match(markup, /<video[^>]*controls=""[^>]*preload="none"/);
  assert.match(markup, /<source src="\/media\/demo-relay-video"/);
  assert.match(
    markup,
    /<track kind="captions" src="\/media\/demo-relay-captions"/,
  );
  for (const tag of [
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'strong',
    'em',
    'del',
    'code',
    'pre',
    'blockquote',
    'ol',
    'ul',
    'table',
    'hr',
    'br',
  ])
    assert.match(markup, new RegExp('<' + tag + '(?:[ >]|/)'), tag);
  assert.match(markup, /<ol start="7">/);
  assert.equal((markup.match(/type="checkbox"/g) || []).length, 3);
  assert.match(markup, /href="https:\/\/docs.bullmq.io\/"/);
  assert.match(markup, /href="https:\/\/github.com\/taskforcesh\/bullmq"/);
  assert.doesNotMatch(markup, /autoplay|<iframe|<script/);
});

await test('reference-style links and images resolve without displaying their definitions', () => {
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

await test('character references render as text while code and raw HTML remain literal', () => {
  const markup = render(
    'Fish &amp; chips &copy; &#x1F680;\n\n`&amp;`\n\n&lt;script&gt;alert(1)&lt;/script&gt;',
  );
  assert.match(markup, /Fish &amp; chips © 🚀/);
  assert.match(markup, /<code>&amp;amp;<\/code>/);
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
});

await test('ordered and unordered lists retain mixed nesting, authored starts and inline formatting', () => {
  const markup = render(
    [
      '7. **Prepare** the release.',
      '   - Review *changes*.',
      '     1. Run `npm test`.',
      '     2. Inspect the result.',
      '   - Publish the notes.',
      '8. Finish.',
      '',
      '- Parent item',
      '  - Child item',
      '    - Grandchild item',
      '- Another parent',
      '',
      '0. Start from zero.',
      '1. Continue.',
    ].join('\n'),
  );
  assert.match(
    markup,
    /<ol start="7"><li><strong>Prepare<\/strong> the release\.<ul><li>Review <em>changes<\/em>\.<ol start="1"><li>Run <code>npm test<\/code>\.<\/li><li>Inspect the result\.<\/li><\/ol><\/li><li>Publish the notes\.<\/li><\/ul><\/li><li>Finish\.<\/li><\/ol>/,
  );
  assert.match(
    markup,
    /<ul><li>Parent item<ul><li>Child item<ul><li>Grandchild item<\/li><\/ul><\/li><\/ul><\/li><li>Another parent<\/li><\/ul>/,
  );
  assert.match(
    markup,
    /<ol start="0"><li>Start from zero\.<\/li><li>Continue\.<\/li><\/ol>/,
  );
});

await test('task markers preserve checked state and loose paragraphs remain inside their list items', () => {
  const markup = render(
    [
      '- [x] Completed **review**.',
      '',
      '  Notes for the completed item.',
      '',
      '- [ ] Pending item.',
      '  - Nested supporting detail.',
    ].join('\n'),
  );
  assert.match(
    markup,
    /<li class="project-task-item"><input[^>]*checked=""\/><p>Completed <strong>review<\/strong>\.<\/p><p>Notes for the completed item\.<\/p><\/li>/,
  );
  assert.match(
    markup,
    /<li class="project-task-item"><input[^>]*\/><p>Pending item\.<\/p><ul><li>Nested supporting detail\.<\/li><\/ul><\/li>/,
  );
  assert.equal((markup.match(/type="checkbox"/g) || []).length, 2);
  assert.equal((markup.match(/disabled=""/g) || []).length, 2);
  assert.equal((markup.match(/checked=""/g) || []).length, 1);
});

await test('shipped Relay tight nested tasks render one checkbox while intentional bracket text stays literal', () => {
  const relay = seeds.find(
    (seed) => seed.kind === 'project' && seed.data.slug === 'relay',
  );
  const markup = render(relay.data.body);
  assert.equal((markup.match(/type="checkbox"/g) || []).length, 3);
  assert.equal((markup.match(/checked=""/g) || []).length, 2);
  assert.match(
    markup,
    /checked=""\/>Describe the duplicate-delivery scenario\.<\/li>/,
  );
  assert.match(
    markup,
    /checked=""\/>Keep the original failure context\.<\/li>/,
  );
  assert.match(
    markup,
    /aria-label="Exercise the worker-crash path in a runnable prototype\."\/>Exercise the worker-crash path in a runnable prototype\.<\/li>/,
  );
  assert.doesNotMatch(markup, /\[(?:x| )\]/);

  const literal = render(
    'Outside task metadata, [x] and [ ] are literal text.\n\n- [x] Preserve the literal `[x]` example.',
  );
  assert.match(
    literal,
    /<p>Outside task metadata, \[x\] and \[ \] are literal text\.<\/p>/,
  );
  assert.match(literal, /<code>\[x\]<\/code>/);
  assert.equal((literal.match(/type="checkbox"/g) || []).length, 1);
});

await test('library categories rely on explicit authored assignment and keep ordinary project links', async () => {
  const { ProjectLibraryWindow, ReadingProjectLibrary } = await loadComponent(
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
  assert.doesNotMatch(markup, /aria-label="Project categories"/);
  assert.doesNotMatch(markup, /aria-pressed=/);
  const all = renderToStaticMarkup(
    createElement(ProjectLibraryWindow, { ...props, category: 'all' }),
  );
  assert.match(all, /href="\/projects\/legacy-system"/);
  const reading = renderToStaticMarkup(
    createElement(ReadingProjectLibrary, { data }),
  );
  assert.match(reading, /aria-label="Project categories"/);
  assert.match(reading, /aria-pressed="true"/);
  assert.match(reading, />Systems<\/span>/);
  assert.doesNotMatch(reading, />Interfaces<\/span>|>Experiments<\/span>/);
  const empty = renderToStaticMarkup(
    createElement(ReadingProjectLibrary, { data: { ...data, projects: [] } }),
  );
  assert.doesNotMatch(empty, /<button/);
  assert.match(empty, /No projects are available yet/);
});

await test('immersive gallery omits cover assets and placeholders while project details retain their media', async () => {
  const { ProjectLibraryWindow } = await loadComponent(
    'features/portfolio/project-library-window.tsx',
  );
  const projects = [
    {
      id: 'illustrated',
      slug: 'illustrated',
      title: 'Illustrated project',
      mediaId: 'cover',
    },
    { id: 'filmed', slug: 'filmed', title: 'Filmed project', mediaId: 'movie' },
    { id: 'text-only', slug: 'text-only', title: 'Text-only project' },
  ].map((project) => ({
    ...project,
    categories: ['systems'],
    summary: 'A project to explore.',
  }));
  const data = {
    site: {},
    experience: [],
    journal: [],
    links: [],
    projects,
    media: [
      {
        id: 'cover',
        url: '/media/cover',
        mime: 'image/webp',
        alt: 'Project overview',
      },
      {
        id: 'movie',
        url: '/media/movie',
        mime: 'video/mp4',
        alt: 'Project walkthrough',
        posterMediaId: 'poster',
      },
      {
        id: 'poster',
        url: '/media/poster',
        mime: 'image/webp',
        alt: 'Walkthrough preview',
      },
    ],
  };
  const props = {
    data,
    category: 'systems',
    onProjectSelect() {},
    onBack() {},
    onClose() {},
  };
  const gallery = renderToStaticMarkup(
    createElement(ProjectLibraryWindow, props),
  );
  for (const project of projects)
    assert.match(
      gallery,
      new RegExp(`aria-label="Read project: ${project.title}"`),
    );
  assert.doesNotMatch(gallery, /<img\b|<video\b|project-card-cover|\/media\//);
  assert.doesNotMatch(gallery, /Explore project/);
  assert.match(gallery, /<header\b[^>]*>[\s\S]*?Systems[\s\S]*?<\/header>/);
  assert.doesNotMatch(gallery, /<footer\b|LIBRARY ONLINE/);

  const imageDetail = renderToStaticMarkup(
    createElement(ProjectLibraryWindow, {
      ...props,
      project: projects[0],
    }),
  );
  assert.match(
    imageDetail,
    /<img[^>]*src="\/media\/cover"[^>]*alt="Project overview"/,
  );
  assert.match(
    imageDetail,
    /<button\b[^>]*>(?:(?!<\/button>)[\s\S])*Back to projects<\/button>/,
  );
  assert.match(
    imageDetail,
    /<footer\b[^>]*>[\s\S]*?Illustrated project[\s\S]*?<\/footer>/,
  );
  assert.doesNotMatch(imageDetail, /PROJECT OPEN|END OF PROJECT/);
  assert.equal((imageDetail.match(/Back to projects/g) || []).length, 1);
  const videoDetail = renderToStaticMarkup(
    createElement(ProjectLibraryWindow, {
      ...props,
      project: projects[1],
    }),
  );
  assert.match(
    videoDetail,
    /<video[^>]*controls=""[^>]*poster="\/media\/poster"/,
  );
  assert.match(videoDetail, /<source[^>]*src="\/media\/movie"/);
});

await test('project resource links share safe source/live destinations and retired dates stay out of both public views', async () => {
  const { ProjectLibraryWindow, ProjectLinks } = await loadComponent(
    'features/portfolio/project-library-window.tsx',
  );
  const { DossierView } = await loadComponent(
    'features/portfolio/room-views.tsx',
  );
  const project = {
    id: 'linked',
    slug: 'linked',
    title: 'A linked project',
    summary: 'A useful tool.',
    categories: ['systems'],
    role: 'Developer',
    period: 'RETIRED PROJECT DATE',
    sourceUrl: 'https://code.example/repository',
    demoUrl: 'https://demo.example/',
    body: '## Overview\n\nA complete project story.',
  };
  const data = {
    site: {},
    projects: [project],
    media: [],
    experience: [],
    journal: [],
    links: [],
  };
  for (const markup of [
    renderToStaticMarkup(
      createElement(ProjectLibraryWindow, {
        data,
        project,
        category: 'systems',
        onProjectSelect() {},
        onBack() {},
        onClose() {},
      }),
    ),
    renderToStaticMarkup(createElement(DossierView, { data, project })),
  ]) {
    assert.doesNotMatch(markup, /RETIRED PROJECT DATE/);
    assert.match(markup, /Developer/);
    assert.match(markup, /aria-label="Project resources"/);
    const resources = markup.match(
      /<nav[^>]*aria-label="Project resources"[^>]*>([\s\S]*?)<\/nav>/,
    )?.[1];
    assert.equal((resources?.match(/<a\b/g) || []).length, 2);
    assert.match(resources, /class="project-resource-link is-source"/);
    assert.match(markup, /<h1[^>]*>A linked project<\/h1>/);
    assert.match(
      resources,
      /class="project-live-link" href="https:\/\/demo.example\/"/,
    );
    assert.deepEqual(
      [...resources.matchAll(/href="([^"]+)"/g)].map((match) => match[1]),
      ['https://demo.example/', 'https://code.example/repository'],
    );
    assert.ok(
      markup.indexOf('A useful tool.') < markup.indexOf('Project resources'),
      'both resource controls follow the introduction',
    );
    assert.match(
      markup,
      /href="https:\/\/code.example\/repository" target="_blank" rel="noopener noreferrer"/,
    );
    assert.match(
      markup,
      /href="https:\/\/demo.example\/" target="_blank" rel="noopener noreferrer"/,
    );
    assert.ok(
      markup.indexOf('Project resources') <
        markup.indexOf('id="project-overview"'),
    );
  }
  const relay = {
    id: 'project-relay',
    ...seeds.find((seed) => seed.id === 'project-relay').data,
  };
  const relayData = { ...data, projects: [relay] };
  for (const markup of [
    renderToStaticMarkup(
      createElement(ProjectLibraryWindow, {
        data: relayData,
        project: relay,
        category: 'systems',
        onProjectSelect() {},
        onBack() {},
        onClose() {},
      }),
    ),
    renderToStaticMarkup(
      createElement(DossierView, { data: relayData, project: relay }),
    ),
  ]) {
    const explanation = markup.indexOf(
      'source and live links are BullMQ reference examples, not a deployed Relay product',
    );
    const resources = markup.indexOf('aria-label="Project resources"');
    assert.ok(
      explanation >= 0 && explanation < resources,
      'clarify the actual destinations in the introduction immediately before the resource links',
    );
    assert.ok(resources < markup.indexOf('id="project-overview"'));
    const links = markup.match(
      /<nav[^>]*aria-label="Project resources"[^>]*>([\s\S]*?)<\/nav>/,
    )?.[1];
    assert.equal((links?.match(/<a\b/g) || []).length, 2);
  }
  assert.equal(
    renderToStaticMarkup(
      createElement(ProjectLinks, {
        project: { sourceUrl: 'javascript:alert(1)', demoUrl: '' },
        site: {},
      }),
    ),
    '',
  );
  assert.equal(
    renderToStaticMarkup(
      createElement(ProjectLinks, {
        project: { demoUrl: 'javascript:alert(1)' },
        site: {},
      }),
    ),
    '',
  );
  assert.equal(
    renderToStaticMarkup(
      createElement(ProjectLinks, { project: {}, site: {} }),
    ),
    '',
  );
});

await test('optional resource controls share the intro row in live-before-source order in both views', async () => {
  const { ProjectLibraryWindow } = await loadComponent(
    'features/portfolio/project-library-window.tsx',
  );
  const { DossierView } = await loadComponent(
    'features/portfolio/room-views.tsx',
  );
  for (const [sourceUrl, demoUrl, expectedSource, expectedLive] of [
    ['', '', 0, 0],
    ['https://code.example/repository', '', 1, 0],
    ['', 'https://live.example/', 0, 1],
    ['https://code.example/repository', 'https://live.example/', 1, 1],
    ['javascript:alert(1)', 'data:text/html,unsafe', 0, 0],
  ]) {
    const project = {
      id: 'optional',
      slug: 'optional',
      title: 'Optional resources',
      summary: 'An introduction.',
      categories: ['systems'],
      body: '## Overview\n\nStory text.',
      sourceUrl,
      demoUrl,
    };
    const data = {
      site: { codeLabel: 'View source', demoLabel: 'Open live project' },
      projects: [project],
      media: [],
      experience: [],
      journal: [],
      links: [],
    };
    for (const markup of [
      renderToStaticMarkup(
        createElement(ProjectLibraryWindow, {
          data,
          project,
          category: 'systems',
          onProjectSelect() {},
          onBack() {},
          onClose() {},
        }),
      ),
      renderToStaticMarkup(createElement(DossierView, { data, project })),
    ]) {
      assert.equal(
        (markup.match(/class="project-resource-link is-source"/g) || []).length,
        expectedSource,
      );
      assert.equal(
        (markup.match(/class="project-live-link"/g) || []).length,
        expectedLive,
      );
      assert.equal(
        (markup.match(/aria-label="Project resources"/g) || []).length,
        expectedSource || expectedLive ? 1 : 0,
        'missing resources leave no empty action row',
      );
      const resources = markup.match(
        /<nav[^>]*aria-label="Project resources"[^>]*>([\s\S]*?)<\/nav>/,
      )?.[1];
      const expectedUrls = [
        ...(expectedLive ? ['https://live.example/'] : []),
        ...(expectedSource ? ['https://code.example/repository'] : []),
      ];
      assert.deepEqual(
        [...(resources || '').matchAll(/href="([^"]+)"/g)].map(
          (match) => match[1],
        ),
        expectedUrls,
      );
      assert.match(markup, /<h1[^>]*>Optional resources<\/h1>/);
      if (resources)
        assert.ok(
          markup.indexOf('An introduction.') <
            markup.indexOf('Project resources'),
        );
      if (expectedLive) assert.match(resources, />Open live project<\/span>/);
      if (expectedSource) assert.match(resources, />View source code<\/span>/);
      assert.doesNotMatch(markup, /href="(?:javascript:|data:)/);
    }
  }
});

await test('the shared resource row retains configured live and source labels with native safe navigation', async () => {
  const { ProjectLinks } = await loadComponent(
    'features/portfolio/project-library-window.tsx',
  );
  const markup = renderToStaticMarkup(
    createElement(ProjectLinks, {
      project: {
        demoUrl: 'https://live.example/',
        sourceUrl: 'https://code.example/project',
      },
      site: {
        demoLabel: 'Try the experience',
        codeLabel: 'Inspect the repository',
      },
    }),
  );
  assert.ok(
    markup.indexOf('Try the experience') <
      markup.indexOf('Inspect the repository'),
  );
  assert.equal(
    (markup.match(/target="_blank" rel="noopener noreferrer"/g) || []).length,
    2,
  );
  assert.doesNotMatch(markup, /<button/);
});

await test('source control clarifies only its legacy default label and preserves authored alternatives', async () => {
  const { ProjectLinks } = await loadComponent(
    'features/portfolio/project-library-window.tsx',
  );
  for (const [configured, expected] of [
    [undefined, 'View source code'],
    ['', 'View source code'],
    ['View source', 'View source code'],
    ['View source code', 'View source code'],
    ['Source code', 'Source code'],
    ['Explore the repository', 'Explore the repository'],
  ]) {
    const site = configured === undefined ? {} : { codeLabel: configured };
    const before = structuredClone(site);
    const markup = renderToStaticMarkup(
      createElement(ProjectLinks, {
        project: { sourceUrl: 'https://code.example/project' },
        site,
      }),
    );
    assert.ok(markup.includes('<span>' + expected + '</span>'));
    assert.match(
      markup,
      /<a[^>]*href="https:\/\/code.example\/project"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
    );
    assert.doesNotMatch(markup, /<button/);
    assert.deepEqual(
      site,
      before,
      'display wording does not rewrite configured content',
    );
  }
});
