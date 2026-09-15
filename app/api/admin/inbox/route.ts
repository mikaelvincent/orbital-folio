import { database } from '@/lib/content/repository';
import { requireAdmin, json, apiError, HttpError } from '@/lib/security';
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const offset = Number(new URL(req.url).searchParams.get('offset') || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 1000000)
      throw new HttpError(400, 'Invalid inbox page.');
    const { results } = await database()
      .prepare(
        'SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 100 OFFSET ?',
      )
      .bind(offset)
      .all();
    return json({ inquiries: results, hasMore: results.length === 100 });
  } catch (e) {
    return apiError(e);
  }
}
