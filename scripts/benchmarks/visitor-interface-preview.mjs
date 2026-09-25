/** Read-only, server-rendered visitor interface states using production components.
 * node scripts/benchmarks/visitor-interface-preview.mjs [baseline revision]
 * GET /after?state=contact-error&surface=reading or /before; /manifest.json records
 * the frozen source. No hydration, WebGL, API, private content, or transport.
 * Restart after source changes. The optional baseline archives source only.
 */
import { build } from 'esbuild';
import tailwindcss from '@tailwindcss/postcss';
import postcss from 'postcss';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, realpath, rm, symlink } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), '../..');
const baseline = process.argv[2];
const port = Number(process.env.VISITOR_PREVIEW_PORT ?? 3002);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('VISITOR_PREVIEW_PORT must be an unprivileged TCP port.');
const sha256 = (contents) =>
  createHash('sha256').update(contents).digest('hex');
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const temporary = await realpath(
  await mkdtemp(resolve(tmpdir(), 'visitor-interface-preview-')),
);
const states = {
  'contact-chooser': 'Contact chooser',
  'contact-error': 'Contact failed message with retained draft',
  'contact-call-ack': 'Contact unsent call acknowledgement',
  'empty-projects': 'Whole-empty Projects collection',
  'empty-case-studies': 'Whole-empty Case studies collection',
  'long-projects': 'Long Projects titles',
  'long-case-studies': 'Long Case study titles',
  'long-project-detail': 'Long Project detail',
  'long-case-detail': 'Long Case study detail',
  'project-no-headings': 'Project body without section headings',
};
const entry = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import './app/globals.css';
import { ContactComputerWindow } from './features/portfolio/contact-computer-window';
import { ProjectLibraryWindow } from './features/portfolio/project-library-window';
import { CaseStudyLibraryWindow } from './features/portfolio/case-study-library-window';
import { ProjectsView, ExperienceView, DossierView, CaseStudyView, ContactView } from './features/portfolio/room-views';

