/** Responsive application rectangle within the fixed physical monitor glass.
 * Portrait crops the surrounding monitor rather than stretching its geometry.
 */
export function contactApplicationLayout(
  viewportWidth: number,
  viewportHeight: number,
  glassWidth: number,
  glassHeight: number,
  bottomInset = 88,
) {
  const portrait = viewportHeight > viewportWidth;
  const height = glassHeight - 0.04;
  const pixelsWidth = Math.max(240, Math.min(560, viewportWidth - 32));
  const pixelsHeight = portrait
    ? Math.max(260, viewportHeight - bottomInset - 80)
    : Math.round((pixelsWidth * height) / (glassWidth - 0.04));
  const width = portrait
    ? Math.min(glassWidth - 0.04, (height * pixelsWidth) / pixelsHeight)
    : glassWidth - 0.04;
  return {
    portrait,
    width,
    height,
    pixelsWidth,
    pixelsHeight: (pixelsWidth * height) / width,
  };
}

/** Observe physical keys without preventing any native form/shortcut behavior. */
export function bindContactKeyboard({
  document: doc,
  window: win,
  keyboard,
  active,
  contains,
  wake,
}: {
  document: Pick<
    Document,
    'addEventListener' | 'removeEventListener' | 'hidden'
  >;
  window: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  keyboard: {
    press: (code: string) => void;
    release: (code: string) => void;
    clear: (immediate?: boolean) => void;
  };
  active: () => boolean;
  contains: (target: EventTarget | null) => boolean;
  wake: () => void;
}) {
  const reset = () => {
    keyboard.clear();
    wake();
  };
  const down = (event: Event) => {
    const key = event as KeyboardEvent;
    if (!active() || !contains(key.target) || key.isComposing || !key.code)
      return;
    keyboard.press(key.code);
    wake();
  };
  const up = (event: Event) => {
    const key = event as KeyboardEvent;
    // macOS can omit a letter's keyup while Command is held.
    if (key.key === 'Meta') keyboard.clear();
    else keyboard.release(key.code);
    if (active()) wake();
  };
  const focus = (event: Event) => {
    if (!contains(event.target)) reset();
  };
  const visibility = () => {
    if (doc.hidden) reset();
  };
  const capture = { capture: true };
  doc.addEventListener('keydown', down, capture);
  doc.addEventListener('keyup', up, capture);
  doc.addEventListener('focusin', focus);
  doc.addEventListener('visibilitychange', visibility);
  win.addEventListener('blur', reset);
  return () => {
    doc.removeEventListener('keydown', down, capture);
    doc.removeEventListener('keyup', up, capture);
    doc.removeEventListener('focusin', focus);
    doc.removeEventListener('visibilitychange', visibility);
    win.removeEventListener('blur', reset);
    keyboard.clear(true);
  };
}
