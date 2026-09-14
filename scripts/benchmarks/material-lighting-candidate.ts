import type { Color } from 'three';

export type RoomLightingMaterial = {
  color: Color;
  emissive: Color;
  emissiveIntensity: number;
  userData: {
    exterior?: boolean;
    linkedRooms?: string[];
    baseColor: Color;
    baseEmissive: Color;
    baseIntensity: number;
    surfaceOnly?: boolean;
  };
};

/** Unactivated benchmark candidate: timing evidence was inconclusive.
 * Derive the same room lighting every frame, including externally changed
 * inputs and colors. Settled colors avoid redundant assignments; no dimmer or
 * highlight animation is cached, and no material mutation can become stale. */
export function updateRoomMaterialLighting(
  materials: RoomLightingMaterial[],
  level: number,
  roomDimmers: Record<string, number>,
) {
  for (const material of materials) {
    const data = material.userData;
    let materialLevel = level;
    if (data.exterior) materialLevel = 1;
    else if (data.linkedRooms) {
      materialLevel = -Infinity;
      for (const room of data.linkedRooms)
        materialLevel = Math.max(materialLevel, roomDimmers[room] ?? 0.5);
    }
    const emission = data.surfaceOnly ? 0 : data.baseIntensity * materialLevel;
    const color = material.color,
      base = data.baseColor;
    const red = base.r * materialLevel,
      green = base.g * materialLevel,
      blue = base.b * materialLevel;
    if (!Object.is(color.r, red)) color.r = red;
    if (!Object.is(color.g, green)) color.g = green;
    if (!Object.is(color.b, blue)) color.b = blue;
    const emissive = material.emissive,
      source = data.baseEmissive;
    const emittedRed = source.r * emission,
      emittedGreen = source.g * emission,
      emittedBlue = source.b * emission;
    if (!Object.is(emissive.r, emittedRed)) emissive.r = emittedRed;
    if (!Object.is(emissive.g, emittedGreen)) emissive.g = emittedGreen;
    if (!Object.is(emissive.b, emittedBlue)) emissive.b = emittedBlue;
    if (material.emissiveIntensity !== 1) material.emissiveIntensity = 1;
  }
}
