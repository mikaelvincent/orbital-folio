import { interfaceText as copy } from '../../lib/content/interface-text.ts';
import {
  CONTACT_NAME_LIMIT,
  CONTACT_COMPANY_LIMIT,
  CONTACT_SUBJECT_LIMIT,
  CONTACT_MESSAGE_LIMIT,
  isValidContactEmail,
} from '../../lib/contact-validation.ts';
export { CONTACT_MESSAGE_LIMIT } from '../../lib/contact-validation.ts';
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
  if (!text(draft.name)) return copy(site, 'Please enter your name.');
  if (text(draft.name).length > CONTACT_NAME_LIMIT)
    return copy(site, 'Keep your name under 121 characters.');
  if (text(draft.company).length > CONTACT_COMPANY_LIMIT)
    return copy(site, 'Keep your company name under 161 characters.');
  if (text(draft.subject).length > CONTACT_SUBJECT_LIMIT)
    return copy(site, 'Keep the subject under 201 characters.');
  if (!isValidContactEmail(text(draft.email))) {
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
  body.set('name', text(draft.name));
  body.set('email', text(draft.email));
  body.set('message', contactInboxMessage(draft));
  // Legacy storage category only; never a visible visitor choice.
  body.set('intent', 'project');
  body.set('website', website);
  await transport(body);
  return 'sent';
}
