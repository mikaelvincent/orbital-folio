import { bindings, database } from '@/lib/content/repository';
import { adminIdentity } from '@/lib/security';

async function serve(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
  head = false,
) {
  const { id } = await params;
  const record = await database()
    .prepare("SELECT published FROM content WHERE id=? AND kind='media'")
    .bind(id)
    .first<{ published: string | null }>();
  if (!record || (!record.published && !(await adminIdentity())))
    return new Response('Not found', { status: 404 });
  const bucket = bindings().MEDIA;
  const headers = new Headers({
    'Cache-Control': record.published
      ? 'public, max-age=300'
      : 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Accept-Ranges': 'bytes',
    // A private preview response must never seed a shared cache.
    Vary: 'Cookie',
  });
  let range: { offset: number; length: number } | undefined;
  if (req.headers.has('range')) {
    const info = await bucket.head(id);
    if (!info) return new Response('Not found', { status: 404 });
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
    if (match && (match[1] || match[2])) {
      const start = match[1]
        ? Number(match[1])
        : Math.max(0, info.size - Number(match[2]));
      const end =
        match[1] && match[2]
          ? Math.min(Number(match[2]), info.size - 1)
          : info.size - 1;
      if (
        Number.isSafeInteger(start) &&
        Number.isSafeInteger(end) &&
        start >= 0 &&
        start <= end &&
        start < info.size
      )
        range = { offset: start, length: end - start + 1 };
    }
    if (!range) {
      headers.set('Content-Range', `bytes */${info.size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set(
      'Content-Range',
      `bytes ${range.offset}-${range.offset + range.length - 1}/${info.size}`,
    );
  }
  const object = head
    ? await bucket.head(id)
    : await bucket.get(id, range ? { range } : undefined);
  if (!object) return new Response('Not found', { status: 404 });
  object.writeHttpMetadata(headers);
  headers.set('Content-Length', String(range?.length ?? object.size));
  headers.set('ETag', object.httpEtag);
  return new Response('body' in object ? (object as R2ObjectBody).body : null, {
    status: range ? 206 : 200,
    headers,
  });
}
export const GET = (
  req: Request,
  context: { params: Promise<{ id: string }> },
) => serve(req, context);
export const HEAD = (
  req: Request,
  context: { params: Promise<{ id: string }> },
) => serve(req, context, true);
