/** Register ownership as resources are acquired, including partial initialization. */
export function createSceneLifetime() {
  const cleanups: (() => void)[] = [];
  let disposed = false;
  const defer = (cleanup: () => void) => {
    let active = true;
    const once = () => {
      if (!active) return;
      active = false;
      cleanup();
    };
    if (disposed) once();
    else cleanups.push(once);
    return once;
  };
  return {
    defer,
    dispose() {
      if (disposed) return;
      disposed = true;
      while (cleanups.length) {
        try {
          cleanups.pop()!();
        } catch (error) {
          // A failed disposer must not strand a context, listener or later resource.
          console.error('Scene resource cleanup failed', error);
        }
      }
    },
  };
}
