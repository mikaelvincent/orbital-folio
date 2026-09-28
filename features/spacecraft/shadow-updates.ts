import type * as Three from 'three';

type ShadowLight = Three.DirectionalLight | Three.SpotLight;

/** Reuse light-space depth maps, not finished spacecraft pixels. The model's
 * revision contract identifies rigid dish motion separately from every other
 * geometry change. Other changes conservatively refresh the complete rig. */
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
  const lightPosition = new T.Vector3();
  const volumes = new Map<Three.SpotLight, Three.Box3>();
  let geometryRevision = -1,
    otherRevision = -1,
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
      const other = revision - root.userData.dishGeometryRevision;
      if (!prepare && revision === geometryRevision) return false;
      const rebuild = prepare || other !== otherRevision || !dish;
      if (rebuild) {
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
      if (rebuild) {
        lights.forEach(dirty);
        prepareVolumes();
        prepare = false;
      } else {
        // Both poses matter: a caster leaving a region must clear its old shadow.
        // This bounds only the small dish subtree, never the whole spacecraft.
        changedBounds.copy(previousDish).union(currentDish);
        for (const light of lights) {
          const volume = volumes.get(light as Three.SpotLight);
          // Directional rays are parallel; the finite-position proof above does
          // not apply to the sun, which remains live throughout dish motion.
          if (!volume || volume.intersectsBox(changedBounds)) dirty(light);
        }
      }
      previousDish.copy(currentDish);
      geometryRevision = revision;
      otherRevision = other;
      return true;
    },
  };
}
