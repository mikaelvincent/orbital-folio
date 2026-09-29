import type * as Three from 'three';

type GeometryBounds = {
  position: Three.BufferAttribute | Three.InterleavedBufferAttribute;
  array: Three.BufferAttribute['array'];
  version: number;
  count: number;
  itemSize: number;
  normalized: boolean;
  box: Three.Box3;
};
type InstanceBounds = {
  geometry: GeometryBounds;
  matrix: Three.BufferAttribute;
  array: Three.BufferAttribute['array'];
  version: number;
  count: number;
  box: Three.Box3;
};

// Share the native local boxes between shadow and dish preparation. Weak keys
// give them the geometry/mesh lifetime without retaining a second set of boxes.
const geometries = new WeakMap<Three.BufferGeometry, GeometryBounds>();
const instances = new WeakMap<Three.InstancedMesh, InstanceBounds>();

/** Local bounds only: callers must apply the current world matrix themselves.
 * In-place positions and instance matrices follow Three's needsUpdate contract,
 * in addition to the model revision that requests shadow/AO/pixel preparation.
 * Replacing an attribute/array, changing instance count or clearing boundingBox
 * also invalidates. Normals, colors, visibility and object transforms do not.
 * Interleaved/morph geometry and skinned poses take the native recompute path;
 * the focused cache covers the spacecraft's ordinary position buffers. */
export function localBounds(mesh: Three.Mesh): Three.Box3 {
  if ((mesh as Three.SkinnedMesh).isSkinnedMesh) {
    const skinned = mesh as Three.SkinnedMesh;
    skinned.computeBoundingBox();
    return skinned.boundingBox!;
  }
  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position');
  const version = (position as Three.BufferAttribute)?.version;
  const cacheable =
    (position as Three.BufferAttribute)?.isBufferAttribute &&
    !geometry.morphAttributes.position?.length;
  let bounds = geometries.get(geometry);
  if (
    !bounds ||
    !cacheable ||
    bounds.position !== position ||
    bounds.array !== position.array ||
    bounds.version !== version ||
    bounds.count !== position.count ||
    bounds.itemSize !== position.itemSize ||
    bounds.normalized !== position.normalized ||
    bounds.box !== geometry.boundingBox
  ) {
    geometry.computeBoundingBox();
    bounds = {
      position,
      array: position?.array,
      version,
      count: position?.count,
      itemSize: position?.itemSize,
      normalized: position?.normalized,
      box: geometry.boundingBox!,
    };
    if (cacheable) geometries.set(geometry, bounds);
    else geometries.delete(geometry);
  }
  if (!(mesh as Three.InstancedMesh).isInstancedMesh) return bounds.box;

  const instanced = mesh as Three.InstancedMesh;
  const matrix = instanced.instanceMatrix;
  const cached = instances.get(instanced);
  if (
    !cached ||
    cached.geometry !== bounds ||
    cached.matrix !== matrix ||
    cached.array !== matrix.array ||
    cached.version !== matrix.version ||
    cached.count !== instanced.count ||
    cached.box !== instanced.boundingBox
  ) {
    instanced.computeBoundingBox();
    instances.set(instanced, {
      geometry: bounds,
      matrix,
      array: matrix.array,
      version: matrix.version,
      count: instanced.count,
      box: instanced.boundingBox!,
    });
  }
  return instanced.boundingBox!;
}
