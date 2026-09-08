import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const base = 'http://localhost:3000';
const response = await fetch(base + '/api/admin/export', {
  headers: { Cookie: '__sites_local_auth=1' },
});
assert.equal(response.status, 200);
const exported = await response.json();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbital-restore-'));
const source = path.join(dir, 'content.json');
fs.writeFileSync(source, JSON.stringify(exported));
const sql = execFileSync(
  process.execPath,
  ['scripts/restore-sql.mjs', source],
  { encoding: 'utf8' },
);
const restored = new DatabaseSync(path.join(dir, 'restored.sqlite'));
for (const migration of fs
  .readdirSync('drizzle')
  .filter((f) => f.endsWith('.sql'))
  .sort())
  restored.exec(fs.readFileSync('drizzle/' + migration, 'utf8'));
restored.exec(sql);
const rows = restored.prepare('SELECT * FROM content ORDER BY id').all();
assert.equal(rows.length, exported.records.length);
for (const expected of exported.records) {
  const actual = rows.find((r) => r.id === expected.id);
  assert.deepEqual(JSON.parse(actual.draft), expected.draft);
  assert.deepEqual(
    actual.published ? JSON.parse(actual.published) : null,
    expected.published,
  );
}
assert.equal(restored.prepare('SELECT count(*) AS n FROM admins').get().n, 0);
assert.equal(
  restored.prepare('SELECT count(*) AS n FROM inquiries').get().n,
  0,
);
restored.close();
console.log(
  JSON.stringify(
    {
      status: 'passed',
      records: rows.length,
      draftAndPublishedSnapshots: 'identical',
      privateDataIncluded: false,
      restoredDatabase: path.join(dir, 'restored.sqlite'),
    },
    null,
    2,
  ),
);
