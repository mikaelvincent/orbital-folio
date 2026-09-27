import type * as Three from 'three';

const applied = new WeakSet<Three.Material>();
const direct =
  'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
const directional = 'getDirectionalLightInfo( directionalLight, directLight );';

/** Specialize the installed Three chunk, leaving every nonzero contribution intact.
 * Plain Standard diffuse/specular both multiply by max(dot(N,L), 0) * light.color.
 * Physical clearcoat can use a different normal and must keep the stock shader.
 * The current DFG/PCF lookups are single-level, isotropic, linearly filtered;
 * adding mip/derivative-dependent sampling inside these branches needs review.
 * Fail back to the stock chunk if an upstream layout change breaks these anchors. */
export function directLightWorkChunk(source: string): string {
  const pointStart = source.indexOf(
    'getPointLightInfo( pointLight, geometryPosition, directLight );',
  );
  const pointEnd = source.indexOf(direct, pointStart);
  const directionalStart = source.indexOf(directional, pointEnd);
  const directionalEnd = source.indexOf(direct, directionalStart);
  if (
    pointStart < 0 ||
    pointEnd < 0 ||
    directionalStart < 0 ||
    directionalEnd < 0
  )
    return source;

  // Assemble untouched source slices. Shadow sampling is also
  // unnecessary on the back of a directional light; indirect lighting is intact.
  return (
    source.slice(0, pointEnd) +
    `if ( directLight.visible && dot( geometryNormal, directLight.direction ) > 0.0 ) { ${direct} }` +
    source.slice(
      pointEnd + direct.length,
      directionalStart + directional.length,
    ) +
    '\n\t\tif ( dot( geometryNormal, directLight.direction ) > 0.0 ) {' +
    source.slice(
      directionalStart + directional.length,
      directionalEnd + direct.length,
    ) +
    '\n\t\t}' +
    source.slice(directionalEnd + direct.length)
  );
}

/** Install after model cloning/batching so existing material hooks and batching
 * eligibility are preserved. No global Three shader chunks are changed. */
export function avoidZeroContributionLighting(
  THREE: Pick<typeof Three, 'ShaderChunk'>,
  root: Three.Object3D,
) {
  const chunk = directLightWorkChunk(THREE.ShaderChunk.lights_fragment_begin);
  root.traverse((object) => {
    const mesh = object as Three.Mesh;
    if (!mesh.isMesh) return;
    for (const material of [mesh.material].flat()) {
      const standard = material as Three.MeshPhysicalMaterial;
      if (
        !standard.isMeshStandardMaterial ||
        standard.isMeshPhysicalMaterial ||
        applied.has(material)
      )
        continue;
      applied.add(material);
      // Preserve authored paint, iris masks and keyboard atlas hooks, including
      // their cache identity, before installing our own hook.
      const compile = material.onBeforeCompile.bind(material);
      const key = material.customProgramCacheKey();
      material.onBeforeCompile = (shader, renderer) => {
        compile(shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <lights_fragment_begin>',
          chunk,
        );
      };
      material.customProgramCacheKey = () => `${key}|zero-direct-light-v1`;
      material.needsUpdate = true;
    }
  });
}
