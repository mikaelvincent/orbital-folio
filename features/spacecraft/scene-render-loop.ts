/** Visible scenes rest after deliberate inactivity, independently of reduced motion. */
export const SCENE_IDLE_DELAY_MS = 15_000;

export function createSceneRenderLoop({
  draw,
  canRender,
  ambientMotion,
  keepAwake,
  renderOnce,
  onRest = () => {},
  now = () => performance.now(),
  requestFrame = requestAnimationFrame,
  cancelFrame = cancelAnimationFrame,
}: {
  draw: (time: number, delta: number, rawDelta: number) => void;
  canRender: () => boolean;
  ambientMotion: () => boolean;
  /** Travel, unfinished transitions, held gestures, or explicit inspection. */
  keepAwake: () => boolean;
  renderOnce: () => boolean;
  onRest?: (resting: boolean) => void;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (id: number) => void;
}) {
  let frame = 0;
  let previousTime: number | null = null;
  let lastActivity = now();
  let drawing = false;
  let requestedDuringDraw = false;
  let disposed = false;
  let resting = false;

  function setRest(value: boolean) {
    if (value === resting) return;
    resting = value;
    onRest(value);
  }

  function schedule() {
    if (!disposed && canRender() && !frame && !drawing)
      frame = requestFrame(loop);
  }

  function loop(time: number) {
    frame = 0;
    if (disposed || !canRender()) {
      previousTime = null;
      return;
    }
    const rawDelta = previousTime === null ? 0 : (time - previousTime) / 1000;
    previousTime = time;
    drawing = true;
    requestedDuringDraw = false;
    try {
      draw(time, Math.min(0.05, rawDelta), rawDelta);
    } finally {
      drawing = false;
    }
    // draw() can navigate, unmount, or request another frame. Recheck afterward
    // and schedule once so those requests cannot create competing frame loops.
    if (disposed || !canRender()) {
      previousTime = null;
      return;
    }
    const idle = time - lastActivity >= SCENE_IDLE_DELAY_MS;
    const needed = keepAwake();
    const continuous =
      requestedDuringDraw ||
      (!renderOnce() && (needed || (ambientMotion() && !idle)));
    setRest(!renderOnce() && ambientMotion() && idle && !needed);
    if (continuous) schedule();
    else previousTime = null;
  }

  return {
    wake() {
      if (disposed) return;
      lastActivity = now();
      if (drawing) requestedDuringDraw = true;
      setRest(false);
      schedule();
    },
    resetClock() {
      previousTime = null;
    },
    suspend() {
      cancelFrame(frame);
      frame = 0;
      previousTime = null;
      setRest(false);
    },
    dispose() {
      disposed = true;
      cancelFrame(frame);
      frame = 0;
      previousTime = null;
    },
  };
}
