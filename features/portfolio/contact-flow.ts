export type ContactMode = 'call' | 'message';
export type ContactDraft = {
  mode?: ContactMode;
  name?: string;
  company?: string;
  email?: string;
  subject?: string;
  message?: string;
  date?: string;
  time?: string;
  timeZone?: string;
};
export type ContactSubmission = {
  status: 'idle' | 'sending' | 'sent' | 'demo';
  error: string;
  mode?: ContactMode;
};

export const CONTACT_MESSAGE_LIMIT = 5000;
const text = (value?: string) => value?.trim() || '';

/** The existing inbox has no separate company/subject columns. Preserve both in
 * the message itself rather than silently dropping fields or changing its API. */
export function contactInboxMessage(draft: ContactDraft) {
  const details = [
    text(draft.company) && `Company: ${text(draft.company)}`,
    text(draft.subject) && `Subject: ${text(draft.subject)}`,
  ].filter(Boolean);
  return [
    ...details,
    ...(details.length ? [''] : []),
    text(draft.message),
  ].join('\n');
}

export function validateContactDraft(draft: ContactDraft): string | null {
  if (draft.mode !== 'call' && draft.mode !== 'message')
    return 'Choose Schedule a call or Send a message first.';
  if (text(draft.name).length > 120)
    return 'Keep your name under 121 characters.';
  if (text(draft.company).length > 160)
    return 'Keep your company name under 161 characters.';
  if (text(draft.subject).length > 200)
    return 'Keep the subject under 201 characters.';
  if (
    text(draft.email).length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(draft.email))
  ) {
    return 'Enter a valid email address.';
  }
  if (text(draft.message).length < 10)
    return 'Please write a message of at least 10 characters.';
  if (contactInboxMessage(draft).length > CONTACT_MESSAGE_LIMIT) {
    return 'Your message, company and subject together must fit within 5,000 characters. Please shorten them before sending.';
  }
  if (draft.mode !== 'message') {
    const date = text(draft.date);
    const parsed = new Date(`${date}T12:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      return 'Choose a valid preferred date.';
    }
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(draft.time)))
      return 'Choose a valid preferred time.';
    try {
      if (!draft.timeZone)
        return 'Your time zone is not ready. Please try again.';
      new Intl.DateTimeFormat('en', { timeZone: draft.timeZone }).format(
        parsed,
      );
    } catch {
      return 'Your time zone could not be recognized.';
    }
  }
  return null;
}

export type ContactTransport = (body: FormData) => Promise<void>;

/** Call requests have no supported backend. Keep the demo branch before payload
 * creation/transport so it can never reach the working message endpoint. */
export async function submitContactDraft(
  draft: ContactDraft,
  transport: ContactTransport,
  website = '',
): Promise<'sent' | 'demo'> {
  const error = validateContactDraft(draft);
  if (error) throw new Error(error);
  if (draft.mode !== 'message') return 'demo';

  const body = new FormData();
  body.set('name', text(draft.name) || 'Name not provided');
  body.set('email', text(draft.email));
  body.set('message', contactInboxMessage(draft));
  // Legacy storage category only; never a visible visitor choice.
  body.set('intent', 'project');
  body.set('website', website);
  await transport(body);
  return 'sent';
}
