import { bindings, database, logAction } from '@/lib/content';
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
    if (Number(req.headers.get('content-length')) > 5242880)
      throw new HttpError(413, 'Images must be under 5 MB.');
    const form = await readForm(req, 5300000);
    const file = form.get('file');
    const alt = formText(form, 'alt').trim();
    if (
      !(file instanceof File) ||
      file.size > 5 * 1024 * 1024 ||
      file.size === 0
    )
      throw new HttpError(400, 'Choose an image under 5 MB.');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
      throw new HttpError(400, 'Use PNG, JPEG, or WebP images.');
    if (!alt || alt.length > 1000)
      throw new HttpError(400, 'Add concise alternative text.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid =
      file.type === 'image/png'
        ? bytes[0] === 137 &&
          bytes[1] === 80 &&
          bytes[2] === 78 &&
          bytes[3] === 71
        : file.type === 'image/jpeg'
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
            new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
    if (!valid)
      throw new HttpError(
        400,
        'The file contents do not match the image type.',
      );
    const id = crypto.randomUUID();
    const data = {
      title: file.name.slice(0, 150),
      alt,
      url: '/media/' + id,
      mime: file.type,
      size: file.size,
      order: 0,
    };
    await bindings().MEDIA.put(id, bytes, {
      httpMetadata: { contentType: file.type },
    });
    try {
      await database()
        .prepare(
          "INSERT INTO content (id,kind,draft,published,revision,updated_at) VALUES (?,'media',?,NULL,1,?)",
        )
        .bind(id, JSON.stringify(data), new Date().toISOString())
        .run();
    } catch (e) {
      await bindings().MEDIA.delete(id);
      throw e;
    }
    await logAction('media.upload', id, actor.userId);
    return json({ ok: true, id });
  } catch (e) {
    return apiError(e);
  }
}
