import type * as Three from 'three';

function sameArray(a: ArrayBufferView, b: ArrayBufferView) {
  if (a.constructor !== b.constructor || a.byteLength !== b.byteLength)
    return false;
  const left = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  const right = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
  return true;
}

function sameAttribute(a: Three.BufferAttribute, b: Three.BufferAttribute) {
  return (
    a.itemSize === b.itemSize &&
    a.normalized === b.normalized &&
    a.gpuType === b.gpuType &&
    a.usage === b.usage &&
    sameArray(a.array, b.array)
  );
}

/** Compare complete GPU geometry inputs, including byte representations. */
function sameGeometry(a: Three.BufferGeometry, b: Three.BufferGeometry) {
  if (a === b) return true;
  if (
    a.drawRange.start !== b.drawRange.start ||
    a.drawRange.count !== b.drawRange.count ||
    JSON.stringify(a.groups) !== JSON.stringify(b.groups)
  )
    return false;
  if (
    !!a.index !== !!b.index ||
    (a.index && b.index && !sameAttribute(a.index, b.index))
  )
    return false;
  const keys = Object.keys(a.attributes).sort();
  if (keys.join('|') !== Object.keys(b.attributes).sort().join('|'))
    return false;
  return keys.every((key) =>
    sameAttribute(
      a.attributes[key] as Three.BufferAttribute,
      b.attributes[key] as Three.BufferAttribute,
    ),
  );
}

/** Coalesce only immutable sibling instance batches. Their existing parent,
 * local transform, vertex inputs and instance bytes remain exactly unchanged.
 * Call during model construction, before GPU uploads or interaction targets. */
