import { env } from 'cloudflare:workers';
import { cache } from 'react';
import { seeds } from './seed';
import { toPortfolio, type Content } from './content-types';
export const bindings = () =>
  env as unknown as {
    DB: D1Database;
    MEDIA: R2Bucket;
    ADMIN_SETUP_KEY?: string;
    LOCAL_ADMIN_KEY?: string;
    ENVIRONMENT?: string;
    RATE_LIMIT_SALT?: string;
  };
export const database = () => bindings().DB;
export async function ensureSeed() {
  const db = database();
  const exists = await db
    .prepare('SELECT id FROM content WHERE id = ?')
    .bind('site')
    .first();
  if (!exists)
    await db.batch(
      seeds.map((r) =>
        db
          .prepare(
            'INSERT OR IGNORE INTO content (id,kind,draft,published,revision,updated_at) VALUES (?,?,?,?,1,?)',
          )
          .bind(
            r.id,
            r.kind,
            JSON.stringify(r.data),
            JSON.stringify(r.data),
            new Date().toISOString(),
          ),
      ),
    );
}
export async function getRecords(): Promise<Content[]> {
  await ensureSeed();
  const { results } = await database()
    .prepare('SELECT * FROM content ORDER BY kind, id')
    .all<any>();
  return results.map((r) => ({
    id: r.id,
    kind: r.kind,
    draft: JSON.parse(r.draft),
    published: r.published ? JSON.parse(r.published) : null,
    revision: r.revision,
    updatedAt: r.updated_at,
  }));
}
export const getPortfolio = cache(async (preview = false) => {
  const data = toPortfolio(await getRecords(), preview);
  if (preview) data.site._preview = true;
  return data;
});
export async function logAction(action: string, target: string, actor: string) {
  await database()
    .prepare(
      'INSERT INTO audit (id,action,target,actor,created_at) VALUES (?,?,?,?,?)',
    )
    .bind(crypto.randomUUID(), action, target, actor, new Date().toISOString())
    .run();
}
