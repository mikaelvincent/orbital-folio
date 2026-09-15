# Measuring spacecraft performance

See the [performance ledger](performance-ledger.md) for the current optimization status, repeatable geometry checks and measured before/after results.

Click the small **pulse icon** beside **SAMPLE / CONCEPT** and the Content studio icon in the top-right corner. It opens **Performance check** without reloading the page or resetting the camera. The optional `?perf=1` URL shortcut also works, including in a production build. Normal visits do not instantiate the collector, request GPU queries, mount the panel, or start diagnostic timers. No measurements are sent to a server or stored in browser storage.

The opening summary shows **Smoothness · FPS**, **CPU preparing · ms**, and **GPU drawing ship · ms**. These describe the page's work, not a device rating. The workflow is the same on every machine. When Safari or another browser does not expose usable GPU timing, that value stays unavailable; CPU, frame timing, draw counts and comparisons remain usable. Missing GPU timing never means zero GPU work.

See the [performance optimization review](performance-optimization-review.md) for the current investigation and optimization evidence. The dated measurements later in this document are historical records, not current benchmarks.

## Repeatable comparisons

1. Use one browser tab, a fixed window size, and the same browser/power settings. Keep other rendering tabs and heavy applications closed. Wait for the room or overview to settle.
2. Under **Record the normal scene**, choose a **Capture length** of **10**, **30**, or **60 seconds**, then press **Record baseline**. This restores normal rendering and all spacecraft groups. After a three-second warmup, recording begins. The panel collapses automatically to avoid live table work, while a visible progress strip and **Stop** control remain available. It reopens when recording finishes. Longer captures help reveal timing changes during a sustained run; they do not identify a thermal cause.
3. Under **Compare one change**, choose an experiment and press **Record this change**. **Hide one room or part** also exposes **Group to compare**. The guided controls apply one change to the normal scene; **Use my Advanced settings** records the current manual configuration. Keep the same capture length and pointer position. For a navigation test, repeat the same route and inspect the recorded activity.
4. Press **Record baseline again** to restore the normal scene and check the reference for drift. **Review the result** names the baseline, change and confirmation captures beside its assessment. If a newer standalone capture is not part of that pair, the panel explicitly labels the displayed comparison as earlier. Expand **Saved captures** to inspect FPS, frame p95, mean CPU time, spacecraft GPU mean/p95, retained duration, and first/last timing trends.
5. Use **Download report** for JSON with raw frames. **Advanced: parts, render settings and data** retains component rankings, manual isolation, rendering experiments, custom capture names, **Record current settings**, timing breakdowns and **View JSON** for a smaller copyable summary. Up to six captures remain in the session. Export before closing diagnostics or reloading: both discard the captures.
6. Repeat promising comparisons, including in Safari and a production build, before making release decisions. Browser backends, development tools, warmup and scheduling can change results. A single A/B run is not an optimization verdict, and these timings cannot establish temperature, power draw or thermal throttling.

Resize, scene visibility changes, context loss, or a changed experiment or spacecraft filter invalidate an in-progress capture. Navigation is allowed and each frame records its room/activity; movement is called out during review rather than silently treated as a still-view comparison.

Outside recording, retention is bounded to **1,800 scene frames** and **1,800 samples per spacecraft pass**. During recording, the limit becomes `captureSeconds × 240`: **2,400**, **7,200**, or **14,400**, respectively. After copying the completed report, or when recording is cancelled, retention returns to 1,800. The exported requested duration, actual duration and `report.window.durationMs` distinguish the recording length from the interval actually retained. Very high refresh rates or sparse rendering can still shorten the measured interval; review warns when it is substantially shorter. AO attribution is sampled only when that pass runs, so its per-pass window can differ from the main scene window.

Review checks viewport, camera, room, browser/build, display scaling, actual drawing buffer and pixel ratio, motion settings, and captured shading/shadow quality. Buffer changes are allowed only for the intended half-resolution comparison with the expected scaling; AO may turn off for the explicit no-AO/no-spacecraft controls. Confirmation must restore the full normal scene and its render settings. Different capture lengths, movement, empty or shortened windows, multiple simultaneous changes, and a drifting repeated baseline make a result inconclusive or a reason to repeat. GPU mean/p95 and early/late CPU/frame trends describe variability; they are not confidence estimates or evidence of thermal throttling.

