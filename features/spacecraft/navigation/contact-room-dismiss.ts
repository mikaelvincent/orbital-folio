import type * as Three from 'three';

/** Pick the rendered wall around the Contact application without selecting
 * through its desk, keyboard or screens. Recreate after replacing model meshes.
 * Without a revision, transforms, instance matrices and visibility are read at
 * each pick. Optional revisions must change for every relevant geometry,
 * transform, layer or visibility mutation (including materials and ancestors).
 * Each picker owns its cache so changing rooms cannot reuse another room's hit.
 */
export function createContactRoomDismissPicker(
  walls: readonly Three.Mesh[],
  blockers: readonly Three.Mesh[],
) {
  const hits: Three.Intersection<Three.Object3D>[] = [];
  let previousRay: Three.Ray | undefined;
  let previousRevision: number | undefined;
  let previousNear = 0,
    previousFar = 0,
    previousLayers = 0,
    raycasts = 0;
  let result: Three.Intersection<Three.Mesh> | null = null;

  function nearest(
    mesh: Three.Mesh,
    raycaster: Three.Raycaster,
    limit: number,
  ): Three.Intersection<Three.Mesh> | null {
    if (!mesh.layers.test(raycaster.layers) || mesh.userData.isInteractionProxy)
      return null;
    for (
      let ancestor: Three.Object3D | null = mesh;
      ancestor;
      ancestor = ancestor.parent
    )
      if (!ancestor.visible) return null;

    // Native Mesh/InstancedMesh raycasts already reject bounding-volume misses.
    // Calling them directly avoids sorting the same temporary array repeatedly.
    hits.length = 0;
    mesh.raycast(raycaster, hits);
    let closest: Three.Intersection<Three.Mesh> | null = null;
    for (const hit of hits) {
      if (hit.distance > limit || (closest && hit.distance >= closest.distance))
        continue;
      const material = Array.isArray(mesh.material)
        ? mesh.material[hit.face?.materialIndex ?? 0]
        : mesh.material;
      if (!material?.visible || (material.transparent && material.opacity <= 0))
        continue;
      closest = hit as Three.Intersection<Three.Mesh>;
    }
    return closest;
  }

  function pick(
    raycaster: Three.Raycaster,
  ): Three.Intersection<Three.Mesh> | null {
    let wall: Three.Intersection<Three.Mesh> | null = null;
    for (const mesh of walls) {
      const hit = nearest(mesh, raycaster, wall?.distance ?? raycaster.far);
      if (hit) wall = hit;
    }
    // Empty sky and other misses do not inspect the detailed console at all.
    if (!wall) return null;
    for (const mesh of blockers) {
      if (nearest(mesh, raycaster, wall.distance + 1e-6)) return null;
    }
    return wall;
  }

  return {
    invalidate() {
      previousRevision = undefined;
    },
    get raycasts() {
      return raycasts;
    },
    pick(raycaster: Three.Raycaster, revision?: number) {
      if (
        revision !== undefined &&
        revision === previousRevision &&
        previousNear === raycaster.near &&
        previousFar === raycaster.far &&
        previousLayers === raycaster.layers.mask &&
        previousRay?.equals(raycaster.ray)
      )
        return result;
      result = pick(raycaster);
      raycasts++;
      previousRevision = revision;
      previousNear = raycaster.near;
      previousFar = raycaster.far;
      previousLayers = raycaster.layers.mask;
      if (previousRay) previousRay.copy(raycaster.ray);
      else previousRay = raycaster.ray.clone();
      return result;
    },
  };
}
