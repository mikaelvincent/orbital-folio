# Measuring spacecraft performance

Open `http://localhost:3000/?perf=1` (or append `?perf=1` to a room URL). This opens the repository's reusable **Scene diagnostics** panel. It also works in a production build. Normal visits do not instantiate the collector, request GPU queries, mount the panel, or start diagnostic timers. No measurements are sent to a server or stored in browser storage.

## Repeatable comparisons

1. Use one browser tab, a fixed window size, and the same browser/power settings. Keep other rendering tabs and heavy applications closed. Start with **Normal rendering** and wait for the room or overview to settle.
2. Name a capture, press **Record 10 seconds**, then collapse the panel. The recorder gives three seconds of warmup and then collects for ten seconds. Keep the pointer still for an idle comparison. For a navigation comparison, use the same route each time.
3. Change one diagnostic, record again, then restore **Normal rendering** and repeat the baseline. Repeat promising comparisons; a single A/B run is vulnerable to shader warmup, browser scheduling and changing device temperature.
4. Press **Download JSON** for the complete report with raw frames, or **View JSON** for a smaller, copyable summary. Up to six captures remain in the current page; export before reloading. Exports include settings, timing distributions, activity/context, pass counters and a scene inventory. Attach reports to future optimization work and retain a before/after pair with the change.
5. Repeat in Safari and a production build before making release decisions. Development tools and another browser's graphics backend can change results. The browser cannot establish temperature, power draw or thermal throttling from these timings.

Resize, scene visibility changes, context loss, or a changed experiment invalidate an in-progress capture. Navigation is allowed and each frame records its room/activity. The collector retains at most 1,800 frames (enough for ten seconds at 120 Hz); exported `window.durationMs` shows the actual retained interval. Extremely high refresh rates may shorten that rolling interval.

## What each diagnostic isolates

| Mode | Temporary change | Interpretation |
| --- | --- | --- |
| Normal rendering | Existing visual quality and continuous animation | Baseline; no optimization is applied |
| Skip background | Skip Earth/space update and draw; retain clearing | Tests background/shader workload |
| Skip contact shading | Skip GTAO refresh and its composite | Tests ambient-occlusion workload; shadows remain |
| Half drawing resolution | Halve each main drawing-buffer dimension, quartering its pixel count | Tests pixel cost; CSS text and the CSS-sized AO buffer retain their resolution |
| Skip spacecraft rendering | Skip spacecraft draw and AO, retain model updates and HTML | Separates spacecraft rendering from its CPU simulation |
| Render one frame, then pause | Stop automatic frame scheduling | Control for sustained redraw; navigation/input can still request individual frames |

Changes are confined to the diagnostic session. Restore normal before judging the design. Reload resets the mode; remove `perf=1` and reload to remove the instrumentation entirely.

## Reading the metrics

- **Rendered FPS / frame interval:** actual application render cadence, with median, p95 and maximum in the export. A steady 60 FPS can still represent sustained GPU load. A paused or empty window has no fabricated FPS value.
- **CPU:** elapsed time inside the render callback, including scene preparation and WebGL command submission. The phases cover navigation, pointer feedback, camera positioning, model update, matrices, callouts, HTML synchronization, background update, individual render passes, CSS3D and the existing metadata publication. Phase totals partition the callback. The panel ranks *amortized milliseconds per rendered frame*, so an infrequent AO refresh does not outrank continuous work merely because one refresh is expensive. Per-execution p95 and sample counts remain visible.
- **GPU:** asynchronous elapsed queries for background, spacecraft, AO refresh and AO composite. They sample once every 15 frames. Unsupported, unavailable and disjoint results are explicitly identified; CPU submission time is never substituted for GPU time. Timings are per sampled execution, not averaged over frames where a pass did not run. CPU and GPU overlap: **do not add their times**. Driver scheduling and query boundaries can perturb a tiled GPU, so corroborate rankings using the isolation modes.
- **Draw workload:** actual `renderer.info` deltas per pass: draw calls, triangles, points and lines. The spacecraft pass includes any requested shadow-map refresh. A separate counter identifies those frames. Geometry inventory includes hidden layout variants and is not a substitute for these rendered counts.
- **AO refresh counters:** dirty state, camera position/angle, geometry motion/settling and roll. Reasons can overlap, so their sum is not the number of refreshes. `ao-refresh / (ao-refresh + ao-cached)` is the observed refresh fraction for frames where AO is enabled.
- **Resources/settings:** browser/build/Three version, viewport, drawing buffer, pixel ratio, camera pose, AO settings, shadow size, geometry/texture/program counts and largest mesh inventories. Geometry attribute bytes describe CPU-side arrays, not total GPU memory.

