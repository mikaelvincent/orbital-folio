import { bindings, database } from '@/lib/content/repository';
import { adminIdentity } from '@/lib/security';

// GET/HEAD use weak comparison, including validator lists and wildcard matches.
function matchesEtag(condition: string | null, etag: string) {
  return (
    condition === '*' ||
    (condition?.match(/(?:W\/)?"[^"]*"/g) || []).some(
      (value) => value.replace(/^W\//, '') === etag,
    )
  );
}

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
  const condition = req.headers.get('If-None-Match');
  const hasRange = req.headers.has('range');
  const info = head || hasRange ? await bucket.head(id) : undefined;
  if (info === null) return new Response('Not found', { status: 404 });
  if (info && matchesEtag(condition, info.httpEtag)) {
    info.writeHttpMetadata(headers);
    headers.set('ETag', info.httpEtag);
    return new Response(null, { status: 304, headers });
  }
  let range: { offset: number; length: number } | undefined;
  if (hasRange) {
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
    ? info
    : await bucket.get(id, {
        ...(range ? { range } : {}),
        // Pass only the condition whose failed precondition means 304.
        ...(condition
          ? { onlyIf: new Headers({ 'If-None-Match': condition }) }
          : {}),
      });
  if (!object) return new Response('Not found', { status: 404 });
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  if (!head && !('body' in object)) {
    headers.delete('Content-Range');
    return new Response(null, { status: 304, headers });
  }
  headers.set('Content-Length', String(range?.length ?? object.size));
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
