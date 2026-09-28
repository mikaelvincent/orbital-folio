import type * as Three from 'three';
import { directLightWorkChunk } from './materials/direct-light-work.ts';

// Cabin fixtures supply the key light. A faint cool exterior wash and restrained
// reflected fill keep the hull and unlit sides legible without flattening the rooms.
export const VESSEL_LIGHTING = {
  sunIntensity: 0.32,
  cabinIntensity: 11,
  environmentIntensity: 0.1,
  contactStrength: 0.5,
};

/** One aimed, warm lamp per cabin: a single shadow view, with a feathered beam. */
export function createCabinLight(T: typeof Three, section: string) {
  const light = new T.SpotLight(
    0xffe6c6,
    VESSEL_LIGHTING.cabinIntensity,
    7,
    Math.PI * 0.3,
    0.48,
    2,
  );
  light.name = `${section}-cabin-lamp`;
  light.userData.section = section;
  light.castShadow = true;
  light.shadow.camera.near = 0.05;
  light.shadow.camera.far = 7;
  light.shadow.normalBias = 0.012;
  light.shadow.bias = -0.00015;
  return light;
}

export function createExteriorLight(T: typeof Three) {
  const light = new T.DirectionalLight(0xddeaff, VESSEL_LIGHTING.sunIntensity);
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

/** Link fixture illumination and its shadow together. Match positions rather than
 * renderer indices, which change when lights are reordered or hidden. Keep the
 * installed Three spot/shadow code intact inside the membership branch. */
export function cabinLightingChunk(source: string, emitterCount: number) {
  const spotStart = source.indexOf('#if ( NUM_SPOT_LIGHTS > 0 )');
  const spotEnd = source.indexOf('#if ( NUM_DIR_LIGHTS > 0 )', spotStart);
  const assignment = 'spotLight = spotLights[ i ];';
  const direct =
    'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
  const spot = source.slice(spotStart, spotEnd);
  if (
    spotStart < 0 ||
    spotEnd < 0 ||
    !spot.includes(assignment) ||
    !spot.includes(direct)
  )
    throw new Error('Review cabin lighting for this Three shader version');
  const membership = Array.from(
    { length: emitterCount },
    (_, i) =>
      `distance(spotLight.position, cabinEmitterPositions[${i}]) < 0.001`,
  ).join(' || ');
  return (
    source.slice(0, spotStart) +
    (emitterCount
      ? spot
          .replace(assignment, `${assignment}\nif (${membership}) {`)
          .replace(direct, `${direct}\n}`)
      : '') +
    source.slice(spotEnd)
  );
}

export function applyCabinLighting(T: typeof Three, root: Three.Object3D) {
  const lamps = new Map<
    string,
    { light: Three.SpotLight; position: Three.Vector3 }
  >();
  root.traverse((object) => {
    if ((object as Three.SpotLight).isSpotLight)
      lamps.set(object.userData.section, {
        light: object as Three.SpotLight,
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
            lamps.has(room) ? [lamps.get(room)!.position] : [],
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
        `${cacheKey}|cabin-lighting-v3:${exterior ? 'exterior' : emitters.length}`;
    }
  });
  return {
    lights: [...lamps.values()].map(({ light }) => light),
    update(camera: Three.Camera) {
      for (const { light, position } of lamps.values())
        position
          .setFromMatrixPosition(light.matrixWorld)
          .applyMatrix4(camera.matrixWorldInverse);
    },
  };
}
