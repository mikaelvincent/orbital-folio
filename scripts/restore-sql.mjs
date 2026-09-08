// Turn an authenticated content export into parameter-safe portable SQLite SQL.
// This script never writes to an existing database. Review the output before applying it.
import fs from 'node:fs';
const input = process.argv[2];
if (!input)
  throw new Error(
    'Usage: node scripts/restore-sql.mjs content.json > restore.sql',
  );
const payload = JSON.parse(fs.readFileSync(input, 'utf8'));
if (
  payload.format !== 'orbital-folio/v1' ||
  !Array.isArray(payload.records) ||
  payload.records.length > 500
)
  throw new Error('Invalid content export.');
const q = (v) =>
  v === null ? 'NULL' : "'" + String(v).replaceAll("'", "''") + "'";
const ids = new Set();
let site = false;
for (const r of payload.records) {
  if (
    typeof r.id !== 'string' ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(r.id) ||
    ids.has(r.id) ||
    !['site', 'project', 'experience', 'journal', 'link', 'media'].includes(
      r.kind,
    ) ||
    !r.draft ||
    typeof r.draft !== 'object'
  )
    throw new Error('Invalid record.');
  ids.add(r.id);
  if (r.id === 'site' && r.kind === 'site') site = true;
}
if (!site) throw new Error('The export must contain site settings.');
console.log('BEGIN TRANSACTION;');
for (const r of payload.records)
  console.log(
    `INSERT INTO content (id,kind,draft,published,revision,updated_at) VALUES (${q(r.id)},${q(r.kind)},${q(JSON.stringify(r.draft))},${q(r.published ? JSON.stringify(r.published) : null)},${Number.isInteger(r.revision) ? r.revision : 1},${q(r.updatedAt || new Date().toISOString())});`,
  );
console.log('COMMIT;');
