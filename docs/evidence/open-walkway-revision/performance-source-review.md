# Production performance source audit

No source evidence establishes why the observed production sample is ~50/66.7 ms while an earlier development sample was ~16.7/33.4 ms. The current code does not select a more expensive production renderer tier; actual viewport, drawing buffer, capability detection, route/hover state, cache activity and host load must be held fixed. No browser/GPU benchmark was run in this read-only subtask.

## Controls that answer useful questions

1. **Independent native RAF while reduced motion is settled.** `pause(true)` collapses a flight, renders, then stops the application RAF when `travelling=false`. Its existing `frameP50`/`frameP95` remain historical, so those fields cannot measure the paused control. An independent native RAF collector must collect fresh timestamps with the document visible, same viewport and foreground state. If that is also slow, the scene alone cannot explain the cadence. If it is fast while active rendering is slow, rendering/compositing load is implicated, without yet proving which pass or GPU stage.
2. **Fresh settled sample, same route/camera and pointer.** The rolling 360-frame array is not cleared on navigation, pause/resume or resize. At 50 ms/frame, old startup/route samples take 18 seconds to leave the window; at 66.7 ms they take 24 seconds. Use independent sampling or an explicit development reset, after `travelling=false` and camera/hover velocities settle. Record drawingBuffer, DPR, contactShading, renderCalls, triangles and camera pose with the sample.
3. **Check whether ambient occlusion is cached.** A GTAO refresh draws the scene into normals/depth, then two fullscreen passes. Cached frames only apply the one-texture AO composite. The existing `renderCalls` therefore distinguishes an expensive AO refresh from idle reasonably well, though a 5 Hz snapshot can miss brief spikes. A development counter of AO refreshes/reasons would be the smallest diagnostic addition if needed.
4. **One-factor A/B/A only after a stable baseline.** The existing development shadow toggle disables shadow sampling and visual shadows, while generation is already cached. Warm each variant, keep the same drawing buffer, then return to A. Do not interpret one fast B sample against an earlier slow A as causal. If another development control is justified, skipping the GTAO refresh/composite is more targeted than changing the whole scene; changing visible point-light count is a separate control and requires shader recompilation/warmup.

`renderCpuMs` times JS dispatch and preparation before the metrics block; it does not include later dataset writes, browser style/layout/compositing or asynchronous GPU completion. It is not total frame CPU time or GPU time.

## Concrete source findings

- Shadows are already cached: `shadowMap.autoUpdate=false`; moving assemblies do not cast into the cached map. Static shadow generation is not repeated during idle by design.
- GTAO is already cached based on dirty state, geometry motion, camera transform and roll. Model portal/door hover flags snap to their goal; the independent model audit observes the last geometry-motion flag at frame 27 and `false` thereafter (0.47 s at 60 Hz). No stuck model flag was found. Camera thresholds are fine-grained (0.0001 world-unit position / 0.00001-radian quaternion angle), so small ongoing pointer movement can legitimately regenerate AO.
- The AO buffer is 0.65 of each CSS dimension: 936×650 at 1440×1000, or 608,400 pixels. It uses 32 GTAO samples and 32 denoise samples when refreshed; it is not recomputed over the Earth background.
- The actual model has **10 non-shadow point lights**, two per cabin plus two in the walkway, at finite radii 3.1/2.9. Dimmed intensity is 0.06, not a disabled light. Three r185 adds all visible lights to the scene light list; its point-light fragment loop calls the PBR direct-light function even when distance attenuation produces exactly zero radiance. This is a concrete possible fragment cost, not a measured bottleneck.
- Scene inventory: 379 nodes, 275 mesh objects, 107 unique materials, 17 instanced objects, approximately 491,712 triangle instances among `traverseVisible` objects. This is not the actual rendered triangle/draw count: material visibility, frustum culling and occlusion affect that.
- The model hierarchy is walked three times on a normal frame: `model.update()` forces 379 visits; the draw function forces another 379 after reader scaling; WebGLRenderer’s automatic scene update walks 380. Consolidating these is a quality-preserving CPU cleanup candidate, provided reader matrices are current before CSS3D decomposition and static lights are initialized. **Do not expect it to explain the measured 50 ms**: this Node audit measures the entire model update at roughly 0.032 ms median.
- The main production diagnostic JSON fields total about 6.2 KB per refresh, with roughly 0.008 ms serialization median in Node. Moving static metadata updates to layout/content changes would reduce DOM churn, but these results do not establish a meaningful CPU bottleneck; DOM mutation cost was not measured.
- The environment remains six draws normally/eight with meteors, with eight desktop cloud field samples per covered cloud fragment. It has no image fetch or per-frame texture upload. Lowering cloud fidelity without a controlled pass isolation would be speculative.

## Small optimization experiments, in priority order

1. **Only if refresh counters show excess GTAO:** distinguish actual geometric animation from color-only portal highlight changes. `portal.strength` currently marks `motionActive` despite only changing emissive intensity. Removing that color-only invalidation preserves AO geometry, although camera passage peeking may still invalidate AO concurrently. This affects transitions, not the settled idle case.
2. **Only if GPU controls implicate PBR fragment work:** the previously prepared `/tmp/orbital-lighting-algebra.ts` supports a guarded r185-only exact-zero point-light BRDF skip. Test with `sharedPcfRotation:false, skipZeroPointLights:true` so there is one factor. It changes no nonzero light contribution or sampling quality; it adds shader-hook maintenance and is not guaranteed to improve compiled GPU code. It remains an optional experiment, not a recommendation to ship an unmeasured hook.
3. **CPU cleanup only:** consolidate duplicate matrix walks and update static DOM diagnostics only when their values change. They have concrete redundant work, but the measured isolated CPU costs are too small to justify prioritizing them over the native RAF/pass controls.

Avoid scene redesign, asset-resolution cuts, blanket point-light removal, or a claimed shadow bottleneck without matching controls. Reducing light count changes illumination and can introduce first-use shader compilation; treating intensity zero as removal does not remove the current PBR loop.

## Evidence

- `/tmp/audit-production-scene-cost.mjs` imports the current checkout model and Three sources, produces actual scene inventory/settling/matrix-visit/serialization measurements, and records source hashes.
- `/tmp/production-scene-cost-audit.json` is the numeric report.
- Relevant source: `components/spacecraft.tsx` renderer/GTAO setup, render sequence and metrics; `components/spacecraft-model.ts` light construction and `update`; Three `GTAOPass.js`, `WebGLRenderer.js`, `lights_fragment_begin.glsl.js` and `lights_pars_begin.glsl.js`.

No checkout edits, UI changes, browser automation, or dependencies were installed.