Browser layout, compositing, other pages, operating-system work and most input-event work outside the render callback are outside CPU phase totals. Small timings are limited by browser timer resolution. Instrumentation adds overhead: GPU queries are sampled and bounded, the panel refreshes once per second, and collapsing it stops live aggregation/table updates while recording continues.

## Initial optimization candidates from source inspection

These are hypotheses until matched captures support them:

1. **Continuous full-scene redraw at rest.** The animated environment keeps the normal loop active. Investigate a frame-rate budget or separate/static rendering when the cabin settles; retain current camera, door and reduced-motion behavior.
2. **Spacecraft rendering.** Detailed meshes, materials and lights remain submitted in a room view. Use actual per-pass triangle/draw counts before selecting geometry simplification, visibility/culling or material batching work.
3. **Background pixel shading.** Earth/cloud/atmosphere layers and the procedural cloud shader run across their covered pixels. Compare the background and resolution controls before reducing visual fidelity.
4. **AO refresh and composite.** AO is already cached at rest. Measure refresh frequency while hovering/navigating and the cost of applying the cached result; don't assume the whole effect is recomputed every idle frame.
5. **Repeated CPU/DOM work.** Model/material updates, repeated matrix traversal and callout/metadata publication run repeatedly. Their individual timings determine whether they deserve priority over GPU work.

## Implementation and validation

`components/spacecraft.tsx` supplies stage boundaries, cumulative render counters, AO invalidation reasons and temporary controls. `lib/scene-performance.ts` owns bounded samples, phase statistics, GPU query lifetimes and reset/disposal. `components/performance-panel.ts` owns recording, comparison controls and downloads. `tests/scene-performance.test.mjs` covers timing partitions, percentiles, counters, sample bounds, per-frame context, asynchronous query reads, disjoint results, reset and cleanup.

The GPU query implementation follows the [Khronos WebGL timer-query specification](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/): query results are read only after availability and after a later frame, with disjoint results discarded. The existing renderer has `info.autoReset=false`; counters are explicitly reset before each complete frame.

Validation: eight collector tests and 37 existing feedback/door/navigation tests passed, along with type checking, lint, formatting and the production build. Browser checks covered recording/export summaries, invalidation on resize, render-once pause, room navigation with the panel retained, and absence of the panel on a normal visit. A [panel screenshot](evidence/performance/diagnostics-panel.png) records the tested interface.

## First M4 comparison — 2026-09-13

Local Apple M4, 16 GiB RAM; Chromium 152 in-app browser; development build; overview at 794×827 CSS pixels. Each capture used three seconds of warmup, ten seconds of measurement, no pointer motion, and a collapsed diagnostics panel. The camera and per-frame context remained identical in all three captures. This is an instrumented browser comparison, **not a Safari, production, battery, temperature, or power measurement**.

| Capture | Drawing buffer | Rendered FPS | Mean callback ms | Spacecraft draws / triangles per frame |
| --- | --- | ---: | ---: | ---: |
| Normal A | 1588×1654 | 47.96 | 11.24 | 466 / 886,144 |
| Half drawing resolution | 794×827 | 60.00 | 4.32 | 466 / 886,144 |
| Normal B | 1588×1654 | 54.38 | 4.86 | 466 / 886,144 |

The improvement with one-quarter of the drawing pixels supports pixel-rendering cost as a candidate; geometry count stayed constant. Baseline CPU/frame-rate variation is substantial, so these figures do not establish exact savings or a single thermal cause. All idle frames in these captures reused cached AO (zero AO refreshes). The cached AO composite still rendered. Do not prioritize repeated AO calculation as the idle bottleneck based on these captures.

First priorities to investigate: a sustained rendering budget when idle; main-pass pixel cost; then spacecraft draw/material/visibility work. Follow with controlled background/AO comparisons and repeat navigation/hover captures. Preserve the visual design until an optimization demonstrates benefit.

The [summary report](evidence/performance/m4-overview-captures.json) and [compressed report with raw frames](evidence/performance/m4-overview-captures.json.gz) are retained for future comparisons. GPU query timings are included but should be cross-checked against isolation modes because query boundaries and GPU scheduling can affect sampled elapsed times.
