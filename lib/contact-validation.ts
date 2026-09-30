export const CONTACT_NAME_LIMIT = 120;
export const CONTACT_COMPANY_LIMIT = 160;
export const CONTACT_SUBJECT_LIMIT = 200;
export const CONTACT_EMAIL_LIMIT = 254;
export const CONTACT_MESSAGE_LIMIT = 5000;

/** Syntax only: never look up a domain or send a verification email. */
export function isValidContactEmail(email: string): boolean {
  if (email.length > CONTACT_EMAIL_LIMIT) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (
    local.length > 64 ||
    !/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i.test(
      local,
    )
  )
    return false;
  const labels = domain.split('.');
  return (
    labels.length > 1 &&
    labels.every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
    )
  );
}