## What each diagnostic isolates

| Mode | Temporary change | Interpretation |
| --- | --- | --- |
| Normal rendering | Existing visual quality and continuous animation | Baseline; no optimization is applied |
| Skip background | Skip Earth/space update and draw; retain clearing | Tests background/shader workload |
| Skip contact shading | Skip GTAO refresh and its composite | Tests ambient-occlusion workload; shadows remain |
| Half drawing resolution | Halve each main drawing-buffer dimension, quartering its pixel count | Tests pixel cost; CSS text and the CSS-sized AO buffer retain their resolution |
| Skip spacecraft rendering | Skip spacecraft draw and AO, retain model updates and HTML | Separates spacecraft rendering from its CPU simulation |
| Render one frame, then pause | Stop automatic frame scheduling | Control for sustained redraw; navigation/input can still request individual frames |

Changes are confined to the diagnostic session. Restore normal before judging the design. Closing diagnostics restores full rendering and removes the collectors and object callbacks. Export first: closing or reloading discards the session captures. Opening the panel again starts a fresh session.

## Pinpointing spacecraft parts

Open **Advanced: parts, render settings and data**, then **Which spacecraft parts create the most work?** The **Spacecraft workload** uses actual submitted draw counters, grouped by room and component. Choose **Rank by: Draw calls / Triangles** and the main or AO render pass. Zero-draw groups stay out of the ranking but remain available for isolation. Use these counts to locate geometry-heavy assemblies, then test the timing impact of hiding a group. Room totals and component totals are alternative views of the same draws; do not add them together.

1. Select the normal view, wait for it to settle and use **Record baseline**. The panel names the capture and collapses automatically; an optional custom name remains available under Advanced.
2. In the guided comparison, choose **Hide one room or part**, select its group, and use **Record this change**. Repeat at the same viewport/camera, then use **Record baseline again**.
3. Compare frame time, CPU and the spacecraft GPU pass across the named saved captures. Advanced **Show only selected group** is useful for inspecting a component, but **Hide selected group** is generally more representative of its contribution to the full scene.
4. Export the report so future changes can use the same named group and camera settings.

These controls affect rendering only. They preserve camera/navigation state and room/model updates. Hiding an object also changes occlusion, shadows and shading, so a timing difference is an experiment, not an additive invoice for that object's GPU time. Batched meshes remain batched; a combined draw cannot be honestly split into its original tiny props. The breakdown identifies semantic assemblies and retained batches without altering normal rendering to obtain nicer numbers.

The main spacecraft pass and AO refresh are separate. Shadow draws or fullscreen AO work that object callbacks cannot attribute remain explicitly unassigned; unavailable reconciliation is labelled as unavailable. Cached AO does not produce new geometry samples. No per-object GPU timers are inserted: hundreds of tiny queries would change the workload being measured.

## Reading the metrics

