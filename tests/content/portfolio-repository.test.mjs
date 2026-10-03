import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import { runInThisContext } from 'node:vm';
import { build } from 'esbuild';
import * as vinextCache from 'vinext/cache';
import {
  createRequestContext,
  runWithRequestContext,
} from 'vinext/shims/unified-request-context';
import { seeds } from '../../lib/content/seed.ts';
import { toPortfolio } from '../../lib/content/types.ts';

// Exercise the installed Vinext request cache with isolated, in-memory SQL.
// Only the Workers binding is replaced; no server or persistent store is used.
const bundled = await build({
  entryPoints: ['lib/content/repository.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  external: ['cloudflare:workers', 'vinext/cache'],
  logLevel: 'silent',
});
const evaluate = runInThisContext(
  `(function(require, module, exports) { ${bundled.outputFiles[0].text}\n})`,
);
const require = createRequire(import.meta.url);
const request = (fn) => runWithRequestContext(createRequestContext(), fn);
const record = (id, kind, published, draft = published) => ({
  id,
  kind,
  draft: JSON.stringify(draft),
  published: published === null ? null : JSON.stringify(published),
});
const site = () =>
  record('site', 'site', { name: 'Live owner' }, { name: 'Draft owner' });
function fixture(t, rows = [site()]) {
  const sql = new DatabaseSync(':memory:');
  t.after(() => sql.close());
  sql.exec(
    'CREATE TABLE content (id TEXT PRIMARY KEY, kind TEXT NOT NULL, draft TEXT NOT NULL, published TEXT, revision INTEGER NOT NULL, updated_at TEXT NOT NULL)',
  );
  const insert = sql.prepare('INSERT INTO content VALUES (?,?,?,?,1,?)');
  for (const row of rows)
    insert.run(row.id, row.kind, row.draft, row.published, 'fixture');
  const calls = [];
  let nextRead;
  const db = {
    prepare(query) {
      let args = [];
      const execute = async (method) => {
        calls.push(query);
        if (nextRead) {
          const hook = nextRead;
          nextRead = undefined;
          await hook();
        }
        return sql.prepare(query)[method](...args);
      };
      return {
        bind(...values) {
          args = values;
          return this;
        },
        async first() {
          return (await execute('get')) ?? null;
        },
        async all() {
          return { results: await execute('all') };
        },
        async run() {
          return execute('run');
        },
      };
    },
    batch(statements) {
      return Promise.all(statements.map((s) => s.run()));
    },
  };
  const loaded = { exports: {} };
  evaluate(
    (name) => {
      if (name === 'cloudflare:workers') return { env: { DB: db } };
      if (name === 'vinext/cache') return vinextCache;
      return require(name);
    },
    loaded,
    loaded.exports,
  );
  return {
    ...loaded.exports,
    calls,
    sql,
    beforeNextRead(hook) {
      nextRead = hook;
    },
  };
}

await test('public reads select only published snapshots and preserve ordering, identity and all collections', async (t) => {
  const rows = seeds.map((r) => record(r.id, r.kind, r.data));
  rows.push(
    record('private-project', 'project', null, { title: 'Private project' }),
  );
  rows.push(record('tie-b', 'project', { title: 'Second tie', order: -1 }));
  rows.push(
    record('tie-a', 'project', {
      id: 'embedded-id',
      title: 'First tie',
      order: -1,
    }),
  );
  const f = fixture(
    t,
    rows.map((r) => ({ ...r, draft: 'invalid private JSON' })),
  );
  const data = await request(() => f.getPortfolio());
  const expected = toPortfolio(
    rows
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))
      .map((r) => ({
        ...r,
        draft: {},
        published: r.published ? JSON.parse(r.published) : null,
        revision: 1,
        updatedAt: 'fixture',
      })),
  );
  assert.deepEqual(data, expected);
  assert.deepEqual(
    data.projects.slice(0, 2).map((r) => r.id),
    ['tie-a', 'tie-b'],
  );
  assert.equal(data.site._preview, undefined);
  assert.doesNotMatch(JSON.stringify(data), /Private project|invalid private/);
  assert.deepEqual(f.calls, [
    'SELECT id, kind, published FROM content WHERE published IS NOT NULL ORDER BY kind, id',
  ]);
});

