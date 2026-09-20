import { bindings, database, getRecords } from '@/lib/content/repository';
import {
  PROJECT_PACKAGE_LIMITS,
  parseProjectPackage,
  materializeProjectPackage,
} from '@/lib/content/project-package';
import {
  requireAdmin,
  sameOrigin,
  readForm,
  HttpError,
  apiError,
  json,
} from '@/lib/security';

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const actor = await requireAdmin();
    const form = await readForm(req, PROJECT_PACKAGE_LIMITS.compressed + 65536);
    const file = form.get('file');
    if (!(file instanceof File) || !/\.zip$/i.test(file.name))
      throw new HttpError(400, 'Choose a project ZIP package.');
    const parsed = parseProjectPackage(
      new Uint8Array(await file.arrayBuffer()),
    );
    const existing = await getRecords();
    if (
      existing.some(
        (record) =>
          record.kind === 'project' &&
          (record.draft.slug === parsed.project.slug ||
            record.published?.slug === parsed.project.slug),
      )
    )
      throw new HttpError(
        409,
        'That project URL already exists. Change the slug in project.md before importing; existing projects are never overwritten.',
      );
    const { project, media } = materializeProjectPackage(parsed, () =>
      crypto.randomUUID(),
    );
    const id = crypto.randomUUID();
    const written: string[] = [];
    const bucket = bindings().MEDIA;
    try {
      for (const asset of media) {
        await bucket.put(asset.id, asset.bytes, {
          httpMetadata: { contentType: asset.data.mime },
        });
        written.push(asset.id);
      }
      const now = new Date().toISOString();
      const db = database();
      await db.batch([
        ...media.map((asset) =>
          db
            .prepare(
              "INSERT INTO content (id,kind,draft,published,revision,updated_at) VALUES (?,'media',?,NULL,1,?)",
            )
            .bind(asset.id, JSON.stringify(asset.data), now),
        ),
        db
          .prepare(
            "INSERT INTO content (id,kind,draft,published,revision,updated_at) VALUES (?,'project',?,NULL,1,?)",
          )
          .bind(id, JSON.stringify(project), now),
        db
          .prepare(
            'INSERT INTO audit (id,action,target,actor,created_at) VALUES (?,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            'project.package.import',
            id,
            actor.userId,
            now,
          ),
      ]);
    } catch (error) {
      // The D1 batch is atomic. Only newly created package blobs are rolled back.
      if (written.length) await bucket.delete(written);
      throw error;
    }
    return json({ ok: true, id, records: await getRecords() });
  } catch (error) {
    return apiError(error);
  }
}
