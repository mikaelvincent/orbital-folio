import type { Object3D } from 'three';

/**
 * Synchronize the complete scene once, after all frame mutations and before
 * picking, annotations, shadows, color, or AO consume its world transforms.
 * The render loop disables automatic scene updates between those consumers.
 * Temporarily enable the root as well: Three.js otherwise skips its world
 * matrix even when updateMatrixWorld(true) is explicitly requested.
 */
export function updateRenderSceneMatrices(scene: Object3D): void {
  const automatic = scene.matrixWorldAutoUpdate;
  scene.matrixWorldAutoUpdate = true;
  try {
    scene.updateMatrixWorld(true);
  } finally {
    scene.matrixWorldAutoUpdate = automatic;
  }
}
