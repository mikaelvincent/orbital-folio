# Spacecraft performance review — 14 September 2026

This is the historical iteration-01 investigation. The [performance ledger](performance-ledger.md) tracks subsequent implementations and their evidence, including the now-implemented tiny-hardware reduction in Projects and About. Figures below describe the original iteration and remain unchanged for comparison.

The diagnostics now offer a guided **Record baseline → Compare one change → Review result** workflow. The pulse icon beside SAMPLE / CONCEPT opens it. Technical rankings, render settings, pass timings and JSON remain under Advanced. Captures support 10, 30 and 60 seconds, automatically minimize the panel while measuring, and warn about mismatched settings or baseline drift. See the [testing guide](performance-diagnostics.md).

Two optimizations are implemented: fewer submissions for identical static hardware, and one coherent scene-position update per frame. No mesh detail, drawing resolution, lighting, shadows, animation cadence, camera path, door timing or interaction behavior was intentionally changed. The temporary diagnostic experiments remain temporary.

## What was measured

Measurements used local production builds, Chromium 152, Three.js r185, a 1200×800 CSS viewport and the same settled overview camera. The reference build was isolated at commit `6689a72`; the optimized build includes this change. Only one test page rendered at a time; builds and test suites were stopped during timed captures. Each short recording had three seconds of warmup and ten seconds of measurement with the panel minimized.

The browser exposed an Apple M4 host with 10 logical processors; the owner identifies it as a passively cooled MacBook Air M4. These results are **not measurements of temperature, watts, battery life or thermal throttling**, and they do not represent Safari or every device. The diagnostics contain no device-specific performance thresholds or M4-only code. CPU/frame timing and draw counts remain useful where a browser does not expose GPU timer queries.

### Targeted component investigation

The first sequence used a **2400×1600 drawing buffer (DPR 2)**. Each component was hidden independently, preserving the same camera. The full scene was restored at the end.

| Capture | Main draws | Main triangles | FPS | Mean CPU callback, ms | Mean whole-ship GPU, ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full reference A | 466 | 886,144 | 56.08 | 4.14 | 7.73 |
| Hide Projects furniture | 415 | 697,892 | 59.70 | 3.91 | 7.54 |
| Hide About furniture | 408 | 795,990 | 56.08 | 3.99 | 7.30 |
| Hide ladder utility fittings | 444 | 805,344 | 44.57 | 4.61 | 9.73 |
| Hide outer chassis | 463 | 805,392 | 37.16 | 5.37 | 13.31 |
| Full reference B | 466 | 886,144 | 36.20 | 5.52 | 14.48 |

The counts identify real workload; the timing ranking is **inconclusive**. The full-scene reference itself slowed substantially, so the later ladder/chassis results do not establish that hiding them makes rendering intrinsically slower. Hiding geometry also changes occlusion and shading. Neither triangle share nor a hide experiment is an additive invoice for an object's GPU time. Browser timing cannot establish the cause of this drift.

The main spacecraft submission occupied about 3.23ms of the initial 4.14ms CPU callback. Model update and explicit matrix work together occupied about 0.50ms. This justified prioritizing spacecraft draw submissions before smaller HTML/callout bookkeeping. All six idle captures reused cached AO; they did not repeatedly regenerate it.

[Complete targeted summaries](evidence/performance/production-targeted-baseline.json)

### Verified workload reduction

| Assembly | Before draws | After draws | Triangles retained |
| --- | ---: | ---: | ---: |
| Projects furniture | 51 | 43 | 188,252 |
| About furniture | 58 | 54 | 90,154 |
| Case-study archive furniture | 41 | 29 | 76,326 |
| Contact furniture | 45 | 39 | 70,940 |
| Whole overview spacecraft | **466** | **436** | **886,144** |

That is **30 fewer draws, or 6.4% fewer main-pass submissions** in this view, not a claim of 6.4% less total compute or power. Ladder fittings and chassis geometry are unchanged. Retained instance batches across the model fell from 123 to 93. The savings are view-dependent: a combined batch has a combined visibility bound and can submit an offscreen instance that was previously culled separately.

A second sequence used a **1200×800 drawing buffer (DPR 1)**. Both optimized and reference captures used that same buffer and camera; their timing differences cannot be compared to the earlier DPR 2 series. The optimized short baseline ran at 59.99 FPS / 3.41ms CPU / 4.06ms ship GPU; its later repeated baseline ran at 59.20 / 5.77 / 7.06. The unoptimized control pair subsequently ran at 60 FPS / 4.20–4.36ms CPU / 6.44–6.91ms ship GPU. Conditions drifted, so these runs **do not support a reliable end-to-end speedup percentage**. They consistently verify 436 versus 466 draws with identical triangle totals.

The optimized 60-second sustained recording retained all **3,575 frames / 59.98 seconds**, averaging 59.58 FPS, 5.40ms CPU and 7.69ms ship GPU. Its first/last five-second CPU averages were 5.81 → 5.17ms. This validates complete retention and trend reporting; one minute does not establish a thermal steady state. The UI correctly flagged drift in the short comparison.

