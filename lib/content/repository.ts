import { env } from 'cloudflare:workers';
import { cacheForRequest } from 'vinext/cache';
import { seeds } from './seed';
import {
  toPortfolio,
  toPublishedPortfolio,
  type Content,
  type Kind,
} from './types';
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
// Vinext also calls loaders outside React's render cache (for metadata/layouts).
// Keep one public snapshot per request, with a fresh D1 read on the next request.
const getPublishedPortfolio = cacheForRequest(async () => {
  const read = () =>
    database()
      .prepare(
        'SELECT id, kind, published FROM content WHERE published IS NOT NULL ORDER BY kind, id',
      )
      .all<{ id: string; kind: Kind; published: string }>();
  let { results } = await read();
  if (!results.some((r) => r.id === 'site')) {
    // Preserve ensureSeed's existence guard, including an unpublished site
    // restored by the owner. Never replace that record with default identity.
    await ensureSeed();
    ({ results } = await read());
  }
  return toPublishedPortfolio(
    results.map((r) => ({
      ...r,
      published: r.published ? JSON.parse(r.published) : null,
    })),
  );
});
const getPreviewPortfolio = cacheForRequest(async () => {
  const data = toPortfolio(await getRecords(), true);
  data.site._preview = true;
  return data;
});
export function getPortfolio(preview = false) {
  // Separate factories: cacheForRequest is keyed by factory, not arguments.
  // Callers must authorize previews before loading them; auth is never cached.
  return preview ? getPreviewPortfolio() : getPublishedPortfolio();
}
export async function logAction(action: string, target: string, actor: string) {
  await database()
    .prepare(
      'INSERT INTO audit (id,action,target,actor,created_at) VALUES (?,?,?,?,?)',
    )
    .bind(crypto.randomUUID(), action, target, actor, new Date().toISOString())
    .run();
}
