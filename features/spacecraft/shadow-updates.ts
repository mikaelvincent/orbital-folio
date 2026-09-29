import type * as Three from 'three';

type ShadowLight = Three.DirectionalLight | Three.SpotLight;

/** Reuse light-space depth maps, not finished spacecraft pixels. The model's
 * revision contract separates rigid dish motion and verified non-caster changes.
 * Unknown changes conservatively refresh the complete rig; moving receivers
 * must reconsider dish poses omitted from their light's cached map. */
export function createShadowUpdates({
  three: T,
  renderer,
  root,
  lights,
  receivers,
}: {
  three: typeof Three;
  renderer: Pick<Three.WebGLRenderer, 'shadowMap'>;
  root: Three.Object3D;
  lights: ShadowLight[];
  receivers: () => Map<Three.SpotLight, Set<Three.Mesh>>;
}) {
  const dish = root.getObjectByName('service-mounted-communications-dish');
  const previousDish = new T.Box3();
  const currentDish = new T.Box3();
  const changedBounds = new T.Box3();
  const dishHistory = new T.Box3();
  const lightPosition = new T.Vector3();
  const volumes = new Map<Three.SpotLight, Three.Box3>();
  let geometryRevision = -1,
    otherRevision = -1,
    nonCasterRevision = -1,
    dishRevision = -1,
    prepare = true;

  for (const light of lights) light.shadow.autoUpdate = false;

  function dirty(light: ShadowLight) {
    light.shadow.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true;
  }

  function invalidate() {
    prepare = true;
    lights.forEach(dirty);
  }

  function prepareVolumes() {
    volumes.clear();
    // These bounds match the installed PCF shader. Unknown projection/filter
    // paths remain live; positive depth bias can sample behind a receiver.
    if (renderer.shadowMap.type !== T.PCFShadowMap) return;
    for (const [light, meshes] of receivers()) {
      if (!lights.includes(light) || light.shadow.bias > 0) continue;
      light.shadow.updateMatrices(light);
      const { camera, mapSize, radius, normalBias } = light.shadow;
      const p = camera.projectionMatrix.elements;
      // At any depth up to far, enclose the Vogel disk plus hardware bilinear
      // filtering and a raster texel. Normal bias can move a sample off a mesh.
      const texels = Math.abs(radius) + 2;
      const pad =
        (2 * camera.far * texels * Math.hypot(1 / p[0], 1 / p[5])) /
          Math.min(mapSize.x, mapSize.y) +
        Math.abs(normalBias) +
        0.001;
      if (!Number.isFinite(pad)) continue;
      const volume = new T.Box3();
      for (const mesh of meshes) volume.expandByObject(mesh);
      // Every blocker of a lamp-to-receiver ray lies within their convex hull;
      // this padded world AABB is a conservative superset of that hull.
      volume.expandByPoint(
        lightPosition.setFromMatrixPosition(light.matrixWorld),
      );
      volume.expandByScalar(pad);
      volumes.set(light, volume);
    }
  }

  invalidate();
  return {
    invalidate,
    /** Call after synchronizing scene world matrices. Camera pose is irrelevant. */
    update() {
      const revision = root.userData.geometryRevision;
      const dishVersion = root.userData.dishGeometryRevision;
      const nonCaster = root.userData.nonCasterGeometryRevision || 0;
      const other = revision - dishVersion - nonCaster;
      if (!prepare && revision === geometryRevision) return false;
      const receiversChanged = nonCaster !== nonCasterRevision;
      const dishChanged = dishVersion !== dishRevision;
      const rebuild =
        prepare ||
        other !== otherRevision ||
        !dish ||
        // VSM also draws receivers into the map. Unknown filters retain the
        // original conservative policy instead of assuming PCF semantics.
        renderer.shadowMap.type !== T.PCFShadowMap;
      if (rebuild || receiversChanged) {
        // A geometry revision may edit vertices or instances in place. Box3's
        // object helpers otherwise reuse their old local bounding boxes.
        const geometries = new Set<Three.BufferGeometry>();
        root.traverse((object) => {
          const mesh = object as Three.InstancedMesh;
          if (!mesh.isMesh) return;
          if (!geometries.has(mesh.geometry)) {
            mesh.geometry.computeBoundingBox();
            geometries.add(mesh.geometry);
          }
          if (mesh.isInstancedMesh) mesh.computeBoundingBox();
        });
      }
      if (dish) currentDish.setFromObject(dish);
      let requested = false;
      if (rebuild) {
        lights.forEach(dirty);
        requested = true;
        prepareVolumes();
        dishHistory.makeEmpty();
        prepare = false;
      } else {
        if (receiversChanged) prepareVolumes();
        // Both poses matter: a caster leaving a region must clear its old shadow.
        // This bounds only the small dish subtree, never the whole spacecraft.
        changedBounds.copy(previousDish).union(currentDish);
        if (dishChanged) dishHistory.union(changedBounds);
        // A lamp can hold a dish pose much older than the previous frame. Keep
        // one conservative history box since the last full refresh, so moving
        // (even hidden) receivers cannot expose a previously irrelevant shadow.
        // It may over-refresh after a receiver moves, but never grows in memory.
        const relevantBounds = receiversChanged ? dishHistory : changedBounds;
        for (const light of lights) {
          const volume = volumes.get(light as Three.SpotLight);
          // Directional rays are parallel; the finite-position proof above does
          // not apply to the sun. Its complete map needs only caster changes.
          if (
            (light as Three.DirectionalLight).isDirectionalLight
              ? dishChanged
              : !relevantBounds.isEmpty() &&
                (!volume || volume.intersectsBox(relevantBounds))
          ) {
            dirty(light);
            requested = true;
          }
        }
      }
      previousDish.copy(currentDish);
      geometryRevision = revision;
      otherRevision = other;
      nonCasterRevision = nonCaster;
      dishRevision = dishVersion;
      return requested;
    },
  };
}
