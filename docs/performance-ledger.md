# Spacecraft performance ledger

This is the running record of implemented optimizations, measured results, visual checks and remaining candidates. Timing results are specific to their recorded browser, viewport and conditions; geometry counts provide a separate device-independent measure of work. Open **Tools → Scene diagnostics** at the bottom right to repeat measurements using the [diagnostics guide](performance-diagnostics.md).

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
| 19 · 15 September 2026 | Delivered camera/invalidation audit; reuse AO through material-only feedback | Three accepted Contact blocks: CPU 4.559→4.082ms; 75→0 AO refreshes per 180 frames. Whole-frame GPU comparison and exclusions recorded; other candidates held. |
| 21 · 15 September 2026 | Compare cached shadows with an offline native-depth bake | Developer prototype retained; no production replacement. Exact landscape transport, visibly incorrect stale portrait shadows, unchanged steady work and inconclusive timing. |
| 22 · 15 September 2026 | Audit baked static contact shading and a live-zone hybrid in Projects | Owner approved retaining existing GTAO. Both developer candidates change appearance; subdivision adds geometry and shading artifacts. |
| 23 · 15 September 2026 | Approximate prefiltered environment illumination with a fitted probe | Audited; delivered illumination retained. Both probes visibly alter shading, and the rested GPU controls fail the stability gate. No production bake is enabled. |
| 24 · 16 September 2026 | Contact computer application and animated keyboard | New authored baseline, not an optimization. Structural visible triangle inputs +664; retained geometry arrays −388,324 bytes after removing the old Contact tablet. One new keyboard atlas costs 2.667 MiB nominal texture storage. |
| 25 · 16 September 2026 | Contact screen clearance, active social controls and wall dismissal | Structural model counts/storage unchanged against `917e7e0`. New exposed-wall picking reuses exact-ray results after geometry/camera settling; descriptive Node workload sizing does not establish browser speed, heat or battery gains. |
| 27 · 18 September 2026 | Surrounding stars, clearer twinkle and a longer land-facing Earth opening | New art baseline: desktop star arrays +0.37 MiB, same one star draw and 8K asset. Sampled terrain-color dominance lasts roughly 12 minutes before dropping below 40%; this is a visual proxy, not a timing gain. |
| 28 · 18 September 2026 | Retarget the early Earth pass toward visible city lights | Land coverage proved misleading. At unchanged rotation speed, weighted warm-light coverage over the first five minutes improves across all three tested layouts; texture, geometry and shaders are unchanged. |
| 29 · 18 September 2026 | Temporary Earth composition helper for the owner's final selection | The coastal opening remains unsatisfactory to the owner. Presets, direct angle controls, Earth-only preview and portable settings enable an explicit choice; no new opening or performance optimization is adopted. |
| 30 · 20 September 2026 | Fixed Earth scene and compact coastal loop | Native Europe detail retained; 21.05% fewer download bytes and 68.75% less nominal map storage. New art/camera baseline; measured timing and limitations in entry 30. |

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
node --test tests/spacecraft/tiny-hardware-detail.test.mjs
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

Visual review covered About and Case Studies at their regular view, the tilted docking mount, 390×844 room/overview layouts, and frozen cloud views at 0/60/ 180 seconds on desktop and phone-sized canvases. The desktop build uses native DPR 2. [Visual and validation evidence](evidence/cloud-room-refinement/README.md).


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

The checked-in asset is `public/textures/earth-blue-marble-2k.jpg`, **526,263 bytes**, SHA-256 `d2c003cc2e865c474245884cb16c9aeeb30349c8acc06e4dfb92594b2c12bbc5`. It is reproducibly resized from NASA's verified 8192×4096 TIFF with Lanczos3 and encoded as JPEG quality 85. The normal path requests only the local image, not the large source or NASA servers. Source credit, SHA-256, projection and encoder versions travel in the [manifest](evidence/performance/earth-fourway/assets/earth-blue-marble-2k.json) and [preparation instructions](../scripts/assets/README.md).

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

The download is approximately 3.66 times larger than 2K; texture storage is approximately four times larger. These are verified asset bytes and calculated texture payload, excluding driver overhead and retained decoded-image memory. The 4K output SHA-256 is `ea8940c7f59de7aea44dce96c021f9c9bf7d1adae328fe9fbdc0449fa6535797`; the [archived manifest](evidence/performance/earth-fourway/assets/earth-blue-marble-4k.json) contains full source and encoding provenance.

No new timed GPU/thermal comparison was requested or run in this image-quality iteration. Iteration 07's GPU percentages remain measurements of **2K** and must not be reused as 4K results. The same shader and draw counts do not prove identical GPU time: larger textures can change cache and bandwidth cost, and image decode/upload work also increases.

8K is available from the retained source and would improve spatial detail again, at about **178.96 MB** of estimated RGBA8 texture/mipmap storage. Upscaling beyond that source cannot invent detail. If the close desktop foreground still needs greater clarity, genuinely higher-resolution geographic tiles would concentrate detail in the visible region more efficiently than loading an enormous global map; that is a separate implementation proposal, not enabled here. [Resolution/framing investigation](evidence/performance/satellite-earth-4k/resolution-review.md).

**13 focused tests**, type checking, targeted type-aware lint and the production build passed. Tests validate the new decoded dimensions/memory and retain request failure, cancellation, ownership, disposal and active-clock coverage. The full portfolio successfully loaded the 4K asset; the frozen desktop comparison was checked at the same 1280×720/DPR2 framing and 180-second position as iteration 07. [4K view](evidence/performance/satellite-earth-4k/desktop-180.png) · [2K view](evidence/performance/satellite-earth-2k/after-desktop-180.png). Validation logs remain in the 4K evidence directory. No unrelated optimization candidates were activated.

## 09 — 8K Earth and four-version rendering comparison

**Approved and implemented, 14 September 2026.** The user requested an 8K trial and a rendering-performance comparison against 2K, 4K and the retained generative implementation. Production now requests `earth-blue-marble-8k.jpg`: **8192×4096**, encoded directly from the verified original NASA TIFF at JPEG quality 85. This preserves original source dimensions; it does not upscale the smaller outputs. Source, encoder and output identity are recorded in the [8K manifest](evidence/performance/earth-fourway/assets/earth-blue-marble-8k.json). Its SHA-256 is `f634e862be1689420d2d2dc5adf8fa460acece6896c9df1d9a67b3adde04f6de`.

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

