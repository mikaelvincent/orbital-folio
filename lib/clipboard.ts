/** Copy plain text during the initiating click, including Safari's gesture-only
 * clipboard path. No await occurs before either clipboard attempt is started. */
export async function copyText(
  text: string,
  doc: Document = document,
  clipboard: Pick<Clipboard, 'writeText'> | undefined = navigator.clipboard,
): Promise<boolean> {
  const focused = doc.activeElement as HTMLElement | null;
  const input = focused as HTMLInputElement | HTMLTextAreaElement | null;
  const start = input?.selectionStart;
  const end = input?.selectionEnd;
  const direction = input?.selectionDirection;
  const selection = doc.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, i) =>
        selection.getRangeAt(i).cloneRange(),
      )
    : [];
  const field = doc.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.tabIndex = -1;
  field.setAttribute('aria-hidden', 'true');
  field.style.cssText = 'position:fixed;left:-9999px;top:0;font-size:16px;';
  let copied = false;
  try {
    doc.body.appendChild(field);
    field.focus({ preventScroll: true });
    field.select();
    // Deliberate compatibility fallback for plain text. Trying this after an
    // awaited permission rejection can lose WebKit's initiating user gesture.
    // oxlint-disable-next-line typescript/no-deprecated -- Intentional Safari plain-text compatibility path; modern fallback follows in the same gesture.
    copied = doc.execCommand('copy');
  } catch {
    // The modern API below may still be available.
  } finally {
    field.remove();
    focused?.focus({ preventScroll: true });
    if (typeof start === 'number' && typeof end === 'number')
      input?.setSelectionRange(start, end, direction ?? undefined);
    else if (selection) {
      selection.removeAllRanges();
      ranges.forEach((range) => selection.addRange(range));
    }
  }
  if (copied) return true;
  try {
    if (!clipboard) return false;
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
