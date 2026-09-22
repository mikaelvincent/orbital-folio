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

export function notebookPageOffset(counts: number[], section: number) {
  return counts
    .slice(0, section)
    .reduce((sum, count) => sum + Math.max(1, count), 0);
}
