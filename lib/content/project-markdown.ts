import { marked, type Token } from 'marked';

/** Destinations as parsed by the same Markdown grammar as the public reader. */
export function projectMediaReferences(markdown: string): string[] {
  const references = new Set<string>();
  void marked.walkTokens(marked.lexer(markdown), (token) => {
    if (
      token.type === 'image' ||
      (token.type === 'link' && /^(?:assets\/|\/media\/)/.test(token.href))
    )
      references.add(token.href);
  });
  return [...references];
}

type Source = { text: string; positions: number[] };
type Edit = { start: number; end: number; text: string };
const slice = (source: Source, start: number, end: number): Source => ({
  text: source.text.slice(start, end),
  positions: source.positions.slice(start, end),
});

/** Marked removes quote/list prefixes from child text. Map each complete child
 * line back to its parent instead of guessing global substring occurrences. */
function childSource(parent: Source, text: string): Source | null {
  const positions: number[] = [];
  let parentCursor = 0;
  for (const line of text.split('\n')) {
    const end = parent.text.indexOf('\n', parentCursor);
    const limit = end < 0 ? parent.text.length : end;
    const rawLine = parent.text.slice(parentCursor, limit);
    const offset = rawLine.lastIndexOf(line);
    if (offset < 0) return null;
    positions.push(
      ...parent.positions.slice(
        parentCursor + offset,
        parentCursor + offset + line.length,
      ),
    );
    if (positions.length < text.length) {
      if (end < 0) return null;
      positions.push(parent.positions[end]);
    }
    parentCursor = limit + 1;
  }
  return { text, positions };
}

function closingLabel(raw: string) {
  let depth = 0;
  for (let index = raw.startsWith('!') ? 1 : 0; index < raw.length; index++) {
    const character = raw[index];
    if (character === '\\') {
      index++;
      continue;
    }
    if (character === '`') {
      const run = /^`+/.exec(raw.slice(index))![0];
      const end = raw.indexOf(run, index + run.length);
      if (end >= 0) {
        index = end + run.length - 1;
        continue;
      }
    }
    if (character === '[') depth++;
    if (character === ']' && --depth === 0) return index;
  }
  return -1;
}

/** Rewrite only parsed image/link destinations and their used definitions.
 * Source ranges preserve inline code, escaped examples, nested fences, prose,
 * whitespace and CRLF line endings byte-for-byte. Unsupported destination
 * formatting remains unchanged so package validation can report it explicitly. */
export function rewriteProjectMedia(
  markdown: string,
  destinations: ReadonlyMap<string, string>,
): string {
  const positions: number[] = [];
  let normalized = '';
  for (let index = 0; index < markdown.length; index++) {
    positions.push(index);
    normalized += markdown[index] === '\r' ? '\n' : markdown[index];
    if (markdown[index] === '\r' && markdown[index + 1] === '\n') index++;
  }
  const source = { text: normalized, positions };
  const parsed = marked.lexer(normalized);
  const active = new Set(projectMediaReferences(normalized));
  const edits: Edit[] = [];
  const definitionSources: { tag: string; href: string; part: Source }[] = [];
  const definitions = new Set<string>();
  const referenceKey = (value: string) =>
    value.trim().replace(/\s+/g, ' ').toLowerCase();
  const replaceAt = (part: Source, start: number, from: string, to: string) => {
    if (part.text.slice(start, start + from.length) !== from) return;
    const first = part.positions[start],
      last = part.positions[start + from.length - 1];
    if (first === undefined || last === undefined) return;
    edits.push({ start: first, end: last + 1, text: to });
  };
  const walk = (tokens: Token[], parent: Source) => {
    let cursor = 0;
    for (const token of tokens) {
      const start = parent.text.indexOf(token.raw, cursor);
      if (start < 0) continue;
      cursor = start + token.raw.length;
      const part = slice(parent, start, cursor);
      if (['code', 'codespan', 'escape', 'html'].includes(token.type)) continue;
      if (token.type === 'def')
        definitionSources.push({
          tag: referenceKey(token.tag),
          href: token.href,
          part,
        });
      if (
        (token.type === 'image' || token.type === 'link') &&
        active.has(token.href) &&
        destinations.has(token.href)
      ) {
        const close = closingLabel(token.raw);
        if (close >= 0) {
          if (token.raw[close + 1] === '(') {
            let destinationStart = close + 2;
            while (
              /\s/.test(token.raw[destinationStart] || '') &&
              destinationStart < token.raw.length
            )
              destinationStart++;
            if (token.raw[destinationStart] === '<') destinationStart++;
            replaceAt(
              part,
              destinationStart,
              token.href,
              destinations.get(token.href)!,
            );
          } else {
            const explicit = /^\[([^\]]*)\]/.exec(token.raw.slice(close + 1));
            const labelStart = token.raw.startsWith('!') ? 2 : 1;
            definitions.add(
              referenceKey(explicit?.[1] || token.raw.slice(labelStart, close)),
            );
          }
        }
      }
      if (token.type === 'list') walk(token.items, part);
      else if (token.type === 'table')
        walk(
          [...token.header, ...token.rows.flat()].flatMap(
            (cell) => cell.tokens,
          ),
          part,
        );
      else if ('tokens' in token && Array.isArray(token.tokens)) {
        const children =
          token.type === 'blockquote' || token.type === 'list_item'
            ? childSource(part, token.text)
            : part;
        if (children) walk(token.tokens, children);
      }
    }
  };
  walk(parsed, source);
  // Use the actual definition token ranges, including definitions nested in a
  // list/blockquote. A top-level line regex would miss their source indentation.
  const rewrittenDefinitions = new Set<string>();
  for (const { tag, href, part } of definitionSources) {
    if (
      !definitions.has(tag) ||
      rewrittenDefinitions.has(tag) ||
      parsed.links[tag]?.href !== href ||
      !destinations.has(href)
    )
      continue;
    const close = closingLabel(part.text);
    if (close < 0 || part.text[close + 1] !== ':') continue;
    let start = close + 2;
    while (start < part.text.length && /\s/.test(part.text[start])) start++;
    if (part.text[start] === '<') start++;
    replaceAt(part, start, href, destinations.get(href)!);
    rewrittenDefinitions.add(tag);
  }
  let result = markdown;
  let precedingStart = markdown.length;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    if (edit.end > precedingStart) continue;
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    precedingStart = edit.start;
  }
  return result;
}
