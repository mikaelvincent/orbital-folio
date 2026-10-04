import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as navigation from 'vinext/shims/navigation';
import 'vinext/shims/navigation-state';
import {
  createRequestContext,
  runWithRequestContext,
} from 'vinext/shims/unified-request-context';
import { seeds } from '../../lib/content/seed.ts';
import { toPublishedPortfolio } from '../../lib/content/types.ts';
import { AUTOMATIC_READING_QUERY } from '../../features/portfolio/view-policy.ts';

const bundled = await build({
  entryPoints: ['features/portfolio/public-shell.tsx'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'next/navigation',
    '@base-ui/react/*',
    './spacecraft-runtime',
  ],
  loader: { '.css': 'empty' },
  logLevel: 'silent',
});
const require = createRequire(import.meta.url);
const loaded = { exports: {} };
runInNewContext(bundled.outputFiles[0].text, {
  module: loaded,
  exports: loaded.exports,
  require: (id) => (id === 'next/navigation' ? navigation : require(id)),
  URL,
  URLSearchParams,
});
const data = toPublishedPortfolio(
  seeds.map(({ id, kind, data: published }) => ({ id, kind, published })),
);

// Render the real shell with Vinext's request URL, without a browser or store.
function render(path, props = {}) {
  return runWithRequestContext(createRequestContext(), () => {
    const url = new URL(path, 'https://portfolio.test');
    navigation.setNavigationContext({
      pathname: url.pathname,
      searchParams: url.searchParams,
      params: {},
    });
    return renderToStaticMarkup(
      createElement(
        loaded.exports.PublicShell,
        {
          data: {
            ...data,
            site: { ...data.site, _preview: !!props.preview },
          },
          active: 'home',
          ...props,
        },
        createElement('article', null, 'Server-rendered reading content'),
      ),
    );
  });
}

await test('Reading view is ready in the first HTML response, including deep links and previews', () => {
  const cases = [
    ['/projects', { active: 'projects' }],
    ['/projects/relay', { active: 'projects', projectSlug: 'relay' }],
    ['/case-studies?category=systems', { active: 'experience' }],
    ['/experience', { active: 'experience' }],
    ['/about', { active: 'about' }],
    [
      `/about/${data.journal[0].slug}`,
      { active: 'about', notebookSlug: data.journal[0].slug },
    ],
    ['/contact', { active: 'contact' }],
    ['/privacy', { active: 'privacy' }],
    ['/admin/preview?section=projects', { active: 'projects', preview: true }],
    ['/?view=reading', {}],
    [
      '/projects/relay?view=reading',
      { active: 'projects', projectSlug: 'relay' },
    ],
    ['/case-studies?category=systems&view=reading', { active: 'experience' }],
    [
      `/about/${data.journal[0].slug}?view=reading`,
      { active: 'about', notebookSlug: data.journal[0].slug },
    ],
    ['/contact?view=reading', { active: 'contact' }],
    ['/admin/preview?section=home&view=reading', { preview: true }],
  ];
  for (const [path, props] of cases) {
    const html = render(path, props);
    assert.doesNotMatch(html, /class="scene-loader boot-loader/, path);
    assert.match(html, /class="flight-header">/, path);
    assert.match(html, /class="orbital-render" hidden=""/, path);
    assert.match(html, /Server-rendered reading content/, path);
    assert.match(
      html,
      /class="flight-identity" href="[^"]*[?&](?:amp;)?view=reading"/,
      'Reading links retain the selected view before JavaScript runs',
    );
  }
});

await test('interactive requests retain the boot loader and no-JavaScript reading fallback', () => {
  for (const path of ['/', '/?view=interactive', '/?view=unknown']) {
    const html = render(path);
    assert.match(html, /class="scene-loader boot-loader/, path);
    assert.match(html, /href="#room-reader"/, path);
    assert.match(
      html,
      /<noscript><style>\.boot-loader \{ display: none !important; \}<\/style><\/noscript>/,
      path,
    );
    assert.match(html, /Server-rendered reading content/, path);
  }
});

await test('automatic home uses the same CSS preference query before hydration and keeps undecided links neutral', () => {
  for (const path of ['/', '/?view=unknown']) {
    const html = render(path);
    assert.ok(html.includes(`@media ${AUTOMATIC_READING_QUERY}`));
    assert.match(html, /class="scene-loader boot-loader automatic-loader"/);
    assert.match(html, /data-room-link="projects"[^>]*href="\/projects"/);
  }
});

await test('explicit Interactive deep links retain the loader and choice before hydration, including previews', () => {
  for (const [path, props] of [
    ['/?view=interactive', {}],
    [
      '/projects/relay?view=interactive',
      { active: 'projects', projectSlug: 'relay' },
    ],
    ['/contact?view=interactive', { active: 'contact' }],
    [
      '/admin/preview?section=about&view=interactive',
      { active: 'about', preview: true },
    ],
  ]) {
    const html = render(path, props);
    assert.match(html, /class="scene-loader boot-loader"/, path);
    assert.ok(!html.includes(`@media ${AUTOMATIC_READING_QUERY}`), path);
    assert.match(
      html,
      /class="flight-identity" href="[^"]*[?&](?:amp;)?view=interactive"/,
      path,
    );
  }
});
