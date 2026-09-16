import type * as Three from 'three';

/** Pick the rendered wall around the Contact application without selecting
 * through its desk, keyboard or screens. Recreate after replacing model meshes;
 * transforms, instance matrices and visibility are read at each pick.
 */
export function createContactRoomDismissPicker(
  walls: readonly Three.Mesh[],
  blockers: readonly Three.Mesh[],
) {
  const hits: Three.Intersection<Three.Object3D>[] = [];

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

  return {
    pick(raycaster: Three.Raycaster): Three.Intersection<Three.Mesh> | null {
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
    },
  };
}
