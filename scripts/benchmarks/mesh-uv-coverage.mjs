/** Exact (up to double precision) UV footprint of indexed triangles at one pose.
 * Clip homogeneous triangle vertices, preserving affine edge UV interpolation.
 * Perspective-correct interpolation on a positive-W clipped polygon is a
 * linear-fractional function: U/V extrema occur at its vertices. This therefore
 * bounds every rasterized fragment, not merely a grid of sampled screen rays.
 */
import * as THREE from 'three';

const PLANES = [
  (p) => p[3] + p[0],
  (p) => p[3] - p[0],
  (p) => p[3] + p[1],
  (p) => p[3] - p[1],
  (p) => p[3] + p[2],
  (p) => p[3] - p[2],
];
export function clipTriangleUv(vertices, planeOffsets = [0, 0, 0, 0, 0, 0]) {
  let polygon = vertices;
  for (const [planeIndex, plane] of PLANES.entries()) {
    const clipped = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i],
        b = polygon[(i + 1) % polygon.length];
      const da = plane(a) + planeOffsets[planeIndex],
        db = plane(b) + planeOffsets[planeIndex];
      if (da >= 0) clipped.push(a);
      if (da < 0 !== db < 0) {
        const t = da / (da - db);
        clipped.push(a.map((value, j) => value + (b[j] - value) * t));
      }
    }
    polygon = clipped;
    if (!polygon.length) break;
  }
  return polygon;
}

/** Maximum longitude separation that can occur at one shared texture latitude.
 * Every polygon edge is affine U(V). Between consecutive vertex V values the
 * outer span is max(affine)-min(affine), hence convex and maximized at an end.
 * Ignoring gaps between visible polygons conservatively includes occlusion.
 */
export function maximumSameLatitudeSpan(polygons) {
  const levels = [...new Set(polygons.flatMap((p) => p.map((v) => v[5])))].sort(
    (a, b) => a - b,
  );
  let maximum = 0,
    atV = null;
  for (const v of levels) {
    let min = Infinity,
      max = -Infinity;
    for (const polygon of polygons) {
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i],
          b = polygon[(i + 1) % polygon.length];
        if (
          v < Math.min(a[5], b[5]) - 1e-12 ||
          v > Math.max(a[5], b[5]) + 1e-12
        )
          continue;
        if (Math.abs(a[5] - b[5]) < 1e-12) {
          min = Math.min(min, a[4], b[4]);
          max = Math.max(max, a[4], b[4]);
        } else {
          const u = a[4] + ((v - a[5]) / (b[5] - a[5])) * (b[4] - a[4]);
          min = Math.min(min, u);
          max = Math.max(max, u);
        }
      }
    }
    if (max - min > maximum) {
      maximum = max - min;
      atV = v;
    }
  }
  return { span: maximum, atV };
}

export function meshUvCoverage(
  mesh,
  camera,
  { sameLatitude = true, positionTolerance = 0, angularTolerance = 0 } = {},
) {
  mesh.updateWorldMatrix(true, false);
  camera.updateMatrixWorld(true);
  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position'),
    uv = geometry.getAttribute('uv');
  const index = geometry.getIndex();
  const localCamera = camera.position
    .clone()
    .applyMatrix4(mesh.matrixWorld.clone().invert());
  const viewProjection = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  const mvp = viewProjection.clone().multiply(mesh.matrixWorld);
  geometry.computeBoundingSphere();
  const worldSphere = geometry.boundingSphere
    .clone()
    .applyMatrix4(mesh.matrixWorld);
  // A unit frustum-plane normal perturbed by angle theta changes signed
  // distance by at most 2*sin(theta/2)*distance; camera translation adds delta.
  // Expanding all six half-spaces therefore contains every projection whose
  // plane directions differ by at most theta and eye differs by at most delta.
  const radiusFromCamera =
    camera.position.distanceTo(worldSphere.center) + worldSphere.radius;
  const planeDistanceTolerance =
    positionTolerance + 2 * Math.sin(angularTolerance / 2) * radiusFromCamera;
  const e = viewProjection.elements;
  const planeOffsets = [
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [2, 1],
    [2, -1],
  ].map(
    ([axis, sign]) =>
      planeDistanceTolerance *
      Math.hypot(
        e[3] + sign * e[axis],
        e[7] + sign * e[4 + axis],
        e[11] + sign * e[8 + axis],
      ),
  );
  const worldScale = new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld);
  const localPositionTolerance =
    positionTolerance / Math.min(worldScale.x, worldScale.y, worldScale.z);
  const clip = Array.from({ length: position.count }, (_, i) => {
    const p = new THREE.Vector4(
      position.getX(i),
      position.getY(i),
      position.getZ(i),
      1,
    ).applyMatrix4(mvp);
    return [p.x, p.y, p.z, p.w, uv.getX(i), uv.getY(i)];
  });
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    eye = new THREE.Vector3();
  const polygons = [];
  let minU = Infinity,
    maxU = -Infinity,
    minV = Infinity,
    maxV = -Infinity;
  const triangleCount = (index?.count ?? position.count) / 3;
  for (let i = 0; i < triangleCount; i++) {
    const ids = [0, 1, 2].map((j) =>
      index ? index.getX(i * 3 + j) : i * 3 + j,
    );
    a.fromBufferAttribute(position, ids[0]);
    b.fromBufferAttribute(position, ids[1]);
    c.fromBufferAttribute(position, ids[2]);
    normal.crossVectors(b.sub(a), c.sub(a));
    eye.copy(localCamera).sub(a);
    if (normal.dot(eye) + normal.length() * localPositionTolerance <= 0)
      continue;
    const polygon = clipTriangleUv(
      ids.map((id) => clip[id]),
      planeOffsets,
    );
    if (polygon.length < 3) continue;
    polygons.push(polygon);
    for (const p of polygon) {
      minU = Math.min(minU, p[4]);
      maxU = Math.max(maxU, p[4]);
      minV = Math.min(minV, p[5]);
      maxV = Math.max(maxV, p[5]);
    }
  }
  if (!polygons.length) return null;
  const same = sameLatitude ? maximumSameLatitudeSpan(polygons) : null;
  return {
    triangles: triangleCount,
    visiblePolygons: polygons.length,
    poseTolerance: {
      position: positionTolerance,
      planeAngleRadians: angularTolerance,
      conservativePlaneDistance: planeDistanceTolerance,
    },
    u: [minU, maxU],
    v: [minV, maxV],
    sourcePixelRows: [(1 - maxV) * 4096, (1 - minV) * 4096],
    maximumSameLatitudeLongitudeSpan: same ? same.span * 360 : null,
    maximumSameLatitudeAtDegrees: same ? (same.atV - 0.5) * 180 : null,
    fixedSeamClearanceDegrees: Math.min(minU, 1 - maxU) * 360,
  };
}
