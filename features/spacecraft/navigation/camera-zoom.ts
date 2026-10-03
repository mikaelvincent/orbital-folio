import { moveCameraAxis } from './flight.ts';
import type { Vec3 } from './scene-controls.ts';

/** Screen-space aim: left/right and bottom/top are -1/+1. */
export type CameraZoomAim = readonly [number, number];

/** A dolly toward the input position, bounded by the authored starting pose. */
export function createCameraZoom() {
  const motion = { value: 0, velocity: 0 };
  const lateral = [0, 0].map(() => ({ value: 0, velocity: 0 }));
  const lateralGoal = [0, 0];
  const pathOrigin = [0, 0];
  const pathSlope = [0, 0];
  let pathDepth = 0;
  let goal = 0;
  let maximum = Math.log(3);
  const clamp = (value: number) => Math.max(0, Math.min(maximum, value));
  const boundedAim = (value: number) => Math.max(-1, Math.min(1, value));
  const factor = (dt = 0) =>
    Math.exp(-clamp(motion.value + motion.velocity * dt));
  const boundedOffset = (value: number, depth: number) =>
    depth === 0 ? 0 : Math.max(-depth, Math.min(depth, value));
  const retarget = () => {
    pathDepth = 1 - factor();
    const remaining = 1 - Math.exp(-goal) - pathDepth;
    lateral.forEach((axis, i) => {
      pathOrigin[i] = axis.value;
      if (Math.abs(remaining) > 1e-12) {
        // Cancelling nearly all pending depth must not turn its leftover
        // lateral goal into a large sideways move over a tiny forward step.
        pathSlope[i] = boundedAim((lateralGoal[i] - axis.value) / remaining);
        lateralGoal[i] = axis.value + remaining * pathSlope[i];
      } else lateralGoal[i] = axis.value;
    });
  };
  return {
    motion,
    get goal() {
      return goal;
    },
    limit(distance: number, minimumDistance: number) {
      const previousDepth = 1 - factor();
      const previousGoal = 1 - Math.exp(-goal);
      maximum = Math.log(Math.max(1, Math.min(3, distance / minimumDistance)));
      goal = clamp(goal);
      motion.value = clamp(motion.value);
      if (motion.value === 0 || motion.value === maximum) motion.velocity = 0;
      lateral.forEach((axis, i) => {
        const scale = previousDepth > 0 ? (1 - factor()) / previousDepth : 0;
        axis.value *= scale;
        axis.velocity *= scale;
        lateralGoal[i] *=
          previousGoal > 0 ? (1 - Math.exp(-goal)) / previousGoal : 0;
      });
      retarget();
    },
    change(delta: number, point: CameraZoomAim = [0, 0]) {
      if (!Number.isFinite(delta)) return;
      const next = clamp(goal + delta);
      if (next === goal) return;
      const nextDepth = 1 - Math.exp(-next);
      const displayedDepth = 1 - factor();
      const remaining = nextDepth - displayedDepth;
      for (let i = 0; i < 2; i++) {
        const aim = Number.isFinite(point[i]) ? boundedAim(point[i]) : 0;
        // Inward input re-aims unfinished travel from the displayed pose.
        // Shortening that travel retains its ray; moving outward restores the
        // visible offset proportionally, even after changing cursor direction.
        lateralGoal[i] =
          remaining > 0
            ? lateral[i].value + remaining * (next > goal ? aim : pathSlope[i])
            : displayedDepth > 0
              ? (lateral[i].value * nextDepth) / displayedDepth
              : 0;
      }
      goal = next;
      retarget();
    },
    reset() {
      goal = 0;
      lateralGoal.fill(0);
      retarget();
    },
    clear() {
      goal = motion.value = motion.velocity = 0;
      lateral.forEach((axis, i) => {
        axis.value =
          axis.velocity =
          lateralGoal[i] =
          pathOrigin[i] =
          pathSlope[i] =
            0;
      });
      pathDepth = 0;
    },
    factor,
    offset(
      distance: number,
      direction: Vec3,
      fov: number,
      aspect: number,
      dt = 0,
    ): Vec3 {
      const length = Math.hypot(...direction);
      const [dx, dy, dz] = direction.map((v) => v / length);
      const horizontal = Math.hypot(dx, dz);
      const right = [dz / horizontal, 0, -dx / horizontal];
      const up = [dy * right[2], horizontal, -dy * right[0]];
      const travel = distance * Math.tan((fov * Math.PI) / 360);
      const depth = 1 - factor(dt);
      const x =
        boundedOffset(lateral[0].value + lateral[0].velocity * dt, depth) *
        aspect *
        travel;
      const y =
        boundedOffset(lateral[1].value + lateral[1].velocity * dt, depth) *
        travel;
      // Translate eye and target together in the actual view plane. The shared
      // vessel camera applies portrait roll after this virtual-frame offset.
      return [right[0] * x + up[0] * y, up[1] * y, right[2] * x + up[2] * y];
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
      const currentFactor = factor();
      const depth = 1 - currentFactor;
      lateral.forEach((axis, i) => {
        // Couple sideways travel to actual forward travel. Independent aim
        // springs initially move the wrong way when the cursor changes sides.
        const value =
          motion.value === goal && motion.velocity === 0
            ? lateralGoal[i]
            : pathOrigin[i] + (depth - pathDepth) * pathSlope[i];
        axis.value = boundedOffset(value, depth);
        axis.velocity =
          (value === axis.value ? pathSlope[i] : Math.sign(value)) *
          currentFactor *
          motion.velocity;
      });
      return currentFactor;
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
    change: (delta: number, point?: CameraZoomAim) => void;
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
  let pointerAim: CameraZoomAim | undefined;
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
  const position = (x?: number, y?: number): CameraZoomAim | undefined => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return pointerAim;
    const rect = element.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0)) return undefined;
    return [
      Math.max(-1, Math.min(1, (2 * (x! - rect.left)) / rect.width - 1)),
      Math.max(-1, Math.min(1, 1 - (2 * (y! - rect.top)) / rect.height)),
    ];
  };
  const change = (delta: number, point?: CameraZoomAim) => {
    if (options.available()) options.change(delta, point);
  };
  listen(element, 'pointermove', (event: PointerEvent) => {
    if (event.pointerType !== 'touch')
      pointerAim = position(event.clientX, event.clientY);
  });
  listen(element, 'pointerleave', (event: PointerEvent) => {
    if (event.target === element) pointerAim = undefined;
  });
  listen(element, 'wheel', (event: WheelEvent) => {
    if (!options.enabled() || editable(event.target)) return;
    if (!event.ctrlKey && (event.target as Element).closest('.world-surface'))
      return;
    if (event.altKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    // WebKit may deliver wheel events alongside its native gesture events.
    if (!gestureScale)
      change(
        wheelZoomDelta(event, element.clientHeight),
        position(event.clientX, event.clientY),
      );
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
    if (next > 0 && touchSpan > 0)
      change(
        Math.log(next / touchSpan),
        position(
          (event.touches[0].clientX + event.touches[1].clientX) / 2,
          (event.touches[0].clientY + event.touches[1].clientY) / 2,
        ),
      );
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
  listen(
    element,
    'gesturechange',
    (event: Event & { scale: number; clientX?: number; clientY?: number }) => {
      if (!gestureScale) return;
      event.preventDefault();
      if (!pinching && event.scale > 0)
        change(
          Math.log(event.scale / gestureScale),
          position(event.clientX, event.clientY),
        );
      gestureScale = event.scale;
    },
  );
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
    else
      options.change(
        event.key === '-' ? -Math.log(1.2) : Math.log(1.2),
        pointerAim,
      );
  });
  const cancel = () => {
    pinching = false;
    touchSpan = gestureScale = 0;
    pointerAim = undefined;
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
