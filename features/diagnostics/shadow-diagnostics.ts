import type { WebGLRenderer } from 'three';
import type {
  ScenePerformance,
  SceneRenderCounts,
} from './scene-performance.ts';

type ShadowRenderer = Pick<WebGLRenderer, 'shadowMap'> & {
  info?: { render: SceneRenderCounts };
};

/** Observe Three's existing shadow-generation call only while diagnostics are
 * mounted. Its CPU duration and draws are a subset of the enclosing spacecraft
 * pass, not another additive phase. No nested GPU timer is started here.
 *
 * The delivered scene has one shadow map generation per frame. getReasons is
 * called only after a successful generation, allowing pending reasons to survive
 * disabled shadows, background renders without lights, or an interrupted draw.
 */
export function instrumentShadowUpdates(
  renderer: ShadowRenderer,
  getCollector: () => Pick<ScenePerformance, 'count' | 'annotate'> | null,
  getReasons: () => string[],
  options: { now?: () => number } = {},
): () => void {
  const now = options.now ?? (() => performance.now());
  const shadowMap = renderer.shadowMap;
  // oxlint-disable-next-line typescript/unbound-method -- Preserve method identity for cleanup; every invocation below explicitly forwards this.
  const original = shadowMap.render;
  function instrumented(
    this: typeof shadowMap,
    ...args: Parameters<typeof original>
  ) {
    const collector = getCollector();
    const eligible =
      collector &&
      shadowMap.enabled !== false &&
      (shadowMap.autoUpdate !== false || shadowMap.needsUpdate !== false)
        ? args[0].filter((light) => {
            const shadow = (
              light as typeof light & {
                shadow?: { autoUpdate: boolean; needsUpdate: boolean };
              }
            ).shadow;
            return (
              shadow &&
              (shadow.autoUpdate !== false || shadow.needsUpdate !== false)
            );
          })
        : [];
    if (!eligible.length) return original.apply(this, args);

    const before = renderer.info ? { ...renderer.info.render } : null;
    const start = now();
    const result = original.apply(this, args);
    const duration = Math.max(0, now() - start);
    const after = renderer.info?.render;
    const counts =
      before && after
        ? Object.fromEntries(
            (['calls', 'triangles', 'points', 'lines'] as const).map((key) => [
              key,
              Math.max(0, after[key] - before[key]),
            ]),
          )
        : null;
    collector!.count('shadow-refresh');
    collector!.annotate({
      shadowGenerationCpuMs: duration,
      shadowGenerationCounts: counts,
      shadowMapsGenerated: eligible.length,
      shadowReasons: getReasons(),
    });
    return result;
  }
  shadowMap.render = instrumented;
  return () => {
    // Do not undo a later owner's wrapper if cleanup ordering ever changes.
    if (shadowMap.render === instrumented) shadowMap.render = original;
  };
}
