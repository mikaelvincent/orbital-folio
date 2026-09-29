// These defaults already have a dedicated field in the site record. The Studio
// omits duplicate message inputs so there is one authoritative setting.
export const interfaceTextSiteFields: Record<string, string> = {
  'Back to projects': 'backLabel',
  'All projects': 'allProjectsLabel',
  Role: 'roleLabel',
  'Built with': 'stackLabel',
  'Open live project': 'demoLabel',
  'View source code': 'codeLabel',
  COMMUNICATIONS: 'contactRoom',
  'Previous page in section': 'previousPageLabel',
  'Next page in section': 'nextPageLabel',
  'A little about me': 'aboutHeading',
  Notebook: 'journalLabel',
};

/** Interface messages use their original English text as stable content keys.
 * Overrides are optional: older drafts/backups keep working without a migration.
 * Substitution is plain text. Callers rendering HTML must escape the result.
 */
export function interfaceText(
  site: Record<string, any> | undefined,
  message: string,
  values: Record<string, string | number> = {},
): string {
  const overrides = site?.interfaceText;
  const template =
    overrides &&
    Object.hasOwn(overrides, message) &&
    typeof overrides[message] === 'string'
      ? overrides[message]
      : message;
  return template.replace(
    /\{([a-zA-Z][a-zA-Z0-9]*)\}/g,
    (token: string, key: string) =>
      Object.hasOwn(values, key) ? String(values[key]) : token,
  );
}

export function portfolioIdentity(site: Record<string, any>): string {
  try {
    return new URL(site.domain).hostname || site.name;
  } catch {
    return site.name;
  }
}
