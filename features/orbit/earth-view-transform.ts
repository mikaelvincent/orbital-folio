import type * as Three from 'three';

/** Approved Europe at Night opening, with motion at 1.5× the original rate.
 * Geography advances over a stationary sphere without changing local angular
 * motion or the retained European geography's opening placement.
 */
export const NIGHT_EARTH_OPENING = {
  longitude: 12,
  latitude: 48,
  roll: -10,
} as const;
export const EARTH_ROTATION_RADIANS_PER_SECOND = 0.0045;

/** Fixed authoring reference; layout-roll presentation is applied separately. */
export const EARTH_REFERENCE_ASPECT = 1280 / 720;
export const EARTH_REFERENCE_FOV = 38;
export const EARTH_RADIUS = 180;

/** Fixed world registration authored from the approved 1280×720 overview.
 * Position/orientation are scene composition, not a live DOM-dependent camera fit.
 * A resized or relabeled portfolio must not silently move the orbital world.
 */
export function createOrbitalWorldReference(THREE: typeof Three) {
  const reference = new THREE.PerspectiveCamera(
    EARTH_REFERENCE_FOV,
    EARTH_REFERENCE_ASPECT,
    0.5,
    80,
  );
  reference.position.set(
    -8.691342758862973,
    4.9456851999661975,
    24.221147213422615,
  );
  reference.quaternion.set(
    -0.09409773847757592,
    -0.13531755978187715,
    -0.012910736271761184,
    0.9862393657307563,
  );
  reference.updateMatrixWorld(true);
  return reference;
}

/** Author the approved desktop horizon before the layout-roll presentation. */
export function placeNightEarth(THREE: typeof Three, earth: Three.Group) {
  const focal = Math.tan(THREE.MathUtils.degToRad(EARTH_REFERENCE_FOV / 2));
  const left = new THREE.Vector3(
    -EARTH_REFERENCE_ASPECT * focal,
    -0.52 * focal,
    -1,
  ).normalize();
  const right = new THREE.Vector3(
    0.72 * EARTH_REFERENCE_ASPECT * focal,
    -focal,
    -1,
  ).normalize();
  const bisector = left.clone().add(right).normalize();
  const normal = new THREE.Vector3().crossVectors(left, right).normalize();
  const cosine = bisector.dot(left);
  const sine = Math.sqrt(1 - cosine * cosine);
  const sweep = 1.2;
  earth.position
    .copy(bisector)
    .multiplyScalar((EARTH_RADIUS * Math.cos(sweep)) / sine)
    .addScaledVector(normal, EARTH_RADIUS * Math.sin(sweep));
  orientNightEarth(THREE, earth);
}

/** Place the opening region on the fixed authoring ray, with north upright.
 * No viewport, camera travel or texture phase can reorient the geographic frame.
 * The fixed mesh's longitude seam is ±180° and must stay outside camera coverage.
 */
export function orientNightEarth(THREE: typeof Three, earth: Three.Group) {
  const longitude = THREE.MathUtils.degToRad(NIGHT_EARTH_OPENING.longitude);
  const latitude = THREE.MathUtils.degToRad(NIGHT_EARTH_OPENING.latitude);
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
  const focal = Math.tan(THREE.MathUtils.degToRad(EARTH_REFERENCE_FOV / 2));
  const direction = new THREE.Vector3(
    -0.5 * EARTH_REFERENCE_ASPECT * focal,
    -0.9 * focal,
    -1,
  ).normalize();
  const ray = new THREE.Ray(new THREE.Vector3(), direction);
  const sphere = new THREE.Sphere(earth.position, EARTH_RADIUS);
  const point = ray.intersectSphere(sphere, new THREE.Vector3());
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
      THREE.MathUtils.degToRad(NIGHT_EARTH_OPENING.roll),
    ),
  );
}
