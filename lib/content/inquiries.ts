export type Inquiry = {
  id: string;
  name: string;
  email: string;
  intent: string;
  message: string;
  created_at: string;
  read_at: string | null;
  replied_at: string | null;
  archived_at: string | null;
};
export const inquiryActions = [
  'read',
  'unread',
  'replied',
  'unreplied',
  'archive',
  'unarchive',
] as const;
export type InquiryAction = (typeof inquiryActions)[number];

/** A draft in the owner's mail application, not a delivery confirmation. */
export function inquiryReplyHref(
  inquiry: Pick<Inquiry, 'email' | 'name' | 'created_at' | 'message'>,
) {
  const line = (value: string) => value.replace(/[\r\n]+/g, ' ');
  const original = inquiry.message.replace(/\r\n?/g, '\n');
  const subject =
    original.match(/^Subject: (.+)$/m)?.[1] || 'Portfolio inquiry';
  const body = `\n\nOn ${line(inquiry.created_at)}, ${line(inquiry.name)} <${line(inquiry.email)}> wrote:\n${original
    .split('\n')
    .map((text) => `> ${text}`)
    .join('\n')}`;
  return `mailto:${encodeURIComponent(inquiry.email)}?subject=${encodeURIComponent(/^re:/i.test(subject) ? line(subject) : `Re: ${line(subject)}`)}&body=${encodeURIComponent(body)}`;
}
export function inquiryCursor(inquiry: Pick<Inquiry, 'created_at' | 'id'>) {
  return `${inquiry.created_at}|${inquiry.id}`;
}