const site = {
  name: 'Review Fixture', email: 'review-owner@example.com',
  backHomeLabel: 'Back to overview', backLabel: 'Back to projects',
  projectsRoom: 'Workshop', projectsHeading: 'Projects',
  projectsIntro: 'Synthetic public content for reviewing collection presentation.',
  allProjectsLabel: 'projects', experienceRoom: 'Archive',
  experienceHeading: 'Case studies',
  experienceIntro: 'Synthetic public content for reviewing the archive presentation.',
  contactRoom: 'Communications', contactHeading: 'Let’s talk.',
  contactIntro: 'Synthetic public data. This fixture cannot send or save anything.',
  emailLabelCta: 'Email', availability: 'Presentation fixture only',
  roleLabel: 'Role', stackLabel: 'Built with', dossierLabel: 'Project contents',
  emptyLabel: 'No entries are available yet.', inviteLabel: 'Get in touch',
};
const body = '## Purpose\\n\\nThis is synthetic review content, not a claim about real work. Its longer prose checks comfortable reading width and wrapping.\\n\\n## Construction notes\\n\\nA very long reference: https://example.com/documentation/InteroperabilityAcrossDistributedWorkflowsWithoutWhitespaceForWrappingReviewOnly\\n\\n> Review content deliberately exercises a long title and mixed paragraph lengths.\\n\\n## Outcome\\n\\nNo service was called and no information was saved.';
const titles = [
  'Coordinating a distributed research archive across teams, time zones, devices, and unusually long project names',
  'InteroperabilityAcrossDistributedWorkflowsWithoutWhitespaceForWrappingReviewOnly',
  'A short title',
];
const entries = titles.map((title, index) => ({
  id: 'fixture-' + index, slug: 'fixture-' + index, title,
  summary: index === 1 ? 'An unbroken title probes overflow without relying on private or published content.' : 'A deliberately longer summary describes a synthetic review example. It checks the relationship between a multiline title, its supporting copy, and the neighbouring entries.',
  categories: ['systems'], category: 'Systems',
  organization: 'Synthetic Research and Systems Collaboration',
  period: '2024–2026', role: 'Design and implementation', stack: 'React, TypeScript',
  body,
}));
const empty = { site, projects: [], experience: [], journal: [], links: [], media: [] };
const populated = { ...empty, projects: entries, experience: entries };
const noop = () => {};
const draft = {
  mode: 'message', name: 'Synthetic Visitor', email: 'visitor@example.com',
  company: 'A synthetic organisation with a deliberately longer display name',
  subject: 'A synthetic draft retained after a message error',
  message: 'This is synthetic review text. Nothing has been submitted, stored or sent.',
  timeZone: 'UTC',
};
export function renderState(state, surface) {
  const native = surface === 'native';
  const data = state.startsWith('empty-') ? empty : populated;
  let content;
  let room;
  if (state.startsWith('contact-')) {
    room = 'contact';
    const props = state === 'contact-error'
      ? { draft, initialError: true }
      : state === 'contact-call-ack'
        ? { draft: { ...draft, mode: 'call', date: '2026-10-20', time: '14:30' }, submission: { mode: 'call', status: 'demo', error: '' } }
        : { draft: { timeZone: 'UTC' } };
    content = native
      ? <ContactComputerWindow site={site} onClose={noop} {...props}/>
      : <ContactView data={empty} error={!!props.initialError} draft={props.draft} submission={props.submission}/>;
  } else if (state.includes('case')) {
    room = 'experience';
    content = native
      ? <CaseStudyLibraryWindow data={data} category="all" caseStudy={state.endsWith('detail') ? entries[0] : undefined} onCaseStudySelect={noop} onBack={noop} onClose={noop}/>
      : state.endsWith('detail') ? <CaseStudyView data={data} caseStudy={entries[0]}/> : <ExperienceView data={data}/>;
  } else {
    room = 'projects';
    const project = state === 'project-no-headings'
      ? { ...entries[0], title: 'A project without section headings', body: 'This synthetic project uses a plain body without Markdown headings. It verifies that the reading article uses the available width when there is no contents navigation. No private content or real project claims are used.' }
      : state.endsWith('detail') ? entries[0] : undefined;
    content = native
      ? <ProjectLibraryWindow data={data} category="all" project={project} onProjectSelect={noop} onBack={noop} onClose={noop}/>
      : project ? <DossierView data={data} project={project}/> : <ProjectsView data={data}/>;
  }
  return renderToStaticMarkup(native
    ? <div className="fixture-native-plane" inert>{content}</div>
    : <div className="orbital-experience is-readable" inert><div className="reader-stage"><article className={'room-reader reader-' + room}>{content}</article></div></div>);
}
`;
const manifest = {
  fixture: 'visitor-interface-preview',
  frozenAt: new Date().toISOString(),
  fixtureSha256: sha256(await readFile(scriptPath)),
  syntheticEntrySha256: sha256(entry),
  currentHead: git('rev-parse', 'HEAD'),
  baselineRevision: baseline ? git('rev-parse', baseline) : null,
  states,
  surfaces: ['reading', 'native'],
  method:
    'React renderToStaticMarkup of production components; production CSS compiled with the configured Tailwind PostCSS plugin. Synthetic public props only.',
  nativePlane:
    'min(960px, 100vw), 760 CSS px tall; no scale or physical-screen projection. Reading layout uses the production reading wrapper.',
  omissions: [
    'No hydration: Contact retains its intentional pre-hydration disabled controls and the custom scroll indicator has no measured thumb.',
    'All component content is inert; navigation, focus, keyboard and submission behavior are not tested.',
    'No WebGL, CSS3D projection, camera, physical monitor, orbital background, media assets, header or tools.',
    'No store, authentication, transport, API routes, main-server proxy or private content.',
    'Synthetic acknowledgment is the production unsent call preview branch, not evidence of message delivery or booking.',
    'Browser engine, viewport, DPR, zoom and screenshot scaling must be recorded by the capture caller.',
  ],
  versions: {},
};
const compiled = {};

try {
  for (const version of baseline ? ['before', 'after'] : ['after']) {
    let sourceRoot = root;
    if (version === 'before') {
      sourceRoot = resolve(temporary, 'baseline');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(sourceRoot);
      const available = git('ls-tree', '--name-only', baseline).split('\n');
      const paths = [
        'app',
        'features',
        'lib',
        'components',
        'tsconfig.json',
      ].filter((path) => available.includes(path));
      const archive = execFileSync(
        'git',
        ['archive', baseline, '--', ...paths],
        {
          cwd: root,
          maxBuffer: 32 * 1024 * 1024,
        },
      );
      execFileSync('tar', ['-xf', '-', '-C', sourceRoot], { input: archive });
      await symlink(
        resolve(root, 'node_modules'),
        resolve(sourceRoot, 'node_modules'),
      );
    }
    const sources = {};
    const record = (path, bytes) => {
      const name = relative(sourceRoot, path);
      if (!name.startsWith('..') && !name.startsWith('node_modules/'))
        sources[name] = sha256(bytes);
    };
    const result = await build({
      absWorkingDir: sourceRoot,
      stdin: { contents: entry, resolveDir: sourceRoot, loader: 'tsx' },
      outfile: 'fixture.cjs',
      write: false,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      packages: 'external',
      alias: { '@': sourceRoot },
      logLevel: 'silent',
      metafile: true,
      plugins: [
        {
          name: 'frozen-source-and-production-css',
          setup(buildContext) {
            buildContext.onLoad(
              { filter: /\.(?:[cm]?[jt]sx?|css)$/ },
              async ({ path }) => {
                if (path.includes('/node_modules/')) return;
                const bytes = await readFile(path);
                record(path, bytes);
                if (extname(path) !== '.css')
                  return {
                    contents: bytes.toString(),
                    loader: extname(path).slice(1),
                  };
                if (relative(sourceRoot, path) !== 'app/globals.css')
                  return { contents: bytes.toString(), loader: 'css' };
                const processed = await postcss([
                  tailwindcss({ base: sourceRoot }),
                ]).process(bytes, { from: path });
                for (const dependency of processed.messages)
                  if (
                    dependency.type === 'dependency' &&
                    dependency.file?.endsWith('.css')
                  )
                    record(dependency.file, await readFile(dependency.file));
                return { contents: processed.css, loader: 'css' };
              },
            );
          },
        },
      ],
    });
    for (const input of Object.keys(result.metafile.inputs)) {
      if (input === '<stdin>') continue;
      const path = isAbsolute(input) ? input : resolve(sourceRoot, input);
      if (
        !sources[relative(sourceRoot, path)] &&
        !path.includes('/node_modules/')
      )
        record(path, await readFile(path));
    }
    const javascript = result.outputFiles.find((file) =>
      file.path.endsWith('.cjs'),
    ).text;
    const css = result.outputFiles.find((file) =>
      file.path.endsWith('.css'),
    ).text;
    const serverModule = { exports: {} };
    runInNewContext(javascript, {
      require: createRequire(import.meta.url),
      module: serverModule,
      exports: serverModule.exports,
    });
    compiled[version] = { render: serverModule.exports.renderState, css };
    const sortedSources = Object.fromEntries(
      Object.entries(sources).sort(([a], [b]) => a.localeCompare(b)),
    );
    manifest.versions[version] = {
      sourceTreeSha256: sha256(JSON.stringify(sortedSources)),
      sources: sortedSources,
      javascriptSha256: sha256(javascript),
      cssSha256: sha256(css),
      currentIncludesWorkingTree: version === 'after',
    };
  }
} catch (error) {
  await rm(temporary, { recursive: true, force: true });
  throw error;
}

const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
const fixtureCss = `.fixture-review-bar{position:relative;z-index:100;padding:12px 16px;background:#151c23;color:#eee9de;border-bottom:1px solid #414c56;font:13px/1.5 Arial,sans-serif}.fixture-review-bar nav{display:flex;flex-wrap:wrap;gap:8px 16px}.fixture-review-bar a{text-decoration:underline;text-underline-offset:3px}.fixture-review-bar p{margin:8px 0 0;max-width:110ch}.fixture-native-plane{width:min(960px,100%);height:760px;margin:24px auto;background:#1f2730}.fixture-footer{padding:16px;font:12px/1.6 Arial,sans-serif;color:#c2c3bf}`;
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const send = (status, type, body) => {
    response.writeHead(status, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  if (!['GET', 'HEAD'].includes(request.method))
    return send(
      405,
      'text/plain',
      'Read-only fixture; requests cannot mutate data.',
    );
  if (url.pathname === '/manifest.json')
    return send(200, 'application/json', JSON.stringify(manifest, null, 2));
  const version = url.pathname.startsWith('/before') ? 'before' : 'after';
  if (!compiled[version])
    return send(404, 'text/plain', 'No baseline compiled.');
  if (url.pathname === `/${version}.css`)
    return send(200, 'text/css', compiled[version].css);
  if (!['/', '/before', '/after'].includes(url.pathname))
    return send(
      404,
      'text/plain',
      'No API or asset proxy exists in this fixture.',
    );
  const state = Object.hasOwn(states, url.searchParams.get('state'))
    ? url.searchParams.get('state')
    : 'contact-error';
  const surface =
    url.searchParams.get('surface') === 'native' ? 'native' : 'reading';
  const content = compiled[version].render(state, surface);
  const links = Object.entries(states)
    .map(
      ([id, label]) =>
        `<a href="/${version}?state=${id}&amp;surface=${surface}">${escape(label)}</a>`,
    )
    .join('');
  const versions = Object.keys(compiled)
    .map(
      (name) =>
        `<a href="/${name}?state=${state}&amp;surface=${surface}">${name}</a>`,
    )
    .join(' · ');
  const surfaces = ['reading', 'native']
    .map(
      (name) =>
        `<a href="/${version}?state=${state}&amp;surface=${name}">${name}</a>`,
    )
    .join(' · ');
  send(
    200,
    'text/html',
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escape(states[state])} · ${version} fixture</title><link rel="stylesheet" href="/${version}.css"><style>${fixtureCss}</style></head><body data-fixture-version="${version}" data-fixture-state="${state}" data-fixture-surface="${surface}" data-source-tree-sha256="${manifest.versions[version].sourceTreeSha256}"><header class="fixture-review-bar"><strong>Static production-component review · ${version} · ${surface}</strong><p>${versions} · ${surfaces} · <a href="/manifest.json">Source manifest</a></p><nav aria-label="Review states">${links}</nav><p>Synthetic public props; no hydration, WebGL, transport or store. All examples are inert. Contact controls retain the intentional disabled state before hydration; scroll indicator measurement is omitted.</p></header>${content}<footer class="fixture-footer">${escape(states[state])}. Native surfaces use a flat 960 × 760 CSS-pixel container, capped to viewport width. No camera projection or scaling is applied. Browser viewport, DPR and capture scale must be recorded separately. Nothing can be sent, saved or booked.</footer></body></html>`,
  );
});
const cleanup = async () => {
  server.close();
  await rm(temporary, { recursive: true, force: true });
};
server.once('error', async (error) => {
  await cleanup();
  console.error(error);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () =>
  console.log(
    `Static visitor review: http://127.0.0.1:${port}/after · frozen ${manifest.frozenAt}`,
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    await cleanup();
    process.exit(0);
  });