- **Smoothness · FPS / frame interval:** actual application render cadence, with median, p95 and maximum in the export. A steady 60 FPS can still represent sustained GPU load. A paused or empty window has no fabricated FPS value.
- **CPU:** elapsed time inside the render callback, including scene preparation and WebGL command submission. The phases cover navigation, pointer feedback, camera positioning, model update, matrices, callouts, HTML synchronization, background update, individual render passes, CSS3D and the existing metadata publication. Phase totals partition the callback. The panel ranks *amortized milliseconds per rendered frame*, so an infrequent AO refresh does not outrank continuous work merely because one refresh is expensive. Per-execution p95 and sample counts remain visible.
- **GPU:** asynchronous elapsed queries for background, spacecraft, AO refresh and AO composite. They sample once every 15 frames. Unsupported, unavailable and disjoint results are explicitly identified; CPU submission time is never substituted for GPU time. Timings are per sampled execution, not averaged over frames where a pass did not run. CPU and GPU overlap: **do not add their times**. Driver scheduling and query boundaries can perturb a tiled GPU, so corroborate rankings using the isolation modes.
- **Draw workload:** actual `renderer.info` deltas per pass: draw calls, triangles, points and lines. The spacecraft pass includes any requested shadow-map refresh. A separate counter identifies those frames. Geometry inventory includes hidden layout variants and is not a substitute for these rendered counts.
- **AO refresh counters:** dirty state, camera position/angle, geometry motion/settling and roll. Reasons can overlap, so their sum is not the number of refreshes. `ao-refresh / (ao-refresh + ao-cached)` is the observed refresh fraction for frames where AO is enabled.
- **Resources/settings:** browser/build/Three version, viewport, drawing buffer, pixel ratio, camera pose, AO settings, shadow size, geometry/texture/program counts and largest mesh inventories. Geometry attribute bytes describe CPU-side arrays, not total GPU memory.

Browser layout, compositing, other pages, operating-system work and most input-event work outside the render callback are outside CPU phase totals. Small timings are limited by browser timer resolution. Instrumentation adds overhead: GPU queries are sampled and bounded, the panel refreshes once per second, and collapsing it stops live aggregation/table updates while recording continues.

## Rested CPU candidate comparisons

Use `scripts/benchmark-controlled-performance.mjs` for repeatable **CPU-only** comparisons of four unactivated candidates: local-transform caching, room-material lighting updates (settled and changing), iris inverse caching (settled and moving), and exact vertex indexing. `--cases=all` runs these six scenarios. Steady cases reuse fixtures; indexing measures fresh model construction and reports compaction separately. This does not measure browser textures, GPU uploads, rendering, FPS, energy, or device temperature, and it never enables a candidate in the application.

Finish builds/tests first, blank rendering browser tabs, stop other heavy work, and keep the power source and Low Power Mode unchanged. On macOS, compile the native sampler **once before the recovery period**; do not interpret or compile Swift for every sample:

```sh
swiftc -O scripts/benchmarks/mac-thermal-snapshot.swift \
  -o /tmp/orbital-folio-mac-thermal-snapshot
```

From the repository root, choose a new output filename for each run:

```sh
node --expose-gc scripts/benchmark-controlled-performance.mjs \
  --cases=all --blocks=4 --burst-ms=120 --prelude-ms=100 \
  --telemetry-argv='["/tmp/orbital-folio-mac-thermal-snapshot"]' \
  --context-telemetry-argv='["/tmp/orbital-folio-mac-thermal-snapshot","--pmset","--settings"]' \
  --out=docs/evidence/performance/rested-retests/new-run.json
```

Telemetry commands run outside timed kernels. Configuring `--telemetry-argv` requires nominal OS thermal pressure; warm or unavailable observations skip work or invalidate a block. The optional context command also records power settings and raw `pmset` output at session/block boundaries. Other devices can supply an equivalent JSON sampler or omit both telemetry flags: the harness remains usable, but explicitly records thermal pressure as **unknown**. `--allow-unknown-thermal` permits unavailable readings from a configured sampler; it does not permit known warm pressure or establish a cooled device.

Defaults use a 60-second initial idle period, three reference controls 10 seconds apart, shared-count bursts targeting 120 ms, seeded ABBA/BAAB ordering, one-second sample rests, and at least 20 seconds between blocks. A startup sample is one indivisible model construction and can exceed the burst target. The default five-percent control-spread gate also rejects sustained directional drift; invalid blocks can retry after a 60-second recovery and fresh controls, within a bounded retry budget. These intervals and thresholds are engineering choices, **not guaranteed cooldown times**. Nominal OS pressure plus stable controls does not prove cold hardware, peak clocks, or absence of throttling. See the [protocol research and limitations](evidence/performance/rested-retests/research.md).

