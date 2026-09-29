import type * as Three from 'three';
import { createHtmlUpdateGate } from '../spacecraft/html-update-gate.ts';

/** Publish only metadata whose inputs can be retained exactly. Call after the
 * scene/camera world matrices are current, at the normal metrics cadence. */
export function createSceneMetadataPublisher(
  THREE: typeof Three,
  group: Three.Object3D,
  camera: Three.Camera,
  dataset: DOMStringMap,
) {
  let layoutVersion = -1;
  const projections = createHtmlUpdateGate();
  const point = new THREE.Vector3();
  return () => {
    const data = group.userData;
    // setLayout updates these arrays in place and advances layoutVersion.
    // Site/label changes rebuild the model/runtime with a new publisher.
    if (layoutVersion !== data.layoutVersion) {
      dataset.physicalLabels = JSON.stringify(data.labelPlaques);
      dataset.exteriorLabelAssemblies = JSON.stringify(
        data.labelAssemblyBounds,
      );
      dataset.roomAnchors = JSON.stringify(data.roomAnchors);
      layoutVersion = data.layoutVersion;
    }
    if (
      !projections.changed(
        [data.layoutVersion],
        [camera.matrixWorldInverse, camera.projectionMatrix, group.matrixWorld],
      )
    )
      return;
    // Exact matrix snapshots include camera motion, near/FOV/aspect changes
    // and vessel transforms. Independent dish/door animation is not an input.
    dataset.overviewSupports = JSON.stringify(
      data.overviewSupportPoints.map((value: [number, number, number]) =>
        point
          .fromArray(value)
          .applyMatrix4(group.matrixWorld)
          .project(camera)
          .toArray(),
      ),
    );
    const { min, max } = data.overviewBounds;
    const corners = [];
    for (const x of [min[0], max[0]])
      for (const y of [min[1], max[1]])
        for (const z of [min[2], max[2]])
          corners.push(
            point
              .set(x, y, z)
              .applyMatrix4(group.matrixWorld)
              .project(camera)
              .toArray(),
          );
    dataset.overviewCorners = JSON.stringify(corners);
  };
}
