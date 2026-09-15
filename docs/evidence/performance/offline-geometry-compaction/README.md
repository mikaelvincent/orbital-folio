# Offline lossless geometry compaction — 15 September 2026

User-authorized ledger candidate 2. Baseline: `437824a`, after the solid-wall hover
fix. Approved 8K Mediterranean night Earth, lighting, room art, navigation and
quality remain fixed. This experiment does not authorize other ledger candidates.

## Decision and scope

Use direct indexed cylinder generation. An offline script specializes the installed
Three.js generator to emit one cap-center tuple instead of one identical tuple
per cap triangle. The browser generates the smaller topology directly; it does
not hash/weld the completed spacecraft or download a baked model. Triangle order,
winding, torso/rim UV and normal seams, groups, parameters and serialization stay
intact. Unsupported parameters retain the original constructor behavior.

The specialization is generated from source, retains Three's MIT notice, and is
checked before every production build. `npm run geometry:generate` deliberately
requires renewed exactness verification after upstream changes. The build also
ships `/licenses/three-indexed-cylinder.txt`, since the production minifier strips
source comments. Explicit `geometryCompaction: false` remains a developer baseline;
normal visits use the indexed version and allocate no alternate scene.

[Inventory](inventory.json) uses default model options and a fresh model per layout, not a stale
pre-layout buffer snapshot. It checks all 488 meshes per layout before counting. All-layout
CPU geometry arrays include hidden responsive variants; visible arrays describe
potential geometry storage, not GPU process memory or actual draw calls.

| Geometry attribute/index arrays | Original | Indexed | Reduction |
| --- | ---: | ---: | ---: |
| All retained variants | 50,739,600 B | 49,331,536 B | 1,408,064 B (2.78%) |
| Wide visible model | 37,370,212 B | 36,290,596 B | 1,079,616 B (2.89%) |
| Compact visible model | 36,661,796 B | 35,669,732 B | 992,064 B (2.71%) |

All-layout vertices: 1,297,785 → 1,253,783. Meshes/geometries stay 488/430;
all-layout triangles stay 1,337,396. Visible wide triangles remain 1,012,382;
compact remains 990,718. These are model inventories, not pass submissions.

The largest visible savings are outer chassis/access hardware (371,072 B wide;
283,520 B compact), ladder utilities (354,752 B), Projects furniture (86,464 B),
About furniture (46,272 B) and Contact furniture (41,280 B). Geometry grouping
ranks storage only; it does not assign additive GPU costs to each object.

## Alternatives and delivery

A broader offline exact-buffer prototype finds 183 beneficial eligible buffers
and 5,146,816 B saved. Even its minimal array-only payload is 35,751,750 B raw,
9,101,496 B gzip or 4,356,463 B Brotli. It excludes hierarchy, materials, loader,
resource lifecycle and editable-content integration. Existing builders would
still run without a much larger asset-pipeline redesign. This is a lower-bound
payload experiment, not a shipped GLB or a measured startup comparison. It is
not adopted. The inventory script reproduces the binary in `/tmp`; hashes and
buffer details remain in the JSON. The 2,596 ms analysis observation excludes
compression and is not a rested timing result.

[Bundle comparison](bundle-comparison.json) uses matching minified standalone
renderer builds against the baseline commit, with the same installed dependencies.
Original: 1,101,299 B raw / 323,464 B gzip / 271,092 B Brotli. Indexed:
1,105,589 B raw / 325,552 B gzip / 272,741 B Brotli. Delta: **4,290 B raw,
2,088 B gzip, 1,649 B Brotli**. This estimates renderer-code delivery; it is not a
public-network transfer or Vinext's exact chunk packaging. There is no new
geometry/texture download. The separate license notice is shipped but not fetched
by normal scene loading. Earth download and texture storage remain unchanged.

## Exactness and visual method

Tests compare expanded position/normal/UV bytes, including signed zero, and all
attribute metadata, groups, draw ranges and stored/recomputed bounds. They cover
ordinary/open/partial/conical cylinders, deterministic parameter variants, the
Uint16/Uint32 reserved-index boundary, clone/JSON behavior, and the complete
spacecraft through wide → compact → wide with two editable configurations.

The hidden built-in Chromium lab mounts the real portfolio with public seed data.
At each deterministic checkpoint it swaps only geometry, sharing camera, material,
lighting, GTAO noise and frozen orbital time. Both sides regenerate AO and shadows.
Readbacks/image serialization are excluded from timing. This tests the exact
render inputs in moving/settled views without cross-instance GTAO noise.

