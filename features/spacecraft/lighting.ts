import type * as Three from 'three';
import { directLightWorkChunk } from './materials/direct-light-work.ts';
import {
  DEFAULT_ROOM_LIGHTING,
  type RenderingSettings,
} from './rendering-settings.ts';

// Bright exterior sunlight is attenuated on interior materials. Broad warm
// fixtures and room-local diffuse fill give every cabin the same authored profile.
export const VESSEL_LIGHTING = {
  sunIntensity: 3.2,
  cabinIntensity: 18,
  ladderIntensity: 4.375,
  environmentIntensity: 0.1,
  contactStrength: 0.5,
};

export function roomLightColor(T: typeof Three, warmth: number) {
  return new T.Color(0xfff4e5).lerp(new T.Color(0xffb85f), warmth);
}

/** One aimed, warm lamp per cabin: a single shadow view, with a feathered beam. */
export function createCabinLight(T: typeof Three, section: string) {
  const light = new T.SpotLight(
    roomLightColor(T, DEFAULT_ROOM_LIGHTING.roomWarmth),
    VESSEL_LIGHTING.cabinIntensity,
    7,
    T.MathUtils.degToRad(DEFAULT_ROOM_LIGHTING.roomSpread),
    0.55,
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

/** Broad beams from the existing guarded diffusers reveal the rungs and returns. */
export function createLadderLight(T: typeof Three, index: number) {
  const light = createCabinLight(T, 'walkway');
  light.name = `ladder-worklight-${index + 1}`;
  light.intensity = VESSEL_LIGHTING.ladderIntensity;
  light.angle = Math.PI * 0.4;
  light.penumbra = 0.55;
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
  const linked =
    source.slice(0, spotStart) +
    (emitterCount
      ? spot
          .replace(assignment, `${assignment}\nif (${membership}) {`)
          .replace(direct, `${direct}\n}`)
      : '') +
    source.slice(spotEnd);
  if (!emitterCount) return linked;
  const sun = 'getDirectionalLightInfo( directionalLight, directLight );';
  const ambient =
    'vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );';
  if (!linked.includes(sun) || !linked.includes(ambient))
    throw new Error('Review cabin lighting for this Three shader version');
  return linked
    .replace(sun, `${sun}\n directLight.color *= cabinSunlight;`)
    .replace(ambient, `${ambient}\n irradiance += cabinFill;`);
}

export function applyCabinLighting(T: typeof Three, root: Three.Object3D) {
  const lamps = new Map<
    string,
    { light: Three.SpotLight; position: Three.Vector3 }[]
  >();
  root.traverse((object) => {
    if ((object as Three.SpotLight).isSpotLight) {
      const room = lamps.get(object.userData.section) ?? [];
      room.push({
        light: object as Three.SpotLight,
        position: new T.Vector3(),
      });
      lamps.set(object.userData.section, room);
    }
  });
  const allLamps = [...lamps.values()].flat();
  const sunlight = { value: DEFAULT_ROOM_LIGHTING.exteriorSpill };
  const fillColor = roomLightColor(T, DEFAULT_ROOM_LIGHTING.roomWarmth);
  const roomFill = {
    value: fillColor
      .clone()
      .multiplyScalar(Math.PI * DEFAULT_ROOM_LIGHTING.roomFill),
  };
  const ladderFill = { value: roomFill.value.clone() };
  const sharedFill = { value: roomFill.value.clone() };
  const applied = new Map<Three.Material, Three.SpotLight[]>();
  // Preserve authored caster/receiver flags, including iris masks and glass.
  root.traverse((object) => {
    const mesh = object as Three.Mesh;
    if (!mesh.isMesh) return;
    for (const material of [mesh.material].flat()) {
      const standard = material as Three.MeshPhysicalMaterial;
      if (!standard.isMeshStandardMaterial || applied.has(material)) continue;
      const section = material.userData.section ?? object.userData.section;
      const linked = (material.userData.linkedRooms ?? [section]) as string[];
      const admitted = material.userData.exterior
        ? []
        : [...new Set(linked)].flatMap((room) => lamps.get(room) ?? []);
      applied.set(
        material,
        admitted.map(({ light }) => light),
      );
      const emitters = admitted.map(({ position }) => position);
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
          shader.uniforms.cabinSunlight = sunlight;
          // Shared hatch faces receive one fill contribution, never one per lamp.
          const hasRoom = admitted.some(
            ({ light }) => light.userData.section !== 'walkway',
          );
          const hasLadder = admitted.some(
            ({ light }) => light.userData.section === 'walkway',
          );
          shader.uniforms.cabinFill =
            hasRoom && hasLadder ? sharedFill : hasRoom ? roomFill : ladderFill;
          shader.fragmentShader =
            `uniform vec3 cabinEmitterPositions[${emitters.length}];\nuniform float cabinSunlight;\nuniform vec3 cabinFill;\n` +
            shader.fragmentShader;
        }
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <lights_fragment_begin>',
          chunk,
        );
      };
      material.customProgramCacheKey = () =>
        `${cacheKey}|cabin-lighting-v4:${exterior ? 'exterior' : emitters.length}`;
    }
  });
  return {
    lights: allLamps.map(({ light }) => light),
    setAppearance(
      settings: Pick<
        RenderingSettings,
        | 'roomLight'
        | 'ladderLight'
        | 'roomWarmth'
        | 'roomSpread'
        | 'roomFill'
        | 'exteriorSpill'
      >,
    ) {
      const color = roomLightColor(T, settings.roomWarmth);
      for (const { light } of allLamps) {
        light.color.copy(color);
        if (light.userData.section !== 'walkway')
          light.angle = T.MathUtils.degToRad(settings.roomSpread);
      }
      roomFill.value
        .copy(color)
        .multiplyScalar(Math.PI * settings.roomFill * settings.roomLight);
      ladderFill.value
        .copy(color)
        .multiplyScalar(Math.PI * settings.roomFill * settings.ladderLight);
      sharedFill.value
        .copy(color)
        .multiplyScalar(
          Math.PI *
            settings.roomFill *
            Math.max(settings.roomLight, settings.ladderLight),
        );
      sunlight.value = settings.exteriorSpill;
      // Uniform-only changes must recapture color while preserving valid depth/AO.
      root.userData.lightingColorSignature = [
        settings.roomLight,
        settings.ladderLight,
        settings.roomWarmth,
        settings.roomFill,
        settings.exteriorSpill,
      ].join(':');
    },
    shadowReceivers(this: void) {
      const receivers = new Map(
        allLamps.map(({ light }) => [light, new Set<Three.Mesh>()]),
      );
      // Use the exact material membership compiled above, including shared
      // materials and hatch faces. Include hidden/offscreen receivers so camera
      // movement never reveals a region excluded from shadow invalidation.
      root.traverse((object) => {
        const mesh = object as Three.Mesh;
        if (!mesh.isMesh || !mesh.receiveShadow) return;
        for (const material of [mesh.material].flat()) {
          if (!(material as Three.MeshStandardMaterial).isMeshStandardMaterial)
            continue;
          // New, unlinked standard materials still use Three's full light loop.
          for (const light of applied.get(material) ?? receivers.keys())
            receivers.get(light)!.add(mesh);
        }
      });
      return receivers;
    },
    update(camera: Three.Camera) {
      for (const { light, position } of allLamps)
        position
          .setFromMatrixPosition(light.matrixWorld)
          .applyMatrix4(camera.matrixWorldInverse);
    },
  };
}
