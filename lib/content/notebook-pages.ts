/** Only standalone markers outside fenced code split paper pages. */
function splitLegacyNotebookPages(body: string): string[] {
  const source = String(body || '');
  const pages: string[] = [];
  let fence = '';
  let offset = 0;
  let from = 0;
  for (const line of source.split('\n')) {
    const match = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (match) {
      if (!fence) fence = match[1];
      else if (
        match[1][0] === fence[0] &&
        match[1].length >= fence.length &&
        /^\s{0,3}(?:`+|~+)\s*$/.test(line)
      )
        fence = '';
    }
    if (
      !fence &&
      /^ {0,3}<!--[ \t]*notebook-page[ \t]*-->[ \t\r]*$/.test(line)
    ) {
      let start = offset;
      let end = offset + line.length;
      for (let n = 0; n < 2 && start > from && source[start - 1] === '\n'; n++)
        start--;
      for (let n = 0; n < 2 && source[end] === '\n'; n++) end++;
      pages.push(source.slice(from, start));
      from = end;
    }
    offset += line.length + 1;
  }
  pages.push(source.slice(from));
  return pages;
}

/** Earlier manual page markers become paragraph breaks without changing code or text. */
export function normalizeNotebookBody(body: string) {
  return splitLegacyNotebookPages(body).join('\n\n');
}

export const NOTEBOOK_PAGE_BREAK = '<!-- page-break -->';

/** Insert a break at the caret without deleting any of the following story. */
export function insertNotebookPageBreak(body: string, position = body.length) {
  const from = Math.max(0, Math.min(position, body.length));
  const prefix = body.slice(0, from);
  const suffix = body.slice(from);
  const inserted = `${prefix && !prefix.endsWith('\n\n') ? '\n\n' : ''}${NOTEBOOK_PAGE_BREAK}\n\n`;
  return {
    body: prefix + inserted + suffix,
    caret: prefix.length + inserted.length,
  };
}

export function notebookPageOffset(counts: number[], section: number) {
  return counts
    .slice(0, section)
    .reduce((sum, count) => sum + Math.max(1, count), 0);
}
/** Shared by measured Markdown columns and their physical page-turn copies. */
export const NOTEBOOK_COLUMN_STRIDE = 494;

/** Each open spread shows two consecutive columns from the same section. */
export function notebookSpreadCount(pages: number) {
  return Math.max(1, Math.ceil(pages / 2));
}

/** Keep the semantic spread and animated page copies on the same footer format. */
export function notebookPageLabel(number: number, total: number) {
  return number <= total ? `${number} of ${total}` : '';
}
