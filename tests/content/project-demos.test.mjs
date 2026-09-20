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
