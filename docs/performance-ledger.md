# Spacecraft performance ledger

This is the running record of implemented optimizations, measured results, visual checks and remaining candidates. Timing results are specific to their recorded browser, viewport and conditions; geometry counts provide a separate device-independent measure of work. Open the pulse icon beside SAMPLE / CONCEPT to repeat measurements using the [diagnostics guide](performance-diagnostics.md).

## Current status

| Iteration | Change | Verified result |
| --- | --- | --- |
| 01 · 14 September 2026 | Identical static hardware batching; remove repeated scene-matrix updates | Overview submissions 466 → 436; geometry unchanged. [Investigation and evidence](performance-optimization-review.md). |
| 02 · 14 September 2026 | Reduce excessive tessellation on Projects display hardware and About notebook page edges | 62,976 fewer triangles; dimensions and room arrangement retained. Details below. |
| 03 · 14 September 2026 | Test exact CPU shortcuts and lossless vertex reuse | Four candidates investigated; none enabled. Original timings are retained and reassessed in iteration 04. |
| 04 · 14 September 2026 | Repeat rejected candidates with native thermal observations, stable controls and real idle breaks; separately fix aperture finishing | Cache candidates remain unfavorable; tiny idle-lighting signal; changing lighting and startup timing inconclusive. No candidates enabled. |
| 05 · 14 September 2026 | Redesign clouds as connected volume; compare startup generation and developer baking; room/hull refinements | Baked atlas selected; lower background GPU means in four short comparisons, with substantial variation. Additional transfer/storage tradeoffs recorded. Other candidates remain held. |
| 06 · 14 September 2026 | Restore scattered clouds using satellite coverage and restrained varied relief | Implemented; 12.1% smaller cloud payload, same texture storage/sample bound. Prior timings kept historical; all other candidates held. |
| 13 · 14 September 2026 | Restore 8K Mediterranean night Earth; compare current 2K, 4K and 8K rendering | 8K costs 2.33 MB transfer / 179.0 MB nominal map storage. Background GPU ranking remains inconclusive; local preparation is costlier. Qualified native Safari and Chromium evidence below. |

## 02 — Targeted tiny hardware detail

The baseline for this iteration includes iteration 01. It was preserved from the working source and production build before these geometry edits. This prevents the earlier batching/matrix changes from being credited to this reduction. The [revision manifest](evidence/performance/hardware-detail/revision-manifest.json) records source hashes; the two original hardware component files match commit `6689a72`.

### Changes

- Projects' three bezel/gasket rings per display use 12 samples per rounded corner instead of 32. Both the outer contour and hole are reduced together. Their dimensions, bevel size and two bevel layers remain unchanged.
- The eight smaller dark grab loops use eight corner samples and one bevel layer. They remain closed solids with real holes, the same mounting points and the same material.
- About's twenty thin page-edge shadow strips use shared closed cuboids, replacing heavily subdivided rounded boxes. Their original dimensions, positions, material and count remain intact. Printed page surfaces, binding, page markers and text are unchanged.

The slight reduction in corner smoothness is the approved visual tradeoff. Screen geometry, artwork, room furniture placement, camera behavior, resolution, lights, shadows, AO and animation cadence are unchanged. This is fixed geometry, so there is no level-of-detail switching or transition pop.

### Deterministic impact

| Workload | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Projects furniture triangles | 188,252 | 144,476 | 43,776 · 23.3% |
| About furniture triangles | 90,154 | 70,954 | 19,200 · 21.3% |
| Full overview triangles submitted | 886,144 | 823,168 | **62,976 · 7.1%** |
| Geometry attributes/indices in the visible wide-layout inventory | 36,227,100 bytes | 30,961,596 bytes | 5,265,504 bytes · 14.5% |

The triangle reduction survives the real production material batching in both wide and compact layouts. Furniture bounds and mesh counts are unchanged; Contact and Case Studies inventories are unchanged. The storage figure counts unique geometry attributes and indices, including shared geometry correctly. It excludes textures, browser allocations and GPU driver storage, and is not a total GPU-memory reading.

[Geometry comparison](evidence/performance/hardware-detail/geometry-comparison.json)

Reproduce the inventory from the repository root:

```sh
node scripts/measure-hardware-geometry.mjs
node scripts/measure-hardware-geometry.mjs /path/to/preserved/baseline
node --test tests/tiny-hardware-detail.test.mjs
```

### Browser measurements and visual validation

Eight matched production recordings covered the selected Projects and About views. Each room used **reference A1 → reduced B1 → reduced B2 → reference A2**, with ten seconds per recording after three seconds of warmup. The same Chromium 152 page was navigated between isolated local builds so only one scene rendered at a time. Builds and test processes were stopped during the timed recordings.

Each room's camera position/angle, 1200×800 CSS viewport and drawing buffer (DPR 1), AO resolution/samples, shadows, browser, motion setting and idle activity were checked for equality in the saved data. All temporary filters were off. The source baseline includes the previous exact batching and matrix optimizations.

| Selected room | Main triangles before → after | Main draws | Mean ship GPU before → after | Observed GPU difference | Mean CPU callback before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Projects | 697,418 → 653,642 | 251 → 251 | 9.30 → 8.33ms | 10.4% lower | 6.92 → 6.32ms |
| About | 724,068 → 661,092 | 275 → 275 | 8.58 → 7.31ms | 14.8% lower | 6.34 → 4.61ms |

These are equal-weight averages of two runs per version, with 40 asynchronous ship GPU samples per version per room. The renderer counts demonstrate that the reduction reaches actual draws, beyond an unused geometry inventory. Room-view totals include any other spacecraft geometry submitted from that camera; the About view's total reduction includes the Projects geometry still submitted there.

Both views stayed around **30 rendered FPS** in this browser session. This test therefore shows reduced geometry work and lower sampled GPU time, **not an FPS gain or measured thermal/battery improvement**. CPU and GPU timings varied between runs. The reference GPU means ranged from 8.71–9.89ms in Projects and 8.10–9.06ms in About; the reduced means ranged from 7.68–8.98ms and 7.11–7.51ms respectively. The small ABBA sequence helps expose drift but does not eliminate it, and the percentages are observations from this test series rather than a guaranteed gain across devices or Safari.

An additional normal overview recording at the native 2560×1440 drawing buffer verified **436 draws / 823,168 triangles**. Its timing is not compared to the room recordings because its camera and buffer differ.

[Timing summary and checked settings](evidence/performance/hardware-detail/timing-summary.json) · [Overview verification](evidence/performance/hardware-detail/overview-after.json)

The original recordings remain available: [Projects A1](evidence/performance/hardware-detail/projects-A1.json), [Projects B1/B2](evidence/performance/hardware-detail/projects-B1-B2.json), [Projects A2](evidence/performance/hardware-detail/projects-A2.json), [About A1](evidence/performance/hardware-detail/about-A1.json), [About B1/B2](evidence/performance/hardware-detail/about-B1-B2.json), [About A2](evidence/performance/hardware-detail/about-A2.json).

Visual inspection covered Projects and About at the regular room angle, native DPR 2 display hardware corners, and the [compact Projects layout](evidence/performance/hardware-detail/after-projects-compact.png). No missing parts, broken openings or visible corner faceting was found at these views. The allowed loss is the minute bevel/curve detail itself; there is no claim of pixel-identical rendering. Printed screens, notebook pages and markers remain present and readable at the same sizes.

[Projects before](evidence/performance/hardware-detail/before-projects.png) · [Projects after](evidence/performance/hardware-detail/after-projects.png) · [About before](evidence/performance/hardware-detail/before-about.png) · [About after](evidence/performance/hardware-detail/after-about.png) · [Native-density hardware reference](evidence/performance/hardware-detail/before-projects-detail-dpr2.png) · [Native-density reduced hardware](evidence/performance/hardware-detail/after-projects-detail-dpr2.png)

All **18 focused tests passed**, covering manifold closed hardware, unchanged openings/bounds/page-layer placement, production batching budgets in both layouts, exact static coalescing, matrix/door raycast behavior and diagnostic attribution. Type checking and the production build passed. Changed Projects code and new measurement/test files pass type-aware lint; the About file retains two unrelated existing `no-useless-spread` findings outside this change.

**Decision: keep this reduction.** It removes measurable submitted geometry and geometry storage, the sampled GPU comparison is encouraging, and the inspected room design remains intact. Further hardware changes should get the same scoped measurements and visual review.

## 03 — Exact-work candidates, including rejected approaches

### Scope and comparison boundaries

This investigation followed the spacecraft submission and matrix costs identified in iteration 01. The constraint was to preserve appearance and interaction. Rather than reducing visible detail again, it tested whether repeated CPU calculations or identical vertex data could be reused exactly.

The same change set also includes **separately requested design work**: curved cabin junctions, the About berth replacing its curtain, and direct-link camera initialization. Those changes are not performance optimizations. A pre-task source/build snapshot and a second snapshot containing the new room design were preserved separately, so a redesigned scene would not be compared with the old scene and credited as an optimization. No new production renderer optimization survived this investigation; iterations 01 and 02 remain enabled.

### Tested CPU shortcuts

Tests used actual model matrices/materials in isolated Node CPU benchmarks, with warmup and four samples per version in ABBA/ABBA order. Timings below measure the named operation, not a rendered frame. The first bookkeeping runs exhibited substantial drift during the wider development session; they are retained as inconclusive/negative evidence, not a clean browser A/B comparison. The final iris run followed a quiet interval with the test browser blank and no builds or test suites running.

