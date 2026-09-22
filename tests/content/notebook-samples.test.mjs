import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { marked } from 'marked';
import { seeds } from '../../lib/content/seed.ts';
import { notebookSamples } from '../../lib/content/sample-notebook.mjs';
import {
  notebookPopulationPlan,
  ORIGINAL_NOTEBOOK_HASHES,
} from '../../scripts/demo-notebook/population-plan.mjs';
import { contentHash } from '../../scripts/demo-projects/population-plan.mjs';

const legacy = JSON.parse(
  await readFile(
    new URL('./fixtures/notebook-legacy-v1.json', import.meta.url),
    'utf8',
  ),
);
const record = (seed, data = seed.data) => ({
  id: seed.id,
  kind: seed.kind,
  draft: structuredClone(data),
  published: structuredClone(data),
  revision: 7,
});

test('fresh notebooks contain five distinct rich Markdown sections without manual page breaks', () => {
  assert.deepEqual(
    seeds.filter(({ kind }) => kind === 'journal'),
    notebookSamples,
  );
  assert.equal(notebookSamples.length, 5);
  assert.equal(new Set(notebookSamples.map(({ id }) => id)).size, 5);
  assert.equal(new Set(notebookSamples.map(({ data }) => data.slug)).size, 5);
  for (const { data } of notebookSamples) {
    assert.equal(data.sample, true);
    assert.ok(data.body.length > 1800, data.slug);
    assert.ok(!data.body.includes('<!-- notebook-page -->'));
    const tokens = marked.lexer(data.body);
    assert.ok(tokens.filter(({ type }) => type === 'heading').length >= 4);
    assert.ok(tokens.filter(({ type }) => type === 'paragraph').length >= 7);
  }
});

test('the exact legacy snapshots upgrade, missing sections are added, and record revisions are retained', () => {
  for (const seed of legacy)
    assert.equal(
      contentHash(seed.data),
      ORIGINAL_NOTEBOOK_HASHES[seed.data.slug],
    );
  const plan = notebookPopulationPlan(legacy.map((seed) => record(seed)));
  assert.equal(plan.update.length, 3);
  assert.equal(plan.create.length, 2);
  assert.equal(plan.skipped.length, 0);
  assert.ok(
    plan.update.every(
      ({ revision, unchanged }) => revision === 7 && !unchanged,
    ),
  );
  assert.deepEqual(
    plan.create.map(({ slug }) => slug),
    ['learning-notes', 'design-details'],
  );
});

test('an owner edit is preserved even if the sample flag, ID and slug are unchanged', () => {
  const seed = legacy[0];
  for (const [key, value] of [
    ['title', 'An authored title'],
    ['body', seed.data.body + '\n\nAn authored paragraph.'],
    ['order', 10],
    ['subtitle', 'An authored subtitle'],
  ]) {
    const current = record(seed, { ...seed.data, [key]: value });
    const plan = notebookPopulationPlan([current]);
    assert.equal(
      plan.update.some(({ id }) => id === seed.id),
      false,
    );
    assert.ok(plan.skipped.some(({ slug }) => slug === seed.data.slug));
    assert.equal(current.draft[key], value);
  }
});

test('unpublished records, non-samples and divergent private drafts remain untouched', () => {
  for (const mutate of [
    (current) => {
      current.published = null;
    },
    (current) => {
      current.draft.sample = current.published.sample = false;
    },
    (current) => {
      current.draft.body += '\nPrivate work in progress.';
    },
  ]) {
    const current = record(legacy[0]);
    mutate(current);
    const before = structuredClone(current);
    const plan = notebookPopulationPlan([current]);
    assert.equal(plan.update.length, 0);
    assert.ok(plan.skipped.some(({ slug }) => slug === 'my-story'));
    assert.deepEqual(current, before);
  }
});

test('sample IDs and either published or private slugs cannot overwrite conflicting records', () => {
  const duplicate = [
    record(legacy[0]),
    { ...record(legacy[0]), id: 'owner-copy' },
  ];
  const wrongKind = [{ ...record(legacy[0]), kind: 'project' }];
  const renamed = record(legacy[0]);
  renamed.draft.slug = renamed.published.slug = 'owner-renamed-section';
  const privateSlug = record(notebookSamples[2]);
  privateSlug.id = 'owner-learning';
  privateSlug.published.slug = 'another-learning-section';
  for (const records of [duplicate, wrongKind, [renamed], [privateSlug]]) {
    const before = structuredClone(records);
    const plan = notebookPopulationPlan(records);
    assert.equal(plan.update.length, 0);
    assert.equal(plan.skipped.length, 1);
    assert.deepEqual(records, before);
  }
});

test('repeating population after API-generated identities makes no changes', () => {
  const populated = notebookSamples.map((seed, index) => ({
    ...record(seed),
    id: `api-generated-${index}`,
  }));
  const plan = notebookPopulationPlan(populated);
  assert.equal(plan.create.length, 0);
  assert.equal(plan.skipped.length, 0);
  assert.equal(plan.update.length, 5);
  assert.ok(plan.update.every(({ unchanged }) => unchanged));
});
