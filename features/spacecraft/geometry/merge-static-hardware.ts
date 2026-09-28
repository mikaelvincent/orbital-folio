import type * as Three from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Fold small immutable instance batches into an existing sibling draw. Run
 * only during construction, before targets, caches or GPU uploads exist.
 * Large repetitions retain instancing to bound the extra vertex storage. */
export function mergeStaticHardware(THREE: typeof Three, root: Three.Object3D) {
  type Mesh = Three.Mesh<Three.BufferGeometry, Three.Material>;
  type Instances = Three.InstancedMesh<Three.BufferGeometry, Three.Material>;
  const allowedData = new Set([
    'section',
    'excludePick',
    'openReader',
    'parts',
  ]);
  const objectDefaults = THREE.Object3D.prototype;
  const materialDefaults = THREE.Material.prototype;
  const supported = (mesh: Mesh) => {
    const material = mesh.material;
    return (
      mesh.isMesh &&
      mesh.visible &&
      !mesh.children.length &&
      !mesh.userData.openReader &&
      Object.keys(mesh.userData).every((key) => allowedData.has(key)) &&
      !mesh.customDepthMaterial &&
      !mesh.customDistanceMaterial &&
      mesh.onBeforeRender === objectDefaults.onBeforeRender &&
      mesh.onAfterRender === objectDefaults.onAfterRender &&
      mesh.onBeforeShadow === objectDefaults.onBeforeShadow &&
      mesh.onAfterShadow === objectDefaults.onAfterShadow &&
      !Array.isArray(material) &&
      material.type === 'MeshStandardMaterial' &&
      !material.transparent &&
      material.opacity === 1 &&
      material.depthTest &&
      material.depthWrite &&
      material.onBeforeCompile === materialDefaults.onBeforeCompile &&
      material.onBeforeRender === materialDefaults.onBeforeRender &&
      material.customProgramCacheKey ===
        materialDefaults.customProgramCacheKey &&
      Object.keys(mesh.geometry.morphAttributes).length === 0 &&
      mesh.geometry.drawRange.start === 0 &&
      mesh.geometry.drawRange.count === Infinity &&
      Object.keys(mesh.geometry.attributes).sort().join(',') ===
        'normal,position,uv' &&
      Object.entries(mesh.geometry.attributes).every(
        ([name, a]) =>
          a instanceof THREE.BufferAttribute &&
          !(a as Three.InstancedBufferAttribute).isInstancedBufferAttribute &&
          a.array instanceof Float32Array &&
          !a.normalized &&
          a.itemSize === (name === 'uv' ? 2 : 3) &&
          a.usage === THREE.StaticDrawUsage &&
          a.gpuType === THREE.FloatType,
      )
    );
  };
  const sameState = (a: Mesh, b: Mesh) =>
    a.material === b.material &&
    a.castShadow === b.castShadow &&
    a.receiveShadow === b.receiveShadow &&
    a.layers.mask === b.layers.mask &&
    a.renderOrder === b.renderOrder &&
    a.frustumCulled === b.frustumCulled &&
    a.userData.section === b.userData.section &&
    !!a.userData.excludePick === !!b.userData.excludePick;
  const parts = (mesh: Mesh): string[] => mesh.userData.parts ?? [mesh.name];
  const indexedClone = (geometry: Three.BufferGeometry) => {
    const clone = geometry.clone();
    if (!clone.index)
      clone.setIndex(
        Array.from({ length: clone.attributes.position.count }, (_, i) => i),
      );
    // Single-material meshes render the full range regardless of groups.
    clone.clearGroups();
    return clone;
  };
  root.updateMatrixWorld(true);
  const batches: Instances[] = [];
  root.traverse((object) => {
    const mesh = object as Instances;
    if (
      !mesh.isInstancedMesh ||
      !supported(mesh) ||
      mesh.instanceColor ||
      mesh.morphTexture ||
      mesh.count < 1 ||
      (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) *
        mesh.count >
        6144 ||
      mesh.instanceMatrix.usage !== THREE.StaticDrawUsage
    )
      return;
    for (let owner = mesh.parent; owner; owner = owner.parent)
      if (
        owner.userData.animated ||
        owner.userData.irisHatch ||
        owner.userData.openReader
      )
        return;
    batches.push(mesh);
  });
  const targets = new Map<Mesh, Instances[]>();
  for (const batch of batches) {
    const target = batch.parent?.children.find((object) => {
      const mesh = object as Instances;
      return !mesh.isInstancedMesh && supported(mesh) && sameState(mesh, batch);
    }) as Mesh | undefined;
    if (!target) continue;
    const siblings = targets.get(target) ?? [];
    siblings.push(batch);
    targets.set(target, siblings);
  }
  let drawsRemoved = 0;
  for (const [target, siblings] of targets) {
    if (target.matrix.determinant() <= 0) continue;
    const geometries = [indexedClone(target.geometry)];
    const mergedParts = [...parts(target)];
    const consumed: Instances[] = [];
    const inverse = target.matrix.clone().invert();
    for (const batch of siblings) {
      const transforms: Three.Matrix4[] = [];
      for (let i = 0; i < batch.count; i++) {
        const instance = new THREE.Matrix4();
        batch.getMatrixAt(i, instance);
        // Instanced normals assume orthogonal positive-scale basis vectors.
        const x = new THREE.Vector3().setFromMatrixColumn(instance, 0);
        const y = new THREE.Vector3().setFromMatrixColumn(instance, 1);
        const z = new THREE.Vector3().setFromMatrixColumn(instance, 2);
        if (
          instance.determinant() <= 0 ||
          Math.abs(x.clone().normalize().dot(y.clone().normalize())) > 1e-6 ||
          Math.abs(x.clone().normalize().dot(z.clone().normalize())) > 1e-6 ||
          Math.abs(y.clone().normalize().dot(z.clone().normalize())) > 1e-6
        )
          break;
        transforms.push(
          inverse.clone().multiply(batch.matrix).multiply(instance),
        );
      }
      if (transforms.length !== batch.count || batch.matrix.determinant() <= 0)
        continue;
      for (const transform of transforms)
        geometries.push(indexedClone(batch.geometry).applyMatrix4(transform));
      mergedParts.push(...parts(batch));
      consumed.push(batch);
    }
    const merged = consumed.length ? mergeGeometries(geometries) : null;
    for (const geometry of geometries) geometry.dispose();
    if (!merged) continue;
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    target.geometry = merged;
    target.userData.parts = mergedParts;
    for (const batch of consumed) batch.removeFromParent();
    drawsRemoved += consumed.length;
  }
  return { drawsRemoved };
}