| Candidate | Exactness safeguard | Reference → candidate | Decision |
| --- | --- | --- | --- |
| Local transform cache, 702 scene nodes | Check complete position/quaternion/scale and local matrix, allowing external edits and retaining native world propagation | 0.773 → 0.995 ms per scene sync in the recorded series | Reject. The checks cost more than native composition; earlier probes also lost. |
| Skip unchanged lighting writes, 234 materials | Recalculate every input/output; preserve linked-room levels, emissions, external mutations and active transitions | Settled: 0.0671 → 0.0752 ms; changing: 0.1006 → 0.0991 ms | Do not enable. Results varied and did not establish a useful gain. |
| Reuse hatch inverse across six iris leaves | Compare the complete source and cached result; invalidate on parent movement or direct edits | Settled: 0.000394 → 0.000600 ms; moving: 0.000432 → 0.000719 ms for all four hatches | Reject. Fewer inversions did not mean less CPU time. |

For the iris case, 100 simulated frames fell from **2,400 inversions to 4 while settled, or 400 while moving**, yet ran slower. This is a useful counterexample for future reviews: operation counts alone do not establish a speedup. Three's existing inverse arithmetic was cheaper than this conservative cache's comparisons. Renderer source review also found that material-uniform refresh is already cached between compatible draws; bypassing its render-target/camera invalidation would risk incorrect lighting and AO, so no extra shortcut was attempted there.

[Bookkeeping runs and method](evidence/performance/refinements/bookkeeping-benchmark.json) · [Quiet iris runs and inversion counters](evidence/performance/refinements/iris-inverse-benchmark.json)

Reproduce independently, with other rendering pages and builds stopped:

```sh
node scripts/benchmark-render-bookkeeping.mjs --out=/tmp/bookkeeping.json
node scripts/benchmark-iris-inverse.mjs --out=/tmp/iris-inverse.json
node --test scripts/benchmarks/*.test.mjs
```

Rejected implementations are isolated under `scripts/benchmarks`, with no application imports. All six candidate correctness tests pass, including actual room/door/social lighting states, external mutations, parent transforms, singular matrices, signed zero and aliased matrices. Passing correctness tests did not override the negative timing results.

### Lossless vertex indexing

This candidate joins only vertex entries with **identical complete attribute bytes**. It retains triangle order, UV/normal seams, signed zero, attribute types/flags, groups, drawing ranges and bounds. It does not simplify the shape. Eligibility excludes custom shaders/callbacks, dynamic or morph/skinned geometry, iris assemblies, wireframe/transparency and interaction proxies; a shared buffer is excluded if any owner is ineligible.

A full-scene feasibility probe found **83,040 redundant entries across 155 candidate buffers**, potentially saving **2,648,064 bytes (8.49% of geometry attribute/index storage at probe time)**. The largest opportunities were ladder utilities (736,832 bytes), Projects furniture (478,016) and outer chassis (439,424). This inventory is not GPU memory consumption or a measured GPU-time saving. A 32-entry LRU simulation estimated fewer vertex transformations, but real GPU caching and frustum culling remain unmeasured.

The initial string-key prototype spent about 3.36 seconds identifying tuples and was rejected for runtime use. A faster integer-hash prototype then targeted **13 Ladder/Projects buffers**. Hash collisions receive exact byte comparisons; a deliberately colliding test still preserved signed zero and UV seams.

| Targeted numeric prototype | Result |
| --- | ---: |
| Geometry storage saved | 1,109,632 bytes |
| Vertex entries removed | 34,676 |
| Mean compaction work | 55.03 ms; range 32.73–72.53 ms |
| Mean model construction alone | 378.29 ms |
| Mean model construction plus compaction | 419.40 ms |
| Observed net construction difference | +41.11 ms / +10.9% |

Two ABBA sequences ran after the other CPU probes, with no rendering test page or builds active. Model construction varied between runs, so the directly timed compaction cost is stronger evidence than the net difference. These are **Node model-construction timings, not browser page-load measurements**. GPU upload, actual render-time savings and browser first-frame latency were not measured. Index-expanded vertex inputs and metadata were verified exactly for every targeted buffer.

**Decision: do not enable runtime compaction.** It introduces extra work before the first scene can render, and an end-to-end benefit has not been demonstrated. The next recommended approach is build-time geometry compaction or equivalent direct indexed geometry generation, so visitors do not perform this analysis. That requires validating editable configurations and measuring both load cost and actual GPU rendering before deployment. Iteration 04 later qualifies the net startup timing as inconclusive under stricter controls.

[Full-scene feasibility](evidence/performance/exact-indexing/feasibility.json) · [Numeric prototype, exactness checks and raw startup runs](evidence/performance/exact-indexing/targeted-numeric-hash.json)

```sh
node scripts/probe-exact-vertex-indexing.mjs > /tmp/indexing-feasibility.json
node --expose-gc scripts/probe-targeted-exact-indexing.mjs > /tmp/indexing-startup.json
```

The indexing probes precede the final mounting-clearance correction described below. Their logs describe that candidate scene, not compacted buffers in the delivered application.

### Separate design accounting and visual checks

- All eight cabin side junctions now have continuous 0.08-unit returns along the rear, floor and ceiling. Adjoining wall faces are trimmed to the same boundary. This intentionally adds **13,788 triangles**, while preserving room datums, door openings, wall thickness and exterior bounds. Four obsolete empty mesh entries were removed. [Scoped geometry comparison](evidence/room-refinements/chassis-geometry.json).
- About replaces its pleated curtain/tracks with a rigid berth rail, amber grip and shielded reading lamp. The complete berth moves 0.09 inward and its retained bedding roll is recentered. This design removes **4,020 triangles** (70,954 → 66,934); it is not credited as an invisible optimization. The lamp uses a luminous material and adds no scene light.
- Combined, these two design requests add **9,768 triangles** to the previous inventory. Their cost is recorded openly rather than mixed into the optimization results.
- The full suite exposed a compact-layout mounting shoe intersecting the new return. Side fittings were then justified within the remaining flat rear-wall span: Projects' tool board/lead, Case Studies' edge fittings and About's bedding roll move inward 0.056 in wide / 0.04 in compact. Compact Contact umbilicals move inward 0.0662; wide Contact stays in place. Hidden mounting feet fit within their housings. Full vertex-containment and text-visibility checks pass with their original tolerances; these adjustments do not change triangle counts.
- Direct room links initialize the camera and springs from the same responsive overview pose, then use the existing entrance itinerary. The initial unchanged ResizeObserver notification no longer cancels that flight. Real resizes and reduced-motion handling retain their existing paths.

Visual inspection covered all four rooms, two overview tilt directions, a 768×1024 tablet and a 390×844 portrait view. Geometry probes cover both model layouts, all eight rear/floor/ceiling returns, smooth normals, non-overlapping surfaces and unobstructed cabin/ladder apertures. Camera traces verify all four direct desktop routes start from the same overview position; tablet/portrait starts use a 90-degree hull orientation and then settle upright without a door hold. A real overview-to-About click was also recorded. Durations from those development traces are functional evidence, not benchmark comparisons.

[About before](evidence/room-refinements/about-before.png) · [About after](evidence/room-refinements/about-after.png) · [Projects](evidence/room-refinements/projects-rounded.png) · [Case Studies](evidence/room-refinements/cases-rounded.png) · [Contact](evidence/room-refinements/contact-rounded.png) · [Tilted chassis](evidence/room-refinements/chassis-tilted-overview.png) · [Camera verification](evidence/room-refinements/camera-entry-verification.json)

[Source boundaries and hashes](evidence/room-refinements/source-manifest.json) · [Focused implementation patch](evidence/room-refinements/implementation.patch)

Final validation: **159 application tests passed**, six benchmark-only correctness tests passed, type checking passed, and the production build passed. [Validation record](evidence/room-refinements/validation.json) · [Application test log](evidence/room-refinements/application-tests.txt).

A final production overview capture verified the actual main pass at **432 draws / 832,936 triangles**, matching the separately recorded design delta. It retained 290 idle frames over about ten seconds at a 1280×720 CSS viewport / 2560×1440 drawing buffer, with normal filters, shadows enabled and AO cached for every captured frame. The capture observed 29.05 rendered FPS, 6.94 ms mean CPU callback and 17.95 ms sampled ship GPU time. This is a **post-change baseline and diagnostics smoke check**, not a matched optimization A/B or a thermal measurement; it must not be compared with another session to claim a speedup or regression. [Complete production capture](evidence/performance/refinements/production-overview-after.json).

## 04 — Rested retests and aperture finishing

### Why the earlier timings needed another check