await test('concurrent callers share one request snapshot; new requests reread D1', async (t) => {
  const f = fixture(t);
  const first = await request(async () => {
    const [a, b, c] = await Promise.all([
      f.getPortfolio(),
      f.getPortfolio(false),
      f.getPortfolio(),
    ]);
    assert.equal(a, b);
    assert.equal(a, c);
    assert.equal(await f.getPortfolio(), a);
    return a;
  });
  assert.equal(f.calls.length, 1);
  first.site.name = 'Caller mutation';
  const second = await request(() => f.getPortfolio());
  assert.notEqual(first, second);
  assert.equal(second.site.name, 'Live owner');
  assert.equal(f.calls.length, 2);
});

await test('public and preview factories stay separate, including within concurrent requests', async (t) => {
  const f = fixture(t);
  await Promise.all(
    Array.from({ length: 3 }, () =>
      request(async () => {
        const [live, preview, repeated] = await Promise.all([
          f.getPortfolio(),
          f.getPortfolio(true),
          f.getPortfolio(true),
        ]);
        assert.equal(preview, repeated);
        assert.notEqual(live, preview);
        assert.equal(live.site.name, 'Live owner');
        assert.equal(preview.site.name, 'Draft owner');
        assert.equal(preview.site._preview, true);
        assert.equal(live.site._preview, undefined);
      }),
    ),
  );
  assert.equal(f.calls.length, 9); // One public query + two private queries per request.
  assert.equal(
    (await request(() => f.getPortfolio())).site._preview,
    undefined,
  );
});

await test('pending snapshots and failed reads never become a cross-request cache', async (t) => {
  const f = fixture(t);
  let release;
  let entered;
  const started = new Promise((resolve) => {
    entered = resolve;
  });
  f.beforeNextRead(() => {
    entered();
    return new Promise((resolve) => {
      release = resolve;
    });
  });
  const pending = request(() => f.getPortfolio());
  await started;
  const independent = await request(() => f.getPortfolio());
  release();
  assert.notEqual(await pending, independent);
  assert.equal(f.calls.length, 2);
  await request(async () => {
    f.beforeNextRead(() => {
      throw Error('D1 unavailable');
    });
    await assert.rejects(f.getPortfolio(), /D1 unavailable/);
    assert.equal((await f.getPortfolio()).site.name, 'Live owner');
  });
  assert.equal(f.calls.length, 4);
});

await test('publication, draft imports, withdrawal, deletion and owner edits are fresh on the next request', async (t) => {
  const f = fixture(t, [
    site(),
    record(
      'project',
      'project',
      { title: 'Live', slug: 'live' },
      { title: 'Draft', slug: 'draft' },
    ),
  ]);
  const read = () => request(() => f.getPortfolio());
  assert.equal((await read()).projects[0].slug, 'live');
  f.sql
    .prepare('UPDATE content SET draft=?,revision=revision+1 WHERE id=?')
    .run(
      JSON.stringify({ title: 'Imported draft', slug: 'imported' }),
      'project',
    );
  assert.equal((await read()).projects[0].slug, 'live');
  f.sql.exec(
    "UPDATE content SET published=draft,revision=revision+1 WHERE id='project'",
  );
  assert.equal((await read()).projects[0].slug, 'imported');
  f.sql.exec(
    "UPDATE content SET published=NULL,revision=revision+1 WHERE id='project'",
  );
  assert.deepEqual((await read()).projects, []);
  f.sql.exec("UPDATE content SET published=draft WHERE id='project'");
  assert.equal((await read()).projects.length, 1);
  f.sql.exec("DELETE FROM content WHERE id='project'");
  assert.deepEqual((await read()).projects, []);
  f.sql
    .prepare("UPDATE content SET published=? WHERE id='site'")
    .run(JSON.stringify({ name: 'New owner identity' }));
  assert.equal((await read()).site.name, 'New owner identity');
});

