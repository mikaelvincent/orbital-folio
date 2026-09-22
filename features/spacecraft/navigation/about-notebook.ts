import type * as Three from 'three';
import { fitPerspectiveFrame, type Vec3 } from './scene-controls.ts';

/** The same mounted spread is fitted on every viewport. Portrait deliberately
 * keeps both pages and the attached flags until a separate mobile design. */
export function fitAboutNotebook(
  THREE: typeof Three,
  notebook: {
    framingAnchor: Three.Object3D;
    framingWidth: number;
    framingHeight: number;
  },
  width: number,
  height: number,
  fov: number,
  bottom = width < 700 ? 132 : 80,
) {
  const anchor = notebook.framingAnchor;
  const direction = new THREE.Vector3(0, 0.54, 0.842).normalize();
  const points: Vec3[] = [];
  for (const x of [-notebook.framingWidth / 2, notebook.framingWidth / 2])
    for (const y of [-notebook.framingHeight / 2, notebook.framingHeight / 2])
      points.push(anchor.localToWorld(new THREE.Vector3(x, y, 0)).toArray());
  const safe = {
    left: -1 + 40 / width,
    right: 1 - 40 / width,
    top: 1 - 64 / height,
    bottom: -1 + (2 * bottom) / height,
  };
  const framed = fitPerspectiveFrame(
    points,
    {
      target: anchor.getWorldPosition(new THREE.Vector3()).toArray(),
      direction: direction.toArray(),
    },
    fov,
    width / height,
    safe,
    0.08,
  );
  return {
    ...framed,
    distance: framed.distance * 1.2,
    direction: direction.toArray(),
    safe,
  };
}