[Optimized captures and trends](evidence/performance/production-optimized-captures.json) · [Matching-resolution reference pair](evidence/performance/production-reference-dpr1.json)

## Implemented changes and safeguards

**Static hardware batching.** Only sibling instance batches with the same material, identical complete geometry input bytes, the same local transform, and compatible render/shadow/layer flags are combined. Their original instance matrices/colors and parent transforms are retained. Transparent, transmissive, animated, interactive and custom-shader/callback cases are excluded. Source names remain in diagnostic inventories. This follows the established principle of batching compatible draws described in [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#batch_draw_calls).

**One scene-position synchronization.** Previously, model update, the browser loop and Three's renderer each walked the spacecraft hierarchy; AO refresh introduced another walk. The browser now completes model/reader changes, synchronizes the full scene including lights once, and reuses those matrices for projection, shadows, color and AO. Standalone model consumers preserve their existing immediate-update behavior. This removes redundant CPU work without changing update frequency.

Exact geometry/instance tests cover both layouts, all room categories and reading transitions. Matrix tests compare all world matrices across 98 animated frames and door raycasts, including ladder travel, scene-root motion, reader scaling and AO visibility switches. Additional checks cover transmissive material exclusion, capture retention and invalid/mismatched comparisons. The full suite passed 151 tests before final refinements; all 13 affected batching/review tests passed after the final safeguards, plus type checking, type-aware lint and the final production build.

Browser checks covered the guided comparison, automatic restoration, named captures, drift notice, 60-second retention, cancellation after a viewport change, closing diagnostics, and 390px mobile layout. Projects, About and Contact were visually inspected; ordinary and ladder navigation completed. The [reference Projects view](evidence/performance/before-projects-dpr1.png) and [optimized Projects view](evidence/performance/after-projects.png) retain matching composition and details. These are fresh-page screenshots, not a bit-identical pixel assertion: existing GTAO denoising initializes random noise, and route/cached-AO history can differ. [Image difference measurements](evidence/performance/projects-image-comparison.json) are retained rather than hidden.

[Desktop diagnostics](evidence/performance/guided-diagnostics-desktop.png) · [Mobile diagnostics](evidence/performance/guided-diagnostics-mobile.png)

## Visual or motion tradeoffs — not implemented

These are ranked proposals for the next round, not promises of measured savings.

| Candidate | Target and expected change | Tradeoff / what a visitor would notice | Recommendation |
| --- | --- | --- | --- |
| Reduce tiny hardware detail | Start with Projects: eight side grab loops contain 25,344 triangles; each four-piece bezel/gasket family contains 12,672. Then About's 20 page-edge pieces contain 19,440. Use fewer curve segments or replace small layered edges with surface detail. | Same room composition and readable screens; close views may show less rounded hardware or shallower page edges. Texture substitutions also flatten small shadows. | **Best next visual optimization to prototype.** Preserve close-up quality and compare specific pieces before extending it to other rooms. |
| Distance-dependent detail | Use simpler Projects/About hardware in the overview, full detail in a selected room. Apply to ladder fittings after those higher-priority targets. | Usually subtle at overview distance, but detail switching can pop during camera travel; blending costs extra draws temporarily. | **Worth prototyping after the first item**, with explicit transition review. Not safe to assume invisible. |
| Adaptive drawing resolution | Reduce the 3D pixel count during sustained heavy rendering. Existing diagnostic evidence showed much higher cadence at half resolution, though with baseline drift. | Softer silhouettes, smaller screen text and fine hardware; changing quality can briefly shimmer. HTML navigation stays sharp. | **Worth offering as an optional quality setting**, not silently reducing the default. Test a modest reduction first, especially for room text. |
| Optional lower-power idle mode | Draw the settled scene less frequently or pause ambient animation until input, resuming full cadence for navigation. | Background/cloud motion and twinkling would be less fluid or stop while idle. A poorly designed wake-up can feel delayed. | **Strong candidate for an opt-in power-saving mode** on sustained-use devices. Keep full-rate interaction and verify wake-up latency. |
| Simplify broad shell curvature | Outer chassis costs 80,752 triangles in only three draws; reduce curve tessellation. | Potentially faceted silhouette, less smooth room corners and altered specular highlights, especially when tilted. | **Defer.** The silhouette is central to this design and the hide experiment did not establish it as the leading time sink. |
| Reduce or remove AO | Lower AO/denoise samples during movement, or disable its contact shading. | Weaker depth/contact shadows; fewer samples can add grain or shimmer during travel. | **Do not remove it globally.** Idle AO is already cached. Investigate movement-only cost separately before trading away shading. |
| Aggressive room hiding | Stop submitting rooms outside the selected cabin. | Adjacent rooms could disappear through an opening or pop back during travel; shadows and reflections can also change. | **Defer until visibility can be proven.** A coarse “selected room only” rule is not safe for the current door/camera design. |

For future comparisons on the Air, use the pulse icon in Safari, one rendering tab, fixed viewport/display scaling and unchanged power settings. Record a 60-second baseline, one targeted change and another baseline, and repeat after a resting period. Export the report before closing diagnostics. Compare the **same browser and drawing buffer**; report sustained timing drift separately from any suspected thermal explanation.
