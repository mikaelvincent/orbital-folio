import type { Matrix4 } from 'three';

/** Rejected benchmark candidate: exact checks cost more than native inversion.
 * Reuse an inverse only while both its complete source and result are intact.
 * Several iris leaves consume the same uniform in one pass; this keeps direct
 * matrix edits, singular matrices and parent motion equivalent to copy/invert. */
export function createExactMatrixInverse(
  source: Matrix4,
  destination: Matrix4,
) {
  const previous = new Float64Array(32);
  let valid = false;
  return () => {
    const input = source.elements,
      output = destination.elements;
    // Aliased input/output intentionally invert the current value every time.
    if (input === output) {
      destination.copy(source).invert();
      valid = false;
      return;
    }
    let unchanged = valid;
    if (unchanged) {
      for (let index = 0; index < 16; index++) {
        if (
          !Object.is(input[index], previous[index]) ||
          !Object.is(output[index], previous[index + 16])
        ) {
          unchanged = false;
          break;
        }
      }
    }
    if (unchanged) return;
    destination.copy(source).invert();
    for (let index = 0; index < 16; index++) {
      previous[index] = input[index];
      previous[index + 16] = output[index];
    }
    valid = true;
  };
}
