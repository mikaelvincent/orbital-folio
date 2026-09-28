import type { Matrix4 } from 'three';

/** Snapshot the inputs to a whole HTML update, rather than comparing each DOM
 * write. Matrices are copied: scene objects mutate the same instances in place. */
export function createHtmlUpdateGate() {
  let previous: readonly unknown[] | undefined;
  let transforms: Matrix4[] = [];
  return {
    changed(values: readonly unknown[], matrices: readonly Matrix4[]) {
      if (
        previous &&
        previous.length === values.length &&
        values.every((value, index) => Object.is(value, previous![index])) &&
        matrices.length === transforms.length &&
        matrices.every((matrix, index) => matrix.equals(transforms[index]))
      )
        return false;
      previous = values.slice();
      if (transforms.length !== matrices.length)
        transforms = matrices.map((matrix) => matrix.clone());
      else matrices.forEach((matrix, index) => transforms[index].copy(matrix));
      return true;
    },
    invalidate() {
      previous = undefined;
    },
  };
}
