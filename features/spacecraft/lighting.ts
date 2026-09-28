import type * as Three from 'three';
import { directLightWorkChunk } from './materials/direct-light-work.ts';

// Art-directed cutaway: a dominant angled sun draws broad cast shadows;
// ceiling and reflected fill keep their dark sides readable without flattening them.
export const VESSEL_LIGHTING = {
  sunIntensity: 3.2,
  cabinIntensity: 3,
  environmentIntensity: 0.14,
  contactStrength: 0.5,
};

/** One broad source represents the paired ceiling diffusers. */
export function createCabinLight(T: typeof Three, section: string) {
  const light = new T.RectAreaLight(
    0xfff1e2,
    VESSEL_LIGHTING.cabinIntensity,
    2.15,
    0.32,
  );
  light.name = `${section}-ceiling-light`;
  light.userData.section = section;
  light.rotation.x = -Math.PI / 2;
  return light;
}

export function createExteriorLight(T: typeof Three) {
  const light = new T.DirectionalLight(0xfff2df, VESSEL_LIGHTING.sunIntensity);
  light.name = 'exterior-sun';
  light.position.set(-7, 9, 12);
  light.castShadow = VESSEL_LIGHTING.sunIntensity > 0;
  Object.assign(light.shadow.camera, {
    left: -10,
    right: 10,
    top: 7,
    bottom: -7,
    near: 0.5,
    far: 36,
  });
  light.shadow.normalBias = 0.025;
  light.shadow.bias = -0.00008;
  return light;
}

/** Link only the ceiling fill. The sun and its shadows reach all surfaces.
 * Match emitter positions, not renderer array indices: hiding or reordering a
 * light must never illuminate a different cabin. Shared doors admit both sides. */
export function cabinLightingChunk(source: string, emitterCount: number) {
  const areaStart = source.indexOf('#if ( NUM_RECT_AREA_LIGHTS > 0 )');
  const areaEnd = source.indexOf(
    '#if defined( RE_IndirectDiffuse )',
    areaStart,
  );
  if (areaStart < 0 || areaEnd < 0)
    throw new Error('Review cabin lighting for this Three shader version');
  const membership = Array.from(
    { length: emitterCount },
    (_, i) =>
      `distance(rectAreaLight.position, cabinEmitterPositions[${i}]) < 0.001`,
  ).join(' || ');
  const chunk =
    source.slice(0, areaStart) +
    (!emitterCount
      ? ''
      : `
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
  RectAreaLight rectAreaLight;
  #pragma unroll_loop_start
  for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
    rectAreaLight = rectAreaLights[ i ];
    if (${membership}) {
      RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    }
  }
  #pragma unroll_loop_end
#endif
`) +
    source.slice(areaEnd);
  return chunk;
}

export function applyCabinLighting(T: typeof Three, root: Three.Object3D) {
  const areas = new Map<
    string,
    { light: Three.RectAreaLight; position: Three.Vector3 }
  >();
  root.traverse((object) => {
    if ((object as Three.RectAreaLight).isRectAreaLight)
      areas.set(object.userData.section, {
        light: object as Three.RectAreaLight,
        position: new T.Vector3(),
      });
  });
  const applied = new Set<Three.Material>();
  // Preserve authored caster/receiver flags, including iris masks and glass.
  root.traverse((object) => {
    const mesh = object as Three.Mesh;
    if (!mesh.isMesh) return;
    for (const material of [mesh.material].flat()) {
      const standard = material as Three.MeshPhysicalMaterial;
      if (!standard.isMeshStandardMaterial || applied.has(material)) continue;
      applied.add(material);
      const section = material.userData.section ?? object.userData.section;
      const linked = (material.userData.linkedRooms ?? [section]) as string[];
      const emitters = material.userData.exterior
        ? []
        : [...new Set(linked)].flatMap((room) =>
            areas.has(room) ? [areas.get(room)!.position] : [],
          );
      const exterior = !!material.userData.exterior || !emitters.length;
      const source = T.ShaderChunk.lights_fragment_begin;
      const chunk = cabinLightingChunk(
        standard.isMeshPhysicalMaterial ? source : directLightWorkChunk(source),
        emitters.length,
      );
      const compile = material.onBeforeCompile.bind(material);
      const cacheKey = material.customProgramCacheKey();
      material.onBeforeCompile = (shader, renderer) => {
        compile(shader, renderer);
        if (emitters.length) {
          shader.uniforms.cabinEmitterPositions = { value: emitters };
          shader.fragmentShader =
            `uniform vec3 cabinEmitterPositions[${emitters.length}];\n` +
            shader.fragmentShader;
        }
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <lights_fragment_begin>',
          chunk,
        );
      };
      material.customProgramCacheKey = () =>
        `${cacheKey}|cabin-lighting-v2:${exterior ? 'exterior' : emitters.length}`;
    }
  });
  return {
    update(camera: Three.Camera) {
      for (const { light, position } of areas.values())
        position
          .setFromMatrixPosition(light.matrixWorld)
          .applyMatrix4(camera.matrixWorldInverse);
    },
  };
}
