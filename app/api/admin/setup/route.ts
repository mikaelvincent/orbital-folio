import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database, bindings, logAction } from '@/lib/content/repository';
import {
  sameOrigin,
  readJson,
  equalSecret,
  rateLimit,
  HttpError,
  apiError,
  json,
} from '@/lib/security';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await getChatGPTUser();
    if (!user)
      throw new HttpError(401, 'Sign in before claiming this portfolio.');
    await rateLimit(req, 'setup', 5, 3600);
    const body = await readJson(req, 1000);
    if (
      !(await equalSecret(
        String(body.key || ''),
        bindings().ADMIN_SETUP_KEY || '',
      ))
    )
      throw new HttpError(403, 'The setup key is not valid.');
    const result = await database()
      .prepare(
        'INSERT INTO admins (id,email,created_at) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM admins)',
      )
      .bind(user.userId, user.email.toLowerCase(), new Date().toISOString())
      .run();
    if (!result.meta.changes)
      throw new HttpError(
        409,
        'This portfolio already has an owner. Ask an owner for access.',
      );
    await logAction('owner.claim', 'site', user.userId);
    return json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
