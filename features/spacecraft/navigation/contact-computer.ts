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

/** Observe key holds (or macOS Caps Lock status) without changing native input. */
export function bindContactKeyboard({
  document: doc,
  window: win,
  keyboard,
  active,
  contains,
  wake,
  platform = typeof navigator === 'undefined' ? '' : navigator.platform,
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
  platform?: string;
}) {
  // macOS emits CapsLock flagsChanged: down means enabled, up means disabled,
  // not physical release (WebKit PlatformEventFactoryMac::isKeyUpEvent).
  // Use the approved lock-status fallback there. Reading every in-app key event
  // also restores the actual status after focus loss or opening with it enabled,
  // and supports Mac browsers that emit only keydown for both lock toggles.
  const macCaps = /Mac/.test(platform);
  const syncCapsStatus = (key: KeyboardEvent) => {
    if (!macCaps) return;
    if (key.getModifierState('CapsLock')) keyboard.press('CapsLock');
    else keyboard.release('CapsLock');
  };
  const reset = () => {
    keyboard.clear();
    wake();
  };
  const down = (event: Event) => {
    const key = event as KeyboardEvent;
    if (!active() || !contains(key.target) || key.isComposing || !key.code)
      return;
    if (key.code !== 'CapsLock' || !macCaps) keyboard.press(key.code);
    syncCapsStatus(key);
    wake();
  };
  const up = (event: Event) => {
    const key = event as KeyboardEvent;
    if (key.code === 'CapsLock' && macCaps) {
      if (active() && contains(key.target) && !key.isComposing) {
        syncCapsStatus(key);
        wake();
      }
      return;
    }
    // macOS can omit a letter's keyup while Command is held.
    if (key.key === 'Meta') keyboard.clear();
    else keyboard.release(key.code);
    if (active() && contains(key.target) && !key.isComposing)
      syncCapsStatus(key);
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
