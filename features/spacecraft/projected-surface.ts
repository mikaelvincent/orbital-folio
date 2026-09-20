import type { Camera, Matrix4 } from 'three';

/** Project native reader pixels directly into the scene viewport. A single
 * projective transform avoids nested CSS perspective and percentage-centering
 * dependencies while retaining the same physical surface and camera. */
export function createProjectedSurface(
  THREE: Pick<typeof import('three'), 'Matrix4'>,
  element: Pick<HTMLElement, 'style'>,
) {
  const viewport = new THREE.Matrix4();
  const pixels = new THREE.Matrix4();
  const projected = new THREE.Matrix4();
  let visible = false;
  let previousTransform = '';

  Object.assign(element.style, {
    position: 'absolute',
    left: '0px',
    top: '0px',
    transformOrigin: '0 0',
    display: 'none',
  });

  return {
    update(
      camera: Pick<Camera, 'projectionMatrix' | 'matrixWorldInverse'>,
      surfaceWorld: Matrix4,
      logicalWidth: number,
      logicalHeight: number,
      viewportWidth: number,
      viewportHeight: number,
      nextVisible: boolean,
    ) {
      const validSize = [
        logicalWidth,
        logicalHeight,
        viewportWidth,
        viewportHeight,
      ].every((value) => Number.isFinite(value) && value > 0);
      nextVisible &&= validSize;
      if (nextVisible !== visible) {
        element.style.display = nextVisible ? '' : 'none';
        visible = nextVisible;
      }
      if (!visible) return;

      // DOM pixels start at the upper left and point down. Three's centered
      // reader plane starts at its middle and points up; surfaceWorld already
      // supplies its world-space size, rotation and position.
      pixels.set(
        1,
        0,
        0,
        -logicalWidth / 2,
        0,
        -1,
        0,
        logicalHeight / 2,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
      );
      viewport.set(
        viewportWidth / 2,
        0,
        0,
        viewportWidth / 2,
        0,
        -viewportHeight / 2,
        0,
        viewportHeight / 2,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
      );
      projected
        .copy(viewport)
        .multiply(camera.projectionMatrix)
        .multiply(camera.matrixWorldInverse)
        .multiply(surfaceWorld)
        .multiply(pixels);

      // Keep the depth row: flattening it to zero makes this matrix singular
      // and prevents browsers from mapping pointer input back to native HTML.
      const transform = `matrix3d(${projected.elements.join(',')})`;
      if (transform !== previousTransform) {
        element.style.transform = transform;
        previousTransform = transform;
      }
    },
  };
}