The earlier candidate runs did not record native thermal pressure. Their timings remain historical observations, but they cannot rule out thermal drift. Firsthand M4 MacBook Air measurements show sustained performance declining during repeated CPU workloads; that establishes a plausible confounder, not proof that it caused our specific results. [Tom’s Hardware measurements](https://www.tomshardware.com/laptops/macbooks/macbook-air-m4-2025-review), [Notebookcheck measurements](https://www.notebookcheck.net/The-passively-cooled-M4-SoC-makes-the-competition-look-old-Apple-MacBook-Air-13-M4-base-model-review.1002534.0.html).

Our own sampler initially observed **fair** thermal pressure while `pmset` simultaneously reported no recorded warning. Later, after the development work finished, the native reading returned to nominal. This is why the new method requires a positive thermal observation and stable reference controls instead of interpreting missing warnings or an elapsed pause as proof of recovery. [Native sampler validation](evidence/performance/rested-retests/sampler-validation.json).

Apple’s thermal-state API is system pressure telemetry, not a temperature sensor or a guarantee of maximum clock speed. The pause durations below are declared experimental choices; neither Apple nor the reviews establish one universally sufficient cooldown interval. [Apple thermal-state guidance](https://developer.apple.com/library/archive/documentation/Performance/Conceptual/power_efficiency_guidelines_osx/RespondToThermalStateChanges.html). The complete rationale, source links and limitations are in the [thermal research and protocol](evidence/performance/rested-retests/research.md).

### Recorded repeat method

- Finish builds, correctness checks and visual review first. Close agent rendering previews and stop the production preview; retain the normal development server for access. No other agent test/build/probe jobs run during the comparisons. Other user workloads and ambient temperature are not instrumented.
- Use the actual current scene for both versions in each comparison, including the separately requested window finishes. Six scenarios cover the same four candidates: local matrix caching; lighting settled/changing; iris inverse settled/moving; targeted indexing at startup. The source hashes travel with the results. These are paired comparisons within this run, not absolute comparisons against the older scene.
- After setup, idle for at least 60 seconds. Require two consecutive nominal native readings, then three brief reference controls separated by 10-second pauses. The declared reference spread limit is 5%, with monotonic drift above 2.5% also rejected. This gate cannot establish a tiny effect inside that noise floor.
- Use a shared iteration count sized to the slower version and targeting 120 ms for steady kernels, with both versions warmed consistently; the faster version can have a shorter measured burst. Randomize scenario order with a recorded seed and use four balanced ABBA/BAAB blocks per scenario. Pause for one second between samples and at least 20 seconds between blocks. Construction is one indivisible fresh model per sample and can exceed the steady-kernel burst target.
- Record native thermal pressure before each sample (before its prelude in version 2) and after its measured work. Skip a sample whose initial reading is warm or unknown under strict mode. Check reference controls before/after every block, drift from initial controls, Low Power Mode and power-source stability. Reject incompatible attempts, rest for 60 seconds and retry within a fixed bound; preserve all attempts rather than dropping inconvenient values.
- The reusable harness is device agnostic. Without a native provider it records thermal state as unknown; this Mac run uses the compiled Apple sampler and requires nominal readings. Neither mode measures GPU cost, FPS, battery savings or temperature.

The initial idle-burst protocol was stopped as a **pilot**, after both iris scenarios and the first local-matrix gate failed stability checks. No comparison block was accepted. Iris-moving reference spreads were approximately 10% in both attempts; iris-settled and local-matrix controls also failed, despite nominal thermal observations. The interrupted report and its exact [version-1 harness source](evidence/performance/rested-retests/protocol-v1/benchmark-controlled-performance.mjs) remain preserved. This is evidence of an unstable measurement setup, not evidence that an optimization helps or harms performance.

A separately declared follow-up adds a fixed 100 ms untimed prelude to every steady-work sample, including A/B and control samples, then resets logical input and measures immediately. Both variants use the same policy and measured iteration count. This asks about warmed repeated CPU work rather than a kernel directly after a long idle; it does not identify CPU wake-up, caching, JIT or heat as the cause of the pilot's variation. The 5% gate, balanced order, rest periods and raw exclusions are retained. Startup construction receives no per-sample prelude, so the work being evaluated is not hidden. CPU and JS-thread CPU time are secondary observations, never corrections to wall time. [Warmup guidance](https://google.github.io/benchmark/user_guide.html#runtime-and-reporting-considerations), [Apple on dynamic CPU performance control](https://developer.apple.com/videos/play/wwdc2020/10224/).

### Follow-up results and revised decisions

The follow-up ran from **04:20:07 to 04:47:58 UTC on 14 September 2026** on an Apple M4, 16 GB RAM, macOS 26.6.2, Node 26.0.0 / Three r185. It finished normally with `complete-with-inconclusive-cases`. Passing subsets do not promote an incomplete four-block scenario into a completed experiment.

**Power-source correction:** the machine switched from battery to AC between moving-iris blocks 2 and 3. Those blocks are therefore reported as two separate, independently counterbalanced two-block cohorts. No power-source change was observed between the before/after context snapshots of any single block. All later recorded blocks used AC; the earliest AC contexts were attached but not charging, followed by charging. Low Power Mode remained disabled and all **475** recorded native thermal observations were nominal. The audit verified all 14 tracked source hashes against the recorded files. The entire session must **not** be described as constant-power, cold, or unthrottled. Native snapshots can also miss changes between observations.

| Candidate / state | Qualified blocks | Observed reference → candidate, ms per named operation | Interpretation and decision |
| --- | --- | --- | --- |
| Iris inverse, moving · battery | 2, one of each order | 0.001086 → 0.002021 | Candidate about 86% slower in this tiny kernel. Keep disabled. |
| Iris inverse, moving · AC | 2, one of each order | 0.001087 → 0.002041 | Candidate about 88% slower. Same direction in the separate source cohort. |
| Iris inverse, settled · AC | 3/4; 1 excluded attempt | 0.000988 → 0.001858 | All accepted and excluded comparisons were slower, but the declared full set is incomplete. Keep disabled; formal result remains inconclusive. |
| Local matrix cache · AC | 2/4; 4 excluded attempts | 0.083715 → 0.095623 | Accepted observations about 14% slower; every raw attempt also favored native work. Keep disabled, with the incomplete-set qualification. |
| Lighting writes, settled · AC | 4/4 after 2 excluded attempts | 0.008436 → 0.007531 | Consistent small kernel saving: median paired difference **0.000908 ms**. This revises the earlier assessment to a small idle-work signal worth retaining, not an enabled optimization. |
| Lighting writes, changing · AC | 3/4; 2 excluded attempts | 0.008732 → 0.008641 | Tiny mixed differences: accepted candidate/reference ratios 0.9852–1.0077. No clear benefit; incomplete set remains inconclusive. |
| Targeted indexing at startup | 0 comparison blocks; both readiness gates failed | Reference construction controls 395.679–526.933 ms | Control spreads **22.1% and 28.5%** prevented a qualified A/B result. Do not use the old net +41 ms estimate as a thermally verified conclusion. Runtime indexing stays on hold. |

The times above are medians within the stated power cohort; percentages use paired ratios. They are **not frame timings**. The settled-lighting paired gain ranged from about 5.5% to 12.7% of this very small operation, saving less than one microsecond per pass. Four descriptive blocks do not establish a universal percentage, and the changing-state results do not establish a benefit. Integration complexity and unmeasured browser behavior outweigh any reason to activate it now.

The cache rejection is supported directionally, including by the excluded raw comparisons, while its formal qualifications remain visible. The startup retest supplies **no reliable net startup estimate**; it does not prove either a startup regression or a benefit. Lossless indexing still has a deterministic storage opportunity, but actual GPU and first-frame benefit remain untested. No candidate was enabled, no recorded timing was thermally “corrected,” and no browser FPS, GPU, temperature, or battery improvement is claimed.

The fixtures are algorithm screens using actual scene matrices/material data. They do not reproduce a complete rendered frame: the matrix case forces a settled traversal, the iris case invokes all four hatches regardless of visibility, the lighting case uses copied material values with fixed linked-room dimmers, and the construction case omits browser canvas textures and GPU upload. Those limits matter when choosing further work.

[Derived results split by power source](evidence/performance/rested-retests/summary.json) · [Full warmed report](evidence/performance/rested-retests/warmed-run-20260914.json) · [All timestamped events](evidence/performance/rested-retests/warmed-run-20260914.events.jsonl) · [Independent continuity and outlier audit](evidence/performance/rested-retests/final-audit.md)

The next candidates remain on hold. Offline geometry compaction stays the priority for a future investigation; the tiny idle-lighting result becomes a low-priority retained candidate, with changing-state and browser validation still required. The runtime indexing decision is now explicitly **unproven end-to-end benefit / unstable startup timing**, rather than a confidently measured net startup penalty.

[Raw repeat report](evidence/performance/rested-retests/run-20260914.json) · [Timestamped event log](evidence/performance/rested-retests/run-20260914.events.jsonl) · [Reusable instructions](performance-diagnostics.md)

### Separate visual work and implementation cost

The window changes are explicitly requested art corrections, not an invisible optimization. The separate mismatched gasket/hover rings are removed from all four cabins and the ladder aperture. The actual chassis reveal triangles now carry a dark navy finish with a narrow orange band inset into their existing depth. No extra skin, coincident paint plane or displaced lip is added. Tests compare the real production surfaces to the original outline at multiple depths/directions in both layouts, checking contour, bevel, full color coverage and lack of overlap.

The first implementation did unnecessary contour scans and triangle allocation during construction. A temporary spatial index and unchanged-triangle copying removed that excess work, with byte-identical position/normal/UV output. Brief development checks measured approximately 146–164 ms versus 33–48 ms per layout; these checks were not part of the rested candidate experiment and are not a whole-page or thermal improvement claim. [Exactness and construction check](evidence/performance/window-reveals/reveal-construction-check.json).

Overview callouts now attach to true edge midpoints on the window’s inset band, including after the ship rotates. Portrait leaders first exit along the edge and then follow the outside rail to avoid the panels and ladder; the existing portrait arrival fade and landscape routing remain intact. The Case Studies terminal loses its 22 pale underside slats, retaining a continuous dark recess and the existing screen layout.

The current wide visible inventory contains **818,186 triangles across 408 meshes**, with 29,460,964 bytes of unique geometry attributes/indices. This is a geometry inventory, not a frustum-aware draw count or total GPU memory. [Inventory](evidence/aperture-refinement/geometry.json).

Visual inspection covered all four selected rooms, tilted cabin/ladder openings, a 390×844 overview and selected Case Studies view, and the production build at native DPR 2 and 768×1024. The production console reported no errors. During the portrait return flight, callouts remained hidden at opacity zero; they were available after arrival. The full application suite passed **163 tests**; the subsequent focused suite passed **13** framing/candidate/protocol tests, and the final reveal implementation passed its three geometry regressions. Nine additional tests passed for the warmed timing boundary and protocol gates. Type checking and production build passed. [Validation](evidence/aperture-refinement/validation.json).

[Projects](evidence/aperture-refinement/projects-desktop.png) · [About](evidence/aperture-refinement/about-desktop.png) · [Contact](evidence/aperture-refinement/contact-desktop.png) · [Case Studies production](evidence/aperture-refinement/cases-production.png) · [Mobile overview](evidence/aperture-refinement/overview-mobile.png) · [Tablet production overview](evidence/aperture-refinement/overview-tablet-production.png)

## 05 — Connected cloud volume and room finishing

This iteration is an explicitly requested cloud redesign and delivery comparison. It does **not** activate the held matrix, lighting, iris, indexing, LOD, resolution, visibility or idle-cadence candidates from iterations 03–04. The spacecraft's existing rendering optimizations remain as delivered.

### Visual result and representation

The old Earth shell used a small periodic 3D Perlin/cellular basis and rebuilt weather, coverage and thin-surface relief in each fragment. The resulting scattered repeating fragments lacked a connected sense of volume. The replacement uses original, nonperiodic spherical weather fields: broad fronts and cloud banks, irregular fringes, stronger middle-scale height variation, and bright lobed tops with blue-grey lower flanks. The references were NASA's [South Indian Ocean formation](https://www.nasa.gov/image-article/cloud-formation-south-indian-ocean/) and [South Pacific Swirl](https://science.nasa.gov/earth/earth-observatory/south-pacific-swirl-145595/). These are visual references, not photographs embedded in the asset.

The developer generator creates a deterministic 2048×1024 RGBA data atlas containing density, top height and two tangent slopes. One bounded 12-step spherical volume pass integrates view-dependent opacity and lighting. Two filtered procedural octaves add restrained small-scale top shading; they do not regenerate the weather map or punch repeated holes through its interiors. Longitude wrapping and derivative-based filtering keep distant detail stable. This is a shallow height-defined volume approximation, not a full fluid/weather simulation or multiple-scattering renderer.

Earth/cloud rotation, stars, meteors, room navigation and rendering cadence remain unchanged. The former continuous weather morph is replaced by a fixed authored weather field rotating around the globe. Sunlight and viewing direction still affect the result; this is not a frozen screen-space image.

### Delivery alternatives and decision

| Approach | Runtime work | Decision |
| --- | --- | --- |
| Original hybrid: startup 3D noise basis plus per-fragment weather | Small initial data, recurring 11/17 3D texture lookups plus weather/shading arithmetic | Retained as frozen reference only. It does not deliver the requested connected volume. |
| Bake the new atlas on a visitor's device | Full field construction at startup; same resulting texture and volume shader | Tested with the exact production generator. Avoided on successful normal loads. |
| Ship the developer-baked atlas | Download, decompress and restore exact bytes; same volume shader | Selected. Predictable content and no client weather-map bake; added transfer and texture-storage cost. |

The successful path loads `public/textures/cloud-banks-v1.cfd.gz`. A small versioned CFD1 header describes the dimensions; planar channel deltas compress without losing a single atlas byte. The final file is **3,165,073 bytes**, down from 4,259,591 for raw RGBA gzip (1,094,518 bytes / 25.7% smaller). The original uncompressed atlas is 8,388,608 bytes. A developer rebuild uses `node scripts/bake-cloud-field.mjs`; the JSON manifest records its seed, dimensions and payload hash.

The loader accepts both hosts that apply HTTP gzip decompression and hosts that return the gzip archive unchanged. Invalid dimensions/packets fail validation. Only an asset failure dynamically loads the generator as recovery; successful loads do not pay both delivery and generation. Texture installation replaces and disposes the initial placeholder correctly. The same fixed data and shader are used on both viewport tiers.

The rested startup comparison used four fixed BC/CB pairs with the actual full-resolution production asset. Generating the field took **560.30–567.37 ms**; warm local read, gzip inflate and exact CFD1 unpack took **36.73–150.98 ms**. All pairs favored prebuilt preparation by **411–531 ms**. Means were 562.70 ms generated and 67.10 ms prebuilt, retaining the slower second decode sample. Every decoded atlas matched the generated 8,388,608 bytes exactly. All thirty native gate/boundary readings reported nominal pressure, Low Power Mode off and battery power; no samples were skipped, retried or removed.

These are repeated preparation kernels in a warm Node process, not browser navigation or network timings. They support avoiding the new field's per-visit generation cost, not a universal first-display improvement. B and C feed identical data into the same shader, so delivery alone does not reduce settled rendering cost. [Complete startup results, all samples and limitations](evidence/performance/cloud-delivery/startup-summary.md).

The download is a real tradeoff. At an ideal sustained 10/25/100 Mbit/s, 3,165,073 bytes alone take approximately **2.53 / 1.01 / 0.25 seconds**, before latency, contention, decompression and upload. These are arithmetic bandwidth estimates, not throttled-network measurements. Local browser observations (~8–9 ms fetch, ~25 ms gzip+CFD1 decode) are not estimates for real visitors. No universal first-load advantage is claimed; prebuilding is chosen to avoid per-visit client generation and deliver the requested visual quality. Browser/server caching can benefit later requests, subject to host policy.

Estimated cloud texture storage with mipmaps is **11,184,812 bytes**. Including the unchanged nebula, the estimate rises from 773,950 to 11,359,576 bytes desktop, and from 118,590 to 11,228,504 bytes for the phone-sized configuration. This is calculated texture payload, not measured driver allocation. It is an intentional storage-for-computation tradeoff, not a memory optimization.

[Codec byte proof and sizes](evidence/performance/cloud-delivery/codec-comparison.json) · [Reproducible delivery benchmark](evidence/performance/cloud-delivery/README.md)

### Rendering comparison and limits

The standalone developer lab builds frozen source/asset snapshots and renders only the orbital background. The old and current environments use their actual production modules. No spacecraft, camera-flight, UI or build/test work runs in the measured render. Every run uses ABBA or BAAB order, ten warmup frames and sixty measured frames per block, with ten seconds of blank, non-rendering rest before each block. Direct WebGL2 elapsed GPU queries enclose the background render.

| Configuration on this M4 | Order | Mean background GPU before → after | Observed difference |
| --- | --- | ---: | ---: |
| 1280×720, DPR 2 | ABBA | 4.716 → 4.371 ms | 7.3% lower |
| 1280×720, DPR 2 | BAAB | 6.742 → 4.423 ms | 34.4% lower |
| 390×844, DPR 1, mobile quality | ABBA | 1.647 → 1.438 ms | 12.7% lower |
| 390×844, DPR 1, mobile quality | BAAB | 1.383 → 1.353 ms | 2.1% lower |

All **16 blocks / 960 GPU queries** were valid and retained. All 34 native observations bracketing the saved runs were nominal; Low Power Mode was off and six sampled power contexts stayed on battery. A prior development observation reported fair pressure, so the measured phase followed stopped rendering and a return to nominal. The same [Apple thermal-state interpretation](evidence/performance/rested-retests/research.md) applies: nominal is not a temperature or constant-clock guarantee, and neither a fixed ten-second pause nor sparse telemetry proves complete cooling.

The new background has a lower mean in all four runs, but block variation is large and some individual pair directions reverse. The small phone-sized BAAB difference is within the observed spread. These are encouraging observations, **not a stable speedup percentage, demonstrated FPS increase, Safari result, physical-phone test, or heat/battery saving**. Frame intervals remained near 16.67 ms. Shader appearance differs intentionally, so this is a redesign cost comparison, not a pixel-identical optimization.

One initial ABBA export was lost due to clipboard collection; ABBA was repeated solely to recover an export. The lost raw frames are not included. Preparation metadata preserved in the later runs is deduplicated in the audit. First submitted-frame observations were 74.0→123.9 ms desktop and 47.9→48.8 ms phone-sized, with different compile costs; they are single local preparations, not proven cold-cache network trials or presentation timestamps. They do not establish faster total first load.

[Full GPU/preparation/thermal audit and raw reports](evidence/performance/cloud-delivery/gpu-audit.md) · [Reusable browser lab](../scripts/benchmarks/CLOUD-LAB.md)

### Separate room and hull refinements

- About: center the narrow berth rail between the bed frame and notebook cradle; keep its wider lamp cap balanced within the upper gap. Shift the mountain photo slightly right.
- Case Studies: give the oxygen cylinder a muted slate-blue shell with its existing straps and metal ends. Move the rear two-rod black fitting right and up, limiting the compact-layout shift to preserve cove clearance.
- Entrance: smooth circular normals on the cream docking mount and dark retaining ring, increasing circumference sampling from 48 to 96. Dimensions, bore and placement remain fixed. This adds 2,304 triangles for the requested visible curvature polish; it is not counted as an optimization.

Room adjustments add no furniture geometry or new interactions. Focused actual-model checks cover both layouts, enclosure clearance, smooth normals and manifold rings. **23 focused tests passed**, along with type checking, type-aware lint of the new cloud/hull code and the production build. The obsolete 3D-cloud audit was replaced with tests for current atlas loading, transforms, mip storage, pauses and disposal. Production browser checks reported no console errors; successful loading used the baked asset, not the generator recovery path.

Visual review covered About and Case Studies at their regular view, the tilted docking mount, 390×844 room/overview layouts, and frozen cloud views at 0/60/180 seconds on desktop and phone-sized canvases. The desktop build uses native DPR 2. [Visual and validation evidence](evidence/cloud-room-refinement/README.md).


## 06 — Scattered satellite cloud coverage

The user rejected iteration 05's continuous blanket. The corrected target is scattered clouds with varied thickness and substantial visible ocean, matching the supplied satellite views. Iteration 05's timing logs remain historical evidence; its procedural field and rendering timings must not be presented as measurements of this new satellite-derived field.

### Representation choice

The environment already contains a complete 3D globe. Importing another globe mesh would not solve coverage or roughness. A fixed satellite photograph has inexpensive rendering and natural detail but fixes the view, illumination and cloud motion. A globe with a combined Earth/cloud texture rotates correctly, but its clouds look painted on the ground. The chosen representation keeps the existing globe and independent drift, adds a **separate NASA satellite cloud mask**, and interprets it as a shallow layer with varied height and responsive light. It retains curvature and modest depth without rebuilding weather on each visitor's device. [Full alternatives and sources](evidence/cloud-scatter-refinement/alternatives.md).

Coverage comes from NASA's [Blue Marble cloud composite](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/). A developer-only 8192×4096 lossless TIFF is filtered to a 2048×1024 greyscale mask. The image is a historical composite, not current weather. NASA acknowledges cloned gap-fill features; the renderer does not add tiling, but the source must not be described as entirely free of repetition. Our inferred height and shading are artistic, not measured altitude. Credit, source hashes and processing are retained with the source mask and public manifest.

### Visual correction

- Preserve the satellite pattern's clear spaces, broken patches, feathered streaks and varied cluster sizes.
- Thin regions mostly affect transparency. Coherent bright cores receive more height and opacity, instead of making every cloudy pixel thick.
- Remove the additional procedural fine-slope noise and soften relief normals, avoiding the embossed, rocky surface of iteration 05.
- Reduce the maximum shell radius from 180.85 to 180.58 and use gentler extinction and self-shading. The existing twelve samples are distributed more densely near thin lower layers, using fixed precomputed intervals and their true integration lengths.
- Keep the existing planet composition, rotation, atmosphere, spacecraft, rooms and navigation.

The new atlas contains some cloud density over about 52.5% of its area, but only about 7.0% exceeds normalized density 0.4 and 2.48% exceeds 0.6. The previous field had 36.5% above 0.6. This addresses saturation rather than simply removing all clouds. Heights are also varied: cloudy-pixel median about 0.133 of the shell, p90 about 0.259 and p99 about 0.525 before the shader's selective core boost. These are **atlas distribution statistics**, not measured atmospheric coverage or screen-space water percentages. Low-angle render checks remain necessary.

### Cost and delivery

`cloud-satellite-v2.cfd.gz` is **2,781,463 bytes**, versus 3,165,073 for the previous atlas: **383,610 bytes / 12.1% less transfer**. It restores 8,388,608 RGBA bytes exactly. Texture dimensions, the estimated 11,184,812-byte cloud mip chain, the cloud draw count, and the twelve-sample bound are unchanged. Removal of procedural surface noise reduces that shader's arithmetic, but this iteration makes **no newly measured GPU-time, FPS, temperature or battery claim**.

The initial download remains a tradeoff: at an ideal 10 Mbit/s, its payload alone is approximately 2.23 seconds before latency and decoding. No cold-network measurements were made. A 4K RGBA atlas was considered but not implemented: it would quadruple cloud texture storage to approximately 44.7 MB and primarily improve mask detail, not fix uniform thickness. The final 2K version was checked for softness and depth at the actual portfolio scale.

The normal browser path loads only the prepared atlas; it does not fetch NASA or run source conversion. Existing load-failure recovery remains available and is separately identified in diagnostics. The older procedural asset is retained for the prior experiment but is not requested by the current scene. `node scripts/bake-satellite-clouds.mjs` reproduces the shipped data from the checked-in source mask. The previous startup benchmark's 411–531 ms saving belongs to its procedural-generator comparison, not this converter. [Rebuild and source provenance](../scripts/assets/README.md).

### Validation

**19 cloud correctness tests passed**, including the actual production asset and NASA mask hashes, exact lossless decoding, clear-gap and density-distribution guards, height variation, longitude wrapping, small synthetic conversion, async loading/cancellation, transforms and resource cleanup. Type checking, type-aware lint and the production build passed. [Audit and visual evidence](evidence/cloud-scatter-refinement/README.md).

Desktop and portrait reviews covered frozen views at 0, 60 and 180 active seconds, then the full production portfolio. These are M4 browser viewport checks, not physical-phone or Safari performance measurements. No unrelated optimization candidate was activated; the next candidates below remain on hold.


## 07 — 2K satellite Earth surface

**Approved and implemented, 14 September 2026.** Following the cost inquiry, the user approved a 2K combined satellite surface and requested measured before/after results. The scene now loads the local NASA Blue Marble JPEG containing land, ocean, ice and clouds onto the existing globe. A single diffuse surface replaces the plain ocean plus shallow twelve-sample cloud volume. Cloud shading comes from the photograph and the globe's broad lighting; there is no per-visitor weather generation or continuing video decode. The photograph is a historical composite, not live weather.

The globe retains its radius, screen framing, active-time pause behavior and 0.003 rad/s surface rotation. The initial geographic orientation selects the Indian Ocean region so the initial composition includes open ocean, broken clouds and nearby land. Clouds now rotate with the land. Atmosphere, stars, meteors, spacecraft, rooms and navigation remain unchanged. The 2K photograph is visibly soft in the closest foreground; no unapproved 4K upgrade or unrelated performance candidate is enabled.

### Delivery, lifecycle and diagnostics

The checked-in asset is `public/textures/earth-blue-marble-2k.jpg`, **526,263 bytes**, SHA-256 `d2c003cc2e865c474245884cb16c9aeeb30349c8acc06e4dfb92594b2c12bbc5`. It is reproducibly resized from NASA's verified 8192×4096 TIFF with Lanczos3 and encoded as JPEG quality 85. The normal path requests only the local image, not the large source or NASA servers. Source credit, SHA-256, projection and encoder versions travel in the [manifest](../public/textures/earth-blue-marble-2k.json) and [preparation instructions](../scripts/assets/README.md).

| Earth representation cost | Before: satellite cloud volume | After: 2K combined image | Difference |
| --- | ---: | ---: | ---: |
| Asset download | 2,781,463 bytes | 526,263 bytes | 2,255,200 bytes / **81.08% less** |
| Estimated RGBA8 texture with mip chain | 11,184,812 bytes | 11,184,812 bytes | Unchanged |
| Background draws at measured 180-second view | 7 | 6 | One fewer |
| Desktop background triangles submitted | 97,284 | 72,964 | 24,320 fewer |
| Compact background triangles submitted | 48,388 | 36,292 | 12,096 fewer |
| Cloud traversal | 12 atlas samples plus volume lighting | Removed; one combined surface map | Less shader work |

The memory row is calculated texture payload, not measured driver memory or complete process memory. The unchanged nebula adds 174,764 bytes desktop / 43,692 bytes compact to estimated texture storage. The decoded bitmap also has CPU-side storage until disposal. Asset compression reduces transfer, not the image's decoded pixel dimensions.

The loader explicitly configures image orientation, sRGB, mipmaps and longitude wrapping. It handles aborts, closes late image decodes, replaces the placeholder material and releases bitmap/GPU resources on disposal. A failed request leaves a cheap ocean surface and a visible diagnostic failure state; it never silently reinstates procedural weather generation. Diagnostics now report Earth source/readiness/error, fetch/decode/readiness timings, image bytes/dimensions and estimated texture memory. Asset errors invalidate benchmark preparation.

### Controlled GPU observations

The standalone lab retains iteration 06 in `scripts/benchmarks/satellite-volume-reference.ts` and compares it with the actual new production modules. Its frozen build includes source and asset hashes. This measures the complete before/after designs—including the geographic change and the shared cloud rotation—not a pixel-identical shader substitution.

All **16 blocks / 960 GPU queries** completed and were valid, with no discarded runs or frame samples. Each run has ten warmup frames and sixty measured frames per block, with twenty-second blank rests before each block. Both orders use frozen time 180 seconds, zero pointer displacement and identical viewport/drawing buffers within each comparison. The device is an Apple M4 with 16 GB RAM, running the in-app Chromium 152/ANGLE Metal renderer. The compact configuration is a viewport on that Mac, not a physical phone or Safari measurement.

| Configuration | Order | Mean background GPU before → after | Observed reduction |
| --- | --- | ---: | ---: |
| 1280×720, DPR 2 | ABBA | 5.958 → 3.297 ms | 44.7% |
| 1280×720, DPR 2 | BAAB | 4.689 → 3.512 ms | 25.1% |
| 390×844, DPR 1 | ABBA | 0.868 → 0.460 ms | 47.0% |
| 390×844, DPR 1 | BAAB | 0.769 → 0.491 ms | 36.2% |

Every adjacent A/B block pair favors the new design. However, repeated baseline block means drift by +13.8%, +27.1%, −17.8% and −12.3% across the four runs. This variation prevents a universal or tightly bounded speedup claim. The evidence supports lower background GPU work in these comparisons. It does not establish a whole-site FPS increase, lower temperature or battery savings. Frame intervals remain near 16.67 ms for both. CPU submission does not improve consistently: compact ABBA increases from 0.529 to 0.567 ms, while the other three run means fall.

Native pressure was **fair** after setup. Rendering and builds were stopped, followed by idle time and two nominal observations before measurement. All nine subsequent recorded observations were nominal; sampled power contexts remained AC/charging with Low Power Mode disabled. Neither these sparse readings nor the fixed pauses prove constant clocks, cold hardware or complete thermal coverage. Other user workloads and ambient temperature were not controlled. [Declared protocol and thermal interpretation](evidence/performance/satellite-earth-2k/protocol.md).

Preparation timings are retained separately, not promoted to a first-load improvement: the first desktop local ready milestone was 79.6 ms before versus 96.7 ms after; compact preparation was 49.0 versus 24.9 ms. These use fixed A-then-B module preparation, local delivery and uncontrolled browser/driver caches. Reverse-order runs reuse those environments. No cold-network or network-throttled benchmark was performed.

[Raw results, source verification, block means and limitations](evidence/performance/satellite-earth-2k/audit-summary.md) · [Before view](evidence/performance/satellite-earth-2k/before-desktop-180.png) · [After view](evidence/performance/satellite-earth-2k/after-desktop-180.png) · [Full portfolio](evidence/performance/satellite-earth-2k/portfolio-desktop.png).

### Validation

All **198 repository tests passed** and the production build succeeded. Type checking and targeted type-aware lint passed for the changed renderer, loader, comparison fixture and new tests. Repository-wide lint still reports existing issues in unrelated room code and older test fixtures; it is not claimed to pass. Production and isolated browser checks covered desktop/compact layouts, asset success, globe rotation and an About navigation. No browser console errors were observed. New tests cover explicit decode orientation/color, failed requests, cancellation at each asynchronous boundary, late-resource cleanup, stable transforms, active-time pause/reset, memory accounting and single disposal. Historical cloud tests now explicitly target the retained comparison implementation.

The next optimization candidates remain on hold.


## 08 — 4K satellite image quality upgrade

**Approved and implemented, 14 September 2026.** The user rejected the 2K appearance and requested 4K. The active asset is now a **4096×2048 JPEG**, derived directly from the verified original **8192×4096 NASA TIFF**, not upscaled from the 2K output. The offline preparation script accepts explicit 2048, 4096 or 8192 widths; 4096 is the current default. The 2K asset remains available for the historical record but is not fetched by production.

This is an approved visible quality increase, not a performance optimization. Framing, geographic orientation, globe geometry, surface shader, atmosphere, filtering and rotation remain the same as iteration 07. Twice the detail in each direction makes clouds and coastlines sharper, but the foreground still magnifies a small part of the full globe map. Four thousand pixels cover the entire planet, not just the visible strip. 4K therefore should not be described as an inherently optimal or fully crisp resolution for this close perspective.

| Cost | 2K before | 4K after |
| --- | ---: | ---: |
| Dimensions | 2048×1024 | 4096×2048 |
| Download | 526,263 bytes | 1,925,103 bytes |
| Nominal RGBA8 base pixels | 8,388,608 bytes | 33,554,432 bytes |
| Estimated texture plus full mip chain | 11,184,812 bytes | 44,739,244 bytes |
| Background draw count / geometry | Iteration 07 | Unchanged |

The download is approximately 3.66 times larger than 2K; texture storage is approximately four times larger. These are verified asset bytes and calculated texture payload, excluding driver overhead and retained decoded-image memory. The 4K output SHA-256 is `ea8940c7f59de7aea44dce96c021f9c9bf7d1adae328fe9fbdc0449fa6535797`; the [public manifest](../public/textures/earth-blue-marble-4k.json) contains full source and encoding provenance.

No new timed GPU/thermal comparison was requested or run in this image-quality iteration. Iteration 07's GPU percentages remain measurements of **2K** and must not be reused as 4K results. The same shader and draw counts do not prove identical GPU time: larger textures can change cache and bandwidth cost, and image decode/upload work also increases.

8K is available from the retained source and would improve spatial detail again, at about **178.96 MB** of estimated RGBA8 texture/mipmap storage. Upscaling beyond that source cannot invent detail. If the close desktop foreground still needs greater clarity, genuinely higher-resolution geographic tiles would concentrate detail in the visible region more efficiently than loading an enormous global map; that is a separate implementation proposal, not enabled here. [Resolution/framing investigation](evidence/performance/satellite-earth-4k/resolution-review.md).

**13 focused tests**, type checking, targeted type-aware lint and the production build passed. Tests validate the new decoded dimensions/memory and retain request failure, cancellation, ownership, disposal and active-clock coverage. The full portfolio successfully loaded the 4K asset; the frozen desktop comparison was checked at the same 1280×720/DPR2 framing and 180-second position as iteration 07. [4K view](evidence/performance/satellite-earth-4k/desktop-180.png) · [2K view](evidence/performance/satellite-earth-2k/after-desktop-180.png). Validation logs remain in the 4K evidence directory. No unrelated optimization candidates were activated.

## 09 — 8K Earth and four-version rendering comparison

**Approved and implemented, 14 September 2026.** The user requested an 8K trial and a rendering-performance comparison against 2K, 4K and the retained generative implementation. Production now requests `earth-blue-marble-8k.jpg`: **8192×4096**, encoded directly from the verified original NASA TIFF at JPEG quality 85. This preserves original source dimensions; it does not upscale the smaller outputs. Source, encoder and output identity are recorded in the [8K manifest](../public/textures/earth-blue-marble-8k.json). Its SHA-256 is `f634e862be1689420d2d2dc5adf8fa460acece6896c9df1d9a67b3adde04f6de`.

The default offline preparation width is now 8192. The 2K and 4K assets remain available for comparisons, but production loads only 8K. The same production loader now accepts those three explicit sizes for developer audits and verifies the exact decoded dimensions. This keeps filtering, image orientation, color handling, materials, globe geometry, framing, rotation and resource ownership consistent across resolution tests. No unrelated performance candidate was enabled.

### Baseline and repeatable method

The original image-free cloud implementation is still retained in `scripts/benchmarks/cloud-reference.ts`, SHA-256 `ec83790e30c7559d17580076fbda53addc2aa67a1d1c9895dffb29bbb0de21c9`. It generates a small 3D noise texture at startup and evaluates procedural clouds while rendering. This is the requested generative reference, **not** the later satellite cloud volume used in iteration 07. It retains its original appearance and geographic orientation; this is a comparison of complete background designs, not identical pixels.

The new [four-version lab](../scripts/benchmarks/earth-resolution-lab.md) freezes source and asset hashes before testing. Four Williams orders balance each variant's serial position and predecessor per viewport. Each block has a 20-second blank rest, native context checks, ten warmup frames and sixty measured frames with asynchronous GPU queries. Desktop uses 1280×720 at drawing DPR 2; compact uses 390×844 at DPR 1 on the same Apple M4, 16 GB Mac. Both freeze time at 180 seconds and pointer displacement at zero. These are Chromium/ANGLE Metal measurements, not Safari or physical-phone tests.

All **eight rounds / 32 blocks / 1,920 GPU queries** completed without exclusions. The four blocks per variant per viewport are repeated observations; their constituent frames are correlated. All **72 native observations** were nominal, with Low Power Mode off and the power source consistently on battery. Preparation preceded an idle recovery of at least 60 seconds and two additional nominal readings for each viewport. The four recovery observations are retained separately. Other workloads and ambient temperature were uncontrolled; nominal OS pressure and fixed rests do not prove equal clocks or complete cooling. [Declared protocol](evidence/performance/earth-fourway/protocol.md) · [Recovery observations](evidence/performance/earth-fourway/recovery.jsonl).

### Measured steady rendering

GPU queries cover the full orbital background, excluding the spacecraft and application UI. CPU submission values are elapsed browser wall durations around update/render calls, not native CPU utilization. Lower milliseconds indicate less work in this experiment.

| Version | Desktop GPU mean | Desktop block-mean range | Compact GPU mean | Compact block-mean range | CPU submission mean, desktop / compact |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original procedural clouds | 6.921 ms | 6.143–7.809 ms | 0.918 ms | 0.796–0.991 ms | 0.504 / 0.437 ms |
| 2K satellite | 3.596 ms | 3.200–4.025 ms | 0.461 ms | 0.441–0.473 ms | 0.440 / 0.418 ms |
| 4K satellite | 3.281 ms | 2.803–3.618 ms | 0.474 ms | 0.430–0.514 ms | 0.430 / 0.410 ms |
| 8K satellite | 3.413 ms | 3.300–3.524 ms | 0.514 ms | 0.461–0.627 ms | 0.409 / 0.368 ms |

The satellite designs require substantially less measured background GPU time than the generative design here. The resolution variants' block ranges overlap and their ordering changes across runs: this does **not** establish that 4K is intrinsically faster than 2K, or that 8K has no per-frame cost. Their mean CPU differences are small and do not establish a reliable resolution-dependent CPU improvement. Display-paced frame intervals stay near 16.67 ms for every version, so no whole-site FPS increase, heat reduction or battery saving is claimed.

Satellite versions submit six background draws versus seven for procedural clouds. Submitted triangles are 72,964 versus 97,284 desktop and 36,292 versus 48,388 compact. The three resolutions have identical draws and geometry. The old design's cloud shader is also removed, so the timing difference must not be attributed solely to its extra draw.

### Startup, transfer and memory tradeoff

| Version | Earth image download | Estimated Earth texture with mip chain | First submitted local preview, desktop / compact |
| --- | ---: | ---: | ---: |
| Original procedural clouds | None | 0.599 / 0.075 MB, desktop / compact | 77.1 / 46.8 ms |
| 2K satellite | 526,263 bytes | 11.185 MB | 68.1 / 59.3 ms |
| 4K satellite | 1,925,103 bytes | 44.739 MB | 133.8 / 141.6 ms |
| 8K satellite | 6,615,276 bytes | 178.957 MB | 447.4 / 437.0 ms |

Preparation is **one fixed-order sequence per viewport**, procedural → 2K → 4K → 8K, reused across the measured rounds. These are local observations with shared/uncontrolled caches, not replicated cold-network load tests or presentation timestamps. The 8K observations include about 226 ms of image decode and 182–184 ms in the first render submission, which includes initial upload work. That initial work can delay or hitch the first appearance even when later frames are inexpensive. Full phase timings and the first-render GPU query are preserved in the audit.

The 8K image costs about **3.44× the transfer and 4× the texture storage of 4K**. Memory figures are calculated texture payload in decimal MB, not measured physical GPU allocation or process memory. They exclude the retained decoded bitmap, geometry, framebuffers and driver overhead. The lab deliberately keeps all four environments resident (about 236.18 MB desktop / 235.13 MB compact of estimated texture payload); production has one Earth. This limits extrapolation to memory-constrained devices. No image download for the procedural version does not mean zero JavaScript delivery or startup generation cost.

**Decision:** keep the requested native 8K trial active. These measurements support it as a quality increase with a clear loading/memory penalty and a comparatively small, unresolved steady-rendering difference from 4K on this device. They do not justify increasing the global map beyond the retained source's native resolution. Any adaptive resolution, tiled imagery or loading behavior change remains a separate proposal.

### Validation and evidence

**15 focused tests passed**, covering all three loader sizes, exact dimensions/memory, rendering transforms, active-clock behavior, error recovery, cancellation and resource disposal. Type checking, targeted type-aware lint and the production build passed. Production diagnostics confirmed the loaded 8192×4096 image and exact 6,615,276-byte payload with no asset error; browser checks reported no console warnings or errors. Frozen desktop/compact views and the [live portfolio capture](evidence/performance/earth-fourway/portfolio-8k.png) are saved alongside validation logs.

The independent [saved-results audit](evidence/performance/earth-fourway/audit-summary.md) recomputes statistics from raw frames, verifies source/asset identity and balanced ordering, checks dimensions/draws/telemetry and deduplicates preparation records. It can be rerun with `node scripts/audit-earth-fourway.mjs` without rendering or heating the GPU. [Structured summary](evidence/performance/earth-fourway/audit-summary.json) · [Audit log](evidence/performance/earth-fourway/audit-output.log). Earlier ledger results remain historical and are not substituted for this new battery-powered comparison.

## 10 — Night Earth and selectable opening views

**Approved and implemented, 14 September 2026.** The user requested several strong Earth compositions for the beginning of a visit, a way to select among them, and a night version if available. Production now uses the local 8K NASA Black Marble 2016 color map. Mediterranean, East Asia, India and North America presets bring recognizable city-light patterns into the foreground. A small Earth control opens the preset selector and manual longitude, latitude, roll, apparent-size and horizon adjustments, plus Earth-only pause/resume, replay and reset. The chosen settings persist in this browser's local storage.

### Source and rendering choice

NASA's [Black Marble map page](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/) documents a historical composite selected from cloud-free nights throughout 2016. Credit: **NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS data from Miguel Román, NASA GSFC**. This is not live weather or one simultaneous photograph of the whole Earth. The image has dark geographic surfaces and city lights, with no added clouds, glow, sharpening or artistic color adjustment. NASA explains that clouds in some promotional globe views are added from Blue Marble separately; this implementation uses the cloud-free flat map. [Source processing explanation](https://science.nasa.gov/earth/earth-observatory/night-light-maps-open-up-new-applications-90008/).

The source GeoTIFF is 13500×6750, so the 8192×4096 output is a genuine downsample. The developer-only preparation script verifies its source hash and dimensions, uses one Sharp worker with Lanczos3, and encodes sRGB JPEG quality 90, MozJPEG and 4:4:4 chroma to retain fine colored lights. Runtime requests only the checked-in same-origin JPEG, never NASA or the 64 MB source. [Manifest and provenance](../public/textures/earth-black-marble-8k.json) · [Reproducible source preparation](../scripts/assets/README.md#night-earth-color-map).

Night rendering uses one `MeshBasicMaterial` surface map with `toneMapped: false`, so photographed city lights are not shaded again by the daytime sun. The globe geometry and two atmosphere shells are retained. There is no additional cloud layer, client weather bake or continuing video decode. Changing a view adjusts the existing globe rather than loading another image or creating another background scene. Tests verify the same texture, material and geometry remain, with no additional request, decode, texture upload or disposal during setting changes.

### Delivery and cost limits

| Property | Previous 8K day map | New 8K night map |
| --- | ---: | ---: |
| Local JPEG payload | 6,615,276 bytes | 2,329,878 bytes |
| Pixel dimensions | 8192×4096 | 8192×4096 |
| Estimated RGBA8 texture with full mip chain | 178,956,972 bytes | 178,956,972 bytes |
| Earth surface maps / atmosphere shells | 1 / 2 | 1 / 2 |

The night image is **4,285,398 bytes / 64.8% smaller to transfer**, but its nominal texture storage is unchanged at about **178.957 decimal MB**. These are asset bytes and calculated texture payload, not measured driver/process memory. Decoded CPU bitmap memory and driver overhead remain additional. A smaller JPEG does not by itself establish faster image decode or first presentation.

**No new timed GPU comparison was performed.** This entry records structural behavior and delivery size, not a measured frame-time, heat or battery improvement. Entry 09's four-way measurements used daytime textures; they do not measure the new night material or its revised geographic framing. The original day assets and historical comparison path remain accessible so those experiments are still reproducible. No next optimization candidate was enabled.

### Opening behavior and validation

The initial scene placeholder remains until the night asset load settles, preserving the selected opening instead of spending its first seconds on an unloaded Earth. A failed load still allows the inexpensive fallback and its diagnostic error. Earth replay resets only its opening timer, and its pause/resume excludes paused time without resetting stars or meteors. Camera navigation remains independent. Settings are normalized before they reach transforms; invalid stored values recover to defaults and finite values are clamped to supported bounds.

**22 focused tests passed**, with type checking, targeted lint and the production build. New tests project the selected geographic point through actual scene matrices at 1280×720, 2560×600, 390×844 and 768×4096, covering every preset and all combinations of manual limits at 0, 5 and 10 seconds. The 432 checks assert visible foreground placement, a front-facing surface, finite transforms, clipping-plane clearance and a camera outside the atmosphere. An early failing ultrawide case led to more lower-edge margin; portrait framing also gained its own anchor and a fallback when a tall custom setting would aim above the limb. The original visibility assertions now pass. Additional tests cover stored settings, photographic night shading, local-loader/resource lifecycle, independent motion clocks and actual asset dimensions/hash.

Browser review saved **24 opening captures**: four presets, two viewport sizes, and nominal 0/5/10-second checkpoints. Their actual elapsed times, settings, readiness and rotation are retained in `opening-checks.json`; these are running-scene observations rather than precisely frozen times. A custom paused view was checked with the global clock still advancing, then reloaded to verify persistence. These checks do not constitute a GPU benchmark or a physical-phone/Safari test. [Visual review, browser records and validation logs](evidence/night-earth-openings/README.md).

### Safari interaction correction — 14 September 2026

The user subsequently reported unusable Earth controls in Safari. Native **Safari 26.6.2** reproduced a panel-dismissal bug: pressing a preset focused the surrounding `main` ancestor, and the outside-focus handler unmounted the button before its click applied. The selector now distinguishes pointer-origin ancestor focus from genuinely leaving the panel. Outside clicks, keyboard Tab-out, and Escape retain their dismissal behavior; native inputs and sliders retain their default interactions.

The fix was verified in actual Safari with presets, all five manual fields, slider dragging, pause/resume, replay, reset, persisted custom values after reload, and room-safe Escape. **29 focused tests passed**, including seven event-sequence regressions. This corrects the earlier Chromium-only validation gap; it is not a rendering optimization. No assets, scene geometry, animation or performance candidates changed, and no GPU/thermal improvement is claimed. [Reproduction, native checks and logs](evidence/safari-earth-controls/README.md).

## 11 — Fixed Mediterranean opening, 2K night map and refined atmosphere

**Approved and implemented, 14 September 2026.** The user selected Mediterranean, requested unused-code cleanup and prioritized an artistic but believable atmosphere. A follow-up selected 2K. Production now loads the 2048×1024 NASA Black Marble JPEG, downsampled directly from the retained verified original GeoTIFF. It is **179,391 bytes**, 92.3% smaller than the preceding 8K night map. Estimated RGBA8 texture storage including mipmaps falls from **178,956,972 to 11,184,812 bytes** (93.75% smaller); decoded CPU image storage and driver overhead are additional. Foreground city lights are softer at the selected lower resolution.

Mediterranean is fixed in the renderer. The selection panel, manual controls, dedicated CSS, storage preferences, preset catalogue, replay/settings state and event plumbing were removed. Earlier browser-local choices no longer affect the opening. The Safari fix in entry 10 remains a historical record of the temporary picker; its now-orphaned dismissal helper/tests have also been removed. The loader, geometry placement, image-readiness behavior and global motion/lifetime checks remain tested.

The former broad saturated blue halo becomes a softer blue-violet lower atmosphere with a faint amber upper airglow and varying brightness along the curve. NASA's [airglow reference](https://earthobservatory.nasa.gov/images/147122/aurora-meet-airglow) distinguishes the twilight blue horizon from nighttime airglow and aurora. This rendering is an artistic twilight treatment, not a physically calibrated simulation. Both density profiles share **one atmosphere draw** instead of two; the photographic surface is unchanged. The unused night daylight rig was removed. No extra texture, bloom or blur pass was introduced. Daytime benchmark behavior and the historical assets remain available for comparison.

**25 focused tests**, type checking, targeted lint and the production build passed. Actual Safari desktop and Chromium compact/wide visual checks passed; live DOM-backed diagnostics confirm the 2K source, fixed geography and single atmosphere layer. Source/asset checks, captures and logs are in the [implementation evidence](evidence/mediterranean-night/README.md).

This is an approved visual/resolution change with verified delivery, nominal-memory and draw-count differences. It is **not a measured GPU, FPS, heat or battery improvement**: the new shader changes fragment work, and no controlled timed A/B was run. The saved live diagnostics contain incidental timings for integration review only. No next optimization candidate was enabled.

## 12 — 4K night Earth with cinematic blue atmosphere

**Approved and implemented, 14 September 2026.** The user requested 4K and rejected the muted warm/gray atmospheric appearance in entry 11. Production now loads a **4096×2048** night JPEG downsampled directly from the verified NASA original. Mediterranean remains the fixed opening. The image is **637,946 bytes**, compared with 179,391 bytes at 2K. Estimated RGBA8 texture storage with mipmaps rises from **11,184,812 to 44,739,244 bytes**, approximately four times the payload and still 75% below 8K. Decoded CPU image memory and driver overhead are additional.

The warm upper band and desaturated haze are removed. The replacement is deliberately cinematic: a narrow cyan-blue crest with a cobalt halo fading into indigo, varying gently along the globe's curve. It falls away quickly over the surface to keep the ocean dark and city lights visible. The existing single atmosphere draw and shared sphere geometry remain; no bloom buffer, blur pass, extra texture or animation was added. The preparation script supports all three night sizes and defaults to 4K. Historical assets remain available to comparison tools.

Actual Safari and Chromium compact/wide checks confirmed the appearance and successfully loaded 4K asset; no Chromium console warnings/errors were reported. **25 focused tests**, type checking, targeted lint and the production build passed. [Captures, source verification and logs](evidence/cinematic-earth-4k/README.md).

This is an approved quality/art-direction change, not a measured performance optimization. No controlled GPU, frame-time or thermal A/B was run, and no next optimization candidate was enabled. The higher image resolution has a verified transfer and nominal-memory cost; unchanged draw counts do not imply identical GPU timing.

## 13 — 8K night Earth and resolution comparison

**Approved and implemented, 14 September 2026.** The user requested 8K again, plus download, memory and performance comparisons. Production now selects the retained **8192×4096 NASA Black Marble map**. Mediterranean and the cinematic cyan/cobalt/indigo atmosphere from entry 12 remain unchanged. This is an approved image-quality change, not an optimization. No next candidate was enabled.

### Image delivery and memory

All three JPEGs were independently checked against their recorded dimensions, file sizes and SHA-256 hashes. The full mip chain was recalculated from actual dimensions. They share the same NASA source and preparation settings.

| Map | Dimensions | Image download | Estimated RGBA8 map with mipmaps | Illustrative decoded RGBA image |
| --- | --- | ---: | ---: | ---: |
| 2K | 2048×1024 | 179,391 B / 0.179 MB | 11,184,812 B / 11.2 MB | 8.4 MB |
| 4K | 4096×2048 | 637,946 B / 0.638 MB | 44,739,244 B / 44.7 MB | 33.6 MB |
| 8K | 8192×4096 | 2,329,878 B / 2.330 MB | 178,956,972 B / 179.0 MB | 134.2 MB |

MB is decimal. These are Earth-image payloads, not total website downloads or measured process/physical GPU allocations. Decoded image format, driver padding, geometry and framebuffers add separate costs. **8K uses approximately 3.65× the image transfer and 4× the map storage of 4K.** The resolution lab holds all three environments resident: combined nominal Earth-map storage is 234.9 MB, before their other allocations. Production retains one Earth, so this lab cannot establish how constrained-memory devices react to a production 8K map.

### Measured rendering and observed conditions

The developer-only [resolution lab](../scripts/benchmarks/earth-resolution-lab.md) now supports the current night environment directly. All six permutations of 2K/4K/8K were completed separately in native Safari and Chromium: **10 warmup frames and 120 measured frames per block**, with **20 seconds of blank idle before every block**. Each resolution contributes six blocks / 720 measured frames per browser. Both browsers used a 1422×871 CSS viewport and 2844×1742 drawing buffer, the initial Mediterranean view, the same stars and single atmosphere layer. Every measured background frame had **4 draws, 48,642 triangles and 3,100 points**. The spacecraft, app UI and navigation are outside this measurement.

The accepted reports contain **84 nominal native thermal observations**, with Low Power Mode disabled and Battery Power throughout. These are OS context observations, not temperatures or proof of complete cooling/identical clocks. The 20-second interval is an experimental rest policy, not an externally guaranteed cooling period. Raw data and exact frozen source/asset hashes are preserved.

Native Safari's first final-order attempt coincided with a screen lock. That original report says complete, but it is **retained and explicitly excluded** using the recorded interruption, then replaced by a fresh BAC round after native access returned. No samples were removed for being slow. The Chromium rounds ran while the in-app browser remained visible and returned valid GPU timer queries; however, native access was blocked at the beginning and available afterward, and the exact lock-state transition was **not observed**. Its display condition is therefore recorded as **unobserved**, not continuously locked or ordinary foreground operation. These GPU data remain descriptive; balanced order cannot remove this environmental uncertainty. [Display conditions](evidence/performance/night-earth-resolution/conditions.json), [retained exclusion](evidence/performance/night-earth-resolution/exclusions.json).

| Map | Chromium background GPU mean | Six GPU block means, min–max | Chromium CPU submission wall mean | Safari CPU submission wall mean | Safari mean frame interval |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2K | 2.243 ms | 2.091–2.548 ms | 0.330 ms | 0.353 ms | 16.668 ms |
| 4K | 2.182 ms | 2.017–2.280 ms | 0.316 ms | 0.394 ms | 16.669 ms |
| 8K | 2.207 ms | 1.998–2.402 ms | 0.289 ms | 0.342 ms | 16.667 ms |

**The steady-rendering results do not reliably rank the resolutions.** The pooled 8K/4K GPU difference is approximately +0.025 ms / +1.2%, but its direction changes between rounds and the block ranges overlap. Neither the lower observed 8K CPU mean nor the slightly higher 2K GPU mean establishes a resolution-driven speedup. Safari does not expose the GPU timer extension here; its GPU values remain unavailable. Its CPU durations were recorded at approximately whole-millisecond granularity, limiting interpretation of small differences. Safari frame pacing was similar across maps in this isolated workload. Chromium's roughly 33.3 ms intervals reflect its separately scheduled browser context; they must not be read as Safari being twice as fast or converted into unconstrained frame-rate capability.

### Preparation observations and decision

Each browser prepared the maps once, in 2K → 4K → 8K order, then reused them across all rounds. The auditor deduplicates those records: **three unique preparations per browser**, not six repeated cold startups per map.

| Map | Safari image decode | Safari first submitted frame | Chromium image decode | Chromium first submitted frame |
| --- | ---: | ---: | ---: | ---: |
| 2K | 17 ms | 90 ms | 16.0 ms | 73.9 ms |
| 4K | 52 ms | 114 ms | 55.3 ms | 133.8 ms |
| 8K | 205 ms | 419 ms | 221.4 ms | 466.9 ms |

These are local first-environment submission observations, including readiness and initial GPU upload work, with shared browser/module/shader caches. They are **not Internet page-load estimates or a balanced replicated startup benchmark**. They nevertheless document substantially more one-time preparation work for the retained 8K image in both observed sessions, alongside its unambiguous transfer/storage increase.

**Recommendation:** 4K remains the balanced default for a broad portfolio audience: materially sharper city lights than 2K, with one quarter of 8K's nominal map storage and a much smaller download. The requested **8K stays active** for its extra visual detail; the sampled steady-rendering data do not establish a meaningful penalty or a heat/battery benefit from lowering it. Choose 2K primarily when minimizing delivery/storage takes priority over the visible softness of the foreground city lights.

The reusable [audit script](../scripts/audit-night-earth-results.mjs) passes all declared structural/source/asset/order/counter/telemetry checks, with the environmental and timer limitations explicitly reported. It preserves raw interruption exclusions and groups display conditions separately. [Full audit and tables](evidence/performance/night-earth-resolution/audit-summary.md), [machine-readable audit](evidence/performance/night-earth-resolution/audit-summary.json). Focused tests, type checking, targeted lint and the production build are recorded in the [implementation evidence](evidence/performance/night-earth-resolution/README.md).

## Next candidates

The tiny-hardware proposal from iteration 01 is now implemented for its two priority targets. Additional detail reduction should start from a new measured ranking instead of applying a global quality reduction. The remaining candidates and their tradeoffs are retained in the [initial investigation](performance-optimization-review.md#visual-or-motion-tradeoffs--not-implemented): distance-dependent detail, optional adaptive resolution, optional lower-power idle behavior, broad shell curvature, AO quality, and room visibility. None is enabled by this iteration.

Prioritize **offline lossless geometry compaction** next. It aims to retain the exact visible geometry and avoid the measured runtime preparation work; its actual browser benefit still needs verification. For changes that would affect the experience, an optional lower-power idle mode remains worth prototyping: ambient motion would pause or become less fluid while idle, then resume for interaction. An optional resolution setting could reduce sustained GPU work but would soften fine room text and edges. Both need explicit design approval and remain disabled. Further broad chassis simplification is a poor fit for the newly requested smooth corners.

For repeatable tests on a passively cooled device, use the [rested testing workflow](performance-diagnostics.md#rested-cpu-candidate-comparisons) and preserve native telemetry, exclusions and power-source context. Keep browser, viewport and drawing buffer fixed for later browser A/B tests. Neither browser timing nor nominal OS pressure identifies temperature or proves the cause of a slowdown.
