/** Finite SSR resource-link fixture; never reads/writes portfolio records.
 * node docs/evidence/project-interface-polish/links-fixture.mjs [/tmp/output]
 * python3 -m http.server 3002 --bind 127.0.0.1 --directory /tmp/orbital-project-links
 */
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const out = resolve(process.argv[2] || '/tmp/orbital-project-links');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const bundled = await build({
  absWorkingDir: repo,
  stdin: {
    contents:
      "export { ProjectLibraryWindow } from './features/portfolio/project-library-window.tsx'; export { DossierView } from './features/portfolio/room-views.tsx';",
    resolveDir: repo,
  },
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
  require: createRequire(resolve(repo, 'package.json')),
  module: loaded,
  exports: loaded.exports,
  URL,
  Map,
  WeakMap,
});
const { ProjectLibraryWindow, DossierView } = loaded.exports;
const project = {
  id: 'fixture',
  slug: 'visual-review',
  title: 'Project links — visual review',
  summary:
    'A finite layout fixture showing optional repository and live project links. These example destinations do not describe an actual portfolio project.',
  categories: ['systems'],
  role: 'Design and implementation',
  stack: 'React, TypeScript',
  sourceUrl: 'https://github.com/example/demo',
  demoUrl: 'https://docs.example.com/',
  body: '## Overview\n\nThe two resources sit below the introduction, before project metadata and the story. The source uses a repository icon; the live project has a globe and a restrained amber accent.\n\n### Detail\n\nNo media or external resource is requested by this fixture.',
};
const data = {
  site: {
    backLabel: 'Back to projects',
    dossierLabel: 'In this project',
    roleLabel: 'Role',
    stackLabel: 'Built with',
    inviteLabel: 'Start a conversation',
  },
  projects: [project],
  media: [],
  experience: [],
  journal: [],
  links: [],
};
const immersive = renderToStaticMarkup(
  createElement(ProjectLibraryWindow, {
    data,
    project,
    category: 'systems',
    onProjectSelect() {},
    onBack() {},
    onClose() {},
  }),
);
const reading = renderToStaticMarkup(
  createElement(DossierView, { data, project }),
);
const sources = [
  'node_modules/tailwindcss/preflight.css',
  'app/globals.css',
  'features/portfolio/contact-computer-window.css',
  'features/portfolio/project-library-window.css',
  'features/portfolio/project-markdown.css',
];
const hashes = {},
  styles = [];
for (const source of sources) {
  const text = await readFile(resolve(repo, source), 'utf8');
  hashes[source] = hash(text);
  styles.push(
    `/* ${source} */\n${text.replace(/^@import\s+[^;]+;\s*$/gm, '')}`,
  );
}
for (const source of [
  'features/portfolio/project-library-window.tsx',
  'features/portfolio/room-views.tsx',
  'features/portfolio/project-markdown.tsx',
])
  hashes[source] = hash(await readFile(resolve(repo, source)));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Project resource links · finite fixture</title>
<style>${styles.join('\n')}</style>
<style>
body.fixture { padding:24px; background:#0b1520; }
.fixture-heading { max-width:1300px; margin:0 auto 20px; }
.fixture-heading h1 { font-size:22px; margin:0 0 6px; }
.fixture-heading p { font-size:13px; color:#b4c4cc; margin:0; }
.fixture-layout { max-width:1300px; margin:auto; display:grid; grid-template-columns:1fr 1fr; gap:24px; }
.fixture-panel { min-width:0; }
.fixture-panel > h2 { margin:0 0 10px; font-size:13px; color:#bccacf; letter-spacing:.08em; }
.fixture-panel[data-context=immersive] > div { height:700px; background:#172b38; border-radius:8px; }
.fixture-panel[data-context=reading] { color:var(--ink); background:var(--paper); padding:20px; border-radius:8px; }
.fixture-panel[data-context=reading] .dossier-layout { display:block; }
.fixture-panel[data-context=reading] .dossier-index { display:none; }
.fixture-panel[data-context=reading] .dossier-paper { padding:28px; }
.fixture-panel[hidden] { display:none; }
.fixture-layout.is-single { display:block; max-width:940px; }
@media(max-width:800px) { .fixture-layout { grid-template-columns:1fr; } }
@media(max-width:500px) { body.fixture { padding:12px; } .fixture-panel[data-context=reading] { padding:10px; } }
</style></head><body class="fixture">
<header class="fixture-heading"><h1>Project resources · visual review</h1><p>Finite server-rendered fixture using the actual components, application styles and reset. No WebGL, camera projection, persisted records or working window controls.</p></header>
<main class="fixture-layout"><section class="fixture-panel" data-context="immersive"><h2>APPLICATION</h2>${immersive}</section><section class="fixture-panel" data-context="reading"><h2>READING VIEW</h2>${reading}</section></main>
<script>const context=new URLSearchParams(location.search).get('context');if(['immersive','reading'].includes(context)){document.querySelector('.fixture-layout').classList.add('is-single');for(const panel of document.querySelectorAll('[data-context]'))panel.hidden=panel.dataset.context!==context;}</script>
</body></html>`;
await mkdir(out, { recursive: true });
await writeFile(resolve(out, 'index.html'), html);
const manifest = {
  generatedAt: new Date().toISOString(),
  method:
    'Actual ProjectLibraryWindow and DossierView SSR, actual Tailwind preflight and application styles. Only build-time CSS imports removed. Wrapper is a finite layout fixture; no camera, WebGL, hydration, live API or persistence.',
  paths: {
    output: out,
    review: 'http://127.0.0.1:3002/?context=immersive',
    reading: 'http://127.0.0.1:3002/?context=reading',
  },
  syntheticProject: project,
  htmlSha256: hash(html),
  generatorSha256: hash(await readFile(fileURLToPath(import.meta.url))),
  sources: hashes,
};
await writeFile(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    'links-fixture-manifest.json',
  ),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(resolve(out, 'index.html'));