await test('studio records remain uncached for reads before and after mutations', async (t) => {
  const f = fixture(t);
  await request(async () => {
    assert.equal((await f.getRecords())[0].draft.name, 'Draft owner');
    f.sql
      .prepare("UPDATE content SET draft=? WHERE id='site'")
      .run(JSON.stringify({ name: 'Saved draft' }));
    assert.equal((await f.getRecords())[0].draft.name, 'Saved draft');
  });
  assert.equal(f.calls.length, 4);
});

await test('fresh databases seed safely under concurrent requests and preserve preexisting records', async (t) => {
  const f = fixture(t, [
    record('custom', 'project', { title: 'Existing content', order: -100 }),
  ]);
  const results = await Promise.all([
    request(() => f.getPortfolio()),
    request(() => f.getPortfolio()),
  ]);
  for (const data of results) {
    assert.equal(data.site.name, seeds.find((r) => r.id === 'site').data.name);
    assert.equal(data.projects[0].title, 'Existing content');
  }
  assert.equal(
    f.sql.prepare('SELECT count(*) AS n FROM content').get().n,
    seeds.length + 1,
  );
  f.calls.length = 0;
  await request(() => f.getPortfolio());
  assert.equal(f.calls.length, 1);
});

await test('existing unpublished site identity is never replaced by sample defaults', async (t) => {
  const f = fixture(t, [
    record('site', 'site', null, { name: 'Restored owner' }),
  ]);
  assert.deepEqual((await request(() => f.getPortfolio())).site, {});
  assert.equal(
    (await request(() => f.getPortfolio(true))).site.name,
    'Restored owner',
  );
  assert.equal(f.sql.prepare('SELECT count(*) AS n FROM content').get().n, 1);
  assert.ok(f.calls.every((sql) => !sql.startsWith('INSERT')));
});

await test('empty and JSON-null published fields retain the previous conversion behavior', async (t) => {
  const f = fixture(t, [site(), record('json-null', 'project', null, {})]);
  f.sql.exec("UPDATE content SET published='null' WHERE id='json-null'");
  f.sql
    .prepare('INSERT INTO content VALUES (?,?,?,?,1,?)')
    .run('empty', 'project', '{}', '', 'fixture');
  assert.deepEqual((await request(() => f.getPortfolio())).projects, []);
});

await test('identity routes read only published site JSON and refresh on every request', async (t) => {
  const f = fixture(t, [
    site(),
    record('project', 'project', { title: 'Live' }),
  ]);
  // Neither unrelated collection JSON nor private drafts may be parsed.
  f.sql.exec(
    "UPDATE content SET published='invalid collection JSON' WHERE id='project'",
  );
  f.sql.exec("UPDATE content SET draft='invalid private JSON'");
  const first = await request(async () => {
    const a = await f.getPublishedSite();
    assert.equal(await f.getPublishedSite(), a);
    return a;
  });
  assert.deepEqual(first, { name: 'Live owner', id: 'site' });
  assert.deepEqual(f.calls, [
    "SELECT published FROM content WHERE id = ? AND kind = 'site'",
  ]);
  f.sql
    .prepare("UPDATE content SET published=? WHERE id='site'")
    .run(JSON.stringify({ name: 'Changed owner', sampleMode: true }));
  assert.equal(
    (await request(() => f.getPublishedSite())).name,
    'Changed owner',
  );
  f.sql.exec("UPDATE content SET published=NULL WHERE id='site'");
  assert.deepEqual(await request(() => f.getPublishedSite()), {});
  assert.equal(f.calls.length, 3);
  assert.ok(f.calls.every((query) => !query.startsWith('INSERT')));
});

await test('identity-only reads seed an empty database but preserve a withdrawn identity', async (t) => {
  const f = fixture(t, []);
  assert.equal(
    (await request(() => f.getPublishedSite())).name,
    seeds.find((r) => r.id === 'site').data.name,
  );
  for (const value of [null, '', 'null']) {
    f.sql.prepare("UPDATE content SET published=? WHERE id='site'").run(value);
    f.calls.length = 0;
    assert.deepEqual(await request(() => f.getPublishedSite()), {});
    assert.equal(f.calls.length, 1);
  }
});
