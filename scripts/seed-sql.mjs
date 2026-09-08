import { seeds } from '../lib/seed.ts';
const quote = (v) => "'" + String(v).replaceAll("'", "''") + "'";
for (const r of seeds)
  console.log(
    `INSERT OR IGNORE INTO content (id,kind,draft,published,revision,updated_at) VALUES (${quote(r.id)},${quote(r.kind)},${quote(JSON.stringify(r.data))},${quote(JSON.stringify(r.data))},1,${quote(new Date().toISOString())});`,
  );
