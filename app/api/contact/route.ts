import { database } from '@/lib/content';
import {
  sameOrigin,
  rateLimit,
  readForm,
  formText,
  HttpError,
  apiError,
  json,
} from '@/lib/security';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rateLimit(req, 'contact', 5, 3600);
    const form = await readForm(req, 30000);
    const name = formText(form, 'name').trim(),
      email = formText(form, 'email').trim(),
      message = formText(form, 'message').trim(),
      intent = formText(form, 'intent');
    if (form.get('website'))
      return Response.redirect(new URL('/contact?sent=1', req.url), 303);
    if (
      !name ||
      name.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      message.length < 10 ||
      message.length > 5000 ||
      !['interview', 'project'].includes(intent)
    )
      throw new HttpError(
        400,
        'Please enter a name, valid email, and a message of 10–5,000 characters.',
      );
    await database()
      .prepare(
        'INSERT INTO inquiries (id,name,email,intent,message,created_at) VALUES (?,?,?,?,?,?)',
      )
      .bind(
        crypto.randomUUID(),
        name,
        email,
        intent,
        message,
        new Date().toISOString(),
      )
      .run();
    if (req.headers.get('accept')?.includes('application/json'))
      return json({ ok: true });
    return Response.redirect(new URL('/contact?sent=1', req.url), 303);
  } catch (e) {
    if (!req.headers.get('accept')?.includes('application/json'))
      return Response.redirect(new URL('/contact?error=1', req.url), 303);
    return apiError(e);
  }
}
