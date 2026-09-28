/** Animate visible scenes continuously; reduced motion remains demand-driven. */
export function createSceneRenderLoop({
  draw,
  canRender,
  ambientMotion,
  keepAwake,
  renderOnce,
  requestFrame = requestAnimationFrame,
  cancelFrame = cancelAnimationFrame,
}: {
  draw: (time: number, delta: number, rawDelta: number) => void;
  canRender: () => boolean;
  ambientMotion: () => boolean;
  /** Required work, such as travel, that can continue with ambient motion off. */
  keepAwake: () => boolean;
  renderOnce: () => boolean;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (id: number) => void;
}) {
  let frame = 0;
  let previousTime: number | null = null;
  let drawing = false;
  let requestedDuringDraw = false;
  let disposed = false;

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
    // Browsers can suspend RAF without a visibility event. Resume from the held
    // pose after a long gap, while retaining its real duration for diagnostics.
    const delta = rawDelta > 1 ? 0 : Math.min(0.05, rawDelta);
    drawing = true;
    requestedDuringDraw = false;
    try {
      draw(time, delta, rawDelta);
    } finally {
      drawing = false;
    }
    // draw() can navigate, unmount, or request another frame. Recheck afterward
    // and schedule once so those requests cannot create competing frame loops.
    if (disposed || !canRender()) {
      previousTime = null;
      return;
    }
    const continuous =
      requestedDuringDraw ||
      (!renderOnce() && (keepAwake() || ambientMotion()));
    if (continuous) schedule();
    else previousTime = null;
  }

  return {
    wake() {
      if (disposed) return;
      if (drawing) requestedDuringDraw = true;
      schedule();
    },
    resetClock() {
      previousTime = null;
    },
    suspend() {
      cancelFrame(frame);
      frame = 0;
      previousTime = null;
    },
    dispose() {
      disposed = true;
      cancelFrame(frame);
      frame = 0;
      previousTime = null;
    },
  };
}
