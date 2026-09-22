import { marked, type Token, type TokensList } from 'marked';
import { decodeHTML } from 'entities';

/** Markdown is content, never executable HTML. URL validation is shared by
 * links, images, cover assets and the Studio preview. */
export function projectContentUrl(
  value: unknown,
  kind: 'link' | 'media' = 'link',
) {
  if (typeof value !== 'string') return undefined;
  const url = value.trim();
  if (
    !url ||
    url
      .split('')
      .some(
        (character) =>
          character.charCodeAt(0) <= 32 ||
          character.charCodeAt(0) === 127 ||
          character === '\\',
      )
  )
    return undefined;
  if (/^\/media\/[a-zA-Z0-9_-]+$/.test(url)) return url;
  if (kind === 'link' && (/^\/(?!\/)/.test(url) || /^#[^#]/.test(url)))
    return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password)
      return url;
    if (
      kind === 'link' &&
      parsed.protocol === 'mailto:' &&
      parsed.pathname.includes('@')
    )
      return url;
  } catch {
    /* Invalid authored URLs render as ordinary text. */
  }
  return undefined;
}

export type ProjectHeading = { id: string; text: string; depth: number };

export function parseProjectMarkdown(
  body: string,
  { preserveSoftBreaks = false }: { preserveSoftBreaks?: boolean } = {},
): {
  tokens: TokensList;
  headings: ProjectHeading[];
} {
  const tokens = marked.lexer(body, { gfm: true, breaks: preserveSoftBreaks });
  const headings: ProjectHeading[] = [];
  const used = new Map<string, number>();
  void marked.walkTokens(tokens, (token) => {
    if (token.type !== 'heading') return;
    const text = inlinePlainText(token.tokens ?? []);
    const base =
      text
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'section';
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    headings.push({
      id: `project-${base}${count ? `-${count + 1}` : ''}`,
      text,
      depth: token.depth,
    });
  });
  return { tokens, headings };
}

function inlinePlainText(tokens: Token[]): string {
  return tokens
    .map((token) => {
      if ('tokens' in token && Array.isArray(token.tokens))
        return inlinePlainText(token.tokens ?? []);
      const text = 'text' in token ? String(token.text) : token.raw;
      return token.type === 'codespan' ? text : decodeHTML(text);
    })
    .join('');
}
