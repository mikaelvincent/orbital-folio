// One opt-in chunk for scene inspection; ordinary rendering needs none of it.
export { createScenePerformance } from './scene-performance';
export { createSpacecraftPerformance } from './spacecraft-performance';
export { instrumentShadowUpdates } from './shadow-diagnostics';
export { mountPerformancePanel } from './performance-panel';
