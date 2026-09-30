import { interfaceText as copy } from '../../lib/content/interface-text.ts';
import {
  CONTACT_NAME_LIMIT,
  CONTACT_COMPANY_LIMIT,
  CONTACT_SUBJECT_LIMIT,
  CONTACT_MESSAGE_LIMIT,
  isValidContactEmail,
} from '../../lib/contact-validation.ts';
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

export function validateContactDraft(
  draft: ContactDraft,
  site: Record<string, any> = {},
): string | null {
  if (!text(draft.name)) return copy(site, 'Please enter your name.');
  if (text(draft.name).length > CONTACT_NAME_LIMIT)
    return copy(site, 'Keep your name within {limit} characters.', {
      limit: CONTACT_NAME_LIMIT,
    });
  if (text(draft.company).length > CONTACT_COMPANY_LIMIT)
    return copy(site, 'Keep your company name within {limit} characters.', {
      limit: CONTACT_COMPANY_LIMIT,
    });
  if (text(draft.subject).length > CONTACT_SUBJECT_LIMIT)
    return copy(site, 'Keep the subject within {limit} characters.', {
      limit: CONTACT_SUBJECT_LIMIT,
    });
  if (!isValidContactEmail(text(draft.email))) {
    return copy(site, 'Enter a valid email address.');
  }
  if (text(draft.message).length < 10)
    return copy(site, 'Please write a message of at least 10 characters.');
  if (text(draft.message).length > CONTACT_MESSAGE_LIMIT) {
    return copy(site, 'Keep your message within {limit} characters.', {
      limit: CONTACT_MESSAGE_LIMIT.toLocaleString('en-US'),
    });
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
  body.set('company', text(draft.company));
  body.set('email', text(draft.email));
  body.set('subject', text(draft.subject));
  body.set('message', text(draft.message));
  // Legacy storage category only; never a visible visitor choice.
  body.set('intent', 'project');
  body.set('website', website);
  await transport(body);
  return 'sent';
}