The source GeoTIFF is 13500×6750, so the 8192×4096 output is a genuine downsample. The developer-only preparation script verifies its source hash and dimensions, uses one Sharp worker with Lanczos3, and encodes sRGB JPEG quality 90, MozJPEG and 4:4:4 chroma to retain fine colored lights. Runtime requests only the checked-in same-origin JPEG, never NASA or the 64 MB source. [Manifest and provenance](../public/textures/earth-black-marble-8k.json) · [Reproducible source preparation](../scripts/assets/README.md#production-night-earth).

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

## 14 — Hull, ladder fit and quieter sky

**Approved visual work, 14–15 September 2026.** The rear hull now uses one
continuous depth profile with rounded rear edges; door guides and signs follow
the visible wall bounds; overlapping front ladder surfaces are removed. A pair
of contoured service covers fills the docking-side wall. Drag release springs
back into the ordinary hover view. These are quality and correctness changes,
not the next optimization experiments.

The service covers add **four static material batches and 8,688 triangles**.
Rear rounding adds geometry but uses the existing materials/render passes.
The complete source-hashed model inventory against `b64852f` changes from
**408 → 412 visible meshes, 820,490 → 887,896 triangles (+8.22%), and
28.32 → 31.22 MiB of geometry attribute/index arrays (+2.90 MiB)**. This includes
the new covers, denser contours, rounded rear construction and revised apertures.
It is a whole visible-scene inventory without camera frustum culling; it excludes
textures, instance buffers, JavaScript objects, render targets and other layers.
[Reproducible inventory](evidence/spacecraft-polish/geometry-inventory.json).
The revised physical shape requires a fresh browser baseline before future
performance comparisons. No GPU,
heat or battery improvement is claimed; unchanged pass counts alone cannot
establish unchanged rendering cost.

The deterministic sky audit records **69.0 → 34.3 meteor arrivals/minute** and
**1.32 → 2.40 seconds median travel duration**, with dimmer varied peaks and
stronger independent star twinkle. Longer trails in time mean any-streak
occupancy only changes from 86.6% to 84.0%; do not interpret half the arrivals as
half the rendering activity. Desktop star count (3,100), star buffers (136,400 B),
reused meteor slots (nine) and the approved 8K Earth remain unchanged. These are
schedule/analytical shader measurements, not GPU timings.

[Implementation, visual evidence and checks](evidence/spacecraft-polish/README.md),
[sky audit and limitations](evidence/spacecraft-polish/sky-review.md).
All optimization candidates below remain on hold. The next approved baseline
must include both the delivered world-camera system and this hull/sky revision.

## 15 — Ladder end fittings, visible exterior detail and overview composition

**Approved quality work, 15 September 2026.** Paired circulation-return fittings
fill the upper and lower curved walls of the ladder bay. Shallow thermal-louver
trays decorate the visible roof, aligned with the room bays and seated on the
existing curved pressure skin. Exterior scope is limited to surfaces visible
from the default, hover or supported drag views; no hidden rear decoration was
added. The fixtures follow the existing material batching and disposal paths,
with no new textures, lights or ongoing object animation.

The overview has a little more roof/side depth on broad screens and a gentler
portrait lean. Its direction interpolates with aspect ratio; the safe fit still
accounts for the entire drag and room-hover envelope. Hover excursion is smaller
while existing springs and navigation remain. Short landscape screens recover
some vessel space through reduced callout gutters. Screens below 480 pixels in
height still default to Reading view; this last improvement applies only after
an explicit Interactive view selection. The critic caught an existing resize guard
that stretched that opt-in canvas and left annotation coordinates stale on its
first portrait rotation. Matching renderer initialization to the visible viewport
fixed both issues; rejected and corrected captures are retained in the evidence.
The current camera contract is documented in [project context](PROJECT-CONTEXT.md#interaction-contract). The original numerical camera record is available at `8f99ba7:docs/room-camera.md` in Git history.

### Structural cost and comparison limits

The source-hashed wide-layout inventory against `a907e22` records:

| Inventory | Before | After | Change |
| --- | ---: | ---: | ---: |
| Visible meshes | 412 | 419 | +7 |
| Triangles, including instances | 887,896 | 895,624 | +7,728 (+0.87%) |
| Unique geometry attribute/index arrays | 31.2235 MiB | 31.9752 MiB | +0.7517 MiB |

The additions comprise **three ladder batches / 3,984 triangles** and **four
roof batches / 3,744 triangles**. The inventory traverses the active visible
scene without camera frustum culling. It excludes JavaScript object overhead,
instance buffers, textures, render targets and other scene layers. Geometry
array bytes are an exact structural accounting under that method, not measured
GPU allocation or process memory. A visible mesh count is not a measured draw
count across the final frame's rendering passes.

[Source hashes, method and raw inventory](evidence/composition-equipment/geometry-inventory.json)
and [visual checks and validation](evidence/composition-equipment/README.md)
preserve this quality change as a new baseline. The approved 8K Mediterranean
night Earth is unchanged. No timed GPU/CPU, thermal or battery comparison was
performed for this entry, so neither a speedup nor unchanged frame cost is
claimed. Smaller pointer excursions also do not establish fewer AO refreshes.

### Held optimization work

No candidate in the next-steps plan was enabled. Keep the current priority order
and the historical comparisons intact. Future approved profiling should use
this final camera and equipment state, with matched viewport, input and
background time; changed framing can change visibility, shading and pass work
independently of triangle count. The new ladder and roof groups provide clear
attribution boundaries for that baseline, but their small structural cost alone
does not justify prioritizing them ahead of the previously measured sinks.

## 16 — Sealed equipment and visible-room navigation

**Approved quality and interaction work, 15 September 2026.** The user requested
replacement of vent-looking equipment throughout the vessel, retaining only the
two air returns beside each of the four cabin headings. Those eight returns stay
in their existing positions. Other slits, perforated covers and louvres become
solid access covers, captive restraint fittings, docking wear pads or protected
edges. The previous roof trays become sealed cover assemblies, and additional
solid panels fill the visible docking shoulder and the ladder bay's curved
ceiling/floor. The cover shapes and captured hardware are artistic functional
cues, not a verified pressure, thermal or shielding design.

Visible room openings now provide navigation targets as well as their doors.
Hover previews the first connecting hatch on the route; activation retains the
selected final room, including when the route crosses intervening rooms. During
travel that destination uses the existing single pending slot, so a newer choice
overrides the earlier one and starts after the current arrival. Rounded opening
masks exclude the solid front frame and dividers. Door and ladder interlocks,
room arrangement, screen content and the approved 8K Mediterranean night Earth
remain unchanged. This is interaction work, not a performance optimization.

### Structural inventory

The integrated source-hashed wide model is compared with `453bf12`:

| Inventory | Before | After | Change |
| --- | ---: | ---: | ---: |
| Visible meshes | 419 | 416 | −3 |
| Triangles, including instances | 895,624 | 896,518 | +894 (+0.0998%) |
| Unique geometry attribute/index arrays | 33,528,472 B | 33,591,636 B | +63,164 B (+0.06024 MiB) |

Replacing the old grille details offsets most of the additional solid-cover
geometry. The count traverses the active visible model without camera frustum
culling. It excludes JavaScript overhead, instance buffers, textures, render
targets and other scene layers. These typed-array bytes are not measured GPU or
process memory; visible mesh counts are not the draw counts of a complete frame
across all passes. Navigation hit-testing cost is outside this geometry inventory.
The revised fittings introduce no new texture, light or ongoing object animation.

[Raw inventory, source hashes and exclusions](evidence/room-access-and-hardware/geometry-inventory.json)
record the combined change, rather than adding separate agent estimates. The
[inventory tool](../scripts/benchmarks/spacecraft-geometry-inventory.mjs) now resolves
historical source imports directly from the selected Git revision, including
paths renamed or removed from the checkout. This preserves reproduction of the
older baselines after `exterior-thermal-equipment.ts` became
`exterior-service-equipment.ts`; previous measurements are retained unchanged.

No controlled runtime CPU/GPU, frame-time, thermal or battery comparison was
performed for this entry. The small structural difference does not establish a
speedup or unchanged rendering cost. The [replacement audit](evidence/room-access-and-hardware/vent-audit.md)
and [implementation checks](evidence/room-access-and-hardware/README.md) preserve
the visual intent, exceptions and validation separately from the inventory.

### Held candidates

No performance-ledger candidate was enabled. Keep the existing priority order
and establish the next approved measurement baseline with these delivered
fittings, the current camera and the completed navigation behavior. Match hover,
room traversal and ladder routes when comparing frames; a different target or
route can change geometry visibility and AO refresh activity independently of
any optimization. No new optimization recommendation is established by this
quality task.


## 17 — Readable access equipment replaces generic filler

**Approved design work, 15 September 2026.** The user rejected entry 16's sealed
ladder/exterior covers as generic filler and explicitly prioritized design over
optimization. This revision replaces those panels with visibly functional access
hardware. A continuous exterior ladder climbs the docking shoulder and crosses
the roof, with raised rails, open rungs, seated posts and tether eyes. Inside, rigid
transfer grab bars and open rope reels occupy the curved ends. Two older framed
docking-side cassettes also become holstered rescue lights. Recessed hose couplings
replace the small anonymous junction lids.

The first interior attempt still resembled hoses and metal disks. Independent
visual review rejected it before acceptance; straight grasp sections, rigid alloy
elbows, a deeper wound drum and open flanges corrected that ambiguity. The new
review rubric gives 75% of its score to recognizable function, composition/color
and physical fit. Low geometry cost is not a substitute for those design goals.
The [design brief and iteration images](evidence/spacecraft-access-design/design-brief.md)
preserve the feedback and direction for a later case study.

### Structural accounting after visual review

The integrated source-hashed wide model is compared with `234de17`:

| Inventory | Before | After | Change |
| --- | ---: | ---: | ---: |
| Visible meshes | 416 | 415 | −1 |
| Triangles, including instances | 896,518 | 993,310 | +96,792 (+10.80%) |
| Unique geometry attribute/index arrays | 33,591,636 B | 35,847,012 B | +2,255,376 B (+2.1509 MiB) |

The added geometry supplies real rail sections, open mounting assemblies, grasp
clearance, rope windings and torch optics. It was not reduced to match the old
panel budgets. Reusing the existing material batching happens to leave one fewer
visible mesh; that does not establish a frame-time improvement. The count includes
all active visible model geometry without frustum culling. Geometry-array bytes
exclude textures, instance buffers, targets, JavaScript and other scene layers;
they are not process or measured GPU memory. No controlled GPU/CPU frame-time,
thermal or battery comparison was performed. The fixtures add no texture, scene
light or ongoing animation.

[Raw inventory and source hashes](evidence/spacecraft-access-design/geometry-inventory.json),
[physical clearance audit](evidence/spacecraft-access-design/ladder-surface-clearance.json)
and [visual/validation record](evidence/spacecraft-access-design/README.md) separate
structural accounting, geometric fit and artistic judgment. The minimum measured
hook-to-grip surface gap is 0.1191 scene units in compact layout and 0.1379 in wide;
these are geometry checks, not certified engineering margins. The 8K Earth,
camera-motion system, room contents and eight retained header vents are unchanged.
Overview fitting automatically includes the new exterior silhouette.

### Held candidates

No performance candidate was enabled. Keep entry 17 as the next measurement
baseline once optimization work is approved. Its deliberately richer silhouette
changes the geometry presented to the renderer, so historical frame timings must
not be treated as measurements of this revision. Preserve the existing priority
order and use matching camera, route, light and background states for any future
comparison. No new optimization recommendation follows from this design task.

## 18 — Symmetric access routes and simpler ladder ends

**User-directed design refinement, 15 September 2026.** Following approval of the
access-equipment direction, the user requested a full lower exterior ladder to
match the roof, a non-light replacement for both angled torches, and clear space
between both grab-bar pairs. The lower route now mirrors the entire upper route:
rails, rungs, mounting feet and tether eyes. Two stowed open-jaw spanners replace
the torches. Both interior reels and every associated lead, hook, axle and mount
are removed; the approved grab bars stay in place.

This remains design work. No held optimization was enabled. The former reel
clearance script was retired with its objects; commit `ef91e1a` preserves the
historical script and the prior evidence keeps its original measurements.

The source-hashed wide-model inventory against `2d52c7e` is:

| Inventory | Before | After | Change |
| --- | ---: | ---: | ---: |
| Visible meshes | 415 | 414 | −1 |
| Triangles, including instances | 993,310 | 1,012,382 | +19,072 (+1.92%) |
| Unique geometry attribute/index arrays | 35,847,012 B | 37,370,212 B | +1,523,200 B (+1.4526 MiB) |

These counts include all active visible model geometry without frustum culling.
They are not frame timing, total memory, GPU allocation, thermal or battery
measurements. The full lower route deliberately adds geometry; removing the
interior reels and replacing the lights offset part of that addition. No new
texture, scene light or ongoing animation is introduced. The 8K Earth and the
existing camera/navigation systems remain unchanged. Future approved profiling
should use this new design baseline rather than attributing its work to entry 17.

[Design and validation record](evidence/spacecraft-access-symmetry/README.md),
[raw inventory](evidence/spacecraft-access-symmetry/geometry-inventory.json) and
[critic review](evidence/spacecraft-access-symmetry/critic-review.md) record the
artistic acceptance and verification separately from structural accounting.

## 19 — Delivered camera and invalidation audit

The owner authorized candidate 1 on 15 September 2026, with implementation limited
to changes that preserve appearance and motion. The delivered source baseline is
`3e9bd67`, after repository organization. The approved 8K Mediterranean night Earth,
all geometry/materials, camera/door behavior, resolution, lights and AO quality
remain unchanged. This entry does not authorize the other candidates.

The audit found one safe, targeted opportunity. `motionActive` mixed actual
geometry movement with room brightness, highlight color/emission and opacity.
GTAO overrides materials to obtain normal/depth inputs, so color-only feedback
was needlessly recomputing identical contact shading. A monotonic geometry
revision now tracks real doors/readers/layout changes, including immediate and
final-snap changes. AO still follows camera position/orientation/roll, projection,
reader stretch, resize and explicit scene/filter invalidation. Existing camera
cache tolerances are retained. Color/feedback alone can reuse the AO texture.
The geometry-based rule is now the normal application default. The developer lab
retains the legacy rule and archived measured sources for future comparisons.

Diagnostics now distinguish an actual shadow-map generation from a pending
request. The nested generation CPU/count scope is part of the main ship pass;
it must not be added to that pass again. Raw frame annotations expose refresh
reasons and geometry revisions; GPU samples retain frame IDs. A reusable frozen
full-scene lab provides surveys, balanced comparisons and image checks without
changing the normal visitor loop. Paired GPU timing uses one whole-frame query;
pass timing remains available separately to avoid nested/overlapping queries.

### Measured result and limits

Hidden built-in Chromium / ANGLE Metal / Apple M4, 1440×900 CSS, 2529×1581 drawing
buffer, normal full scene and 8K Earth. Three pre-gated Contact blocks supply six
runs per policy (1,080 frames each). In the highlight-only replay:

| Metric | Before | After |
| --- | ---: | ---: |
| Mean callback CPU | 4.559 ms | 4.082 ms (10.47% lower) |
| Pooled callback CPU p95 | 5.700 ms | 4.700 ms |
| Mean actual frame interval | 20.749 ms | 18.800 ms |
| Pooled actual frame interval p95 | 26.800 ms | 22.500 ms |
| Raw sampled whole-frame GPU | 16.267 ms | 13.937 ms |
| Pooled sampled whole-frame GPU p95 | 22.606 ms | 15.660 ms |
| AO refreshes / 180 frames | 75 | 0 |

Each removed refresh submits 238 draws / 823,712 triangles. This is work eliminated
in this interaction, not a geometry simplification or idle improvement. The
camera/light/geometry checkpoints, settings and resource counts match in accepted
comparisons. No new textures, geometry, baked assets or quality reduction are
introduced by the reuse rule. The developer verifier alone allocates a temporary
AO backup target/readback arrays; normal visitors do not allocate them.

The fourth Contact block exceeded the 5% baseline spread gate, and subsequent
recovery failed. Its raw file retains `inconclusive-recovery`; it is not counted
as a successful whole session. Earlier accepted blocks show CPU reductions of
9.39–11.42%. GPU's fixed 15-frame sampling overrepresents AO-refresh frames: 6/12
sampled versus 75/180 actual. A separately labeled cohort-weighted GPU estimate is
15.926→13.937 ms, with 6.62–15.51% block variation. It is not every-frame GPU time.
CPU/frame evidence is stronger than a precise GPU percentage.

Native context reports nominal thermal pressure, Low Power Mode off and an
`AC Power` label while the battery reports discharging. These observations and
rest periods do not prove equal clocks, stable mains power or no throttling.
Other user workload was unobserved. No heat, energy or battery-life improvement
is claimed. Built-in Chromium results are not native Safari measurements.

### Visual acceptance and validation

The [wide comparison](evidence/performance/camera-invalidation/wide-visual-comparison.json)
contains 142 checkpoints per policy. Cached-versus-fresh difference metrics
match, and matched Contact, opening-door and ladder PNGs are byte-identical.
The first three idle scenarios began at different existing arrival-tolerance
poses; their cross-policy images are excluded from matched-image claims.

The final [portrait comparison](evidence/performance/camera-invalidation/portrait-visual-comparison.json)
uses one mounted scene/GTAO instance at an actual 900×1200 viewport and drawing
buffer, DPR 1, with AO enabled. All captured state and difference metrics match
across 170 checkpoints per policy; all six selected PNG pairs are byte-identical.
Six nonzero cached-versus-fresh settling checks reproduce the legacy cache
tolerances in both policies. The optimization introduces no additional image
difference and does not alter those tolerances.

Both portrait overview transitions are explicitly captured. Each 300-frame route
performs 140 shadow refreshes with either policy; refresh masks, light transforms
and the corresponding images match. Earlier sweeps performed these transitions
only during preparation, so they were insufficient evidence for roll. The final
[roll source archive](evidence/performance/camera-invalidation/roll-coverage-source.tar.gz)
and manifest preserve the corrected coverage.

The full application suite passed 267 tests; final targeted checks passed 26
(including three new summary tests and overlapping regression checks). Typecheck,
production build and changed-file lint passed. Full-repository lint retains 199
existing diagnostics against an independently checked baseline of 213. A normal
application/direct-entry/diagnostics smoke check passed in hidden Chromium.
The separate overview timing continuation failed both readiness groups (5.37%
and 23.73% spread) and stopped before comparison blocks. Its raw results remain
inconclusive; no overview timing benefit or equivalence is claimed. The evidence
folder's completion section records the independent critic review.

### Priorities informed by the audit

- Settled overview and all cabins reused AO on all 180 surveyed frames. Wide
  hover/drag/cabin travel preserved light/shadow transforms and generated no new
  shadow maps. Portrait roll does refresh the light-relative map, as verified
  above. Do not target repeated idle shadow generation: it was absent.
- Main spacecraft submission remains the larger steady CPU cost. Overview has
  438 main draws / 1,013,140 triangles. Shared chassis and Projects furniture lead
  triangle submissions; About furniture leads draw count. These are submission
  rankings, not isolated GPU costs; occluded geometry can still be submitted.
- Camera-driven AO remains necessary in the current design. Overview focus kept
  180/180 refreshes. The arrival-tail hypothesis found no redundant refreshes.
  Static contact-shading experiments remain a possible future motion-cost study,
  requiring appearance approval and a properly measured comparison.

Full method, raw/excluded runs, source/asset hashes, pass/group ranking, image
acceptance and critic outcome are maintained in the
[delivered-camera evidence](evidence/performance/camera-invalidation/README.md).
Use the [updated diagnostics guide](performance-diagnostics.md#delivered-camera-and-invalidation-replay)
to repeat it. No other held optimization was enabled.

## 20 — Offline lossless geometry compaction (15 September 2026)

The owner authorized candidate 2, preserving all visible appearance and motion.
Baseline `437824a` includes the delivered camera/AO rules and subsequent solid-wall
hover fix. This is a new geometry baseline, with the approved 8K night Earth.

### Implemented: direct indexed cylinder generation

An offline source-specialization script generates an equivalent Three.js cylinder
constructor that shares each cap's identical center vertex. It retains every
triangle, exact expanded attributes, seams, groups and bounds. Existing builders
produce compact geometry directly; there is no visitor-side vertex hashing,
quantization, runtime welding pass or downloaded baked model. All object identities,
materials, animations, picking and disposal remain intact. Invalid/unusual inputs
retain the installed upstream constructor behavior. Builds verify the generated
artifact against the installed Three source; the upstream license is preserved.

| Geometry attribute/index arrays | Before | After | Saved |
| --- | ---: | ---: | ---: |
| Default fixture, all retained layout variants | 50,739,600 B | 49,331,536 B | 1,408,064 B (2.78%) |
| Default fixture, wide visible geometry | 37,370,212 B | 36,290,596 B | 1,079,616 B (2.89%) |
| Default fixture, compact visible geometry | 36,661,796 B | 35,669,732 B | 992,064 B (2.71%) |

The configured public-seed browser model has additional screen/reader geometry:
50,769,620 → 49,361,556 B, the same 1,408,064 B reduction. These are geometry-array
counts, not measured process/GPU memory. Visible storage does not imply that every
buffer is resident. Mesh counts, triangle counts and draw submissions are unchanged.
Largest wide savings: outer chassis/access hardware 371,072 B, ladder utilities
354,752 B, Projects furniture 86,464 B. This is storage attribution, not GPU cost.

The matching minified standalone renderer gains 4,290 B raw / 2,088 B gzip /
1,649 B Brotli. These are renderer-build projections, not Vinext's exact public
network waterfall. No new geometry or texture asset loads. The broader offline
buffer-bake prototype saves 5,146,816 B but needs at least 4,356,463 B Brotli
(9,101,496 B gzip) of arrays before loader/hierarchy/material integration. Its
existing builders would still run without a much larger rewrite. That broader
bake is not adopted; source, payload hashes and the reproduction script remain.

### Verification and measurement

Exactness tests cover parameter variants, UV/normal seams, signed zero, index-width
boundaries, bounds, clone/JSON behavior and complete models through responsive
layout changes with editable configurations. The full suite passes **282 tests**;
typecheck, affected-file lint and production build pass. The independent critic
scores the final work **94/100**, with no blockers and explicit storage-only
adoption. The build preserves the new static license notice. No dependency version or application quality changes.

Same-state original/indexed image comparisons produce **zero differing pixels in
332 checkpoints**: 162 wide (1280×720 CSS, 2560×1440 buffer, DPR 2), 170 portrait
(900×1200 CSS/buffer, DPR 1, AO enabled). All twelve saved image pairs are
byte-identical. Coverage includes all cabins, overview entry/return and portrait
roll, door/ladder travel, hover/drag and readers. Independent visual review covers
actual overview, doors and ladder close-ups. This is hidden built-in Chromium,
not native Safari. No visible-change approval is required for the inspected result.

Both 16-scenario pass surveys preserve identical draw/triangle statistics and
AO refresh/cached counts. They record per-pass CPU/GPU mean/p95 but are ungated
sequential surveys, not a causal speedup comparison. Balanced rendering and fresh-
startup results, including excluded controls/blocks, are detailed in the evidence.
No heat or battery-life improvement is inferred from lower storage or timings.

**Timing outcome: inconclusive; adopted for storage only.** The balanced rendering
trial excluded its first ABBA block (7.97% repeated baseline CPU spread), then
failed recovery (24.05%). The moving paired workload was not reached. Excluded
idle means were 3.489→3.386 ms CPU and 9.952→9.107 ms sampled whole-frame GPU; these
are retained observations, not a gain. Fresh startup passed readiness, but its
first ABBA construction block drifted 7.68% and stopped before BAAB replication:
730.25→723.90 ms construction, 962.95→955.10 ms first submission, and
1,381.75→1,363.70 ms first 8K-ready submission. The latter two metrics separately
passed their gates, but their differences remain below reference variation.
Startup equivalence/improvement and steady rendering gains are unproven. The
small new constructor-selection/validation overhead is not separately resolved.
Native observations were nominal with Low Power Mode off; this does not prove
stable clocks or absence of throttling. All raw excluded/inconclusive runs remain.

The [geometry-compaction evidence](evidence/performance/offline-geometry-compaction/README.md)
contains the alternatives, source and bundle hashes, raw results, exact comparison
method, image pairs, timing limits and critic outcome. The
[diagnostics guide](performance-diagnostics.md#offline-geometry-comparison) documents
regeneration and repeatable startup/pass/paired checks. Candidates 3–5 remained held at that point; entry 21 records the subsequent candidate 3 authorization.

## 21 — Cached shadows versus developer-baked depth (15 September 2026)

**Decision: retain the existing cached shadow system.** Candidate 3 was authorized
and implemented as a reproducible developer experiment. It does not justify a
production replacement: ordinary steady rendering already reuses the depth map,
a saved native-depth map preserves the same filtered lookups, and portrait roll
changes lighting relative to the stationary ship. The prototype and its assets
are confined to the local lab; normal visitors download no new shadow asset.
Candidates 4–5 remained held at that point; entry 22 records the subsequent
candidate 4 authorization.

The baseline is `25b23ca`, after entry 20's approved geometry change. The prototype
exports exact normalized depth bits from Three r185's native D24 target, compresses
them offline, then uploads and restores them with a fullscreen depth-write pass.
It keeps the original PCF shader, comparison filter, shadow matrix, bias and normal
bias. A surface mask was rejected as an exact replacement: the current PCF sample
pattern also depends on screen coordinates, so fixed lighting alone cannot make
such a mask identical throughout hover, drag and resize.

| Measured work / storage | Existing cached map | Saved native-depth prototype |
| --- | ---: | ---: |
| Extra shadow asset, 2048² landscape | 0 | 2,603,223 bytes gzip / 1,746,731 bytes Brotli |
| Decoded transport buffer | 0 | 16,777,216 bytes; transient RGBA8 upload also needed |
| Map preparation plus main spacecraft draws | 759 | 439 |
| Map preparation plus main spacecraft triangles | 1,992,212 | 1,013,141 |
| Steady spacecraft draws / triangles | 438 / 1,013,140 | 438 / 1,013,140 |
| Shadow generations in each 120-frame steady sample | 0 | 0 |

Preparation counts include the same main spacecraft pass on both sides; the
candidate adds one full-screen triangle to restore depth. They are **not per-frame
savings**. Both versions retain the same shadow texture format and sampling shader.
The lab holds both maps for reversible comparisons; transport/attachment sizes
are not measured process or GPU memory.

The final landscape replay has 31 zero-pixel comparisons covering all cabins,
overview, travel, hover, drag/release and reader states. Reusing that map in a
900×1200 portrait view changes 70,192 overview pixels (maximum channel difference
82/255); all 31 subsequent live-fallback checks match exactly. Portrait lighting
cannot be replaced by this fixed bake. Same-GPU roundtrip equality also does not
prove that a developer-generated map matches another GPU's or Safari's native
rasterization. No visually different candidate was enabled.

Two rested readiness attempts were excluded. CPU controls drifted monotonically
by 4.27% and 3.50%; the second GPU control spread was 13.79%. Both attempts stopped
before ranked ABBA/BAAB blocks. A separate **unranked** survey retained preparation
and steady CPU/GPU/pacing samples and deterministic counts. Its own baseline moved
substantially (preparation CPU 1.94→5.18ms; GPU 9.71→15.41ms), so its numbers do not
establish a speedup or slowdown. Upload/restoration was 8.34–8.80ms CPU submission
and 24.58–26.85ms GPU including the same main render in that survey; this is not a
cold-page comparison. Real-network, cold first-frame and first-fallback latency
remain unmeasured. There is no demonstrated net startup, heat or battery gain.

The [complete shadow-bake evidence](evidence/performance/static-shadow-bake/README.md)
contains additional responsive/map-size checks, original before/after images,
source/asset hashes, raw failed/excluded/unranked runs, costs and review. The
[diagnostics guide](performance-diagnostics.md#offline-shadow-comparison) documents
the retained lab. All 282 tests, type checking, affected lint and the production
build passed. Browser evidence uses hidden built-in Chromium, not native Safari.

## 22 — Baked surface contact shading and live-zone hybrid (15 September 2026)

**Decision: retain the existing production GTAO; subsequently approved by the owner.** The owner authorized candidate
4 as a developer experiment against baseline `174ea8c`. The static bake and its
hybrid are visually different approximations, not approved replacements. Their
code, compressed assets and controls stay in the lab: production imports no bake
and visitors download no new contact-shading asset. The owner subsequently
authorized candidate 5 as the separate developer experiment in entry 23.

The forward/reverse baseline survey covers four rooms at idle and during hover
(16 × 90 measured frames). Projects was chosen for its high selected-view workload:
301 draws / 881,084 triangles, including the largest cabin-furniture triangle group
at 146,396 triangles / 43 draws. This does not prove it is the largest isolated GPU
sink: shared chassis has more triangles and About furniture has more draws.
Every idle window reused AO throughout; every hover window refreshed it for camera
movement. The opportunity concerns moving views, not nonexistent idle refreshes.
Per-pass GPU queries gave suspiciously similar main/AO/composite times on the
Apple M4 tiled renderer; do not sum them or infer a saving by subtraction.

The experiment compares **A**, the existing GTAO; **B**, an offline geometric
hemisphere-visibility bake on static Projects surfaces; and **C**, the same bake
with bounded live-contact zones around neighboring hatches and the deployable
reader. Screens, dynamic objects and other receivers retain live shading. Both
candidates still render the full normal/depth scene and retain the fullscreen AO
and denoise passes, with early-outs only for eligible baked pixels. C disables
baked multiplication inside its live zones rather than applying both terms.

| Developer-bake cost | Measured value |
| --- | ---: |
| Static Projects receiver meshes | 31 |
| Contact radius / rays per unique sample / maximum subdivided edge | 0.32 units / 32 rays / 0.16 units |
| Receiver triangles, original → subdivided | 169,220 → 483,032 (**+313,812**) |
| Candidate-minus-original receiver geometry attribute/index arrays | **8,115,970 bytes** |
| Compressed asset | **6,171,242 bytes gzip / 3,294,186 bytes Brotli** |
| Offline rays | 9,249,536 |
| Offline bake duration | 133,970 ms (about 134 seconds) |

The lab retains both geometries for restoration; its extra residency is larger
than the candidate-minus-original difference. The arrays and transport payload
are not measured process/GPU memory. This bake
adds geometry rather than simplifying it. Asset transfer, offline work, decode/
installation, frame preparation and steady rendering must remain separate costs.
The compressed asset is reusable only with matching input and baker-source
hashes; it is not a production cache-invalidation or fallback system.

**Visual finding:** the result has visible coarse, patchy triangular shading.
The original-material/full-GTAO subdivision control also changes appearance, so
those artifacts cannot all be attributed to the baked occlusion values. B loses
moving-object contact shadows on baked static surfaces. C preserves more of those
contacts within its hatch/reader zones, but is still visibly different; boundaries
and denoising can introduce seams, and contacts outside the zones remain absent.
The visible degradation and added costs do not justify production adoption.
Keep the developer comparison for further art review rather than enable it.

Final freeze `38a41135` has 138 candidate comparisons with zero WebGL errors
across wide, portrait and compact layouts, plus three subdivision-only controls.
All 141 restoration checks return exactly to baseline. Compact B/C fall back to
A under the existing AO policy. The wide hybrid idle image changes 948,786 pixels
(maximum channel difference 86/255); subdivision alone changes 28,611. Reader,
door and ladder states are covered, with original before/after PNGs retained.
Captures cover the WebGL canvas, not the overlaid HTML reader text.

A saved AO target in the shared developer verifier had retained stale dimensions
after resize. It now resizes before copying, with per-pair GL checks in this lab.
That audit-only fix changes no visitor rendering. The first rested attempt was
excluded for WebGL error1281. The corrected attempt still failed readiness:
CPU controls spread 6.20%, GPU controls 23.74%. Neither produced ranked blocks.
Nominal OS pressure and recovery breaks do not establish equal clocks or prove
absence of thermal throttling.

A separate unranked 2,880-frame survey preserved actual CPU/GPU/pacing costs and
432 valid GPU queries, with zero GL errors. A hover CPU means moved 5.92→9.80ms
and whole-frame GPU 22.49→39.82ms, so candidate timings cannot establish a causal
speedup/slowdown. B hover GPU observations were 33.89–48.56ms, C 40.75–47.69ms.
The deterministic counts are clear: the static geometry pass remains, selected
idle triangles rise 881,084→1,194,896 at the same 301 draws, and moving-view AO
still refreshes on every sampled frame. Idle AO was already cached on every
frame. No demonstrated runtime, startup, heat or battery benefit justifies the
visible tradeoff. Candidate retention is for reproducibility and review only.

All 294 tests passed. Final type checking, affected lint, production build and
source-matched responsive replay passed; the complete test suite preceded the
small audit-target resize correction. Testing used hidden built-in Chromium,
not native Safari. Raw failed, invalid-reader pilot, superseded-verifier and
excluded timing runs remain explicitly qualified in the evidence index.
Independent critic review scored **94/100**, with no unresolved blockers.

The [contact-bake evidence](evidence/performance/static-contact-bake/README.md)
records the baseline, rejected attempts, compressed bake, source/asset identities,
visual controls and limitations. The retained lab and protocol are documented in
the [diagnostics guide](performance-diagnostics.md#offline-contact-shading-comparison).

## 23 — Baked environment-illumination probe (15 September 2026)

**Audited; delivered lighting retained. Both visible candidates remain developer-only
and require approval before production adoption.** After approving
entry 22's recommendation to retain GTAO, the owner authorized candidate 5,
baked diffuse illumination. This bounded prototype approximates the existing
prefiltered reflection environment on eligible static Projects materials.
Production retains its original illumination and GTAO. The recommendation is to
keep that appearance: the fit changes shading and no reliable net speedup was
established.

The renderer already prepares its `RoomEnvironment` PMREM once, and Three.js
uses a precomputed DFG reflectance approximation. The experiment fits **nine RGB
coefficients** to 4,096 actual GPU samples of the PMREM at roughness 1 and unit
intensity. A least-squares polynomial spans the spherical-harmonic basis through
degree 2. It approximates that already-prefiltered directional field without a
second convolution; it does not bake new room-to-room light bounces, furniture
occlusion or local contacts. An independent set of 4,096 rotated directions
compares actual clamped Float32 shader output with GPU PMREM references.

| Variant | Illumination change and expected tradeoff |
| --- | --- |
| A | Existing production PMREM sampling and material shading. |
| B | Replaces the single `getIBLIrradiance` lookup with the fitted probe. Its shared irradiance affects both indirect diffuse and specular multiscattering energy; fewer texture samples do not establish a net speedup. |
| C | Replaces only the irradiance used by `RE_IndirectSpecular_Physical` to accumulate indirect diffuse. Original specular energy and the PMREM lookup remain; the probe adds arithmetic and is a fidelity control rather than an assumed optimization. |

Both candidates retain three directional lights, eight room point lights, the
hemisphere light, key shadows, GTAO, dynamic readers, emission, view-dependent
specular radiance, cabin-paint neutralization and room feedback. The shader
evaluates the current fragment normal in the current environment rotation,
rather than storing a world-fixed lighting field. Portrait roll is included in the final
comparison replay; this design does not inherit the fixed shadow-map assumption rejected
in entry 21. Original and candidate materials preserve sharing, and restoration
returns to the original material references.

No geometry or texture is added by the candidate. Its 27 Float32 coefficient
values occupy **108 bytes**; this is only coefficient storage, not total process
or GPU memory. Cloned materials, compiled shaders, temporary capture targets,
asset parsing and driver allocations are separate costs. The production site
imports no probe asset or experimental shader.

**Initial pilot, not final evidence:** the wide B image changes approximately
1.596 million pixels, with maximum channel difference 37/255, including visible
brightness differences. That pilot predates the final independent shader
validation. Preserve it with its own source identity; it establishes neither
visual equivalence nor a performance benefit. The
[developer evidence](evidence/performance/baked-diffuse-probe/) retains the pilot,
probe inputs, fit output and subsequent comparisons.

**Final source-matched evidence:** baseline `6e689c2`, freeze
`b005614a-4515-47c9-8493-107d2721cf37`, probe SHA-256
`5ca4d8ec037a663b193283d5e8d474884a5021711b802b851bf5d13ac4115d98`.
The source archive retains all 85 non-dependency inputs. Final eligibility covers
64 static meshes sharing 31 original materials and 210,296 unchanged triangles.
The asset is 2,026 bytes JSON / 952 gzip / 776 offline Brotli. A single offline
fit took 4.535 ms; this is not visitor startup time. Developer loopback capture,
fit and compression took 150.6 ms; download 1.2 ms, decode 0.3 ms, and installation
85.6 ms including 84.7 ms of developer-only GPU validation. Full memory and cold
network/upload/startup costs are unmeasured; PMREM still exists for reflections.

Independent held-out clamped Float32 GPU output has **5.2901% relative RMS error**
against actual PMREM references (maximum linear radiance error 0.22588). This
is directional illumination error, not a final-image error percentage. All
**150 final comparisons** across actual 1280×720 CSS/DPR 2, 900×1200/DPR 1 and
390×844/DPR 1 pass WebGL checks and restore A pixel-exactly. Both candidates
remain active on compact screens. The replay includes hover, drag/spring return,
focused doors, reader transitions, neighboring rooms, ladder travel and overview
roll. Wide idle B changes 1,588,362 pixels and C 1,581,655, maximum 37/255: subtle
surface brightness differences are visible. Composition and contacts remain
intact, but neither candidate is invisible or approved. Canvas captures exclude
HTML reader text; this is a controlled Chromium fixture, not native Safari.

A fresh Projects baseline and a rested attempt are retained. After a 60-second
pause, three unchanged A controls ten seconds apart have CPU means
4.129 / 4.322 / 4.129 ms and GPU frame means 15.662 / 16.657 / 16.327 ms.
The **6.09% GPU spread fails the 5% gate**, so the attempt stops before candidate
blocks. CPU spread is 4.68%; settings and view match, GL errors are zero, AC power
and nominal OS pressure are stable. Those facts do not prove equal clocks or
absence of throttling. No reliable improvement is claimed. The subsequent
balanced unranked A/B/C survey is descriptive evidence only; detailed raw costs,
checks and final critic review are retained in the linked evidence folder.
The 301-test suite, build, final typecheck and affected lint passed, with the
check chronology qualified in the evidence. Independent review scored **95/100**
with no unresolved blockers for the developer-only outcome.

**Decision:** retain the current lighting and reusable developer probe. B removes
only one irradiance fetch while adding arithmetic and changing shared specular
energy. C preserves that specular energy but retains the fetch, so it is a
fidelity control, not an established optimization. Neither removes expensive
scene/AO passes or direct light loops. User approval of the before/after art and
a repeatable net benefit would be needed before adoption; no further candidate
or broader lightmap implementation is implicitly authorized.


## 24 — Contact computer design baseline (16 September 2026)

The owner authorized a new computer-centered Contact flow. The existing monitor
now hosts a native HTML application, and the decorative keypad becomes an 82-key
keyboard with press/hold/release animation. The old deployable Contact tablet is
removed. This is authored interaction/design work, **not an optimization gain**;
none of the held lighting/shadow candidates is enabled.

Against `d0fb599`, the source-identified inventory uses both wide and compact
layouts with identical deterministic inputs. Visible mesh structural submissions
change **433 → 438**, triangle inputs **1,012,868 → 1,013,532** (+664 / 0.066%),
and unique visible geometry/index arrays **36,310,280 → 36,083,204 bytes**.
Including hidden variants, retained geometry/index arrays fall by **388,324
bytes** as the old tablet is removed; instance arrays increase by 3,864 bytes.
These are model inventories without frustum culling, not actual rendered draw
counts or measurements of CPU/GPU speed. Geometry source archives and raw output
are preserved in the [Contact evidence](evidence/contact-computer/README.md).

The shared 1024×512 keyboard legend atlas adds 2,097,152 base RGBA8 bytes, or
**2,796,204 nominal bytes with mipmaps (2.667 MiB)**. It is generated once, with
no separate image-file download. Added JavaScript delivery, generation/upload,
steady CPU/GPU time and process/GPU memory were not measured. No heat, battery or
frame-rate benefit is claimed. This entry establishes a baseline for later work.

Keys use two dynamic instance batches (caps and legends). Only moving keys update
their matrices; held keys settle without ongoing geometry changes. Key travel and
the idle-screen visibility switch increment geometry revision for GTAO. Animated
keys do not enter the cached static shadow map. HTML forms, validation and the
secondary email callout require no extra WebGL render targets. Room navigation,
8K Earth, production illumination and existing diagnostics remain in place.

The full 314-test suite, typecheck, affected lint and production build passed.
The evidence records live built-in Chromium checks at 1280×720, 390×844 and
900×1200, local inbox verification/cleanup, demo isolation and limitations.
Native Safari/on-screen keyboard testing was not performed. These checks do not
establish a cross-device performance comparison.
Independent final review scored **94/100**, with no unresolved blockers; its
rubric, revisions and limitations are recorded with the evidence.

## 25 — Contact computer interaction refinements (16 September 2026)

The owner requested inset social-monitor feedback, an unobstructed keyboard,
hover camera and social access while the application is open, a conventional X,
and clicking the surrounding room to close. The main monitor and its supports
move up by 0.10 console-local units, preserving the glass dimensions and every
key. Exposed pressure walls provide material-only hover feedback; real console
surfaces block dismissal. The social screens retain independent native links.
This is a requested interaction/design refinement, not adoption of a held
performance candidate. Production lighting, GTAO and 8K Earth remain unchanged.

The deterministic inventory compares Git **`917e7e0`** with archived candidate
model source `1d3a94e137fee1ba…`. Every structural delta is **zero** in wide and
compact layouts, for visible geometry, retained variants and the Contact console.
Wide visible inputs remain **438 potential mesh submissions / 1,013,532
triangles / 36,083,204 geometry/index bytes**. Compact remains 438 / 991,868 /
35,462,340 bytes. The console remains 37 / 70,710 / 1,716,560 bytes. Instance
arrays, material counts and nominal texture storage also remain unchanged.
These are construction inventories without camera culling, not measured draws,
delivery size, process memory or runtime costs.

The new wall picker checks four wall meshes and up to 38 console blocker meshes;
sky misses skip the console. A small, unconditioned Node workload survey found
median per-call times of **1.189ms** for an exposed wall, **1.476ms** for a
desk-blocked ray, **0.235ms** for a keyboard-blocked ray and **0.000242ms** for
sky. Six alternating-order batches of 300 calls retain raw results and source
snapshots. The browser was allowed to continue rendering during this survey;
these numbers describe function workload, not a controlled browser CPU/GPU
comparison. The old ordinary room picker answers a different question, and the
open application previously skipped pointer feedback entirely: no speedup ratio
is valid.

To avoid charging that new detailed check again for a settled pointer/view, the
runtime reuses its result only while the exact ray and geometry revision match.
Scene-target synchronization rebuilds the picker; actual key/door geometry
changes invalidate the result. DOM hit testing remains first on every frame so
forms, social links and overlays remain authoritative. Wall paint changes reuse
GTAO. Camera movement still refreshes view-dependent AO as expected. No browser
frame-time, heat or battery benefit is claimed.

The [refinement evidence](evidence/contact-computer-refinement/README.md) records
the source-identified inventory, geometry-clearance regression, raw picker
workload, responsive captures and verification chronology. The 648 clearance
states are offline projection fixtures, not 648 recorded camera flights. Initial
full verification had one unrelated workflow child failure and its parent
failure (320 passing, 2 failing): a deliberately rejected request could leave the
local development connection unusable. The evidence retains that failure and
the focused transport investigation; only the two adversarial test requests now
close their connections. Application security/submission behavior is unchanged.
The final **322-test suite**, typecheck, affected lint and production build pass.
Live built-in Chromium checks cover 1280×720 and 390×844 at DPR 1. A settled
wall-pick counter remains unchanged for 23 seconds, then advances after camera
movement; this confirms reuse without claiming a frame-time gain. Native Safari
and device keyboard checks remain unperformed. Independent final review scored
**95/100** with no unresolved blockers; the rubric and revisions are retained
with the linked evidence.

## 26. Contact desktop, input and wall-return polish — 16 September 2026

The owner requested a subdued desktop wallpaper, choice-first Contact forms,
date/time-first call requests, in-app drag control, flush close feedback, clearer
wall return, first-click email copy and a momentary Caps Lock animation. Public
sample labels are removed while sample metadata and the existing working inbox
remain; call requests still return before transport/persistence. Duration is
omitted because this is a preferred-time inquiry, not an appointment booking.

The [source-identified inventory and visual evidence](evidence/contact-desktop-polish/README.md)
compare `b17d153` with the delivered revision. Wide/compact visible inventories
remain **438 potential submissions**, **1,013,532 / 991,868 triangle inputs** and
**36,083,204 / 35,462,340 geometry-array bytes**. Contact's console remains
**37 submissions, 70,710 triangles and 1,716,560 array bytes**. All inventory
material/texture counts and nominal texture bytes are unchanged. These offline
counts exclude browser compositing and do not establish equal frame timings.

The wallpaper is three static CSS gradients, with no new image download/WebGL
texture. The wall cue adds one DOM element and material interpolation. Drag uses
the existing spring with a closer 0.04 / 0.12 rad pitch/yaw envelope; real camera
motion invokes the existing AO/camera work. The Mac Caps Lock workaround uses a
140 ms pulse because native lock events cannot expose physical hold duration.
There is no optimization gain, heat/battery claim or broad timing comparison.
Held candidates below remain untouched.

Hidden built-in Chromium captures cover landscape and portrait. The expanded
648-projection clearance test includes the settled drag envelope plus existing
entry/hover states. Evidence records native date/time entry, preserved drafts,
wall/X/social actions, sampled spring return, and copy acknowledgment; the tool's
virtual clipboard cannot confirm the copied payload. Native Safari, physical Mac
Caps Lock and device on-screen keyboard remain untested. Final verification and
independent review are recorded with the linked evidence. The final **327-test
suite**, typecheck, affected lint and production build pass. Independent final
review scored **95/100** with no blockers; rubric and limitations are retained.

**Caps Lock follow-up, 16 September 2026:** the owner subsequently authorized
physical hold/release where available, with lock status as the fallback when the
browser cannot expose it. The Mac-only 140 ms pulse is replaced by event-driven
`getModifierState('CapsLock')` synchronization; no timer, polling loop, geometry,
material or asset is added. Other keys/platforms retain physical down/up behavior.
The existing key animation settles while held; this is an input correction, not
a measured frame-time, heat or battery improvement. Focus/visibility/close cleanup
is preserved. The [focused verification and independent review](evidence/contact-capslock-status/review.json)
record event-sequence and real-model tests, with native Safari input still untested.

**Contact chooser follow-up, 18 September 2026:** the owner selected `LET’S CONNECT`
for the idle monitor and requested deselectable modes plus an always-visible
scrollbar when the computer application overflows. The existing canvas texture
is repainted with the new heading; its dimensions and scene geometry stay the
same. Two native toggle buttons replace the hidden-radio label assemblies.
Returning to the chooser preserves the temporary draft and cannot submit it.
The scrollbar adds DOM elements, one ResizeObserver for viewport/content sizes,
and event-driven scroll/drag updates, with no polling or animation loop. Its
three projected reference points correct pointer dragging on the CSS3D screen.
The existing native content pane still owns wheel, touch and field scrolling.
This is requested interface work, not a measured optimization; no timing, memory,
heat or battery improvement is claimed. The [source-matched review and checks](evidence/contact-chooser-scroll/review.json)
record landscape/portrait behavior and verification limitations. Deferred
optimization candidates remain untouched.

## 27 — Surrounding stars and a longer land-facing Earth opening (18 September 2026)

**Requested visual work, not an optimization.** The owner reported starless drag
edges, barely visible twinkle, dust-like star sizes and an Earth view that soon
became ocean-heavy. A uniform surrounding sphere replaces the rectangular star
patch. Three size bands (2.2–3.3, 3.6–5.0 and 6.2–8.0 CSS-pixel sprite diameters)
combine fine stars with a few luminous anchors. Independent brightness modulation
and 18% halo-size breathing make twinkle legible without synchronized flashing.
The actual luminous cores are smaller than the sprites; these are shader sizes,
not measured bright-pixel diameters. Meteor timing and appearance are unchanged.

| Retained star attributes | Before (`29ffee1`) | Delivered | Change |
| --- | ---: | ---: | ---: |
| Desktop points / array bytes | 3,100 / 136,400 B | 12,000 / 528,000 B | +391,600 B (0.37 MiB) |
| Compact points / array bytes | 2,300 / 101,200 B | 9,000 / 396,000 B | +294,800 B (0.28 MiB) |

These counts cover the whole sphere, including points outside the current view;
they are not the visible star count. There is still one Points geometry/material
and one star draw, no new downloaded asset or per-frame allocation, but more
vertex work and revised fragment shading. Array bytes exclude JS objects,
driver copies and rasterization cost. Unchanged draws do not imply unchanged
GPU time; this task makes no frame-rate, heat or battery claim. Keep the new art
in future source-identified performance baselines.

The same 8K Black Marble image now starts at **110°E, 30°N, −12° roll**, replacing
Mediterranean. Existing 0.003 rad/s rotation exposes Eurasia before the Atlantic.
No motion reversal, looping, hidden repositioning, new texture or resolution
change is used. The [reproducible CPU composition audit](evidence/sky-land-composition/earth-land-audit.json)
compares 72 candidate orientations across 1280×720, 2560×600 and 390×844 using
the production 38° lens. A source-image color proxy gives approximately 66–74%
terrain coverage initially versus 36–58%, and 80–92% mean over the first five
minutes versus 25–34%. First sampled coverage below 40% shifts from 0–160 to
700–720 active seconds. These are approximate texture-color classifications,
not an authoritative land mask or guaranteed threshold for every camera.
Sampling uses 20-second steps, excludes spacecraft occlusion and measures nominal
overview. Warm lights and rendered images also informed selection; maximizing
terrain alone would favor darker northern regions. A full rotation still takes
about 35 minutes and eventually includes oceans.

The [source-matched visual review and checks](evidence/sky-land-composition/review.json)
include wide/portrait live scenes, post-release drag integration, exact-angle
orbital fixtures, distinct twinkle phases and Earth at zero, five and ten minutes.
Built-in Chromium is the tested engine; native Safari remains untested. The finite
comparison fixture omits spacecraft/AO and records actual viewport/DPR/buffer
dimensions. Live captures use the full renderer; their development accessibility
banner is not production UI. Existing quality, cached shading and held optimization
candidates remain unchanged. Current resolution tooling follows the new opening;
the older night-result auditor intentionally remains scoped to its historical
Mediterranean measurements.

Verification: **335 full tests**, including 31 focused orbit tests, typecheck,
affected lint, production build and diff checks pass. Independent review scored
**95/100**, with the rubric and limitations recorded in the review above.

## 28 — City-light composition instead of land coverage (18 September 2026)

**Requested visual correction, not an optimization.** The owner correctly observed
that the previous route quickly crossed large unlit land masses. Entry 27's
terrain metric passed those views; its zero/five/ten-minute captures missed the
especially dark two-minute interval. Its Earth acceptance is superseded here,
while the approved star design and historical evidence remain intact.

The production change is three orientation constants: **120°E, 25°N, +22.5° roll**,
replacing 110°E, 30°N, −12°. This lower-latitude tilted route keeps China's and
India's city-light networks in the foreground through the first five minutes.
The same 8K photograph, 0.003 rad/s continuous rotation, atmosphere, stars,
camera transforms, materials and geometry remain. There is no artificial city
lighting, exposure boost or public globe-control UI.

The [source-identified audit](evidence/earth-light-composition/light-path-audit.json)
retains 1,344 coarse and 153 refined trials, rejected alternatives and full-cycle
finalist timelines. It filters the unchanged image to 2048×1024 **in audit memory
only**, then samples the production 38° lens at 20-second intervals across
1280×720, 2560×600 and 390×844. Warm-light coverage and distribution over 15 screen
tiles prioritize the weakest 60-second stretch as well as mean coverage and the
opening. The foreground is weighted more than the horizon. These are image-color
proxies, not a settlement map, measured luminance or a performance benchmark;
the audit excludes spacecraft occlusion. It does not reuse entry 27's metric.

| First-five-minute weighted warm-light coverage | Baseline `baa290b` | Selected opening |
| --- | ---: | ---: |
| 1280×720 | 1.52% | 4.81% |
| 2560×600 | 2.18% | 6.42% |
| 390×844 | 2.64% | 3.37% |

Rendered frozen comparisons include zero, one, two, five and ten minutes in wide
views and zero, two and five minutes in portrait; full live application captures
confirm the opening with spacecraft and UI occlusion. A slower North American
alternative was inspected but not selected: it changes motion, and merely
postpones dark geography. No speed change was chosen while the optional preference
question remained unanswered. A slightly different roll favored the ten-minute
aggregate at the expense of the initial five-minute composition.

**Limit:** continuous rotation still eventually exposes darker regions. The
ten-minute capture is deliberately retained; it remains dimmer over Africa.
This improves the initial sustained view, not perpetual illumination. Keeping a
bright region indefinitely would require revisiting motion or illumination with
the owner. Do not characterize this as a solved full-revolution light guarantee.

The [final review, source hashes, captures and checks](evidence/earth-light-composition/review.json)
separate the trial fixture from final production evidence. Tests now inspect warm
light coverage and spatial distribution at 0/60/120/180/300 seconds, including
the previously missed failure. Injecting the old opening in memory makes the
new check fail at 120 seconds. **34 focused orbit/camera tests**, typecheck,
affected lint and production build pass; the previous full-suite result stays
historical. Independent critic review scored **93/100**, with no unresolved
blockers. Hidden built-in Chromium was visually tested; native Safari was not.
This task adds no production texture, geometry, pass or per-frame operation.
That structural fact is not a measured CPU/GPU, heat or battery improvement.
Deferred performance candidates remain unchanged.

## 29 — Temporary Earth composition helper (18 September 2026)

**Requested design-selection tooling, not an optimization.** The owner still
finds the initial coastal view too ocean-heavy and sparsely lit. Entry 28's
improved early aggregate scores did not establish acceptance of the opening.
Instead of choosing another default without that feedback, a temporary public
**Earth view** helper now supports direct comparison and an exact owner-selected
result. This authorization supersedes the earlier removal of public controls for
the duration of the selection process; the helper is to be removed after the
owner shares their final settings.

The interface provides longitude, latitude and tilt sliders with numeric inputs.
Five starting points cover Europe, northern India, eastern China, eastern United
States and the existing coastal opening. Europe is recommended as the first
city-light composition to inspect, not a production change. Pause/play, 1×/10×/
30×/60× playback and a roughly 35-minute scrubber let the owner inspect later
geography, return to 0:00 or reset the angle. Fast-forward affects only Earth's
rotation. A deliberate Play action can animate Earth under reduced motion while
the ordinary spacecraft, star and meteor behavior remains unchanged. Closing the
helper pauses preview and leaves that frame available for inspection.

The portable version-1 JSON contains the three opening angles and the unchanged
0.003 rad/s production rotation rate. Preview speed and elapsed time are excluded.
An explicit **Use this frame as the start** action folds the later rotation into
the opening before copying; import validates complete, finite, bounded settings
instead of silently accepting malformed values. Copy has a selectable-text
alternative. The chosen settings remain in temporary interface state; no database,
browser-storage, backend or public content mutation is involved. Reloading starts
from the unchanged production opening until a separate final choice is applied.

The same 8K texture, sphere geometry, atmosphere and sky shaders are reused. The
helper adds interface/state work and Earth-specific preview bookkeeping; editing
an angle recalculates orientation without rebuilding scene resources. These are
implementation observations, not measured CPU/GPU, process-memory, heat or battery
claims. No new resolution benchmark or optimization candidate is part of this
task. Keep the helper's state identifiable in future performance comparisons,
and distinguish normal visits from deliberately accelerated preview runs.

The [source-matched implementation and review record](evidence/earth-composer/review.json)
owns final checks, actual browser coverage, screenshots, critic findings and
remaining limitations. Earlier city-light comparisons remain preserved as
historical evidence, including their unsuccessful acceptance assumptions.
Deferred optimization candidates remain unchanged.

Verification: 340 tests passed, with the five preview tests repeated after the
final diagnostics-only metadata addition; typecheck, affected lint and production
build passed. Seventeen live hidden-Chromium captures cover desktop and portrait
controls, recommended openings, playback, seeking and settings import. The
independent critic rated the final implementation **95/100**, with no blockers.
Native Safari and the native clipboard payload remain unverified; the evidence
records the built-in browser's separate virtual-clipboard limitation. No timing
or thermal improvement is claimed.

### Rotation-speed selection follow-up (19 September 2026)

The owner also requested control over the saved rotation speed. The helper's
**Motion** tab now selects 0–5× the current rate (0–0.015 rad/s), including a
stationary Earth. This rate is included in copied/imported version-1 settings;
old settings remain valid. Preview fast-forward stays a separate 1×/10×/30×/60×
multiplier. A rate edit pauses at the selected starting view instead of silently
changing its angle. Presets preserve the selected rate, and adopting a preview
frame uses that rate when computing its exact new opening. The 35-minute
scrubber represents visit time at the chosen speed, not necessarily one revolution.

Production defaults and the 8K asset remain unchanged until the owner shares a
final choice. This is requested design tooling, not an optimization: there is no
measured CPU/GPU, memory, heat or battery claim. Source tests verify rate handling,
clock isolation and unchanged scene resources. The [speed follow-up review](evidence/earth-composer-speed/review.json)
records final checks, browser coverage and critic review; entry 29's original
screenshots and checks remain historical evidence. Held candidates are unchanged.

Verification: **341 tests passed**; final typecheck, affected lint and production
build passed. Seven live browser captures cover saved-speed selection, frame
adoption, stationary mode, exact fractional input and portrait controls. The
independent critic scored **97/100**, with no blockers. Native Safari, physical
touch and native clipboard contents remain unverified. A final UI-only precision
fix received refreshed browser/typecheck/lint/build checks after the full suite.

### Route-preset comparison at 2–3× (19 September 2026)

The owner requested presets balancing illuminated land and water at the opening
and throughout rotation, especially avoiding long empty-water or unlit-land
periods. This follow-up evaluates **2× saved rotation** (0.006 rad/s), the owner's
likely choice, with **3×** (0.009 rad/s) as an optional faster comparison. A complete
loop takes approximately **17:27 at 2×** and **11:38 at 3×**. Faster motion shortens
all intervals proportionally; it does not remove dark geography.

The revised helper offers **Coastal Asia** (124° / 31° / 7.5°) as the overall
recommendation; **Tilted Asia** (112° / 32.5° / 135°) as an artistic alternative;
**Asian light corridor** (116° / 23.5° / 7.5°) for a longer early light sequence;
and **American city lights** (−86° / 32.5° / 7.5°) for immediate opening impact.
Coastal Asia still has brief early inland dimness. The corridor trades its early
sequence for worse dark stretches over a full loop, while the American opening
reaches Pacific darkness relatively early. The existing **Current opening** stays
available for comparison. Presets preserve the selected saved speed; no opening,
production speed, texture, shader or geometry default is changed by this selection.

The [source-identified route review](evidence/earth-route-presets/review.json)
retains broad/refined candidate results, actual rendered comparisons, verification
and review limits. CPU warm-light coverage and spatial distribution helped select
views for rendered inspection; the day-image blue-water threshold is a
cloud-confounded proxy, not a geographic land/water mask. Neither a proxy score nor
an attractive opening establishes continuous brightness or owner acceptance.

This is requested art-selection work, **not a performance optimization**. No
CPU/GPU timing, memory, thermal or battery gain is claimed. Previous helper and
composition records remain historical evidence; deferred optimization candidates
below are unchanged.

Verification: **37 orbit tests passed**, as did final typecheck, affected lint and
production build. Twenty-two hidden Chromium captures include all four openings
with the real spacecraft in desktop and portrait layouts, route comparison sheets,
and helper controls. The complete 2× loop was sampled; 3× early frames were rendered
and full-loop durations use the exact two-thirds time scaling. The independent
critic scored **94/100**, with no blockers. Several-minute sparse-light stretches
remain; threshold-derived durations are approximate visual guidance. Native Safari
and live full-cycle hover/drag were not tested. Production defaults remain unchanged.

### Mediterranean history and regional alternatives (19 September 2026)

The owner asked to revisit a previously liked Europe/Middle East composition.
History identifies the expressly selected Mediterranean opening at **18° / 38° /
−12°** in checkpoint `2e6937c`. The helper restores it as **Mediterranean classic**,
alongside **Mediterranean diagonal** (18° / 38° / 45°), the earlier **Europe at
night** helper view (12° / 48° / −10°), **Nile & Mediterranean** (32° / 30° /
20°), and **Middle East sweep** (50° / 32° / −52.5°). Prior Asian/American choices
and the production reference remain available under **Earlier comparisons**.
Revisiting classic first follows the owner's earlier preference; it does not
establish a final new choice or invalidate the previous comparison evidence.

These comparisons retain the intended **2–3×** saved speed and continuous rotation,
including its later dark stretches. Presets preserve the chosen rate. Production
remains **120° / 25° / 22.5° at 0.003 rad/s**, with the same 8K texture. Recovering
classic's angles does not recreate the original screenshot pixel for pixel:
`c777fc2` changed the background's 42° lens to the shared 38° camera and introduced
world-relative travel. Its geographic transform and sphere-placement math are
unchanged.

The [source-identified follow-up review](evidence/earth-mediterranean-presets/review.json)
owns the exact history, sampled regional comparisons, rendered evidence,
verification and independent critic findings. This is requested art-selection
work, **not a performance optimization**. No CPU/GPU, memory, thermal or battery
benefit is claimed. The earlier records remain historical evidence, and held
optimization candidates below remain unchanged.

The historical Mediterranean ran at **1×**; at 2× its coastal sequence passes
twice as quickly. The regional audit screened 84 coarse and 84 refined candidates,
then sampled 26 finalists over a complete 2× loop. Classic best recovers the
owner's earlier composition; diagonal is the strongest new artistic alternative.
Nile favors its distinctive opening silhouette over sustained light coverage.
The restored Europe helper is a historical comparison, with markedly weaker
wide-view light coverage through the rest of its rotation. None removes later
dark periods. Threshold-derived timing is approximate, layout-dependent guidance,
not a measured geographic classification or guarantee of perceived brightness.

Verification: **37 orbit tests passed**, along with typecheck, affected lint and
production build. Twenty-two hidden Chromium captures cover wide/portrait
openings, finite 2×/3× comparisons and keyboard-accessible grouped controls.
Preset changes retain the selected rotation speed. Native Safari and live
full-cycle hover/drag were not tested. The temporary comparison server was
stopped; the main development server remains available at localhost:3000.
The independent critic scored **95/100**, with no blockers, after reviewing the
final source, matching captures, history and checks. This score evaluates the
implementation and comparison evidence, not the owner's acceptance of a route.

### Night Earth / Blue Marble comparison toggle (19 September 2026)

The owner requested a model toggle in the temporary Earth helper. It now compares
the existing **8K Black Marble night** and **8K Blue Marble daytime** assets using
the same selected angle, saved rotation rate and preview time. Night remains the
production default. Day uses the existing photographed clouds/land/ocean surface
and its diffuse lighting/atmosphere; this is an explicitly requested appearance
alternative, not a claim of visually lossless optimization.

The alternate texture loads only when selected. The current surface remains
visible until the replacement is ready, then its texture/bitmap and materials
are released. Rapid changes cancel superseded loads; failures keep the current
Earth available for retry. The helper retains choices only for this visit.
Version-2 copied settings include `earthAppearance`; version-1 imports still
work and select Night Earth. Existing presets remain available, with their
lighting recommendations explicitly identified as night-map comparisons.

Measured JPEG file sizes are **2,329,878 bytes** for night and **6,615,276 bytes**
for day; the day asset adds no initial-page download until selected.
Both images decode to 8192×4096. Nominal RGBA8 texture storage including mipmaps
remains **170.67 MiB per active map**, not a measured process/GPU-memory figure.
The old and new decoded assets can overlap briefly during replacement; the
implementation does not retain a permanent two-map GPU cache. Switching back may
reuse the browser's HTTP cache but still requires texture preparation. Day's
existing atmosphere uses one more mesh pass than night's; counts do not establish
a timing, thermal or battery difference. No held optimization is implemented.

The [toggle review](evidence/earth-appearance-toggle/review.json) records source
and asset hashes, lifecycle tests, actual application captures, verification and
independent review. Prior night-route comparisons remain historical evidence.

Verification: **349 tests passed**. After final readiness-metric preservation and
UI copy polish, all **45 orbit tests**, typecheck, affected lint and production
build passed again. Eleven hidden Chromium captures cover both models in wide
and portrait layouts, settings, reading-view return and active playback.
Failure/retry, rapid switching and disposal are covered by loader lifecycle tests.
Native Safari, physical touch and native clipboard contents remain unverified.
The independent critic scored **95/100**, with no unresolved blockers. Review
revisions prevent failed imports from reporting success and shorten helper prose
so the preset choices are easier to find.

### Final Europe at Night selection and helper retirement (20 September 2026)

**Approved and implemented.** The owner chose **Europe at Night**, explicitly
confirmed the night map, and authorized removing the alternatives. Production
now opens at **12° longitude / 48° latitude / −10° roll**, with continuous rotation
at **0.0045 rad/s (1.5× the former 0.003 base rate)**. One full rotation takes
approximately **23 minutes 16 seconds**. This supersedes the temporary helper,
model toggle and East Asian production reference in the preceding entries.
The selected route still reaches darker regions later; it is not a promise of
continuous city-light coverage.

The runtime now has one fixed 8K night loader and renderer. The helper, alternate
presets, copy/import/preview controls, day lighting/atmosphere, resolution switches
and helper-only tests/probes are removed. Five unused Earth JPEGs total
**9,883,979 bytes** removed from the public asset tree. This is a repository and
deployment-payload reduction, **not a measured initial-download or rendering
speedup**: the alternative day image was previously lazy-loaded. The retained
night JPEG is unchanged: **2,329,878 bytes**, SHA-256
`48270283df64bcf5c892a15c2efcbaf2a468fb292c1e534b67d47b6ac2c707cd`.
Its estimated RGBA8 mip storage remains **170.67 MiB**; process/GPU memory and
CPU/GPU/frame pacing were not remeasured for this requested art selection.

Historical raw results, images, credits and five relocated provenance manifests
remain under `docs/evidence/`. The deleted comparison implementations/assets are
recoverable together from Git **`56c67bb123b4afab0c34d39560100db3e2366ea2`**;
[the comparison guide](../scripts/benchmarks/earth-resolution-lab.md) explains the
separate-checkout workflow. The saved night audit now records that asset revision;
all **12 reports** passed on a temporary copy, with unchanged cohorts/asset facts.
Retained sky fixtures snapshot their matching historical loader. Cloud benchmarks
and their textures remain because active tests/tools use them; production does
not request those cloud assets. Held optimization candidates remain unchanged.

Verification: **330 tests passed**, plus typecheck, affected lint and production
build (including generated-geometry verification). Three existing camera tests
were rerun after their lint-only promise handling was corrected. Retained sky,
cloud and horizon fixtures built and returned HTTP 200; the sky-motion audit ran
successfully. Browser checks used **hidden built-in Chromium**, actual
**1280×720 desktop** and **390×844 portrait** viewports at DPR 1. The live application
rendered the night map, exposed no Earth helper, navigated into About, and produced
no captured console warnings/errors. [Desktop](evidence/europe-night-final/desktop.jpg),
[portrait](evidence/europe-night-final/portrait.jpg) and
[About navigation](evidence/europe-night-final/about.jpg) are live captures, not
frozen timing fixtures. Native Safari and a full rotation were not tested.

Captured renderer SHA-256:
`a02179571a934c89b94ce612c0c174d413a9aa333aeddf3fcda2c44588698b7b`;
opening transform:
`c716603a9f1dd451d6a27e63599d20a211b0e510d56c25b66b2b3fcf14d0ed37`;
texture loader:
`f3c468f0dadfd3f66e84a4bb2260bc91c1c329041e4b03f39dc232290ddcb1d1`.

Independent critic: **95/100**, no unresolved blockers. Rubric: request
fulfillment **30/30**, rendering/resource correctness **24/25**, cleanup and
organization **19/20**, visual consistency **14/15**, verification/evidence
**8/10**. Review found and resolved stale helper event guards/test options and
historical-fixture loader/readiness assumptions. Final source hashes, captures,
330-test log and build log were reviewed together. The review retains the
Chromium-only, no-full-rotation/no-timing limitations above; old comparisons also
require their documented Git objects.

### Continuous regional night Earth (20 September 2026)

**Approved art change and implemented.** The owner authorized a seamlessly
repeating regional map, including believable fictional geography, while retaining
the visible quality of the 8K night image. The approved **12° / 48° / −10° Europe
opening** and **0.0045 rad/s** forward motion are unchanged. The new map repeats
every **180° / 698.13s (11m38s)**, with no reset, reversal, animated dissolve or
runtime generation. This supersedes the preceding full-world Earth baseline;
the held shadow/AO/illumination candidates remain held.

The **4096×3072 lossless WebP** retains the original 8192×4096 image's texel density.
It is not a downsampled 4K globe. A protected 1536×3072 European core has **zero
decoded RGB differences** from the original. The rest uses deterministic native
satellite patches joined along minimum-error paths, preserving fine light detail.
The fictional connecting geography is intentionally artistic. The AI trial was
rejected for oversized light flares and changed photographic character; an early
long-strip collage was rejected for recognizable repeated country shapes. Both
rejected approaches and final provenance remain in the
[regional-loop evidence record](evidence/europe-regional-loop/README.md).

| Earth asset cost | Previous full-world image | Delivered regional loop |
| --- | ---: | ---: |
| Encoded download | 2,329,878 bytes | 3,625,576 bytes |
| Nominal RGBA8 base texture | 128 MiB | 48 MiB |
| Nominal RGBA8 with mipmaps | 170.67 MiB | 64 MiB |

The **62.5% reduction in estimated texture allocation** is accompanied by a
**1,295,698-byte / 55.6% larger download** to avoid another lossy encoding
generation. These are asset bytes and calculated texture storage, not measured
process/GPU memory. The existing single sphere, material lookup and frame-update
path remain; resource counts alone do not prove a rendering speedup. The full
night JPEG remains an actively used source/comparison fixture and is not fetched
by normal application visits.

The camera audit samples **2,079 scenarios / 11 viewports**. Its largest observed
longitude span is **152.06°**, below the 180° repeat; sampled latitudes remain
inside the crop with a minimum **4.12°** margin. This finite audit ignores ship
occlusion and approximates drag/spring extremes; it is not a guarantee for future
camera changes. The warm-light image proxy improves across the sampled loop, but
is not a land/water classifier or an aesthetic acceptance rule. Desktop and
portrait phase captures, loop-boundary and sphere-seam checks provide the visual
evidence. The original opening matches; the 160s regional view retains lit coast
where the original is nearly dark. Live app checks cover overview, drag release,
portrait roll/navigation and Contact close-ups, with no captured console errors.

The reusable `scripts/regional-earth-lab.mjs` freezes both source/asset versions
and records separate preparation, CPU, GPU-where-available and frame-cadence data.
At **1280×720 / DPR 2**, background-only ABBA measured GPU means **3.140 → 3.063ms**;
BAAB measured **3.814 → 3.917ms**. The apparent ranking reverses and both runs fail
the 5% repeated-control gate (reference spread **31.29% / 25.23%**). **Rendering
speed is inconclusive**, with all raw/excluded-as-ranking observations retained.
Each order includes 1,200 frames and 240 valid GPU queries per version after
60-second non-rendering rests before each block. Background counts remain four
draws / 48,642 triangles / 12,000 points. Local decode and first-upload observations
favor the smaller texture, but only two sequential, cache-warm preparations per
version were recorded; this is not a cold-network/startup benchmark. Tables,
source hashes, power context and limitations are in the linked evidence record.

Verification: **332 tests passed**, typecheck, affected lint, production build and
retained sky-audit smoke passed. Actual app and frozen preview checks used hidden
built-in **Chromium 153**, not Safari. Independent critic: **94/100**, no unresolved
blockers; rubric **20/20 fulfillment, 27/30 visual quality, 25/25 runtime/mapping,
9/10 organization/provenance, 13/15 verification/evidence**. Review preserves the
finite-camera, sampled-loop, Chromium-only and inconclusive-timing limitations.
This art change does not claim lower heat, power or battery use.

### Temporary Earth playback inspection (20 September 2026)

The owner explicitly requested a speed slider and video-style timeline to inspect
the regional loop. A globe button beside diagnostics now opens Play/Pause/Restart,
backward/forward seeking across the **698.13-second** loop and **1–60×** playback
relative to the approved **0.0045 rad/s** rate. At 60×, one loop takes about
**11.64 seconds**. The former angle/preset/day controls remain retired; this
authorization is limited to temporary playback inspection.

Seeking pauses at the selected frame. Closing preserves the Earth phase and
restores normal 1× playback; reload resets to the original Europe opening. State
is temporary in React/the orbital environment, with no persistent browser storage
or backend writes. Stars, meteors and camera timing remain independent. Asset
readiness and global reduced-motion/visibility behavior still gate automatic
playback, while manual seeking can preview still frames under reduced motion.

The open panel polls display state at **10 Hz**; closing removes that timer.
No texture, geometry or quality settings change. This is an inspection tool, not
a performance optimization; no timed benchmark or frame-rate, memory, heat or
battery improvement is claimed. The preceding regional-art measurements retain
their original source scope. Verification and critic review belong to the
[playback-control evidence](evidence/earth-playback-controls/README.md).
Verification: **338 tests passed**, typecheck, affected lint and production build
passed. Final live desktop/portrait checks used hidden built-in **Chromium 153**,
not Safari; final console capture was clear. Independent critic: **94/100**, no
unresolved blockers (fulfillment 24/25, interaction/correctness 29/30, visual/usability
18/20, organization 10/10, verification/evidence 13/15). The linked evidence records
the portal layering correction, matching captures and untested native-device cases.
Held optimization candidates remain unchanged.

## 30 — Fixed Earth scene and shorter native-detail coastal loop (20 September 2026)

**Authorized design and measurement work.** The owner approved replacing
viewport-dependent Earth composition with one physical scene, auditing the
visible texture domain, shortening/cropping the loop without reducing retained
source detail, and an AI-assisted believable continuation. This supersedes the
4096×3072 satellite-only regional collage. It does not authorize held lighting,
shadow or other optimization candidates.

Earth placement, orientation, radius and spacecraft-world registration are fixed.
Responsive camera framing remains: 38° vertical landscape, 38° horizontal portrait,
78° vertical cap. Portrait roll naturally rotates the horizon. The first fixed
scene trial hid Earth entirely in portrait; a wider physical lens and matching
annotation unprojection corrected that regression. Different responsive camera
poses are still different physical viewpoints, not identical image crops.

The final 2560×1536 lossless WebP preserves a 1536×1536 original European core and
uses a native AI-authored coastal bridge, with no upscaling or runtime generation.
Generated pixels account for 28.346%; original satellite pixels 71.654%. Normal
motion remains 0.0045 rad/s. Scrolling U coordinates over a stationary sphere gives
a 112.5° / 7m 16s period with the existing single texture sample. The hidden mesh
longitude seam stays outside the audited camera envelope. The previous map's
11m38s period and simultaneous globe rotation are historical behavior.

| Asset cost | Before | Delivered |
| --- | ---: | ---: |
| Download | 3,625,576 B | 2,862,376 B (−21.05%) |
| Nominal RGBA8 mip chain | 64 MiB | 20 MiB (−68.75%) |
| Base decoded RGBA8 pixels | 48 MiB | 15 MiB |
| Runtime maps / samples | 1 / 1 | 1 / 1 |

These are asset/allocation facts, not measured process/GPU memory or proof of
faster frames, less heat or battery savings. Image SHA-256:
`19ac5ed0c9796d81a36c2619a67396e1630f36b9915e1bd716c0057b65bf3cf1`.

The actual-triangle/frustum UV audit covers 48,314 poses across 17 viewport shapes,
including room, reader, Contact, hover/drag and route fixtures plus continuous
pose neighborhoods. Guarded source rows 469.333–1805.333 fit inside 384–1919 with
85.33/114.67 rows of margin, above the chosen 64-row allowance. This is a
conditional camera-domain bound, not a universal proof of minimal dimensions for
all possible screens. It excludes spacecraft occlusion conservatively. Changing
camera limits requires rerunning the audit.

Desktop hidden Chromium/Metal timing used eight balanced normal-motion blocks,
2,400 frames per version, at 1280×720 / DPR 2 with 60-second blank rests. Pooled GPU
means were 3.201→2.993ms, but repeated-version means drifted 85%/72%, failing the
predeclared 5% control gate. **The apparent 6.5% saving is rejected as inconclusive;
neither a speedup nor slowdown is established.** Both versions averaged 16.667ms
frame intervals. This background-only fixture does not establish whole-app or
portrait spacecraft cost, heat or power use. Raw samples and qualified local
preparation observations are preserved; CPU and GPU durations are not added.

The additional portrait BAAB probe at 390×844 / DPR 2 measured GPU means
1.595→1.635 ms. The apparent 2.5% increase is below repeated-control variation
(3.59%/3.95%), so its ranking is also inconclusive. Mean frame intervals remain
16.665 ms. That fixture uses each version's delivered lens but a neutral camera;
it does not measure the production portrait spacecraft/AO combination. Neither
run supports claiming faster frames or guaranteed unchanged whole-app cost.

The [source-identified evidence](evidence/earth-consistent-loop/README.md) retains
raw coverage, rejected art/framing stages, prompts, build/input hashes, before/
after captures and verification. Baseline Git is `4e215f2`. Final timing results
and independent critic review are retained in that record. The visual recommendation
is **keep**: Europe remains intact and the continuation is more varied/coastal.
Some sea-heavy and sparsely lit phases remain; the loop is shorter and therefore
more recognizable during very long visits or accelerated preview.

Verification: **343 tests passed**, plus typecheck, affected lint and production
build. Independent critic: **94/100**, no unresolved blockers. Runtime and asset
changes are committed as `319fdd0`; the linked evidence records final source hashes,
review limitations and browser checks.

### Entry 30 follow-up — portrait placement correction, 20 September 2026

**Superseded motion policy:** the subsequent stable-navigation correction below
replaces the live-roll compensation. Its earlier positive review checked the
wrong perceptual invariant; retain these results only as historical evidence.

The owner requested the same bottom-left Earth composition with a vertical
spacecraft. Earth and its atmosphere now compensate only the continuous layout
roll, around the camera's physical pivot; stars, actual hover/drag/travel and
texture playback remain unchanged. Zero roll retains landscape placement. This
is an approved art-direction exception to entry 30's completely fixed Earth
transform, not a new optimization or a new texture.

No image, geometry, shader, material or draw pass was added. Four reusable CPU
matrices are recomputed only when layout roll changes. Visible fragment coverage
differs in portrait, so unchanged resource counts do not establish unchanged
GPU time. No new performance timing or heat/battery claim is made; entry 30's
timings remain historical to that source. Deferred candidates remain held.

The renewed desktop/mobile crop audit covers **48,314 poses**. Worst guarded
source rows are **469.333–1782.073**, retaining **85.333/137.927 rows** beyond
the sampled footprint inside the existing crop. Both exceed the chosen 64-row
filtering allowance. The geometric longitude seam remains at least **115.3125°**
away in the guarded audit. No asset or crop change was needed. This remains a
bounded pose/viewport certificate. See [portrait placement evidence](evidence/earth-portrait-placement/README.md)
for captures, raw coverage, source identity, verification and independent review.

Verification: **344 tests passed**, plus typecheck, affected lint and production
build. Independent critic: **94/100**, no unresolved blockers; recommendation keep.
Phone/tablet/landscape and Contact transition checks used hidden built-in Chromium,
not native Safari.

### Entry 30 follow-up — stable Earth during navigation, 20 September 2026

The owner identified that keeping Earth visually steady during portrait
overview↔room rotation made the spacecraft and stars appear to turn around it.
Commit `e238e60` had tied Earth placement to the animated camera roll. The
correction chooses an anchor from viewport orientation only, holds it fixed during
navigation, and lets Earth and stars respond to the same physical camera.
Earth remains bottom-left in portrait overview, but may move out of frame in rooms.
Only an actual viewport-orientation change eases between composition anchors;
initialization and reduced motion apply the chosen anchor immediately.

No asset, geometry, material or draw-pass change. The texture remains 2,862,376
bytes and approximately 20 MiB nominal RGBA8+mip storage. Transform updates now
belong only to viewport composition changes. Changed visible fragment coverage
prevents inferring equal GPU time from these counts; no new timing, power or
thermal claim is made. This is a correctness/art correction, not an optimization.

Verification: **345 tests passed**, typecheck, affected lint and production build
passed. The replacement regression asserts fixed Earth/atmosphere matrices and
moving projections during both camera-roll directions. Live Chromium sequences
capture both complete Contact round trips; phone, tablet and landscape were
checked. Native Safari and a correct whole-frame ultrawide recording were not
available; clipped/stitched capture attempts are explicitly documented.
Independent critic: **93/100**, recommendation keep, no unresolved implementation
blockers; sequential motion evidence and coverage limitations were reviewed.

The new CPU audit includes **57,324 poses** and **5,832 targeted exact-frustum
perturbations**. Ordinary navigation retains guarded crop margins of about
85/138 source rows on desktop and 128/138 on compact geometry. All exact resize
and perturbation samples fit the existing crop. Four deliberately enlarged
ultrawide resize neighborhoods per mesh exceed the filtering allowance; their
sufficient bounds are conservative, but that stronger certificate is **not
claimed**. No guard was reduced to force a pass and the texture is retained.
[Evidence, raw results and limitations](evidence/earth-stable-navigation/README.md).

The owner's partial-sphere/plane idea was assessed only. The two Earth meshes
share approximately 0.52 MiB desktop / 0.26 MiB compact geometry arrays, versus
20 MiB nominal map storage. Back faces/offscreen regions are not fully shaded,
although geometry processing remains. Mesh trimming alone does not shrink the
already regional 2560×1536 map or reduce the pixels visible on screen. Further
texture reduction needs proof that content is unused across the corrected
navigation and full loop. A bounded exact partial-mesh benchmark is a low-priority
held candidate, with no promised speedup or download saving. A flat-card rewrite
is not recommended without evidence of preserved perspective and a net gain.

### Entry 31 — continuous portrait overview flights, 20 September 2026

**Superseded by entry 32:** the owner rejected the residual clearance pullback.
The earlier critic score did not establish user acceptance.

Art/motion baseline change from `f907b7b`, explicitly requested by the owner.
Portrait overview gains a restrained oblique angle; landscape directions remain
unchanged. The old three-stage pullback/roll/approach itinerary is replaced by
one eased cubic curve whose clearance poses are shaping controls. Normal phone
entry and return each take about **3.73 seconds of active animation time** in the
captured trace, with no intermediate settle gate. This is authored motion duration,
not render performance. Camera traces preserve a fixed spacecraft matrix. Browser
history interruption carries current velocity through a short decaying tangent.

No texture, geometry, material, render pass or resolution changes. Curve setup is
performed on navigation and scalar interpolation runs during flight. AO still
refreshes as the camera moves; changing roll still invalidates the cached shadow.
Different motion and visible fragment coverage establish a new baseline; no CPU/GPU,
frame-rate, heat or battery improvement is claimed. Deferred optimizations remain
held. The full source-identified [evidence](evidence/portrait-continuous-flight/README.md)
includes sequential before/after images, live camera traces, tests, crop-coverage
limits, an initial stale-test failure and the independent critic review.

Verification: **349 tests passed**, typecheck, affected lint and production build
passed. Hidden Chromium phone/tablet/landscape checks, both portrait directions,
direct About entry, queued Overview and mid-flight browser Back were exercised.
The renewed crop audit covers 115,564 poses; ordinary/curve guarded bounds pass.
Existing extreme ultrawide resize sufficient-bound exceptions remain disclosed;
all exact resize samples and 5,832 additional perturbed frusta fit. Arbitrary
interrupted-flight coverage and native Safari were not exhaustively tested.
Independent critic: **94/100**, recommendation keep, no unresolved blockers.

### Entry 32 — ceiling-facing overview and direct inward entry, 20 September 2026

Baseline `9b4ae30`. The owner requested the opposite portrait elevation and **no
zoom-out during room entry**. The prior curve still targeted widened clearance
poses. Those controls and their 17-roll support fitting are removed from runtime.
One ease now advances the physical eye and focus directly toward their endpoint
while rotating; the hull may crop during travel. Portrait virtual X is reversed
for every aspect below 1, showing ceilings; landscape direction remains unchanged.
Displayed hover/drag/dolly are absorbed into departure, and history-interruption
velocity is transformed into the same world frame.

Live phone baseline eye Z moved from 16.815 to 26.290 before arriving at 7.129.
Fresh candidate entry from highlighted Contact moved from 16.277 to 7.129 with
**zero outward depth steps** across 149 recorded frames. Its active authored
duration is about 3.20 seconds, not a render-performance metric. The different
hover state means the opening coordinates are not an exact same-input image
comparison; the retreat versus inward-only behavior is directly observable.
The first candidate diagnostic export was stale after HMR and was rejected;
its reason, original data and fresh repeat remain in the evidence.

No asset, geometry, material, render pass, resolution or texture change. Removing
clearance fitting simplifies navigation setup, but this is an art/motion change
and no CPU/GPU, frame-rate, heat or battery saving is claimed. Existing AO refresh
and roll-driven shadow invalidation remain. Deferred optimization candidates stay
held. [Evidence and verification](evidence/portrait-inward-flight/README.md) include
fresh live traces, sequences, responsive views, coverage limits and critic review.

Verification: 350 tests passed; final focused tests (7), typecheck, affected lint
and build passed. Hidden Chromium phone/tablet/landscape views, normal entry,
return and history reversal were checked. The updated coverage audit includes
118,508 exact poses, 5,832 targeted resize perturbations and 3,084 recorded
frame/mesh checks; all exact footprints retain the crop's 64-row allowance.
Ordinary/new-flight guarded bounds pass. Four pre-existing extreme ultrawide
resize bounds per mesh remain conservative exceptions, not universally certified
states. Native Safari and every possible interruption were not tested.
Independent critic: **93/100**, no unresolved blockers, recommendation keep.

### Entry 33 — reference-matched portrait overview and roof-biased drag, 20 September 2026

Baseline `73e576a`. The owner supplied a gentler vertical overview and clarified
that the roof to expose is the **outer left hull** after rotation; the underside
to restrain is the **outer right hull**. Portrait now uses virtual direction
`[0.10, 0.08, 1]`, yaw −0.40…+0.03 radians and pitch ±0.32. Both halves of the
asymmetric response share a derivative at neutral, avoiding a drag-speed jump.
The displayed pose and range velocities are retained when departing/interrupted.
The prior direct inward path, spring return, landscape direction/ranges/fit,
stationary spacecraft and physical orbital viewpoint remain.

This is authored camera design, not a performance optimization. It adds two
scalar range springs and denser portrait-only containment sampling (8 divisions,
including neutral, versus 4); containment runs when resolving a pose, not as a
new render pass. No texture, mesh, material, shader or render-pass changes were
made. The changed view can affect screen coverage, so unchanged resources do not
prove equal CPU/GPU cost. No frame-rate, memory, heat or battery benefit is claimed;
all held optimization candidates remain held.

[Evidence](evidence/portrait-roof-biased-overview/README.md) records the source
hashes, before/after portrait views, near-limit roof view, capped underside view,
release sequences and final live room entry/return. Phone entry has 192 frames
with **zero outward depth steps**; return is monotonic outward to overview.
Full suite: **354 tests passed**; final focused camera tests (11), typecheck,
affected lint and production build passed. Live checks use hidden built-in
Chromium at actual 390×844, 768×1024 and 1280×720 CSS pixels, DPR 1; Safari was
not tested. All 118,508 exact audit poses and 1,770 recorded frame/mesh checks
pass the retained crop's filtering allowance. Normal-view/flight guarded bounds
also pass; 16 conservative resize-union neighborhoods per mesh remain inconclusive
despite safe exact footprints. This is not a universal coverage certificate.
Independent critic: **94/100**, no unresolved blockers, recommendation keep.

### Entry 33 follow-up — more responsive right-side portrait drag, 20 September 2026

Baseline `610f8bf`. The owner liked the new portrait composition but found the
rightward drag nearly inert. Its +0.03-radian cap was below the 0.036-radian hover
range, allowing hover alone to consume the entire allowance. The portrait yaw
maximum is now **+0.10 radians** (about 4° more travel); −0.40 left limit, ±0.32
pitch, neutral direction and landscape controls remain. The existing shared-slope
response stays smooth; changing the right bound also slightly changes intermediate
leftward sensitivity, while its endpoint is unchanged.

The regression now checks that right drag adds useful motion beyond right hover,
in addition to containment, roof bias, smooth neutral response and inward flights.
No assets, passes or runtime algorithms changed. This is a requested design
adjustment; no performance benefit or identical GPU timing is claimed. Deferred
optimization candidates remain held. [Follow-up evidence](evidence/portrait-right-drag/README.md)
records live before/after drag, phone checks, final verification and finite
source-matched Earth-coverage results. The prior 17-viewport audit remains
historical, rather than being relabeled as a current full-domain certificate.
Verification: 354 tests and 11 focused camera tests pass, along with typecheck,
affected lint and build. All 22,040 sampled phone/tablet Earth poses pass exact
and guarded filtering allowances on both meshes. Hidden Chromium checks show
visible rightward travel and smooth spring return; Safari was not tested.
Independent critic: **95/100**, no blockers, recommendation keep.

### Entry 34 — Projects application and portable authoring, 20 September 2026

Baseline `e940a53`. The existing four Projects monitors now open an application
window on their own glass, with category browsing, full project stories,
persistent scrolling, responsive close-camera framing and shared reading content.
Studio adds structured metadata, flexible Markdown, managed image/video/caption
media and bounded draft-only ZIP import/export. Existing owner content and
publication state are preserved. The old Projects clipboard is removed; other
readers remain. This is a feature/art change, not a ledger optimization.

The source-identified Node/Three inventory has the same deltas for wide/compact:
all objects **+30 meshes, −4,864 triangles, −127,232 geometry-array bytes**;
effectively visible neutral overview **+35 meshes, +544 triangles, +20,672 bytes**.
Removing hidden reader geometry accounts for the retained-storage decrease;
independent screens/rims and material isolation add visible mesh slots. These
are not actual draw counts, process/GPU memory or timing. There is no added
postprocess, shadow pass or Earth asset. New DOM/Markdown and authored media have
costs; no delivery, first-frame, steady CPU/GPU, frame-pacing, heat or battery
improvement is claimed. Future measurement should include closed/open library,
story scrolling and video, rather than attributing this new baseline to a gain.
All held optimization candidates remain held.

The close portrait application uses a Projects-only fit minimum and near plane;
ordinary cameras retain their previous values. The updated Earth coverage audit
checks **17,680 finite poses** across 17 viewports, all four monitor anchors and
both sphere meshes. Every exact footprint retains the 64-row filtering allowance
(minimum **84.594 rows**); seam clearance remains at least **115.3125°**. This is
not a proof of arbitrary interrupted/resize trajectories. The initial pre-fix
coverage remains source-identified as superseded.

[Evidence, verification and critic review](evidence/projects-library/README.md)
include current source hashes, inventory definitions, raw coverage, responsive
Chromium views, interaction checks and the corrected initial failures. Full suite:
381 passed; final targeted regressions, typecheck, affected lint and production
build pass. Native Safari, real touch and a cross-device video codec matrix were
not tested. No owner records were rewritten or automatically recategorized.
Independent critic: **94/100**, no unresolved blockers, recommendation keep.

### Entry 34 follow-up — populated demos and display clearance, 20 September 2026

Baseline `9efe05c`. The owner requested varied demo categories, rich media,
physical-monitor-only category selection and correct application fit. The nine
untouched local samples now provide **5 Systems, 3 Interfaces, 1 Experiment**,
with Markdown, still covers, native video/captions and a finite GIF. A loopback-only
population tool preserves edited content/private drafts and reruns without
updates. Fresh seeds contain the story/category text; managed media is populated
explicitly. Reading view retains its useful category filters.

The HTML anchor now matches real glass depth; the physical application rectangle
reserves `.01` extra clearance inside each feedback-rim edge. The camera preserves
portrait text sizing. Complete covers are capped at 180 logical pixels, and narrow
tables scroll rather than breaking ordinary words. No mesh, material or render
pass is added. This is design/content work, not an optimization; framing and new
DOM/media can change rendering cost. No CPU/GPU, FPS, heat or battery improvement
is claimed, and deferred candidates remain held.

Twelve managed demo assets total **206,539 bytes** (nine WebP covers 143,808 B,
MP4 48,567 B, GIF 13,917 B, captions 247 B). This is an asset inventory, not measured
initial transfer, decode/upload time, process/GPU memory or frame cost. The MP4
plays on user action; the GIF runs 24 frames at 80ms twice, stopping at 3.84s.

[Evidence and review](evidence/projects-demo-fit/README.md) preserve final source
hashes, valid/rejected browser captures, clearance rays and raw crop-coverage data.
All 1,440 monitor-perimeter rays are clear across four screens and five viewports.
All 17,680 finite Earth poses retain the 64-row filtering allowance (minimum 84.594
rows) and 115.3125° seam clearance. Those aggregate bounds match the prior recorded
Entry 34 audit; its baseline was not freshly rerun. These checks do not certify
every interruption/resize trajectory or native HTML/WebGL compositing state.

Verification: **390 tests passed**; final focused regressions, typecheck, affected
lint and production build pass. Hidden Chromium checked desktop, phone, tablet
and a 990×1298 viewport; the last capture is bottom-cropped by the browser tool,
and malformed full-page/clip captures were rejected. Native Safari and a full
video codec matrix were not tested. Independent critic: **95/100**, no unresolved
findings, recommendation keep.

### Entry 34 follow-up — desktop projection and navigation, 20 September 2026

Baseline `071841a`. The owner reported a downward-offset Projects window on
Safari desktop. The existing glass/camera anchors matched in Chromium; the
large displacement was not reproduced there. Native reader HTML now uses one
explicit viewport-relative projective matrix, replacing its nested CSS3D camera
wrappers and percentage centering. Hotspots retain CSS3DRenderer. The shared
physical camera, surface anchors, geometry and Earth coverage envelope are
unchanged. This is a robust positioning correction; native Safari confirmation
is still outstanding, and no exact engine-specific cause is claimed.

Projects gains static CSS wallpaper and a distinct, persistent title-bar Back
control. No image asset, scene texture, mesh, shadow or postprocess pass is added.
The new projection performs matrix composition in the existing CSS phase, reuses
scratch matrices/cached viewport dimensions, skips hidden surfaces and caches
unchanged style writes. It introduces no per-frame DOM read. These implementation
facts do **not** establish unchanged compositor cost or a measured performance
gain. No CPU/GPU, frame-pacing, delivery/memory, heat or battery saving is claimed.
This design/correctness work does not implement any held candidate.

[Source-identified evidence](evidence/projects-screen-projection/README.md) records
Chromium checks from 320×568 to 1920×1080, a default 1280×720 DPR2 view, category
return/scroll/resize/drag/close, and shared Contact/About/Case readers. Settled
neutral DOM/physical-plane bounds agree within 0.003 CSS pixels. Moving samples
with a delayed diagnostic snapshot are explicitly excluded from that bound and
retained. The new finite regression covers 1,125 projected points and inverse
mapping; it cannot certify an engine's native compositor. Full suite: **392
passed**; typecheck, affected lint and production build pass. Independent critic:
**93/100**, no implementation blockers, recommendation keep. Native Safari
confirmation and unmeasured compositor cost remain limitations.

### Entry 34 follow-up — full-glass wallpaper and list refinement, 20 September 2026

Baseline `4370874`. The owner clarified that wallpaper must cover the full monitor,
including the area outside the HTML app. Projects and Contact now show a shared
static canvas texture on their complete rounded glass while active, restoring
idle graphics on close. App wrappers are transparent around their opaque windows.
Project collections are text-only; detail covers/media remain. Window chrome is
reduced to left Back/right X, and shared Markdown restores ordered/unordered/
nested markers and task checkboxes after the global reset.

This authored design introduces one 1024×768 texture, nominally **4 MiB RGBA8
including mipmaps**, with nominal **3 MiB canvas backing**. These are estimates,
not measured process/GPU memory. It needs no image download; preparation/upload
work was not timed. Actual post-batching inventory adds five retained meshes and
five material instances sharing the texture: **21,676 geometry-array bytes**,
130 triangles per Projects desktop and 42 for Contact. Only one wallpaper is
visible when an app is active. Mesh counts do not establish actual draw counts
or unchanged frame cost. Gallery image removal avoids those DOM image elements;
no net download, CPU/GPU, FPS, heat or battery saving is claimed.

[Evidence](evidence/projects-desktop-refinements/README.md) preserves final source
hashes, post-batching inventory, live Chromium desktop/portrait images and a finite
SSR fixture of the real list renderer/styles in immersive/reading/Studio wrappers.
The fixture does not certify the entire authenticated editor. No owner records
were rewritten. No camera/Earth coverage changed; all held candidates remain held.
Full suite: **396 passed**; typecheck, affected lint and production build pass.
Independent critic: **95/100**, no unresolved implementation blockers,
recommendation keep. Native Safari and runtime timing remain untested.

### Entry 34 follow-up — fitted Contact frames and Projects finishing, 20 September 2026

Baseline `4a1f715`. Contact's three monitors replace protruding stacked trim with
one seated rounded frame and concentric corners, giving the glass a uniform dark
border. The glass and application anchors move slightly backward; screen sizes
and camera-control settings stay unchanged. Projects adds category title-bar
labels, removes the gallery status bar, replaces generic detail status with the
project title and paints category counts on all four room screens. Three guarded
local demos now contain nested lists; tight nested task metadata renders once.

Post-batching retained Contact output changes by **−1 mesh, −3,652 triangle
inputs, +61,672 geometry/index-array bytes**. Effectively visible deltas are
−1 mesh, −3,692 triangles and +60,152 bytes. Projects geometry and nominal texture
storage stay unchanged; no added texture or image download. These are structural
inventories, not actual draw calls or measured process/GPU allocations. No timed
CPU/GPU, frame-pacing, heat, battery or net delivery improvement is claimed.

[Source-identified evidence](evidence/monitor-finishing/README.md) preserves model
sources, reproducible inventory, live Chromium desktop/portrait checks and raw
coverage. The desktop sphere audit checks 66,598 finite poses over 17 viewports;
exact sampled footprints retain the 64-row allowance and positive seam clearance.
The compact mesh repeats those 66,598 poses and also passes exact sampled
coverage. Broad ±.25-position/5.5° neighborhoods exceed the south crop by
170.67 rows (desktop) and 192 rows (compact):
that continuous certificate is **inconclusive**, not a passing universal guarantee.
The texture/crop is unchanged and no held optimization is implemented.

Full suite: **400 passed**. The final isolated tight-task renderer correction
then passed 19 focused tests; typecheck, affected lint and production build pass.
Native Safari, real touch and runtime timing remain untested. Independent critic:
**95/100**, no unresolved implementation blockers, recommendation keep; full
rubric and review corrections are recorded with the evidence.

## 35 — Project interface polish and compact archive terminal (21 September 2026)

Baseline `c7a5c9c`. Projects removes redundant card/detail actions, footer category
copy, project period fields and physical-monitor counts. Optional repository/live
links share a restrained resource row in the application and reading view. Gallery
counts and Experience timelines remain. Bottom **Tools** groups Earth playback,
opt-in diagnostics and Content studio; opening its list starts neither inspection
tool. At viewports at least 1000×650, Projects/Contact reduce their inner application
padding to 4px/6px. Physical safe insets, projection and camera paths are unchanged.

The Case studies floor terminal changes from a very wide strip to **16:9** glass
(1.12×0.63 before its existing 0.85 rig scale). Its enclosure, handles, cable and
supports follow those dimensions. This is a new authored design baseline, not an
optimization and not authorization for any held candidate below.

The [source-identified inventory and visual evidence](evidence/project-interface-polish/README.md)
compare the normal batched model in wide/compact layouts, idle and Contact-open
states. Mesh, triangle-input, geometry-array, material and structural submission
counts are unchanged. The Case assembly retains 28 meshes, 76,062 triangle inputs
and 2,163,692 geometry-array bytes. Its canvas changes **1536×318 → 1536×864** to
preserve the existing horizontal artwork resolution at the new aspect ratio:
nominal RGBA8 storage including mip levels increases **2,603,080 → 7,077,784 bytes**,
or **4,474,704 bytes / 4.27 MiB**. Total retained model texture estimates change
101,808,796 → 106,283,500 bytes. Canvas backing, driver allocations, Earth,
environment maps and render targets are not included. No new image download is
introduced; the display is painted locally.

These are structural counts and storage estimates, not measured browser/GPU
memory or CPU/GPU timing. No frame-rate, delivery, heat or battery gain is claimed.
Chromium visual/interaction checks and validation limitations are recorded with
the evidence; native Safari was not controlled. Existing optimization candidates
remain held.

Final isolated full suite: **405 passed**; typecheck, production build and affected
lint pass. Independent critic: **91/100**, keep. The evidence also discloses an
initial test-isolation failure that removed deprecated site-label metadata,
unsuccessful exact-value recovery, and the compatibility/isolation safeguards
added afterward; the final suite used separate disposable data.

## 36 — Project screen refinement and archive-terminal restoration (21 September 2026)

Baseline `194d359`. This follow-up replaces entry 35's application padding
adjustment with the requested smaller **physical wallpaper margin** in Projects.
The landscape HTML surface now has a 0.02 total glass inset instead of 0.06,
with 2px inner padding. The existing 0.06 rectangle still determines camera
framing, so camera endpoints and motion are unchanged; portrait retains its
original physical rectangle. Contact's preceding desktop-only padding rule is
reverted to uniform 14px. Projects removes the exterior app shadow and wide dark
scrollbar backing, retaining the outline, track/thumb and focus feedback.

The owner rejected the Case studies 16:9 terminal; its original wide geometry
and canvas are restored. The [source-identified comparison](evidence/project-screen-refinement/README.md)
records unchanged mesh, triangle, material-submission and geometry-array counts.
The canvas returns from 1536×864 to 1536×318: nominal RGBA8+mip storage decreases
by **4,474,704 bytes / 4.27 MiB**, returning the retained model estimate from
106,283,500 to 101,808,796 bytes. This is a design reversal, not a measured
rendering-speed improvement. Actual process/GPU memory, CPU/GPU timing, startup,
frame pacing, heat and battery were not measured. Held candidates remain held.

Relay now demonstrates all supported project formatting/media and the optional
resource buttons, with explicit attribution of its BullMQ example destinations.
Meter moves to Systems, leaving Experiments empty but selectable: counts
9/6/3/0. The replacement Meter cover shrinks 15,682 → 15,470 bytes; the managed
demo asset set totals 206,327 bytes and loads on demand. Old persisted media is
preserved. No total session-download or runtime gain is inferred from these bytes.
Tools also preserves pointer toggle intent through intervening focus dismissal;
ordinary second-click closure was verified in Chromium, with the ordering defect
covered by an event regression rather than a claimed Safari reproduction.

The final full suite used separate fresh D1/R2/secrets/cache: **411 passed**,
no failures or skips. Typecheck, production build and affected lint pass. Live
Chromium desktop, portrait and narrow evidence is preserved; native Safari and
real touch are untested. Independent critic: **94/100**, keep, no unresolved
blockers; rubric, corrections and limitations are recorded with the evidence.

## 37 — Dormant project categories and prominent live action (21 September 2026)

Baseline `0f4e03d`. Empty categories now retain dark, unlabelled installed
monitors with no hover, activation or keyboard/accessibility target; reading
view omits their filters. This supersedes entry 36's selectable empty state.
Availability updates from the same explicit categories throughout React, the
runtime and model without recreating the scene. The optional live-project link
is now an amber title-side action, stacking on narrow screens; source-link
appearance remains unchanged. A scoped reading-paper width fix prevents rich
content from widening the page on portrait screens.

The [source-identified evidence](evidence/project-category-actions/README.md)
records zero structural changes in mesh/triangle inputs, material submissions,
geometry arrays and nominal texture storage across wide/compact idle and
Contact-open fixtures. Retained model RGBA8+mip estimate remains 101,808,796
bytes. Empty monitors reuse their existing canvases; installed hardware is
preserved. No media asset or texture download is added. The inventory uses
populated fixtures and does not measure HTML layout, changed canvas pixels,
collection-refresh timing or browser/GPU allocation.

No runtime timing, startup, pacing, total delivery, heat or battery gain is
claimed. This is requested behavior/design work; held candidates remain held.
The isolated full suite passed **414 tests**. After the sole subsequent source
change (the narrow reading-paper CSS fix), **15 renderer tests**, typecheck,
affected lint and production build pass. Live Chromium checks cover desktop,
portrait and narrow views; native Safari was not controlled. The evidence records
source hashes, the superseded partial suite, corrected capture artifacts and
independent critic findings. Final critic: **95/100**, keep, no unresolved blockers.

## 38 — Intentional standby art and quieter resource actions (21 September 2026)

Baseline `c2886e5`. The owner rejected entry 37's black dormant face and solid
amber resting button. Inactive monitors now show the existing desktop wallpaper,
subdued with a small STANDBY label, while preserving all availability guards.
Live rests in a dark amber tint with an outline; hover/focus produces a stronger
fill. Source is a secondary outlined control with code icon and View source code
wording. Both interactive and reading views use these states.

The [source-identified comparison](evidence/project-standby-resources/README.md)
records unchanged geometry arrays, mesh/triangle inputs, material submissions and
nominal texture storage in the populated structural fixtures. The retained model
estimate remains 101,808,796 RGBA8+mip bytes. Standby copies the already-created
desktop canvas into the existing idle canvas, adding a copy/overlay/text operation
and reupload when availability changes, not per-frame painting. There are no new
media assets, texture allocations, geometry or render passes. The changed Canvas2D
preparation/upload and HTML visual-state costs were not timed. No runtime,
memory-residency, download, thermal or battery improvement is claimed.

The isolated full suite passes **415/415** against the final source, along with
typecheck, affected lint and production build. Hidden Chromium evidence covers
desktop rest/focus, portrait and narrow views and inert standby interaction;
native Safari remains untested. This is design work; held candidates remain held.
Independent critic: **95/100**, keep, no unresolved blockers.

## 39 — Populated-monitor wallpaper and grouped resource actions (21 September 2026)

Baseline `1e7eacc`. The owner requested the reverse room-view background
assignment: populated monitors now use the folded wallpaper behind their title
and icon; unavailable monitors retain STANDBY on the plain navy gradient.
Live and Source now share the resource row below the introduction, in that order,
in both views. Their approved visual states remain; obsolete title-side layout
code is removed. [Evidence and source identities](evidence/project-screen-hierarchy/README.md)
record the new composition and responsive checks.

This only changes Canvas2D painting and HTML/CSS composition. Existing geometry,
material/texture allocation, canvas dimensions and render-pass code are unchanged
by inspection; the inventory was not remeasured. Copying wallpaper now happens
for the initially available draw of each monitor and subsequent populated-state
repaints. A monitor later marked unavailable is repainted with gradient/text.
This changes bounded preparation/repaint work, not per-frame painting. There is
no new media request. Preparation, upload, CPU/GPU timing, actual memory and
session delivery were not measured; no performance improvement is claimed.

Verification covers the affected pure renderer, category availability, desktop
and application-layout suites plus typecheck, affected lint and production build.
No shared renderer, navigation, backend or data code changed, so the mutating API
suite was not repeated. Hidden Chromium provides visual evidence; native Safari
is untested. Held optimization candidates remain held.
All **25 targeted tests** and required checks pass. Independent critic:
**95/100**, keep, no unresolved blockers.

## 40 — Four-recorder Case studies room and taller terminal (21 September 2026)

Baseline `32d7577`. The owner removed the bottom Field notes recorder and asked
for a taller, narrower screen that fills the available space. The four upper
cartridges stay aligned; terminal glass is now **1.76 × 0.99 (16:9)** before its
existing 0.85 scale, with matching casing, handles, hinge supports and artwork.
This supersedes entry 36's restored wide terminal and is a new authored baseline.
Shared room cameras and the renderer remain unchanged.

[Source-identified evidence](evidence/case-study-four-options/README.md) preserves
live Chromium desktop, portrait, compact, drag-return and overview views. The
static Node wide-layout inventory (excluding document-backed graphics/textures)
changes **452 → 450 visible meshes**, **1,009,734 → 1,000,234 triangle inputs** and
**36,143,548 → 35,892,276 geometry-array bytes**. These are not submitted draw calls
or GPU timings. The larger 1536×864 screen canvas, less the removed 1536×115 label,
adds an estimated **3,535,832 RGBA8+mip bytes (3.37 MiB)**. No new media download,
render pass or per-frame painting. Actual memory, preparation/upload, CPU/GPU
pacing, heat and battery were not measured; no speedup is claimed. Held candidates
remain held.

The isolated full suite passed **415/416**, with one stale minimum-batch assertion
exposed by the removed recorder. After replacing that art-dependent threshold
with actual-coalescing and retaining all exact-instance/equivalence checks, the
full affected file passes **5/5**. Typecheck, affected lint and production build
pass. No implementation changed after that full suite; only the test was corrected.
Native Safari and physical touch remain untested. Independent critic: **94/100**,
approve, no blockers or required revisions; rubric is preserved with the evidence.

## Next candidates

**Status update, 15 September 2026 — candidates 1–5 were authorized and audited in entries 19–23. The owner approved retaining GTAO after candidate 4. Candidate 5 recommends retaining current illumination; its visibly different probes remain developer-only and unapproved. Candidates 3 and 4 retain the existing cached shadows and GTAO; their bakes also remain developer-only.** The user selected **8K night Earth detail as the intended quality level**, having found its visual improvement worthwhile. Entry 30 now preserves that source texel density in a 2560×1536 AI-assisted atlas with fixed Earth placement and a responsive camera lens; use its exact source/asset hashes in new baselines. Historical full-world comparisons retain their matching assets. Entry 13's observations remain historical evidence; this decision supersedes its general recommendation of 4K for this portfolio. The bounded candidate 5 experiment does not authorize production adoption, automatic resolution reduction or other deferred optimizations.

The completed camera and atmosphere changes establish the new baseline measured in entry 19; their effects are not attributed to the AO optimization. The spacecraft now stays fixed while the camera moves; the light rig, shadow-camera up direction and environment orientation are transformed during roll to preserve the authored appearance. Illumination therefore still changes relative to the stationary geometry, so one fixed shadow bake cannot reproduce every roll. The background now projects its sky texture from camera rays, adding normalization, matrix arithmetic and atan/asin operations per pixel. Unchanged draw, texture or pass counts do not establish unchanged GPU time; include this shader work in the new baseline.

### What is already precomputed or reused

The application does **not** rebuild every shadow on every frame. The renderer disables automatic shadow-map updates and reuses the key light's map. At this review, that is one shadow-casting directional light with a 2048×2048 desktop or 1024×1024 compact map. Roll still explicitly invalidates it because the light rig changes relative to the fixed spacecraft; resize and diagnostic scene changes also request updates. Moving doors and reader assemblies do not cast into that cached map. Ordinary frame rendering still samples the map to shade receiving surfaces. These are two different costs: generating shadow depth and using that depth during visible rendering. The underlying Three.js API explicitly supports manual updates. [Application renderer](../features/spacecraft/spacecraft-runtime.ts), [Three.js shadow implementation](https://github.com/mrdoob/three.js/blob/r185/src/lights/LightShadow.js).

Contact shading is a separate system: GTAO derives occlusion from the current camera view. Its result is already cached while the view settles, but refreshes for camera movement, geometry motion and dirty state. The current desktop configuration uses 32 AO samples, 32 denoising samples and render targets at 0.65 of each CSS viewport dimension. Animated door silhouettes participate in this pass. The model's broad motion flag also includes room brightness and highlight transitions. Entry 19 separates actual geometry revisions so those material-only changes no longer cause refreshes. This is now the normal application rule; the legacy rule remains in the developer comparison lab. Diagnostics retain the distinction, along with camera, projection, stretch and explicit invalidation reasons. [Renderer and invalidation policy](../features/spacecraft/spacecraft-runtime.ts), [Model animation and lighting](../features/spacecraft/spacecraft-model.ts).

The reflection environment is also prepared once at scene setup and reused. Room selection and hover change material color/emission, while metal reflections and highlights remain view dependent. Consequently, “precompute everything” should be investigated as several bounded experiments rather than a replacement of the whole room render with a fixed image.

### Order and authorization status

| Priority | Experiment | Expected opportunity and tradeoff | Evidence required before adoption |
| --- | --- | --- | --- |
| 1 · completed | Re-measure the delivered camera system and audit invalidation | Entry19 records the audit and targeted material-only AO reuse. Idle AO/shadows were already cached; this does not claim an idle gain. | Preserve the source-identified lab, accepted/excluded runs, transform/reason traces and image checks. Re-measure when art, camera or rendering changes. |
| 2 · completed | Prototype offline lossless geometry compaction | Entry 20 adopts exact direct indexed cylinder generation: 1.41 MB fewer retained arrays with no new model asset. The broader array bake is not adopted because of delivery and integration cost. | Preserve source generation/checks, exact expanded attributes and images, startup/rendering observations and inconclusive runs. Revisit broader direct-generation opportunities only with new measured evidence; do not restore runtime welding/cache approaches. |
| 3 · audited, baseline retained | Compare the existing cached shadow map with a developer-baked static representation | Entry 21 proves native-depth transport on the tested engine but finds no steady sampling reduction, added delivery/upload cost and incorrect shadows through portrait roll. Timing rankings were rejected for drift. | Keep the source-identified lab, exact/stale-map image pairs and excluded runs. Revisit only with evidence for net startup benefit, exact validity/fallback and cross-engine rendering fidelity; no production bake is enabled. |
| 4 · audited, baseline retention approved | Baked static contact shading and bounded live-zone hybrid in Projects | The owner approved retaining GTAO after entry 22: the bake and subdivision visibly alter shading, add 313,812 receiver triangles and require an additional asset. The hybrid improves moving contacts locally without matching the baseline. | Preserve source-matched subdivision controls, B/C image pairs, restored-A checks, rejected runs and qualified timing. Any future adoption requires acceptable art, a repeatable net benefit and renewed approval. |
| 5 · audited, baseline retained | Fitted environment-illumination probe on static Projects materials | Entry 23 compares replacing the shared irradiance lookup against changing only its diffuse contribution. Neither adds geometry or a texture; both visibly approximate existing lighting. Held-out error is about 5.3%; rested GPU controls fail the stability gate. Retain current illumination. | Source-matched GPU fit validation, dim/hover/selected/transit and portrait-roll checks, preserved material/reflection behavior, exact restoration, preparation costs and rested timing. A visible prototype must be accepted before production integration. |
| 6 · proposed, held | Exact visible-region Earth mesh and texture coverage | A partial mesh may save vertex work; it does not automatically shrink the existing regional texture or visible fragment work. Low priority; no measured gain. | Independent surface/atmosphere visibility envelopes across navigation, drag and resize; exact retained UV/detail and limb checks; rested matched timing. Further texture cropping needs its own proof. No flat-card replacement or implementation authorized. |

Three.js exposes separate light-map and AO-map inputs; preparing suitable UV coordinates and texture/color-space handling is part of the asset work. A baked AO map is **not an exact substitute** for this application's existing screen-space multiply/composite, so passing a static screenshot check is insufficient. Keep any proposed dynamic shadow layer separate in the comparison: doors currently rely on the AO silhouette rather than casting into the key map, and adding their live cast shadows would introduce new appearance and cost. [Three.js material inputs](https://github.com/mrdoob/three.js/blob/r185/src/materials/MeshStandardMaterial.js), [GTAO implementation](https://github.com/mrdoob/three.js/blob/r185/examples/jsm/postprocessing/GTAOPass.js).

### Measurement and acceptance record

For each approved experiment, preserve a source/asset-hashed baseline and candidate, with the current Earth representation at approved 8K source detail, matching viewport/drawing buffer, frozen background time and deterministic camera/input routes. Measure each selected room and the overview at rest; ordinary and ladder travel; open/half-open/closed doors; pointer and keyboard hover; and both portrait and landscape transitions. Camera-only work must remain distinguishable from light-to-object changes.

Record CPU mean/p95, GPU mean/p95 where available, frame intervals and long frames, draw/triangle counts by pass, and shadow/AO refresh counts and reasons. The current spacecraft pass includes shadow-map generation when requested; do not label its entire cost “shadows.” Separate refreshed frames from cached frames, and use a narrowly scoped developer measurement if further attribution is needed. Report AO refresh cost and its frequency independently. Hiding groups changes occlusion, so differences are not additive invoices for objects.

Record new download bytes, decoded/texture/target storage, build-time bake duration, first-frame preparation and cache invalidation behavior. Check resource disposal and repeated visits. Include direct room loads, resize, motion preferences, Safari and Chromium, legible labels/screens, light leaks, stale door silhouettes, UV seams and reflection continuity. Use matched captures at several points along the route; note existing AO noise rather than requiring unexplained pixel equality.

Use balanced comparison order and the [rested testing workflow](performance-diagnostics.md#rested-cpu-candidate-comparisons), preserving native telemetry, exclusions and power-source context. Recovery pauses are an experimental control, not a guaranteed Mac cooldown. Nominal OS pressure does not prove constant clocks or absence of throttling. Treat a saving smaller than repeated baseline variation as inconclusive; approve additional implementation complexity only for a repeatable benefit in the affected workload without unacceptable visual changes. No frame-rate, heat or battery improvement is claimed for any proposal above.

Distance-dependent detail, optional lower-power idle behavior, optional adaptive drawing resolution and carefully proven room visibility remain deferred in the [initial investigation](performance-optimization-review.md#visual-or-motion-tradeoffs--not-implemented). Further global hardware reduction or broad chassis simplification is not a priority: preserve the approved detail and smooth hull. Revisit those options only if the new measurements identify a larger worthwhile opportunity and the user approves the visual or motion tradeoff.
