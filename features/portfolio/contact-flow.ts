import { interfaceText as copy } from '../../lib/content/interface-text.ts';
export type ContactDraft = {
  name?: string;
  company?: string;
  email?: string;
  subject?: string;
  message?: string;
};
export type ContactSubmission = {
  status: 'idle' | 'sending' | 'sent';
  error: string;
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

export function validateContactDraft(
  draft: ContactDraft,
  site: Record<string, any> = {},
): string | null {
  if (text(draft.name).length > 120)
    return copy(site, 'Keep your name under 121 characters.');
  if (text(draft.company).length > 160)
    return copy(site, 'Keep your company name under 161 characters.');
  if (text(draft.subject).length > 200)
    return copy(site, 'Keep the subject under 201 characters.');
  if (
    text(draft.email).length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(draft.email))
  ) {
    return copy(site, 'Enter a valid email address.');
  }
  if (text(draft.message).length < 10)
    return copy(site, 'Please write a message of at least 10 characters.');
  if (contactInboxMessage(draft).length > CONTACT_MESSAGE_LIMIT) {
    return copy(
      site,
      'Your message, company and subject together must fit within 5,000 characters. Please shorten them before sending.',
    );
  }
  return null;
}

export type ContactTransport = (body: FormData) => Promise<void>;

export async function submitContactDraft(
  draft: ContactDraft,
  transport: ContactTransport,
  website = '',
  site: Record<string, any> = {},
): Promise<'sent'> {
  const error = validateContactDraft(draft, site);
  if (error) throw new Error(error);

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