The preliminary wide sweep `verify-1789459822325-497515d7` has 162 checks across
16 scenarios and zero differing pixels. All six saved PNG pairs are byte-identical.
Actual viewport: 1280×720 CSS, 2560×1440 drawing buffer, DPR 2. An independent agent
visually inspected overview, opening door and ladder close-ups (previews scaled to
2048×1152). The preliminary report's baseline accounting includes five runtime
navigation proxies absent from its reference model; its apparent 250-triangle
reduction is **not an optimization**. The final harness captures baseline model
accounting before those proxies are added. This accounting-only fix does not
change the preliminary image comparison.

The final portrait sweep `verify-1789460587180-ce2d820f` adds 170 checks, all with
zero differing pixels. Its six PNG pairs are byte-identical. Actual viewport and
drawing buffer: 900×1200, DPR 1, AO enabled. This includes portrait overview-entry
and return roll, normal/ladder travel, open/closing doors, readers, hover/drag and
settling. The critic inspected actual overview, door and ladder image pairs.

The public-seed browser fixture configures screen/reader content and has 512 model
meshes / 454 geometries before runtime proxies, versus the static default fixture's
488/430. Its arrays are 50,769,620 → 49,361,556 B, the same **1,408,064 B saving**.
The comparison lab additionally retains 17,863,232 B of candidate CPU arrays.
Neither that extra residency nor the earlier proxy mismatch is production savings.

## Timing protocol and interpretation

Finish builds/tests first. Use one hidden browser tab and an immutable production-
React standalone bundle. The main development server remains available but is not
used for timings. This is not the deployed Vinext server or a native Safari test.

Steady comparisons retain baseline and indexed CPU geometry arrays for switching,
explicitly reporting the extra arrays as `addedCpuBytesOverBaseline`. Inactive GPU
buffers are disposed before warming the selected route. Shared CPU residency stays
constant across variants; lab residency is not production memory. GPU pass surveys
and whole-frame paired timers are separate to avoid overlapping queries.

Fresh-startup samples mount one model and a new WebGL context in an iframe. Initial
warmups, 60-second recovery, three baseline controls ten seconds apart, ABBA/BAAB
blocks and 20-second inter-block pauses are recorded. Each sample unmounts React
and requests context release before acknowledgement. Release is not a measurement
of completed physical GPU reclamation. Inventory runs after the measured Earth-
ready boundary. Model construction, first submitted frame, and first 8K-ready
submitted frame have independent acceptance gates. Shared driver caches remain;
these are fresh mounts, not cold browser starts or measured presentation latency.

Visibility/context loss, viewport/DPR/drawing-buffer/quality mismatch and changed
native context reject comparisons. Once native telemetry has been available, its
later absence cannot qualify as uniformly unknown. Startup comparability is
conservative across all readiness attempts: an earlier invalid attempt can also
prevent a later block from qualifying. All raw attempts are retained.

Reference CPU spread must stay within 5%; readiness rejects sustained directional
drift above 2.5%. These are engineering gates, not guaranteed Mac cooldown times.
Nominal OS thermal pressure, idle pauses and power labels do not prove equal clocks,
absence of throttling, or battery/heat improvement. External user workload is
unobserved. Missing/disjoint GPU values are unavailable. CPU and GPU times are not
added. Small signals within baseline variation are inconclusive.

## Measured rendering and startup outcome

**Adopt for deterministic geometry storage, not a demonstrated speedup.** Both
16-scenario surveys completed with matching per-pass draw/triangle statistics and
AO refresh/cached counts in every scenario. Their sequential timing shifts are
not qualified gains. The raw files and [summary](summary.json) retain CPU/GPU
mean/p95 for background, main spacecraft, refreshed AO and its composite. For
example, idle overview submits 438 spacecraft draws / 1,013,140 triangles and
reuses AO on all 180 frames in both variants. Those counts are unchanged.

The balanced rendering run `paired-1789461414035-7b6d29a3` ended
`inconclusive-recovery`. Its first readiness group failed (10.48% spread), the
second passed (2.85%), then the first ABBA overview block failed with 7.97% repeated
baseline CPU spread. Recovery controls failed at 24.05% spread. No block qualifies;
the second block and balanced moving workload were not reached. Moving states do
have descriptive pass surveys and exact visual coverage. Do not infer a general
rendering result from this unqualified idle block.

For completeness, the **excluded** ABBA block's two runs per variant (360 frames)
were:

| Excluded metric | Original | Indexed |
| --- | ---: | ---: |
| Callback CPU mean / pooled p95 | 3.489 / 4.000 ms | 3.386 / 3.800 ms |
| Sampled whole-frame GPU mean / pooled p95 | 9.952 / 12.275 ms | 9.107 / 12.703 ms |
| Actual frame interval mean / pooled p95 | 16.667 / 17.700 ms | 16.673 / 17.800 ms |

