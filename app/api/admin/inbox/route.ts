import { database, logAction } from '@/lib/content/repository';
import {
  requireAdmin,
  sameOrigin,
  readJson,
  rateLimit,
  json,
  apiError,
  HttpError,
} from '@/lib/security';
import { inquiryActions, type Inquiry } from '@/lib/content/inquiries';
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const params = new URL(req.url).searchParams;
    const cursor = params.get('before');
    const offset = Number(params.get('offset') || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 1000000)
      throw new HttpError(400, 'Invalid inbox page.');
    const [date, id, extra] = (cursor || '').split('|');
    if (
      cursor &&
      (extra ||
        !/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        !/^[a-zA-Z0-9-]{1,100}$/.test(id))
    )
      throw new HttpError(400, 'Invalid inbox cursor.');
    const query = database().prepare(
      cursor
        ? 'SELECT * FROM inquiries WHERE created_at < ? OR (created_at = ? AND id < ?) ORDER BY created_at DESC, id DESC LIMIT 100'
        : 'SELECT * FROM inquiries ORDER BY created_at DESC, id DESC LIMIT 100 OFFSET ?',
    );
    const { results } = await (
      cursor ? query.bind(date, date, id) : query.bind(offset)
    ).all();
    return json({ inquiries: results, hasMore: results.length === 100 });
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(req: Request) {
  try {
    sameOrigin(req);
    const actor = await requireAdmin();
    await rateLimit(req, 'inbox-status', 120, 60);
    const body = await readJson(req, 2048);
    if (
      !body ||
      typeof body.id !== 'string' ||
      !/^[a-zA-Z0-9-]{1,100}$/.test(body.id) ||
      !inquiryActions.includes(body.action) ||
      Object.keys(body).some((key) => !['id', 'action'].includes(key))
    )
      throw new HttpError(400, 'Choose a message and a valid status action.');
    const now = new Date().toISOString();
    const assignments: Record<string, string> = {
      read: 'read_at=?',
      unread: 'read_at=NULL',
      replied: 'replied_at=?,read_at=coalesce(read_at,?)',
      unreplied: 'replied_at=NULL',
      archive: 'archived_at=?',
      unarchive: 'archived_at=NULL',
    };
    const values =
      body.action === 'replied'
        ? [now, now]
        : ['read', 'archive'].includes(body.action)
          ? [now]
          : [];
    const inquiry = await database()
      .prepare(
        `UPDATE inquiries SET ${assignments[body.action]} WHERE id=? RETURNING *`,
      )
      .bind(...values, body.id)
      .first<Inquiry>();
    if (!inquiry) throw new HttpError(404, 'Message not found.');
    await logAction(`inquiry.${body.action}`, body.id, actor.userId);
    return json({ inquiry });
  } catch (e) {
    return apiError(e);
  }
}
