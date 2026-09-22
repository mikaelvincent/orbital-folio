import {
  database,
  getRecords,
  logAction,
  bindings,
} from '@/lib/content/repository';
import {
  requireAdmin,
  sameOrigin,
  readJson,
  HttpError,
  apiError,
  json,
} from '@/lib/security';
import { validateContent } from '@/lib/content/validation';
import {
  validateProjectPublication,
  mediaDependencyClosure,
  directProjectMediaIds,
} from '@/lib/content/project-package-media';
import {
  directCaseStudyMediaIds,
  validateCaseStudyPublication,
} from '@/lib/content/case-study-media';
import {
  directAboutPhotoMediaIds,
  validateAboutPhotoPublication,
} from '@/lib/content/about-photo-publication';
export async function GET() {
  try {
    await requireAdmin();
    return json({ records: await getRecords() });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const actor = await requireAdmin();
    const b = await readJson(req, 2000000);
    const db = database();
    let target = b.id || 'site';
    if (b.action === 'save') {
      const records = await getRecords();
      const old = records.find((r) => r.id === b.id);
      const kind = old?.kind || b.kind;
      if (kind === 'site' && b.id !== 'site')
        throw new HttpError(400, 'Only one site settings record is allowed.');
      const data = validateContent(kind, b.data);
      if (
        data.slug &&
        records.some(
          (r) =>
            r.id !== b.id &&
            r.kind === kind &&
            (r.draft.slug === data.slug || r.published?.slug === data.slug),
        )
      )
        throw new HttpError(409, 'That URL slug is already in use.');
      if (old) {
        const result = await db
          .prepare(
            'UPDATE content SET draft=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?',
          )
          .bind(
            JSON.stringify(data),
            new Date().toISOString(),
            b.id,
            b.revision,
          )
          .run();
        if (!result.meta.changes)
          throw new HttpError(
            409,
            'This record changed in another tab. Reload before saving.',
          );
      } else {
        target = crypto.randomUUID();
        await db
          .prepare(
            'INSERT INTO content (id,kind,draft,published,revision,updated_at) VALUES (?,?,?,NULL,1,?)',
          )
          .bind(target, kind, JSON.stringify(data), new Date().toISOString())
          .run();
      }
    } else if (['publish', 'unpublish', 'delete'].includes(b.action)) {
      if (b.id === 'site' && b.action !== 'publish')
        throw new HttpError(400, 'Site settings must remain published.');
      const records = await getRecords();
      const old = records.find((r) => r.id === b.id);
      if (!old) throw new HttpError(404, 'Record not found.');
      if (b.action === 'publish') {
        validateContent(old.kind, old.draft);
        if (old.kind === 'project')
          validateProjectPublication(old.draft, records);
        if (old.kind === 'experience')
          validateCaseStudyPublication(old.draft, records);
        if (old.kind === 'site' || old.kind === 'link')
          validateAboutPhotoPublication(old.kind, old.draft, records, old.id);
        if (old.kind === 'media') {
          // A used image cannot turn into a video through a metadata revision.
          for (const record of records)
            if (
              record.published &&
              directAboutPhotoMediaIds(
                record.kind,
                record.published,
                records,
              ).includes(old.id)
            )
              validateAboutPhotoPublication(
                record.kind,
                record.published,
                records.map((item) =>
                  item.id === old.id ? { ...item, published: old.draft } : item,
                ),
                record.id,
              );
          // Validate the current video draft but resolve its dependencies from
          // published metadata; unrelated media drafts remain private.
          mediaDependencyClosure(
            [old.id],
            records.map((r) =>
              r.id === old.id ? { ...r, published: old.draft } : r,
            ),
            true,
          );
        }
      }
      if (old.kind === 'media' && b.action !== 'publish') {
        const used = records.some(
          (r) =>
            r.id !== old.id &&
            r.published &&
            (directAboutPhotoMediaIds(r.kind, r.published, records).includes(
              old.id,
            ) ||
              (r.kind === 'project' &&
                directProjectMediaIds(r.published).includes(old.id)) ||
              (r.kind === 'experience' &&
                directCaseStudyMediaIds(r.published).includes(old.id)) ||
              (r.kind === 'media' &&
                [
                  r.published.posterMediaId,
                  r.published.captionsMediaId,
                ].includes(old.id))),
        );
        if (used)
          throw new HttpError(
            409,
            'This media is used by published content. Remove that reference or unpublish the content first.',
          );
      }
      const claimsAboutSlot =
        b.action === 'publish' &&
        old.kind === 'link' &&
        ['left', 'center', 'right'].includes(old.draft.aboutSlot);
      const query =
        b.action === 'delete'
          ? 'DELETE FROM content WHERE id=? AND revision=?'
          : `UPDATE content SET published=${b.action === 'publish' ? 'draft' : 'NULL'},revision=revision+1,updated_at=? WHERE id=? AND revision=?${claimsAboutSlot ? " AND NOT EXISTS (SELECT 1 FROM content AS occupied WHERE occupied.kind='link' AND occupied.id<>content.id AND json_extract(occupied.published,'$.aboutSlot')=json_extract(content.draft,'$.aboutSlot'))" : ''}`;
      const statement =
        b.action === 'delete'
          ? db.prepare(query).bind(b.id, b.revision)
          : db.prepare(query).bind(new Date().toISOString(), b.id, b.revision);
      if (!(await statement.run()).meta.changes)
        throw new HttpError(
          409,
          claimsAboutSlot
            ? 'This record or its About position changed in another tab. Reload before publishing.'
            : 'This record changed in another tab. Reload before continuing.',
        );
      if (
        b.action === 'delete' &&
        old.kind === 'media' &&
        old.draft.url === '/media/' + old.id
      )
        await bindings().MEDIA.delete(old.id);
    } else if (b.action === 'import') {
      if (
        b.payload?.format !== 'orbital-folio/v1' ||
        !Array.isArray(b.payload.records) ||
        b.payload.records.length > 500
      )
        throw new HttpError(
          400,
          'Use an Orbital Folio content export with at most 500 records.',
        );
      const seen = new Set<string>();
      const slugs = new Set<string>();
      const existing = await getRecords();
      const imported = b.payload.records.map((r: any) => {
        if (
          typeof r.id !== 'string' ||
          !/^[a-zA-Z0-9-]{1,100}$/.test(r.id) ||
          seen.has(r.id)
        )
          throw new HttpError(400, 'Invalid or repeated record ID.');
        seen.add(r.id);
        if ((r.kind === 'site') !== (r.id === 'site'))
          throw new HttpError(400, 'Invalid site record.');
        const old = existing.find((o) => o.id === r.id);
        if (old && old.kind !== r.kind)
          throw new HttpError(400, 'Record type cannot change.');
        const data = validateContent(r.kind, r.draft);
        if (data.slug) {
          const key = r.kind + ':' + data.slug;
          if (slugs.has(key))
            throw new HttpError(409, 'Repeated imported URL slug.');
          slugs.add(key);
          if (
            existing.some(
              (o) =>
                o.id !== r.id &&
                o.kind === r.kind &&
                (o.published?.slug === data.slug ||
                  (!b.payload.records.some((p: any) => p.id === o.id) &&
                    o.draft.slug === data.slug)),
            )
          )
            throw new HttpError(
              409,
              'Imported URL slug conflicts with existing content.',
            );
        }
        return { id: r.id, kind: r.kind, data };
      });
      await db.batch(
        imported.map((r: any) =>
          db
            .prepare(
              'INSERT INTO content (id,kind,draft,published,revision,updated_at) VALUES (?,?,?,NULL,1,?) ON CONFLICT(id) DO UPDATE SET draft=excluded.draft,revision=content.revision+1,updated_at=excluded.updated_at',
            )
            .bind(
              r.id,
              r.kind,
              JSON.stringify(r.data),
              new Date().toISOString(),
            ),
        ),
      );
    } else if (b.action === 'inquiryDelete') {
      await db.prepare('DELETE FROM inquiries WHERE id=?').bind(b.id).run();
    } else if (b.action === 'addAdmin') {
      const email = String(b.email || '')
        .trim()
        .toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new HttpError(400, 'Enter a valid email address.');
      await db
        .prepare(
          'INSERT OR IGNORE INTO admins (id,email,created_at) VALUES (?,?,?)',
        )
        .bind('email-' + email, email, new Date().toISOString())
        .run();
      target = email;
    } else if (b.action === 'revokeAdmin') {
      const row = await db
        .prepare('SELECT email FROM admins WHERE id=?')
        .bind(b.id)
        .first<{ email: string }>();
      if (row?.email === actor.email.toLowerCase())
        throw new HttpError(400, 'You cannot remove your own access.');
      await db.prepare('DELETE FROM admins WHERE id=?').bind(b.id).run();
    } else throw new HttpError(400, 'Unknown action.');
    await logAction(b.action, target, actor.userId);
    return json({ ok: true, id: target, records: await getRecords() });
  } catch (e) {
    return apiError(e);
  }
}
