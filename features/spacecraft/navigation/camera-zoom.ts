import { moveCameraAxis } from './flight.ts';

/** A dolly along the current view, bounded by its authored starting position. */
export function createCameraZoom() {
  const motion = { value: 0, velocity: 0 };
  let goal = 0;
  let maximum = Math.log(3);
  const clamp = (value: number) => Math.max(0, Math.min(maximum, value));
  return {
    motion,
    get goal() {
      return goal;
    },
    limit(distance: number, minimumDistance: number) {
      maximum = Math.log(Math.max(1, Math.min(3, distance / minimumDistance)));
      goal = clamp(goal);
      motion.value = clamp(motion.value);
      if (motion.value === 0 || motion.value === maximum) motion.velocity = 0;
    },
    change(delta: number) {
      if (Number.isFinite(delta)) goal = clamp(goal + delta);
    },
    reset() {
      goal = 0;
    },
    clear() {
      goal = motion.value = motion.velocity = 0;
    },
    factor() {
      return Math.exp(-motion.value);
    },
    update(delta: number, immediate = false) {
      if (immediate) {
        motion.value = goal;
        motion.velocity = 0;
      } else {
        moveCameraAxis(motion, goal, delta, {
          frequency: 12,
          speed: 3,
          acceleration: 16,
          settle: 1e-6,
        });
        // Reversals retain momentum, but can never overshoot either endpoint.
        const bounded = clamp(motion.value);
        if (bounded !== motion.value) motion.velocity = 0;
        motion.value = bounded;
      }
      return Math.exp(-motion.value);
    },
  };
}

export function wheelZoomDelta(
  event: {
    deltaY: number;
    deltaMode: number;
    ctrlKey: boolean;
  },
  height: number,
) {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
  return -event.deltaY * unit * (event.ctrlKey ? 0.01 : 0.002);
}

/** Scene gestures own zoom; one-finger/ordinary wheel content scrolling stays native. */
export function bindCameraZoom(
  element: HTMLElement,
  options: {
    enabled: () => boolean;
    available: () => boolean;
    change: (delta: number) => void;
    reset: () => void;
    interrupt: () => void;
  },
) {
  const document = element.ownerDocument;
  const window = document.defaultView!;
  const events = new AbortController();
  let pinching = false;
  let touchSpan = 0;
  let gestureScale = 0;
  const listen = (
    target: EventTarget,
    type: string,
    handler: (event: any) => void,
  ) =>
    target.addEventListener(type, handler, {
      capture: true,
      passive: false,
      signal: events.signal,
    });
  const editable = (target: EventTarget | null) =>
    target instanceof Element &&
    !!target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable=false])',
    );
  const change = (delta: number) => {
    if (options.available()) options.change(delta);
  };
  listen(element, 'wheel', (event: WheelEvent) => {
    if (!options.enabled() || editable(event.target)) return;
    if (!event.ctrlKey && (event.target as Element).closest('.world-surface'))
      return;
    if (event.altKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    // WebKit may deliver wheel events alongside its native gesture events.
    if (!gestureScale) change(wheelZoomDelta(event, element.clientHeight));
  });
  const span = (touches: TouchList) =>
    touches.length === 2
      ? Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY,
        )
      : 0;
  listen(element, 'touchstart', (event: TouchEvent) => {
    if (
      !options.enabled() ||
      editable(event.target) ||
      event.touches.length < 2
    )
      return;
    event.preventDefault();
    pinching = true;
    touchSpan = span(event.touches);
    options.interrupt();
  });
  listen(element, 'touchmove', (event: TouchEvent) => {
    if (!pinching) return;
    event.preventDefault();
    const next = span(event.touches);
    if (next > 0 && touchSpan > 0) change(Math.log(next / touchSpan));
    touchSpan = next;
  });
  const endTouch = (event: TouchEvent) => {
    if (!pinching) return;
    // The remaining finger must not become a drag or activate the touched room.
    options.interrupt();
    touchSpan = span(event.touches);
    if (!event.touches.length) pinching = false;
  };
  listen(window, 'touchend', endTouch);
  listen(window, 'touchcancel', endTouch);
  listen(element, 'gesturestart', (event: Event & { scale: number }) => {
    if (!options.enabled() || editable(event.target)) return;
    event.preventDefault();
    gestureScale = event.scale || 1;
    options.interrupt();
  });
  listen(element, 'gesturechange', (event: Event & { scale: number }) => {
    if (!gestureScale) return;
    event.preventDefault();
    if (!pinching && event.scale > 0)
      change(Math.log(event.scale / gestureScale));
    gestureScale = event.scale;
  });
  listen(window, 'gestureend', () => {
    if (gestureScale) options.interrupt();
    gestureScale = 0;
  });
  listen(document, 'keydown', (event: KeyboardEvent) => {
    if (!options.enabled() || editable(event.target) || event.altKey) return;
    if (
      (event.target as Element).closest?.(
        '[data-scene-perf], [data-earth-playback], [data-rendering-controls], [role=dialog], [role=menu]',
      )
    )
      return;
    if (
      !(event.ctrlKey || event.metaKey) ||
      !['+', '=', '-', '0'].includes(event.key)
    )
      return;
    event.preventDefault();
    if (!options.available()) return;
    if (event.key === '0') options.reset();
    else options.change(event.key === '-' ? -Math.log(1.2) : Math.log(1.2));
  });
  const cancel = () => {
    pinching = false;
    touchSpan = gestureScale = 0;
  };
  listen(window, 'blur', cancel);
  return {
    get pinching() {
      return pinching || gestureScale > 0;
    },
    dispose() {
      cancel();
      events.abort();
    },
  };
}