Protocol v2 supports `--prelude-ms=100` for **warmed repeated CPU work**. Every steady A/B sample, including reference controls and brackets, runs the selected variant for the same untimed duration, resets its logical inputs, and immediately measures the unchanged work count. No telemetry, asynchronous wait, or garbage collection occurs between that prelude and the measurement. Both variants also warm before calibration. Actual prelude time and operation counts are logged; 100 ms is a declared engineering choice, not proof of frequency or JIT stabilization. The default remains zero for the earlier no-prelude behavior. Indexing startup always excludes the prelude: it measures the complete construction operation, but remains repeated model construction in an already-used process rather than cold application startup.

Process and, where the Node runtime exposes it, thread CPU-time deltas provide secondary context. Getter overhead stays outside the wall timer where possible. These fields never correct timings or change acceptance gates; process totals can exceed wall time because they include multiple threads, and neither a ratio near one nor nominal thermal pressure proves an unthrottled device.

The JSON report retains configuration, source hashes, environment/thermal observations, calibration, individual samples, accepted and rejected attempts, and paired summaries. Its sibling `.events.jsonl` file preserves progress and skip/rejection reasons. An accepted block only passed the comparison checks; it does not mean the candidate helped. An inconclusive status means insufficient stable evidence—retain those attempts and repeat under better-controlled conditions instead of deleting them or adjusting timings. Small differences within observed variation are not reliable wins.

Use `--dry-run` to inspect the schedule without constructing models, or `--correctness-only` to verify equivalence without performance trials. `--cases`, `--blocks`, `--seed`, rest durations, drift limits, and retry budgets are configurable and recorded. Add `--notes` with the actual power/browser/workload conditions. Keep raw reports and record decisions in the [performance ledger](performance-ledger.md); promising CPU results still need browser validation before activation.

Power-source context needs an explicit audit: the runner automatically checks thermal pressure and Low Power Mode, but its raw per-case summary does not split battery and AC cohorts. Inspect the full before/after power contexts, exclude a comparison if the source changes within it, and report separate cohorts if it changes between blocks. The September repeat’s [power-source summary](evidence/performance/rested-retests/summary.json) and [audit](evidence/performance/rested-retests/final-audit.md) demonstrate this distinction. A constant Low Power Mode setting does not imply a constant power source.


## Initial optimization hypotheses — historical

These motivated the original diagnostics. They are hypotheses, not a current measured ranking; use the [optimization review](performance-optimization-review.md) for the subsequent investigation and changes:

1. **Continuous full-scene redraw at rest.** The animated environment keeps the normal loop active. Investigate a frame-rate budget or separate/static rendering when the cabin settles; retain current camera, door and reduced-motion behavior.
2. **Spacecraft rendering.** Detailed meshes, materials and lights remain submitted in a room view. Use actual per-pass triangle/draw counts before selecting geometry simplification, visibility/culling or material batching work.
3. **Background pixel shading.** Earth/cloud/atmosphere layers and the procedural cloud shader run across their covered pixels. Compare the background and resolution controls before reducing visual fidelity.
4. **AO refresh and composite.** AO is already cached at rest. Measure refresh frequency while hovering/navigating and the cost of applying the cached result; don't assume the whole effect is recomputed every idle frame.
5. **Repeated CPU/DOM work.** Model/material updates, repeated matrix traversal and callout/metadata publication run repeatedly. Their individual timings determine whether they deserve priority over GPU work.

## Implementation and validation

`features/spacecraft/spacecraft-runtime.ts` supplies stage boundaries, cumulative render counters, AO invalidation reasons and temporary controls. `features/diagnostics/scene-performance.ts` owns bounded samples, phase statistics, GPU query lifetimes and reset/disposal. `features/diagnostics/spacecraft-performance.ts` owns per-pass component attribution and filters. `features/diagnostics/performance-panel.ts` owns the guided recorder, comparison controls and downloads. `features/diagnostics/performance-review.ts` checks capture comparability and derives early/late trends and baseline drift. Focused tests cover these review checks alongside collector timing partitions, percentiles, counters, retention changes, per-frame context, asynchronous query reads, disjoint results, reset and cleanup.