export function coalesceStaticInstances(
  THREE: typeof Three,
  root: Three.Object3D,
) {
  type Instance = Three.InstancedMesh<Three.BufferGeometry, Three.Material>;
  const allowedData = new Set(['section', 'excludePick', 'parts']);
  const objectDefaults = THREE.Object3D.prototype;
  const materialDefaults = THREE.Material.prototype;
  const eligible = (mesh: Instance) => {
    if (
      !mesh.isInstancedMesh ||
      !mesh.parent ||
      !mesh.visible ||
      mesh.children.length ||
      mesh.count < 1 ||
      !(mesh.instanceMatrix.array instanceof Float32Array) ||
      mesh.instanceMatrix.itemSize !== 16 ||
      mesh.instanceMatrix.normalized ||
      mesh.instanceMatrix.meshPerAttribute !== 1 ||
      mesh.instanceMatrix.gpuType !== THREE.FloatType ||
      mesh.instanceMatrix.usage !== THREE.StaticDrawUsage ||
      mesh.morphTexture ||
      mesh.customDepthMaterial ||
      mesh.customDistanceMaterial ||
      mesh.onBeforeRender !== objectDefaults.onBeforeRender ||
      mesh.onAfterRender !== objectDefaults.onAfterRender ||
      mesh.onBeforeShadow !== objectDefaults.onBeforeShadow ||
      mesh.onAfterShadow !== objectDefaults.onAfterShadow ||
      Object.keys(mesh.userData).some((key) => !allowedData.has(key))
    )
      return false;
    for (
      let owner = mesh.parent;
      owner && owner !== root;
      owner = owner.parent!
    ) {
      if (
        Object.entries(owner.userData).some(
          ([key, value]) =>
            value != null &&
            value !== false &&
            /animated|interaction|interactable|highlight|projectSlot|caseStudySlot|openReader/i.test(
              key,
            ),
        )
      )
        return false;
    }
    const material = mesh.material;
    if (
      Array.isArray(material) ||
      material.transparent ||
      ((material as Three.MeshPhysicalMaterial).transmission ?? 0) > 0 ||
      material.opacity !== 1 ||
      !material.depthTest ||
      !material.depthWrite ||
      material.onBeforeCompile !== materialDefaults.onBeforeCompile ||
      material.onBeforeRender !== materialDefaults.onBeforeRender ||
      material.customProgramCacheKey !==
        materialDefaults.customProgramCacheKey ||
      ![
        'MeshStandardMaterial',
        'MeshPhysicalMaterial',
        'MeshBasicMaterial',
      ].includes(material.type)
    )
      return false;
    if (
      Object.keys(mesh.geometry.morphAttributes).length ||
      Object.values(mesh.geometry.attributes).some(
        (attribute) =>
          !('isBufferAttribute' in attribute) ||
          attribute.usage !== THREE.StaticDrawUsage ||
          (attribute as Three.InstancedBufferAttribute)
            .isInstancedBufferAttribute,
      )
    )
      return false;
    return (
      !mesh.instanceColor ||
      (mesh.instanceColor.usage === THREE.StaticDrawUsage &&
        mesh.instanceColor.array instanceof Float32Array &&
        mesh.instanceColor.itemSize === 3 &&
        mesh.instanceColor.meshPerAttribute === 1)
    );
  };
  const compatible = (a: Instance, b: Instance) =>
    a.parent === b.parent &&
    a.material === b.material &&
    a.matrix.equals(b.matrix) &&
    a.matrixAutoUpdate === b.matrixAutoUpdate &&
    a.matrixWorldAutoUpdate === b.matrixWorldAutoUpdate &&
    a.castShadow === b.castShadow &&
    a.receiveShadow === b.receiveShadow &&
    a.frustumCulled === b.frustumCulled &&
    a.renderOrder === b.renderOrder &&
    a.layers.mask === b.layers.mask &&
    a.userData.section === b.userData.section &&
    a.userData.excludePick === b.userData.excludePick &&
    !!a.instanceColor === !!b.instanceColor &&
    (!a.instanceColor ||
      !b.instanceColor ||
      (a.instanceColor.itemSize === b.instanceColor.itemSize &&
        a.instanceColor.normalized === b.instanceColor.normalized &&
        a.instanceColor.gpuType === b.instanceColor.gpuType)) &&
    sameGeometry(a.geometry, b.geometry);

  root.updateMatrixWorld(true);
  const candidates: Instance[] = [];
  let meshesBefore = 0;
  root.traverse((object) => {
    const mesh = object as Instance;
    if (!mesh.isInstancedMesh) return;
    meshesBefore += 1;
    if (eligible(mesh)) candidates.push(mesh);
  });
  const buckets: Instance[][] = [];
  for (const mesh of candidates) {
    const bucket = buckets.find((items) => compatible(items[0], mesh));
    if (bucket) bucket.push(mesh);
    else buckets.push([mesh]);
  }
  let mergedGroups = 0,
    drawsRemoved = 0;
  for (const meshes of buckets) {
    if (meshes.length < 2) continue;
    const first = meshes[0];
    const count = meshes.reduce((sum, mesh) => sum + mesh.count, 0);
    const matrices = new Float32Array(count * 16);
    const colors = first.instanceColor ? new Float32Array(count * 3) : null;
    const names: string[] = [];
    let offset = 0;
    for (const mesh of meshes) {
      matrices.set(
        mesh.instanceMatrix.array.subarray(0, mesh.count * 16),
        offset * 16,
      );
      if (colors && mesh.instanceColor)
        colors.set(
          mesh.instanceColor.array.subarray(0, mesh.count * 3),
          offset * 3,
        );
      names.push(
        ...(Array.isArray(mesh.userData.parts)
          ? mesh.userData.parts
          : [mesh.name]),
      );
      offset += mesh.count;
    }
    // Reuse the first object so its exact local/world transform, material,
    // geometry and rendering flags do not need to be copied or reconstructed.
    first.instanceMatrix = new THREE.InstancedBufferAttribute(matrices, 16);
    if (colors && first.instanceColor) {
      const previous = first.instanceColor;
      first.instanceColor = new THREE.InstancedBufferAttribute(
        colors,
        3,
        previous.normalized,
      );
      first.instanceColor.gpuType = previous.gpuType;
    }
    first.count = count;
    first.userData.parts = names;
    first.boundingBox = null;
    first.boundingSphere = null;
    first.computeBoundingBox();
    first.computeBoundingSphere();
    for (const mesh of meshes.slice(1)) mesh.removeFromParent();
    mergedGroups += 1;
    drawsRemoved += meshes.length - 1;
  }
  return {
    meshesBefore,
    meshesAfter: meshesBefore - drawsRemoved,
    mergedGroups,
    drawsRemoved,
  };
}
