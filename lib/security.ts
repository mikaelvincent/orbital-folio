import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database, bindings } from './content';
import { HttpError } from './http-error';
export { HttpError };
export async function adminIdentity() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const allowed = await database()
    .prepare('SELECT id FROM admins WHERE id = ? OR email = ?')
    .bind(user.userId, user.email.toLowerCase())
    .first();
  return allowed ? user : null;
}
export async function requireAdmin() {
  const user = await adminIdentity();
  if (!user) throw new HttpError(403, 'Owner access required.');
  return user;
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const expected = new URL(req.url).origin;
  if (
    !origin ||
    origin !== expected ||
    req.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new HttpError(403, 'This action must be submitted from this site.');
}
export async function boundedBody(
  req: Pick<Request, 'body' | 'headers'>,
  limit: number,
) {
  if (Number(req.headers.get('content-length') || 0) > limit)
    throw new HttpError(413, 'The request is too large.');
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        void reader.cancel().catch(() => {});
        throw new HttpError(413, 'The request is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
export async function readForm(req: Request, limit: number) {
  const body = await boundedBody(req, limit);
  try {
    return await new Response(body, {
      headers: { 'Content-Type': req.headers.get('content-type') || '' },
    }).formData();
  } catch {
    throw new HttpError(400, 'Invalid form data.');
  }
}
export async function readJson(req: Request, limit = 150000) {
  if (!req.headers.get('content-type')?.includes('application/json'))
    throw new HttpError(415, 'Use JSON content.');
  const bytes = await boundedBody(req, limit);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
export async function equalSecret(a: string, b: string) {
  if (!a || !b) return false;
  const aa = await digest(a),
    bb = await digest(b);
  let diff = 0;
  for (let i = 0; i < aa.length; i++)
    diff |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return diff === 0;
}
export async function rateLimit(
  req: Request,
  scope: string,
  max: number,
  seconds: number,
) {
  const now = Math.floor(Date.now() / 1000),
    bucket = Math.floor(now / seconds);
  const key = await digest(
    `${bindings().RATE_LIMIT_SALT || ''}:${scope}:${req.headers.get('cf-connecting-ip') || 'local'}:${bucket}`,
  );
  const result = await database()
    .prepare(
      'INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',
    )
    .bind(key, (bucket + 1) * seconds)
    .first<{ count: number }>();
  if (result && result.count > max)
    throw new HttpError(429, 'Too many attempts. Please try again later.');
  if (Math.random() < 0.02)
    await database()
      .prepare('DELETE FROM rate_limits WHERE expires < ?')
      .bind(now)
      .run();
}
export function apiError(e: unknown) {
  if (e instanceof Error && /UNIQUE constraint failed/i.test(e.message))
    return Response.json(
      { error: 'That URL slug is already in use.' },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    );
  if (e instanceof HttpError)
    return Response.json(
      { error: e.message },
      { status: e.status, headers: { 'Cache-Control': 'no-store' } },
    );
  console.error('Request failed', e);
  return Response.json(
    { error: 'The request could not be completed. Please try again.' },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function formText(form: FormData, key: string): string {
  const value = form.get(key);
  if (value !== null && typeof value !== 'string')
    throw new HttpError(400, 'Expected a text field.');
  return value ?? '';
}
