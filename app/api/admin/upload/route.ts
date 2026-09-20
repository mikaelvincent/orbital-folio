import { bindings, database } from '@/lib/content/repository';
import {
  MEDIA_LIMITS,
  mimeForFilename,
  validateMediaBytes,
} from '@/lib/content/media-upload';
import {
  requireAdmin,
  sameOrigin,
  readForm,
  formText,
  HttpError,
  apiError,
  json,
} from '@/lib/security';

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const actor = await requireAdmin();
    const form = await readForm(req, MEDIA_LIMITS.video + 65536);
    const file = form.get('file');
    const alt = formText(form, 'alt').trim();
    if (!(file instanceof File))
      throw new HttpError(400, 'Choose a media file.');
    if (!alt || alt.length > 1000)
      throw new HttpError(400, 'Add concise alternative text.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Some browsers report WebVTT as application/octet-stream or text/plain.
    const mime =
      mimeForFilename(file.name) === 'text/vtt' ? 'text/vtt' : file.type;
    validateMediaBytes(bytes, mime);
    const id = crypto.randomUUID();
    const data = {
      title: file.name.slice(0, 150),
      alt,
      url: '/media/' + id,
      mime,
      size: file.size,
      order: 0,
    };
    await bindings().MEDIA.put(id, bytes, {
      httpMetadata: { contentType: mime },
    });
    try {
      const db = database();
      const now = new Date().toISOString();
      await db.batch([
        db
          .prepare(
            "INSERT INTO content (id,kind,draft,published,revision,updated_at) VALUES (?,'media',?,NULL,1,?)",
          )
          .bind(id, JSON.stringify(data), now),
        db
          .prepare(
            'INSERT INTO audit (id,action,target,actor,created_at) VALUES (?,?,?,?,?)',
          )
          .bind(crypto.randomUUID(), 'media.upload', id, actor.userId, now),
      ]);
    } catch (e) {
      await bindings().MEDIA.delete(id);
      throw e;
    }
    return json({ ok: true, id, media: { ...data, id } });
  } catch (e) {
    return apiError(e);
  }
}
