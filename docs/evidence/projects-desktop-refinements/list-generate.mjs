import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';

// Run from the repository, or pass its root as the first argument. Output stays
// beside this temporary generator; it never reads or writes portfolio data.
const repo = path.resolve(process.argv[2] || process.cwd());
const out = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.join(repo, 'package.json'));
const { build } = require('esbuild');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const bundled = await build({
  absWorkingDir: repo,
  entryPoints: ['features/portfolio/project-markdown.tsx'],
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
  require, module: loaded, exports: loaded.exports, URL, Map, WeakMap,
});
const { ProjectMarkdown } = loaded.exports;
const markdown = [
  '7. **Prepare** the release.',
  '   - Review *changes*.',
  '     1. Run `npm test`.',
  '     2. Inspect the result.',
  '   - Publish the notes.',
  '8. Finish.',
  '',
  '- Parent item with a longer sentence that wraps on narrow screens so the hanging indentation can be inspected.',
  '  - Child item',
  '    - Grandchild item',
  '- Another parent',
  '',
  '0. Start from zero.',
  '1. Continue.',
  '',
  '---',
  '',
  '- [x] Completed **review**.',
  '',
  '  Notes for the completed item.',
  '',
  '- [ ] Pending item.',
  '  - Nested supporting detail.',
].join('\n');
const rendered = renderToStaticMarkup(createElement(ProjectMarkdown, { body: markdown }));
const sources = [
  'node_modules/tailwindcss/preflight.css',
  'app/globals.css',
  'features/portfolio/contact-computer-window.css',
  'features/portfolio/project-library-window.css',
  'features/studio/project-editor.css',
  'features/portfolio/project-markdown.css',
];
const hashes = {};
const styles = [];
for (const source of sources) {
  const original = await fs.readFile(path.join(repo, source), 'utf8');
  hashes[source] = createHash('sha256').update(original).digest('hex');
  // Preflight is included directly above. Vite/Tailwind build-time imports do
  // not belong in this standalone file; all ordinary app selectors are kept.
  const css = original.replace(/^@import\s+[^;]+;\s*$/gm, '');
  styles.push(`/* ${source} */\n${css}`);
}
for (const source of ['features/portfolio/project-markdown.tsx', 'features/portfolio/project-markdown-content.ts']) {
  hashes[source] = createHash('sha256').update(await fs.readFile(path.join(repo, source))).digest('hex');
}
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Project Markdown list review</title>
<style>${styles.join('\n')}</style>
<style>
body.fixture-page { margin:0; padding:24px; background:#0a1420; font-family:Arial,Helvetica,sans-serif; color:#e7eced; }
.fixture-heading { max-width:940px; margin:0 auto 22px; }
.fixture-heading h1 { font-size:24px; line-height:1.3; margin:0 0 8px; }
.fixture-heading p { font-size:13px; color:#b4c4cc; margin:0; }
.fixture-panels { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); align-items:start; gap:22px; max-width:1500px; margin:auto; }
.fixture-panels.is-single { display:block; max-width:940px; }
.fixture-panel { min-width:0; }
.fixture-panel > h2 { font-size:14px; line-height:1.4; letter-spacing:.05em; margin:0 0 12px; color:#c8d5db; }
.fixture-panel[hidden] { display:none; }
.fixture-panel .project-library-window { height:auto; }
.fixture-panel .dossier-paper { padding:26px 24px; border-width:3px; }
.fixture-panel .project-preview-document { padding:26px 24px; }
@media(max-width:950px) { .fixture-panels { grid-template-columns:1fr; max-width:620px; } }
@media(max-width:500px) { body.fixture-page { padding:14px; } .fixture-heading h1 { font-size:21px; } }
</style></head><body class="fixture-page">
<header class="fixture-heading"><h1>Project Markdown: list hierarchy</h1><p>Temporary server-rendered fixture. Actual renderer and stylesheet/reset sources; synthetic content only. No WebGL, camera projection or persistent writes.</p></header>
<main class="fixture-panels">
<section class="fixture-panel" data-context="immersive"><h2>IMMERSIVE · dark application</h2><article class="project-library-window"><div class="project-window-detail">${rendered}</div></article></section>
<section class="fixture-panel" data-context="reading"><h2>READING · paper detail</h2><article class="dossier-paper">${rendered}</article></section>
<section class="fixture-panel" data-context="studio"><h2>STUDIO · editor preview</h2><article class="project-preview-document">${rendered}</article></section>
</main>
<script>
const context = new URLSearchParams(location.search).get('context');
if (['immersive','reading','studio'].includes(context)) {
  document.querySelector('.fixture-panels').classList.add('is-single');
  for (const section of document.querySelectorAll('[data-context]')) section.hidden = section.dataset.context !== context;
}
</script>
</body></html>`;
await fs.writeFile(path.join(out, 'index.html'), html);
await fs.writeFile(path.join(out, 'fixture.md'), markdown);
await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  method: 'Actual ProjectMarkdown server-rendered through React, actual Tailwind Preflight, all ordinary app globals, current component and Studio styles. Only build-time CSS imports removed. Wrapper layout is a finite fixture, not a screenshot of the live app or CSS3D projection.',
  contexts: ['immersive', 'reading', 'studio'],
  query: '?context=immersive|reading|studio selects one panel; omit for all panels',
  hashes,
}, null, 2) + '\n');
console.log(path.join(out, 'index.html'));
