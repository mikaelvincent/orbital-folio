import type { MeshStandardMaterial } from 'three';

export type HardwareFinish = 'alloy' | 'bronze';

const profiles = {
  alloy: { roughness: 0.46, metalness: 0.6, envMapIntensity: 0.35 },
  bronze: { roughness: 0.46, metalness: 0.2, envMapIntensity: 0.35 },
} as const;

/** Apply a shared physical finish without changing paint, emission or feedback. */
export function applyHardwareFinish<T extends MeshStandardMaterial>(
  material: T,
  finish: HardwareFinish,
): T {
  const profile = profiles[finish];
  material.roughness = profile.roughness;
  material.metalness = profile.metalness;
  material.envMapIntensity = profile.envMapIntensity;
  material.userData.hardwareFinish = finish;
  return material;
}
