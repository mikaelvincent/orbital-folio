import type { Object3D } from 'three';

/** Rejected benchmark candidate, intentionally unused by the application.
 * Avoid recomposing unchanged local transforms while retaining Three's world
 * propagation and dirty flags. Direct matrix edits invalidate the cache too.
 * Passing the already-loaded constructor keeps this helper free of a runtime
 * Three import; custom updateMatrix implementations are left alone. */
export function installLocalTransformCache(
  root: Object3D,
  constructor: { prototype: Pick<Object3D, 'updateMatrix'> },
): () => void {
  const restorers: (() => void)[] = [];
  root.traverse((object) => {
    if (object.updateMatrix !== constructor.prototype.updateMatrix) return;
    const inherited = !Object.hasOwn(object, 'updateMatrix');
    // Keep the function identity; the wrapper supplies its original receiver.
    // oxlint-disable-next-line typescript/unbound-method
    const original = object.updateMatrix;
    const cached = new Float64Array(26);
    let initialized = false;
    const update = function (this: Object3D) {
      if (this !== object) return original.call(this);
      const p = this.position,
        q = this.quaternion,
        s = this.scale;
      const matrix = this.matrix.elements;
      let unchanged =
        initialized &&
        Object.is(p.x, cached[0]) &&
        Object.is(p.y, cached[1]) &&
        Object.is(p.z, cached[2]) &&
        Object.is(q.x, cached[3]) &&
        Object.is(q.y, cached[4]) &&
        Object.is(q.z, cached[5]) &&
        Object.is(q.w, cached[6]) &&
        Object.is(s.x, cached[7]) &&
        Object.is(s.y, cached[8]) &&
        Object.is(s.z, cached[9]);
      if (unchanged) {
        for (let i = 0; i < 16; i++) {
          if (!Object.is(matrix[i], cached[i + 10])) {
            unchanged = false;
            break;
          }
        }
      }
      if (unchanged) {
        // Native updateMatrix marks this even when compose produces the same
        // numbers. Keep it so non-forced world updates preserve their contract.
        this.matrixWorldNeedsUpdate = true;
        return;
      }
      original.call(this);
      cached[0] = p.x;
      cached[1] = p.y;
      cached[2] = p.z;
      cached[3] = q.x;
      cached[4] = q.y;
      cached[5] = q.z;
      cached[6] = q.w;
      cached[7] = s.x;
      cached[8] = s.y;
      cached[9] = s.z;
      for (let i = 0; i < 16; i++) cached[i + 10] = matrix[i];
      initialized = true;
    };
    object.updateMatrix = update;
    restorers.push(() => {
      if (object.updateMatrix !== update) return;
      if (inherited) delete (object as Partial<Object3D>).updateMatrix;
      else object.updateMatrix = original;
    });
  });
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    for (const restore of restorers) restore();
  };
}