The before/reference itself moved from 3.634 to 3.344 ms CPU and 10.846 to
9.058 ms GPU. These changes undermine a causal speedup claim despite attractive
pooled means. GPU was sampled every 15 frames; it is not every-frame timing.

Fresh startup `startup-1789461840758` completed warmups and passed all three
readiness metrics (construction 1.61% spread, first frame 2.95%, Earth-ready 2.77%).
Its first ABBA block then failed construction's 5% gate: 7.68% reference spread.
The run stopped `inconclusive-block`, so no BAAB replication was performed.
First-frame and Earth-ready gates separately passed in that block, but their
observed differences are smaller than their reference variation. They also do not
establish an improvement or equivalent speed.

| Fresh startup, one ABBA block only | Original mean | Indexed mean | Reference spread |
| --- | ---: | ---: | ---: |
| Model construction | 730.25 ms | 723.90 ms | 7.68% — excluded |
| Mount to first submitted frame | 962.95 ms | 955.10 ms | 4.75% |
| Mount to first 8K-ready submitted frame | 1,381.75 ms | 1,363.70 ms | 2.95% |

Raw samples retain frame-submission CPU, navigation-relative timestamps, asset
transfer/decode observations and resource cleanup. All 11 completed fresh mounts
(4 warmups, 3 controls, 4 block samples) reported valid visible/unchanged settings,
React unmount and requested context release. Both measured variants requested the
same 8K night texture. This does not time physical GPU completion or memory return.

Engine: built-in Chromium 152, ANGLE Metal / Apple M4; wide timed runs use
1280×720 CSS / 2560×1440 drawing buffer, DPR 2. Native snapshots in the rendering
run remained nominal, Low Power Mode off, `AC Power`, battery 80%, AC attached but
not charging. Startup context is preserved alongside each control/block. These
observations cannot establish thermal stability, clock equality, heat or energy
savings. Native Safari was not automated.

There is no known production correctness regression. The new constructor adds a
small namespace/class selection and parameter-validation cost while removing
redundant center emission. That startup tradeoff remains unproven by these noisy
whole-model timings. Adoption is justified narrowly by exact rendering and
1.41 MB fewer model arrays for roughly 2 KB gzip code, with no asset wait or new
render pass. Broader direct-generation or bake work needs a separate authorization
and comparison; shadow/contact-lighting candidates remain held.

## Evidence and verification record

Raw run IDs above, [build manifest](build-manifest.json), [source archive](source.tar.gz),
[inventory](inventory.json), [bundle comparison](bundle-comparison.json) and
[summary](summary.json) preserve sources, environment, exclusions and results.
Use `node scripts/benchmarks/summarize-geometry-compaction.mjs` to regenerate the
summary from plain or gzip raw JSON. Image-verification timings are excluded.
Large raw JSON is losslessly gzip-compressed for repository storage; image pairs
retain original PNG bytes. The evidence manifest records file hashes.

Full suite: 282 passed, zero failed. Typecheck, affected-file lint, generated-source
check and production build passed. Build emits existing large-chunk, deprecated
module-hook and route-classification notices; no build failure. Early harness
iterations corrected verifier-side bounds mutation and runtime-proxy accounting
before final comparisons; initial lint/type errors were corrected before the
frozen timing build. No required application check remains failing.

`baseline-feasibility.json` is an early inventory pilot, retained for provenance;
the layout-aware `inventory.json` owns final storage figures.

## Independent critic — 94/100

Final review: no blocking findings. Rubric: request/scope 25/25; exactness and
visual preservation 25/25; correctness/maintainability 18/20; performance evidence
and interpretation 17/20; documentation/reproducibility 9/10.

Review revisions strengthened bounds/attribute/index-width checks, captured model
ownership before runtime proxies, moved inventory outside startup timing, added
explicit scene/context cleanup and settings/telemetry guards, preserved the shipped
license, and clarified comparison-only CPU residency. The sampler path in the
repeat instructions was corrected. The critic independently verified matching
frozen sources, full-suite and final type/lint results, raw exclusions, all survey
counts and portrait image equality, and visually inspected three portrait pairs.
A separate design reviewer inspected three wide pairs. Neither reviewer found a
visible-change approval requirement.

The critic supports **storage-only adoption**. Remaining limits: no native Safari
validation, no stable repeated timing conclusion, no measured whole-process/GPU
memory, heat or battery result. These limits are preserved rather than converted
into an optimization claim. Normal About-room load and diagnostics open/close
also passed in hidden built-in Chromium with no console errors. Temporary lab
servers/tabs were closed; the main development server still returns HTTP 200.
