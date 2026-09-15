import { bindings, database } from '@/lib/content/repository';
import { adminIdentity } from '@/lib/security';
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const record = await database()
    .prepare("SELECT published FROM content WHERE id=? AND kind='media'")
    .bind(id)
    .first<{ published: string | null }>();
  if (!record || (!record.published && !(await adminIdentity())))
    return new Response('Not found', { status: 404 });
  const object = await bindings().MEDIA.get(id);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers({
    'Cache-Control': record.published
      ? 'public, max-age=300'
      : 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  });
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
}
