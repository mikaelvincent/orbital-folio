import type * as Three from 'three';

/** Keep the established framing coordinates while rendering a stationary hull. */
export function createVesselCameraFrame(THREE: typeof Three) {
  const virtualCamera = new THREE.PerspectiveCamera();
  const projectionModel = new THREE.Group();
  const axis = new THREE.Vector3(0, 0, 1);
  const inverseRoll = new THREE.Quaternion();

  function apply(
    camera: Three.PerspectiveCamera,
    target: Three.Vector3,
    direction: Three.Vector3,
    distance: number,
    roll: number,
  ) {
    virtualCamera.copy(camera);
    virtualCamera.up.set(0, 1, 0);
    virtualCamera.position.copy(target).addScaledVector(direction, distance);
    virtualCamera.lookAt(target);
    virtualCamera.updateMatrixWorld(true);
    inverseRoll.setFromAxisAngle(axis, -roll);
    // Inverting the old hull rotation on the camera gives the same model-view
    // matrix, including translation. Camera.roll alone would change the orbit.
    camera.position.copy(virtualCamera.position).applyQuaternion(inverseRoll);
    camera.quaternion.copy(virtualCamera.quaternion).premultiply(inverseRoll);
    camera.up.set(0, 1, 0).applyQuaternion(inverseRoll);
    camera.updateMatrixWorld(true);
    // Annotation layout still uses the established framing coordinates. This
    // metadata-only object is never added to a rendered or raycast scene.
    projectionModel.quaternion.setFromAxisAngle(axis, roll);
    projectionModel.updateMatrixWorld(true);
  }

  return { apply, virtualCamera, projectionModel, inverseRoll };
}
