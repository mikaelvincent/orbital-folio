import { database } from '@/lib/content/repository';
import { contactInboxMessage } from '@/lib/content/inquiries';
import {
  CONTACT_NAME_LIMIT,
  CONTACT_COMPANY_LIMIT,
  CONTACT_SUBJECT_LIMIT,
  CONTACT_MESSAGE_LIMIT,
  isValidContactEmail,
} from '@/lib/contact-validation';
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
      company = formText(form, 'company').trim(),
      email = formText(form, 'email').trim(),
      subject = formText(form, 'subject').trim(),
      message = formText(form, 'message').trim(),
      intent = formText(form, 'intent');
    if (form.get('website'))
      return Response.redirect(new URL('/contact?sent=1', req.url), 303);
    if (
      !name ||
      name.length > CONTACT_NAME_LIMIT ||
      company.length > CONTACT_COMPANY_LIMIT ||
      subject.length > CONTACT_SUBJECT_LIMIT ||
      !isValidContactEmail(email) ||
      message.length < 10 ||
      message.length > CONTACT_MESSAGE_LIMIT ||
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
        contactInboxMessage({ company, subject, message }),
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