The GPU query implementation follows the [Khronos WebGL timer-query specification](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/): query results are read only after availability and after a later frame, with disjoint results discarded. The existing renderer has `info.autoReset=false`; counters are explicitly reset before each complete frame.

Historical rollout validation: eight collector tests and 37 existing feedback/door/navigation tests passed, along with type checking, lint, formatting and the production build. Browser checks covered recording/export summaries, invalidation on resize, render-once pause, room navigation with the panel retained, and absence of the panel on a normal visit. The [original panel screenshot](evidence/performance/diagnostics-panel.png) records that earlier interface, not the current guided workflow. Current validation is recorded in the [optimization review](performance-optimization-review.md).

## Historical: first M4 comparison — 2026-09-13

Local Apple M4, 16 GiB RAM; Chromium 152 in-app browser; development build; overview at 794×827 CSS pixels. Each capture used three seconds of warmup, ten seconds of measurement, no pointer motion, and a collapsed diagnostics panel. The camera and per-frame context remained identical in all three captures. This is an instrumented browser comparison, **not a Safari, production, battery, temperature, or power measurement**.

| Capture | Drawing buffer | Rendered FPS | Mean callback ms | Spacecraft draws / triangles per frame |
| --- | --- | ---: | ---: | ---: |
| Normal A | 1588×1654 | 47.96 | 11.24 | 466 / 886,144 |
| Half drawing resolution | 794×827 | 60.00 | 4.32 | 466 / 886,144 |
| Normal B | 1588×1654 | 54.38 | 4.86 | 466 / 886,144 |

The improvement with one-quarter of the drawing pixels supports pixel-rendering cost as a candidate; geometry count stayed constant. Baseline CPU/frame-rate variation is substantial, so these figures do not establish exact savings or a single thermal cause. All idle frames in these captures reused cached AO (zero AO refreshes). The cached AO composite still rendered. Do not prioritize repeated AO calculation as the idle bottleneck based on these captures.

First priorities to investigate: a sustained rendering budget when idle; main-pass pixel cost; then spacecraft draw/material/visibility work. Follow with controlled background/AO comparisons and repeat navigation/hover captures. Preserve the visual design until an optimization demonstrates benefit.

The [summary report](evidence/performance/m4-overview-captures.json) and [compressed report with raw frames](evidence/performance/m4-overview-captures.json.gz) are retained for future comparisons. GPU query timings are included but should be cross-checked against isolation modes because query boundaries and GPU scheduling can affect sampled elapsed times.


## Historical: component validation — 2026-09-14

The [component comparison](evidence/performance/spacecraft-parts-comparison.json) retains three overview captures at 1200×800, DPR 1, in the development Chromium browser. The camera remained identical. The [compressed report](evidence/performance/spacecraft-parts-comparison.json.gz) also retains batch/source inventories; these captures do not include raw per-frame arrays.

- Full spacecraft: **466 draw calls / 886,144 triangles**, all attributed.
- Hide Projects furniture: **415 / 697,892**, exactly removing its **51 / 188,252** and leaving the other component counts unchanged.
- Restore full spacecraft: **466 / 886,144** again.

Projects furniture had the most triangles; About furniture the most draws (58). This identifies geometry and submission candidates, not a proven GPU-cost ranking. Timing differences in this short comparison were inconclusive: the first baseline was about 60 FPS and the hidden/restored runs about 58 FPS, with variation in both CPU and GPU timings. The retained comparison validates filter/count integrity rather than claiming an optimization benefit.

Six additional tests cover actual draw deltas, room/component reconciliation, invisible variants, restoration/disposal, bounded samples and taxonomy against the real batched spacecraft. Normal model geometry and batching are unchanged.

At that stage, the extension passed those six tests plus the previous 45 diagnostics/navigation/feedback tests, type checking, type-aware lint, formatting and the production build. Browser verification covered button activation without a query string, component and room filtering, capture cancellation when the filter changes, closing/reopening with resolution restoration, room/ladder navigation, and the control/panel at 390-pixel width. The [component-panel screenshot](evidence/performance/spacecraft-parts-panel.png) records that historical interface in a room view.
