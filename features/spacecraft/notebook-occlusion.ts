import type * as Three from 'three';

type Point = [number, number, number];
type Plane = [number, number, number, number];
type Bounds = [number, number, number, number, number, number];
type Chunk = { start: number; end: number; bounds: Bounds };
type Node = { bounds: Bounds; children?: Node[]; chunks?: Chunk[] };
type GeometryRecord = {
  position: Three.BufferAttribute | Three.InterleavedBufferAttribute;
  index: Three.BufferAttribute | null;
  version: string;
  node: Node;
};

const records = new WeakMap<Three.BufferGeometry, GeometryRecord>();
const boundsVersions = new WeakMap<
  Three.BufferGeometry,
  {
    position: Three.BufferAttribute | Three.InterleavedBufferAttribute;
    version: number;
  }
>();
const emptyBounds = (): Bounds => [
  Infinity,
  Infinity,
  Infinity,
  -Infinity,
  -Infinity,
  -Infinity,
];
const extend = (bounds: Bounds, x: number, y: number, z: number) => {
  bounds[0] = Math.min(bounds[0], x);
  bounds[1] = Math.min(bounds[1], y);
  bounds[2] = Math.min(bounds[2], z);
  bounds[3] = Math.max(bounds[3], x);
  bounds[4] = Math.max(bounds[4], y);
  bounds[5] = Math.max(bounds[5], z);
};
const mergedBounds = (chunks: Chunk[]) => {
  const bounds = emptyBounds();
  for (const chunk of chunks) {
    extend(bounds, ...(chunk.bounds.slice(0, 3) as Point));
    extend(bounds, ...(chunk.bounds.slice(3, 6) as Point));
  }
  return bounds;
};
const hierarchy = (chunks: Chunk[]): Node => {
  const bounds = mergedBounds(chunks);
  if (chunks.length <= 8) return { bounds, chunks };
  let axis = 0;
  for (let i = 1; i < 3; i++)
    if (bounds[i + 3] - bounds[i] > bounds[axis + 3] - bounds[axis]) axis = i;
  chunks.sort(
    (a, b) =>
      a.bounds[axis] + a.bounds[axis + 3] - b.bounds[axis] - b.bounds[axis + 3],
  );
  const middle = Math.floor(chunks.length / 2);
  return {
    bounds,
    children: [
      hierarchy(chunks.slice(0, middle)),
      hierarchy(chunks.slice(middle)),
    ],
  };
};

/** Coarse triangle groups retain authored-part locality after material batching.
 * The small hierarchy is shared by all stationary and turning ink surfaces. */
function geometryRecord(geometry: Three.BufferGeometry): GeometryRecord | null {
  const position = geometry.getAttribute('position');
  if (!position) return null;
  const index = geometry.index;
  const count = index?.count ?? position.count;
  const start = Math.max(0, geometry.drawRange.start);
  const end = Math.min(count, start + geometry.drawRange.count);
  const positionVersion =
    'version' in position ? position.version : position.data.version;
  const version = `${positionVersion}:${index?.version ?? 0}:${start}:${end}`;
  const previous = records.get(geometry);
  if (
    previous?.version === version &&
    previous.position === position &&
    previous.index === index
  )
    return previous;
  const chunks: Chunk[] = [];
  for (let offset = start; offset + 2 < end; offset += 96 * 3) {
    const stop = Math.min(end, offset + 96 * 3);
    const bounds = emptyBounds();
    for (let i = offset; i < stop; i++) {
      const vertex = index ? index.getX(i) : i;
      extend(
        bounds,
        position.getX(vertex),
        position.getY(vertex),
        position.getZ(vertex),
      );
    }
    chunks.push({ start: offset, end: stop, bounds });
  }
  const record = { position, index, version, node: hierarchy(chunks) };
  records.set(geometry, record);
  return record;
}

function outside(bounds: Bounds, planes: Plane[]) {
  return planes.some(
    ([x, y, z, distance]) =>
      x * bounds[x >= 0 ? 3 : 0] +
        y * bounds[y >= 0 ? 4 : 1] +
        z * bounds[z >= 0 ? 5 : 2] +
        distance <
      -1e-10,
  );
}

const distance = (plane: Plane, point: Point) =>
  plane[0] * point[0] + plane[1] * point[1] + plane[2] * point[2] + plane[3];

/** Clip before dividing by eye depth: crossing the eye or paper plane must
 * never create an infinite polygon or mask unrelated parts of the notebook. */
function clip(points: Point[], planes: Plane[]) {
  for (const plane of planes) {
    if (points.every((point) => distance(plane, point) >= 0)) continue;
    const next: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const da = distance(plane, a),
        db = distance(plane, b);
      if (da >= 0) next.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        next.push([
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
          a[2] + (b[2] - a[2]) * t,
        ]);
      }
    }
    points = next;
    if (points.length < 3) return [];
  }
  return points;
}

export type NotebookOcclusionStats = {
  meshes: number;
  candidateMeshes: number;
  chunks: number;
  triangles: number;
  polygons: number;
  cacheHit: boolean;
};

