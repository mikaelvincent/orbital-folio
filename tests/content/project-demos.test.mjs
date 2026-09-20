import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { marked } from 'marked';
import { build } from 'esbuild';
import { seeds } from '../../lib/content/seed.ts';
import { sampleProjectData } from '../../lib/content/sample-projects.mjs';
import {
  samplePopulationPlan,
  localBase,
  canonical,
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
  manifest.assets.map((a) => [a.key, 'demo-' + a.key]),
);
const projects = seeds.filter((s) => s.kind === 'project');
const record = (seed, data = seed.data) => ({
  id: seed.id,
  kind: 'project',
  draft: data,
  published: structuredClone(data),
  revision: 1,
});
const bundled = await build({
  stdin: {
    contents:
      "export * from './lib/content/media-upload.ts'; export * from './features/studio/project-editor-helpers.ts';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'esm',
  logLevel: 'silent',
});
const { validateMediaBytes, projectUploadError } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(bundled.outputFiles[0].text).toString('base64')
);

await test('nine authored sample stories exercise uneven categories and rich Markdown without dangling fresh-seed media', () => {
  const counts = { systems: 0, interfaces: 0, experiments: 0 };
  for (const project of projects) {
    counts[project.data.categories[0]]++;
    const types = new Set();
    void marked.walkTokens(marked.lexer(project.data.body), (t) =>
      types.add(t.type),
    );
    for (const type of [
      'heading',
      'strong',
      'em',
      'code',
      'table',
      'list',
      'blockquote',
    ])
      assert.ok(types.has(type), project.data.slug + ': ' + type);
    assert.ok(
      !project.data.body.includes('/media/'),
      'fresh seeds do not reference absent blobs',
    );
  }
  assert.deepEqual(counts, { systems: 5, interfaces: 3, experiments: 1 });
  const relay = sampleProjectData(
    projects.find((p) => p.data.slug === 'relay').data,
    ids,
  );
  assert.ok(relay.body.includes('/media/demo-relay-video'));
  assert.ok(relay.body.includes('/media/demo-relay-motion'));
  assert.equal(relay.mediaId, 'demo-relay');
});

await test('browsable demo stories demonstrate varied nested ordered, unordered and task lists', () => {
  const summaries = {};
  for (const project of projects) {
    const summary = {
      depth: 0,
      ordered: false,
      unordered: false,
      tasks: false,
    };
    const inspect = (tokens, depth = 0) => {
      for (const token of tokens) {
        if (token.type === 'list') {
          summary.depth = Math.max(summary.depth, depth + 1);
          if (depth) summary[token.ordered ? 'ordered' : 'unordered'] = true;
          for (const item of token.items) {
            summary.tasks ||= !!item.task;
            inspect(item.tokens, depth + 1);
          }
        } else if (token.tokens) inspect(token.tokens, depth);
      }
    };
    inspect(marked.lexer(project.data.body));
    summaries[project.data.slug] = summary;
  }
  assert.deepEqual(summaries.relay, {
    depth: 3,
    ordered: true,
    unordered: true,
    tasks: true,
  });
  assert.deepEqual(summaries.fieldnotes, {
    depth: 3,
    ordered: true,
    unordered: true,
    tasks: false,
  });
  assert.deepEqual(summaries.meter, {
    depth: 2,
    ordered: false,
    unordered: true,
    tasks: false,
  });
  for (const slug of ['beacon', 'parcel', 'tempo', 'ledger', 'harbor', 'atlas'])
    assert.equal(summaries[slug].depth, 1, slug + ' keeps its shorter example');
});

await test('previous rich demo migration requires exact content and verified media IDs', async () => {
  // Frozen authored v1 content is a migration input, not a rendering fallback.
  const previous = JSON.parse(
    await readFile(
      new URL('./fixtures/project-demo-relay-v1.json', import.meta.url),
      'utf8',
    ),
  );
  const relay = projects.find((project) => project.data.slug === 'relay');
  const localIds = Object.fromEntries(
    manifest.assets.map((asset, i) => [asset.key, 'verified-local-' + i]),
  );
  const populated = {
    ...previous.populated,
    mediaId: localIds.relay,
    body: previous.populated.body.replace(
      /\/media\/demo-([a-zA-Z0-9_-]+)/g,
      (_, key) => '/media/' + localIds[key],
    ),
  };
  for (const input of [previous.seed, populated]) {
    const current = record(relay, input);
    const before = canonical(current);
    const plan = samplePopulationPlan([current], [relay], localIds);
    assert.equal(plan.update.length, 1);
    assert.equal(plan.update[0].unchanged, false);
    assert.equal(plan.update[0].data.mediaId, localIds.relay);
    assert.match(plan.update[0].data.body, /   - \[x\]/);
    assert.equal(
      canonical(current),
      before,
      'migration planning stays read-only',
    );
  }
  const unverified = samplePopulationPlan(
    [record(relay, populated)],
    [relay],
    {},
  );
  assert.equal(
    unverified.update.length,
    0,
    'unrecognized media IDs must not be trusted',
  );
  for (const edit of [
    { ...populated, body: populated.body + '\nOwner-authored notes.' },
    { ...populated, title: 'My own Relay study' },
    { ...populated, mediaId: localIds.fieldnotes },
  ]) {
    const plan = samplePopulationPlan([record(relay, edit)], [relay], localIds);
    assert.equal(
      plan.update.length,
      0,
      'published owner edits must be retained',
    );
  }
  const privateDraft = record(relay, populated);
  privateDraft.draft = {
    ...populated,
    body: populated.body + '\nPrivate draft.',
  };
  assert.equal(
    samplePopulationPlan([privateDraft], [relay], localIds).update.length,
    0,
  );
  const unpublished = record(relay, populated);
  unpublished.published = null;
  assert.equal(
    samplePopulationPlan([unpublished], [relay], localIds).update.length,
    0,
  );
});

