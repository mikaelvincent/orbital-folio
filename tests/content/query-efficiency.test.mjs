import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const built = await build({
  entryPoints: ['app/api/admin/inbox/route.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  external: ['@/lib/content/repository', '@/lib/security'],
});
const migrate = (sql) => {
  for (const path of fs
    .readdirSync('drizzle')
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b)))
    sql.exec(fs.readFileSync('drizzle/' + path, 'utf8'));
};

await test('inbox cursor seeks through the composite index with identical results across timestamp ties', async (t) => {
  const sql = new DatabaseSync(':memory:');
  t.after(() => sql.close());
  migrate(sql);
  const insert = sql.prepare(
    'INSERT INTO inquiries (id,name,email,intent,message,created_at) VALUES(?,?,?,?,?,?)',
  );
  for (let i = 0; i < 1000; i++)
    insert.run(
      String(i).padStart(4, '0'),
      'Fixture',
      'test@example.com',
      'project',
      'Synthetic fixture',
      `2026-10-0${1 + Math.floor(i / 250)}T00:00:00.000Z`,
    );
  let query;
  let parameters;
  const loaded = { exports: {} };
  runInNewContext(built.outputFiles[0].text, {
    module: loaded,
    exports: loaded.exports,
    URL,
    require(name) {
      if (name.endsWith('/security'))
        return {
          requireAdmin: async () => {},
          json: (value) => value,
          apiError: (error) => {
            throw error;
          },
        };
      return {
        database: () => ({
          prepare(text) {
            query = text;
            return {
              bind(...args) {
                parameters = args;
                return {
                  all: async () => ({
                    results: sql.prepare(text).all(...args),
                  }),
                };
              },
            };
          },
        }),
      };
    },
  });
  const rows = sql
    .prepare('SELECT * FROM inquiries ORDER BY created_at DESC,id DESC')
    .all();
  for (const position of [0, 249, 250, 899, 999]) {
    const cursor = rows[position];
    const result = await loaded.exports.GET(
      new Request(
        'http://fixture/api/admin/inbox?before=' +
          encodeURIComponent(cursor.created_at + '|' + cursor.id),
      ),
    );
    assert.deepEqual(
      result.inquiries,
      rows.slice(position + 1, position + 101),
    );
    assert.equal(result.hasMore, result.inquiries.length === 100);
    const plan = sql.prepare('EXPLAIN QUERY PLAN ' + query).all(...parameters);
    assert.match(
      plan.map((row) => row.detail).join(' '),
      /SEARCH inquiries USING INDEX idx_inquiries_received/,
    );
  }
  assert.deepEqual(
    (
      await loaded.exports.GET(
        new Request('http://fixture/api/admin/inbox?offset=250'),
      )
    ).inquiries,
    rows.slice(250, 350),
  );
});

await test('expiry cleanup uses its index without deleting live buckets or changing counters', (t) => {
  const sql = new DatabaseSync(':memory:');
  t.after(() => sql.close());
  migrate(sql);
  sql.exec(
    "INSERT INTO rate_limits VALUES ('expired',3,99),('boundary',2,100),('live',4,101)",
  );
  const query = 'DELETE FROM rate_limits WHERE expires < ?';
  assert.match(
    sql
      .prepare('EXPLAIN QUERY PLAN ' + query)
      .all(100)
      .map((r) => r.detail)
      .join(' '),
    /SEARCH rate_limits USING INDEX idx_rate_limits_expires/,
  );
  assert.equal(sql.prepare(query).run(100).changes, 1);
  assert.deepEqual(
    sql
      .prepare('SELECT key,count FROM rate_limits ORDER BY key')
      .all()
      .map((r) => ({ ...r })),
    [
      { key: 'boundary', count: 2 },
      { key: 'live', count: 4 },
    ],
  );
});
