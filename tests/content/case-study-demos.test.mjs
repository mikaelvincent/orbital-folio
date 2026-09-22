import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { marked } from 'marked';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { seeds } from '../../lib/content/seed.ts';
import {
  caseStudySamples,
  sampleCaseStudyData,
  CASE_STUDY_SAMPLE_ASSETS,
} from '../../lib/content/sample-case-studies.mjs';
import {
  caseStudyPopulationPlan,
  ORIGINAL_CASE_STUDY_HASHES,
} from '../../scripts/demo-case-studies/population-plan.mjs';
import {
  canonical,
  contentHash,
} from '../../scripts/demo-projects/population-plan.mjs';

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
const legacy = JSON.parse(
  await readFile(
    new URL('./fixtures/case-studies-legacy-v1.json', import.meta.url),
    'utf8',
  ),
);
const record = (seed, data = seed.data) => ({
  id: seed.id,
  kind: seed.kind,
  draft: structuredClone(data),
  published: structuredClone(data),
  revision: 1,
});
const bundle = await build({
  stdin: {
    contents:
      "export * from './lib/content/validation.ts'; export * from './lib/content/case-study-media.ts'; export * from './lib/content/project-markdown.ts';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const {
  validateContent,
  validateCaseStudyPublication,
  projectMediaReferences,
} = await import(
  'data:text/javascript;base64,' +
    Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

test('fresh portfolios have six distinct studies, uneven categories and one deliberately empty research shelf', () => {
  const samples = seeds.filter((seed) => seed.kind === 'experience');
  assert.deepEqual(samples, caseStudySamples);
  assert.equal(new Set(samples.map((seed) => seed.id)).size, 6);
  assert.equal(new Set(samples.map((seed) => seed.data.slug)).size, 6);
  const counts = { product: 0, systems: 0, interfaces: 0, research: 0 };
  for (const sample of samples) {
    assert.deepEqual(validateContent('experience', sample.data), sample.data);
    assert.equal(sample.data.sample, true);
    assert.ok(sample.data.period);
    assert.ok(sample.data.body.length > 500);
    assert.equal(sample.data.mediaId, '');
    assert.equal(
      projectMediaReferences(sample.data.body).filter((url) =>
        url.startsWith('/media/'),
      ).length,
      0,
    );
    for (const category of sample.data.categories) counts[category]++;
  }
  assert.deepEqual(counts, {
    product: 3,
    systems: 2,
    interfaces: 1,
    research: 0,
  });
  const lengths = samples.map((sample) => sample.data.body.length);
  assert.ok(
    Math.max(...lengths) > Math.min(...lengths) * 3,
    'stories vary from concise to a full reference',
  );
  assert.equal(new Set(samples.map((sample) => sample.data.body)).size, 6);
});

test('the full product study demonstrates the safe Markdown vocabulary and every supported media presentation', () => {
  const study = sampleCaseStudyData(caseStudySamples[0].data, ids);
  const types = new Set(),
    headings = new Set(),
    tasks = new Set(),
    starts = new Set();
  void marked.walkTokens(marked.lexer(study.body), (token) => {
    types.add(token.type);
    if (token.type === 'heading') headings.add(token.depth);
    if (token.type === 'list' && token.ordered) starts.add(token.start);
    if (token.type === 'list_item' && token.task) tasks.add(token.checked);
  });
  for (const type of [
    'heading',
    'strong',
    'em',
    'del',
    'codespan',
    'code',
    'blockquote',
    'list',
    'table',
    'hr',
    'br',
    'link',
    'image',
  ])
    assert.ok(types.has(type), type);
  assert.deepEqual(
    [...headings].sort((a, b) => a - b),
    [2, 3, 4, 5, 6],
  );
  assert.deepEqual(
    [...tasks].sort((a, b) => Number(a) - Number(b)),
    [false, true],
  );
  assert.ok(starts.has(7));
  assert.equal(study.mediaId, ids.harbor);
  for (const key of ['fieldnotes', 'relay-video', 'relay-motion'])
    assert.ok(
      projectMediaReferences(study.body).includes('/media/' + ids[key]),
      key,
    );
  assert.match(
    study.body,
    /synthetic illustrations, not a recording of a deployed product/,
  );
  assert.match(study.body, /independent queue-design references/);
  assert.match(study.body, /GIF runs twice and stops/);

  const records = manifest.assets.map((asset) => {
    const data = {
      title: asset.title,
      mime: asset.mime,
      url: '/media/' + ids[asset.key],
      ...(asset.poster ? { posterMediaId: ids[asset.poster] } : {}),
      ...(asset.captions ? { captionsMediaId: ids[asset.captions] } : {}),
    };
    return { id: ids[asset.key], kind: 'media', draft: data, published: data };
  });
  const used = validateCaseStudyPublication(study, records)
    .map((item) => item.id)
    .sort((a, b) => a.localeCompare(b));
  assert.deepEqual(
    used,
    CASE_STUDY_SAMPLE_ASSETS[study.slug]
      .map((key) => ids[key])
      .sort((a, b) => a.localeCompare(b)),
  );
  for (const sample of caseStudySamples) {
    const populated = sampleCaseStudyData(sample.data, ids);
    assert.deepEqual(validateContent('experience', populated), populated);
    assert.doesNotThrow(() => validateCaseStudyPublication(populated, records));
  }
});

test('known untouched legacy samples update and missing demos are added without rewriting other records', () => {
  for (const sample of legacy)
    assert.equal(
      contentHash(sample.data),
      ORIGINAL_CASE_STUDY_HASHES[sample.data.slug],
    );
  const current = legacy.map((sample) => record(sample));
  current.push({
    id: 'owner-project',
    kind: 'project',
    draft: { title: 'Owner project' },
    published: { title: 'Owner project' },
  });
  const before = canonical(current);
  const plan = caseStudyPopulationPlan(current, ids);
  assert.deepEqual(
    plan.update.map((entry) => entry.id),
    ['experience-one', 'experience-two', 'experience-three'],
  );
  assert.deepEqual(
    plan.create.map((entry) => entry.seedId),
    [
      'case-study-release-decisions',
      'case-study-recovery-runbook',
      'case-study-readable-interfaces',
    ],
  );
  assert.equal(plan.skipped.length, 0);
  assert.equal(canonical(current), before);
});

test('the rich case study renders its tables, nested tasks, images and captioned native video with the public Markdown renderer', async () => {
  const bundled = await build({
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
    require: createRequire(import.meta.url),
    module: loaded,
    exports: loaded.exports,
    URL,
  });
  const media = manifest.assets.map((asset) => ({
    id: ids[asset.key],
    url: '/media/' + ids[asset.key],
    mime: asset.mime,
    title: asset.title,
    alt: asset.alt,
    ...(asset.poster ? { posterMediaId: ids[asset.poster] } : {}),
    ...(asset.captions ? { captionsMediaId: ids[asset.captions] } : {}),
  }));
  const study = sampleCaseStudyData(caseStudySamples[0].data, ids);
  const markup = renderToStaticMarkup(
    createElement(loaded.exports.ProjectMarkdown, {
      body: study.body,
      media,
    }),
  );
  assert.match(
    markup,
    /<video[^>]*controls=""[^>]*poster="\/media\/demo-relay"/,
  );
  assert.match(
    markup,
    /<source src="\/media\/demo-relay-video" type="video\/mp4"/,
  );
  assert.match(
    markup,
    /<track kind="captions" src="\/media\/demo-relay-captions"/,
  );
  assert.match(markup, /<img[^>]*src="\/media\/demo-fieldnotes"/);
  assert.match(markup, /<img[^>]*src="\/media\/demo-relay-motion"/);
  assert.match(markup, /<table>/);
  assert.match(markup, /<h6 id="project-boundary-condition">/);
  assert.match(markup, /<ol start="7">/);
  assert.equal((markup.match(/type="checkbox"/g) || []).length, 3);
  assert.equal((markup.match(/checked=""/g) || []).length, 2);
  assert.match(markup, /href="https:\/\/docs.bullmq.io\/"/);
  assert.match(markup, /rel="noopener noreferrer"/);
  assert.doesNotMatch(markup, /<script/);
});

test('population is idempotent for exact fresh and media-populated samples, including ordinary API-generated IDs', () => {
  const fresh = caseStudySamples.map((sample) => record(sample));
  assert.ok(
    caseStudyPopulationPlan(fresh).update.every((item) => item.unchanged),
  );
  assert.equal(caseStudyPopulationPlan(fresh, ids).create.length, 0);
  const populated = caseStudySamples.map((sample, i) => ({
    ...record(sample, sampleCaseStudyData(sample.data, ids)),
    id: 'created-id-' + i,
  }));
  const again = caseStudyPopulationPlan(populated, ids);
  assert.equal(again.update.length, 6);
  assert.ok(again.update.every((item) => item.unchanged));
  assert.equal(again.create.length, 0);
  assert.equal(again.skipped.length, 0);
  assert.equal(
    caseStudyPopulationPlan(populated, {}).skipped.length,
    4,
    'unverified media IDs cannot authorize overwriting illustrated samples',
  );
});

test('guards preserve edited samples, divergent drafts, unpublished records and ID or slug collisions', () => {
  const current = caseStudySamples.map((sample) => record(sample));
  current[0].draft.title = current[0].published.title = 'Owner title';
  current[1].draft.body += '\nPrivate notes';
  current[2].published = null;
  current[3].draft.sample = current[3].published.sample = false;
  current[4].kind = 'project';
  current.push({ ...record(caseStudySamples[5]), id: 'duplicate-slug' });
  const before = canonical(current);
  const plan = caseStudyPopulationPlan(current, ids);
  assert.equal(plan.update.length, 0);
  assert.equal(plan.create.length, 0);
  assert.equal(plan.skipped.length, 6);
  assert.equal(canonical(current), before);
  const renamed = record(caseStudySamples[0]);
  renamed.draft.slug = renamed.published.slug = 'owner-renamed';
  assert.equal(
    caseStudyPopulationPlan([renamed], ids).skipped[0].slug,
    'building-products',
  );
});