type Notebook = {
  root: Three.Object3D;
  anchor: Three.Object3D;
  pixelsWidth: number;
  pixelsHeight: number;
};

/** Project opaque scenery onto the native ink's physical plane. This supplies
 * black polygons for a white SVG luminance mask; it does not modify WebGL or
 * rasterize Markdown. All polygon windings agree, so overlapping blockers form
 * a union with the default nonzero fill rule (never evenodd).
 *
 * Call after model matrices/motion update. geometryRevision must change for
 * changed scene visibility, geometry, or transforms, as in the AO cache. */
export function createNotebookOcclusion(
  THREE: typeof Three,
  root: Three.Object3D,
  notebook: Notebook,
) {
  const meshes: Three.Mesh[] = [];
  const collect = (object: Three.Object3D) => {
    if (object === notebook.root || object.userData.isInteractionProxy) return;
    const mesh = object as Three.Mesh;
    if (mesh.isMesh) {
      const materials = [mesh.material].flat();
      // Raw iris stock has shader-clipped storage wings. Its existing analytic
      // GTAO silhouette describes the same aperture without those hidden wings.
      if (!materials.some((material) => material.userData.irisApertureMasked))
        meshes.push(mesh);
    }
    object.children.forEach(collect);
  };
  collect(root);
  const inverse = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const instance = new THREE.Matrix4();
  const combined = new THREE.Matrix4();
  const eye = new THREE.Vector3();
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  const normal = new THREE.Vector3(),
    edge = new THREE.Vector3(),
    toEye = new THREE.Vector3();
  const previousAnchor = new THREE.Matrix4();
  const previousRoot = new THREE.Matrix4();
  const previousCamera = new THREE.Matrix4();
  const previousProjection = new THREE.Matrix4();
  const cameraProjection = new THREE.Matrix4();
  const previousEye = new THREE.Vector3(Infinity, Infinity, Infinity);
  let previousRevision: unknown;
  let previousSize = '';
  let previousLayers = -1;
  let result = {
    visible: false,
    path: '',
    changed: true,
    stats: {
      meshes: meshes.length,
      candidateMeshes: 0,
      chunks: 0,
      triangles: 0,
      polygons: 0,
      cacheHit: false,
    },
  };
  const visible = (mesh: Three.Mesh, irisProxy: boolean) => {
    for (
      let object: Three.Object3D | null = mesh;
      object;
      object = object.parent
    )
      if (!object.visible && !(object === mesh && irisProxy)) return false;
    return true;
  };
  const opaque = (material: Three.Material | undefined) =>
    material?.visible &&
    material.colorWrite &&
    material.opacity >= 0.98 &&
    !material.alphaTest &&
    !(material as Three.MeshStandardMaterial).alphaMap &&
    !((material as Three.MeshPhysicalMaterial).transmission > 0);

  return {
    update(
      camera: Three.Camera,
      geometryRevision: unknown,
      anchor: Three.Object3D = notebook.anchor,
      width = notebook.pixelsWidth,
      height = notebook.pixelsHeight,
    ) {
      inverse.copy(anchor.matrixWorld).invert();
      eye.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
      const size = `${width}:${height}`;
      if (
        size === previousSize &&
        geometryRevision === previousRevision &&
        previousAnchor.equals(anchor.matrixWorld) &&
        previousRoot.equals(root.matrixWorld) &&
        previousCamera.equals(camera.matrixWorldInverse) &&
        previousProjection.equals(camera.projectionMatrix) &&
        previousLayers === camera.layers.mask &&
        previousEye.equals(eye)
      ) {
        result = {
          ...result,
          changed: false,
          stats: { ...result.stats, cacheHit: true },
        };
        return result;
      }
      previousSize = size;
      previousRevision = geometryRevision;
      previousAnchor.copy(anchor.matrixWorld);
      previousRoot.copy(root.matrixWorld);
      previousCamera.copy(camera.matrixWorldInverse);
      previousProjection.copy(camera.projectionMatrix);
      previousLayers = camera.layers.mask;
      previousEye.copy(eye);
      const stats: NotebookOcclusionStats = {
        meshes: meshes.length,
        candidateMeshes: 0,
        chunks: 0,
        triangles: 0,
        polygons: 0,
        cacheHit: false,
      };
      const halfWidth = width / 2000,
        halfHeight = height / 2000;
      const front =
        Number.isFinite(eye.z) && eye.z > 0.00001 && width > 0 && height > 0;
      const paths: string[] = [];
      if (front) {
        cameraProjection
          .copy(camera.projectionMatrix)
          .multiply(camera.matrixWorldInverse)
          .multiply(anchor.matrixWorld);
        const projected = cameraProjection.elements;
        const planes: Plane[] = [
          [0, 0, 1, -0.000001],
          [0, 0, -1, eye.z - 0.000001],
          [eye.z, 0, -halfWidth - eye.x, halfWidth * eye.z],
          [-eye.z, 0, eye.x - halfWidth, halfWidth * eye.z],
          [0, eye.z, -halfHeight - eye.y, halfHeight * eye.z],
          [0, -eye.z, eye.y - halfHeight, halfHeight * eye.z],
          // Match WebGL's near/far clipping as the camera passes walls. A
          // surface already clipped by the renderer cannot hide native ink.
          [
            projected[3] + projected[2],
            projected[7] + projected[6],
            projected[11] + projected[10],
            projected[15] + projected[14],
          ],
          [
            projected[3] - projected[2],
            projected[7] - projected[6],
            projected[11] - projected[10],
            projected[15] - projected[14],
          ],
        ];
        for (const mesh of meshes) {
          const irisProxy = mesh.name === 'iris-occlusion-silhouette';
          if (!visible(mesh, irisProxy) || !mesh.layers.test(camera.layers))
            continue;
          const materials = [mesh.material].flat();
          if (!materials.some(opaque)) continue;
          const geometry = mesh.geometry;
          const position = geometry.getAttribute('position');
          if (!position) continue;
          const version =
            'version' in position ? position.version : position.data.version;
          const previousBounds = boundsVersions.get(geometry);
          if (
            !geometry.boundingBox ||
            previousBounds?.position !== position ||
            previousBounds.version !== version
          ) {
            geometry.computeBoundingBox();
            boundsVersions.set(geometry, { position, version });
          }
          if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) continue;
          const instanced = mesh as Three.InstancedMesh;
          for (
            let instanceIndex = 0;
            instanceIndex < (instanced.isInstancedMesh ? instanced.count : 1);
            instanceIndex++
          ) {
            combined.copy(mesh.matrixWorld);
            if (instanced.isInstancedMesh) {
              instanced.getMatrixAt(instanceIndex, instance);
              combined.multiply(instance);
            }
            local.copy(inverse).multiply(combined);
            // Transposing the point transform puts the clipping planes in
            // mesh-local coordinates, allowing cheap bounds rejection.
            const m = local.elements;
            const localPlanes = planes.map(
              ([x, y, z, w]): Plane => [
                m[0] * x + m[1] * y + m[2] * z + m[3] * w,
                m[4] * x + m[5] * y + m[6] * z + m[7] * w,
                m[8] * x + m[9] * y + m[10] * z + m[11] * w,
                m[12] * x + m[13] * y + m[14] * z + m[15] * w,
              ],
            );
            const box = geometry.boundingBox;
            if (
              outside(
                [
                  box.min.x,
                  box.min.y,
                  box.min.z,
                  box.max.x,
                  box.max.y,
                  box.max.z,
                ],
                localPlanes,
              )
            )
              continue;
            const record = geometryRecord(geometry);
            if (!record) continue;
            stats.candidateMeshes++;
            const determinantSign = local.determinant() < 0 ? -1 : 1;
            const visit = (node: Node) => {
              if (outside(node.bounds, localPlanes)) return;
              if (node.children) {
                node.children.forEach(visit);
                return;
              }
              for (const chunk of node.chunks ?? []) {
                if (outside(chunk.bounds, localPlanes)) continue;
                stats.chunks++;
                for (let i = chunk.start; i + 2 < chunk.end; i += 3) {
                  const group = Array.isArray(mesh.material)
                    ? geometry.groups.find(
                        (group) =>
                          i >= group.start && i < group.start + group.count,
                      )
                    : null;
                  const material = Array.isArray(mesh.material)
                    ? materials[group?.materialIndex ?? -1]
                    : materials[0];
                  if (!opaque(material)) continue;
                  stats.triangles++;
                  const index = record.index;
                  a.fromBufferAttribute(
                    record.position,
                    index ? index.getX(i) : i,
                  ).applyMatrix4(local);
                  b.fromBufferAttribute(
                    record.position,
                    index ? index.getX(i + 1) : i + 1,
                  ).applyMatrix4(local);
                  c.fromBufferAttribute(
                    record.position,
                    index ? index.getX(i + 2) : i + 2,
                  ).applyMatrix4(local);
                  normal.subVectors(b, a).cross(edge.subVectors(c, a));
                  const facing =
                    normal.dot(toEye.subVectors(eye, a)) * determinantSign;
                  if (
                    (material.side === THREE.FrontSide && facing <= 0) ||
                    (material.side === THREE.BackSide && facing >= 0)
                  )
                    continue;
                  const polygon = clip(
                    [a.toArray(), b.toArray(), c.toArray()] as Point[],
                    planes,
                  );
                  if (polygon.length < 3) continue;
                  const points = polygon.map(([x, y, z]) => [
                    width / 2 + (1000 * (x * eye.z - eye.x * z)) / (eye.z - z),
                    height / 2 - (1000 * (y * eye.z - eye.y * z)) / (eye.z - z),
                  ]);
                  let area = 0;
                  for (let p = 0; p < points.length; p++) {
                    const next = points[(p + 1) % points.length];
                    area += points[p][0] * next[1] - next[0] * points[p][1];
                  }
                  if (Math.abs(area) < 0.0001) continue;
                  if (area < 0) points.reverse();
                  paths.push(
                    `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`,
                  );
                  stats.polygons++;
                }
              }
            };
            visit(record.node);
          }
        }
      }
      const path = paths.join('');
      result = {
        visible: front,
        path,
        changed: result.visible !== front || result.path !== path,
        stats,
      };
      return result;
    },
  };
}
