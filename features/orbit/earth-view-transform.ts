import type * as Three from 'three';

export type EarthOpening = {
  longitude: number;
  latitude: number;
  roll: number;
};

/** A lower-latitude, tilted pass keeps urban light networks in the foreground.
 * Geography stays consistent across viewports; the orbit and spin rate stay fixed.
 */
export const NIGHT_EARTH_OPENING = {
  longitude: 120,
  latitude: 25,
  roll: 22.5,
} as const;

/** Place the opening region in the visible foreground, with north upright.
 * Recomputed on resize or explicit composition edits, not per frame.
 * The map's seam is ±180°.
 */
export function orientNightEarth(
  THREE: typeof Three,
  earth: Three.Group,
  camera: Three.PerspectiveCamera,
  opening: EarthOpening = NIGHT_EARTH_OPENING,
) {
  const longitude = THREE.MathUtils.degToRad(opening.longitude);
  const latitude = THREE.MathUtils.degToRad(opening.latitude);
  const localNormal = new THREE.Vector3(
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    -Math.cos(latitude) * Math.sin(longitude),
  );
  const localEast = new THREE.Vector3(
    -Math.sin(longitude),
    0,
    -Math.cos(longitude),
  );
  const localNorth = new THREE.Vector3().crossVectors(localNormal, localEast);
  // Keep the selected region visible below the ship on both portrait and wide layouts.
  const focal = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  // A short ultrawide foreground magnifies vertical drift. Leave more room for
  // the first seconds of rotation instead of placing its subject at the edge.
  const anchorY = camera.aspect > 2.2 ? -0.78 : camera.aspect < 1 ? -0.8 : -0.9;
  const direction = new THREE.Vector3(
    (camera.aspect < 1 ? -0.4 : -0.5) * camera.aspect * focal,
    anchorY * focal,
    -1,
  ).normalize();
  const ray = new THREE.Ray(new THREE.Vector3(), direction);
  const sphere = new THREE.Sphere(earth.position, 180);
  let point = ray.intersectSphere(sphere, new THREE.Vector3());
  // Very tall viewports may put the higher anchor above the limb. Use
  // the lower foreground then; never aim at the hidden center of the sphere.
  if (!point) {
    ray.direction
      .set(-0.5 * camera.aspect * focal, -0.9 * focal, -1)
      .normalize();
    point = ray.intersectSphere(sphere, new THREE.Vector3());
  }
  const normal = point
    ? point.sub(earth.position).normalize()
    : earth.position.clone().negate().normalize();
  const east = new THREE.Vector3(1, 0, 0)
    .addScaledVector(normal, -normal.x)
    .normalize();
  const north = new THREE.Vector3().crossVectors(normal, east).normalize();
  const localBasis = new THREE.Matrix4().makeBasis(
    localEast,
    localNorth,
    localNormal,
  );
  const worldBasis = new THREE.Matrix4().makeBasis(east, north, normal);
  earth.quaternion.setFromRotationMatrix(
    worldBasis.multiply(localBasis.transpose()),
  );
  earth.quaternion.premultiply(
    new THREE.Quaternion().setFromAxisAngle(
      normal,
      THREE.MathUtils.degToRad(opening.roll),
    ),
  );
}