await test('local population preserves owner edits, divergent drafts, unpublished content and is a no-op after an exact run', () => {
  const fresh = projects.map((s) => record(s));
  assert.equal(samplePopulationPlan(fresh, seeds, ids).update.length, 9);
  const populated = projects.map((s) =>
    record(s, sampleProjectData(s.data, ids)),
  );
  const rerun = samplePopulationPlan(populated, seeds, ids);
  assert.equal(rerun.update.length, 9);
  assert.ok(rerun.update.every((p) => p.unchanged));
  const changed = structuredClone(populated);
  changed[0].draft.title += ' owner edit';
  changed[0].published.title = changed[0].draft.title;
  changed[1].draft.body += '\nPrivate draft changes';
  changed[2].published = null;
  changed[3].draft.sample = false;
  changed[3].published.sample = false;
  const before = canonical(changed);
  const plan = samplePopulationPlan(changed, seeds, ids);
  assert.equal(plan.update.length, 5);
  assert.equal(plan.skipped.length, 4);
  assert.equal(canonical(changed), before, 'planning itself is read-only');
  assert.equal(localBase('http://localhost:3000'), 'http://localhost:3000');
  for (const url of [
    'https://example.com',
    'http://localhost.evil.test',
    'http://user:secret@localhost:3000',
    'https://localhost:3000',
  ])
    assert.throws(() => localBase(url));
});

await test('checked-in demo media matches provenance hashes and contains decoded images and a finite animated GIF', async () => {
  let total = 0;
  for (const asset of manifest.assets) {
    const bytes = await readFile(
      new URL(
        '../../scripts/assets/project-demos/' + asset.file,
        import.meta.url,
      ),
    );
    total += bytes.length;
    assert.equal(bytes.length, asset.size);
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      asset.sha256,
    );
    assert.doesNotThrow(() => validateMediaBytes(bytes, asset.mime));
    if (asset.mime === 'image/webp') {
      const m = await sharp(bytes).metadata();
      assert.equal(m.width, 960);
      assert.equal(m.height, 600);
    }
    if (asset.mime === 'image/gif') {
      const m = await sharp(bytes, { animated: true }).metadata();
      assert.equal(m.width, 320);
      assert.equal(m.pageHeight, 180);
      assert.equal(m.pages, 24);
      assert.equal(m.loop, 2);
      assert.deepEqual(m.delay, Array(24).fill(80));
      assert.ok(m.delay.reduce((n, v) => n + v, 0) * m.loop < 5000);
      const first = await sharp(bytes, { page: 0 }).raw().toBuffer(),
        last = await sharp(bytes, { page: 23 }).raw().toBuffer();
      assert.notDeepEqual(first, last, 'decoded frames contain real animation');
    }
    if (asset.mime === 'video/mp4') {
      const body = bytes.toString('latin1');
      assert.ok(body.includes('avc1'), 'H.264 sample entry');
      assert.ok(
        body.includes('moov') && body.includes('mdat'),
        'metadata and encoded media payload',
      );
      assert.ok(
        bytes.length > 20000,
        'real encoded frames, not the signature-only security test fixture',
      );
    }
  }
  assert.equal(total, 206539);
  assert.doesNotThrow(() =>
    validateMediaBytes(
      Uint8Array.from([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 0, 0, 59]),
      'image/gif',
    ),
  );
  assert.throws(
    () =>
      validateMediaBytes(
        new TextEncoder().encode('<script>fake GIF</script>'),
        'image/gif',
      ),
    /contents/,
  );
  assert.equal(
    projectUploadError({ size: 20, name: 'animation.gif', type: 'image/gif' }),
    null,
  );
  assert.match(
    projectUploadError({
      size: 5 * 1024 * 1024 + 1,
      name: 'animation.gif',
      type: 'image/gif',
    }),
    /image up to 5/,
  );
});
