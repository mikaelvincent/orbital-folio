# Live dish and receiving surfaces: Option B

**Implemented, verified and reverted. No qualified net performance gain was
established.** This follow-up preserved the dish's motion, moving shadows and
contact shading while caching the unaffected spacecraft. It achieved much more
reuse than the [earlier fallback prototype](../README.md), and its sampled costs
were lower. The controlled comparison nevertheless had **zero accepted blocks**:
reference drift and changed operating conditions excluded its first block, and
the remaining prescribed recovery/order set could not fit the wait budget.

This extends candidate **10**, not a new candidate. The two investigations have
separate implementations, source snapshots and measurements. Their timings must
not be pooled. Neither establishes energy or battery-life savings.

## What B changed and retained

The authored two-axis dish scan, PCF shadows, GTAO quality, Earth, sky and Contact
animations were preserved. A conservative sphere around the dish axle enclosed
its entire rotation sweep. Projecting that volume into the light's view identified
whole meshes that could receive its moving shadow. Those meshes stayed live;
the remaining eligible opaque meshes supplied cached display color and depth.
In the measured desktop view, **504 of 633 meshes were cache candidates and 129
were live**, including 62 meshes in the dish influence set and ordinary live effects.
The portrait overview required a larger live set: 426 cached and 207 live.

The shadow map was repaired inside the padded light-space rectangle, redrawing
both the dish and overlapping static casters. Clearing and redrawing only the dish
would lose static occluders. Repair ran inside Three's normal shadow callback:
calling `shadowMap.render` directly outside `renderer.render` failed because
Three's active render state was absent. Layer masks and target scissors were
restored after each pass, including exceptional exits.

Existing normal/depth, GTAO and denoise targets were repaired within conservative
screen regions, dilated for AO sampling and denoiser support. Foreground occluders,
disoccluded background and normally hidden iris AO proxies remained eligible.
Projects' dish region was offscreen, allowing those dish-only AO updates to be
skipped. The light-space shadow repair still ran. No separate shadow-factor
multiplication or frozen moving shadow was used.

Camera/projection, viewport, other geometry, lights, materials/textures, scene
inventory and room transitions forced full reconstruction. Only the authored dish
rotation bypassed that invalidation: mount position/scale, parent transforms,
descendant transforms and geometry attributes remained inputs. Independent source
review caught missing transform/shadow-intensity inputs and incomplete candidate
capture gates; these were fixed before measurement. Rest/hiding released the
color/depth attachments; wake-up rebuilt them before reuse.

This added complexity and storage. RGBA8 display color plus unsigned-integer depth,
four multisamples and resolved attachments required **147,456,000 nominal bytes
(140.625 MiB)** at 2560×1440, or **43,200,000 bytes (41.199 MiB)** at 900×1200.
These are attachment arithmetic, not measured GPU/process memory. Resolving and
reconstructing depth also changed edge coverage; the result was not pixel-identical.

## Source and comparison method

- Production reference: `4161a44`. Final prototype/harness: `14d1972`.
  Rollback: `ad80c03`. Final source was checked against the reference; runtime,
  model, diagnostics, scripts, tests and dependencies were restored exactly.
- Reproduction uses a disposable checkout at `14d1972` and
  `node scripts/benchmarks/camera-invalidation-lab.mjs --experiment receivers --port 3021`.
  The historical **Rested comparison** control runs the experiment. Its source
  records the bounded retry rules; it does not predict whether conditions qualify.
- Frozen production-React public seed fixture, without private database/uploads
  or contact-write APIs. A disabled the cache in the same runtime; B enabled it.
  Attachments/programs warmed by B remained resident when returning to A. This
  was not an independent-process memory or delivery-size comparison.
- Hidden built-in **Chromium 154**, ANGLE Metal on **Apple M4**, macOS 27.0
  (26A428), Three r185. No Safari test. Projects, settled neutral camera, reader
  closed, reduced motion off, 1280×720 CSS, native/effective DPR 2, 2560×1440
  drawing buffer; GTAO 832×468, 32 AO/denoise samples, 2048² shadows.
- Battery power, discharging, Low Power Mode off; recorded charge 31→26%.
  Native conditions are retained in the raw report. Clocks and energy were not
  measured; unrelated user applications were not controlled.

The [comparison procedure](../../../../performance-diagnostics.md) used the same
complete-cycle adaptation as the first investigation: **1,080 fixed 1/60-second
simulation steps on actual RAF**, one authored 18-second dish cycle per capture.
Actual frame intervals and retained spans are reported separately. Unequal motion
in the first/last parts of a cycle makes the ordinary idle-window drift test
inapplicable; this is not a fixed-wall-duration capture. Earth was reset and
background time held at zero for matched rendering; dish/Contact time was replayed.
Every capture settled the room, warmed 30 frames and positioned the cycle. B was
invalidated before measurement, including one capture and two fallback frames.

The plan was three A readiness controls after 60 seconds without rendering, with
10-second control rests, then bracketed **ABBA / BAAB / ABBA / BAAB** blocks.
Five-percent spread, 2.5% monotonic drift and five-percent readiness-reference gates
covered CPU, whole-frame GPU and frame-interval means. Every A and B capture also
needed complete frame/query coverage, no GL/discarded-query errors, unchanged
camera/quality/buffers and matching readiness settings. Native conditions had to
remain nominal and power settings unchanged. Limits were 300 seconds of inserted
waits and 20 minutes from initial recovery, with at most one readiness retry and
one block retry. No other review renderer, build or test suite ran during timing.

Formal snapshot **8c12cef3-204b-4ffe-ac29-c2d046aeb0b5**, built at
2026-09-27 17:01:59.922 UTC, hashes all source, bundle and public assets. Key SHA-256s:

| Input | SHA-256 |
| --- | --- |
| Pixel cache | `3cf495dca93f92acc611aa1943eaf7c5319fbb7f8cab7dfe031cf2cec2c889cb` |
| Dish influence regions | `38cc66b6c82a04bad5e7189233d80df0f7dbddc03c75a99a1eda7b541594e92c` |
| Runtime | `da5a5326297f6e62c2222793375421ca0226d609bdf06fae518eecb87069938c` |
| Dependency lock | `3d5ccb3561102f4b28ccdc1ab60109b377eaa520641ea5f8d430d4c2e9aaadc4` |

## Controlled result: promising samples, excluded block

[Raw run](receivers-timing-1790528565661.json.gz), 17:02:45.661–17:10:45.594 UTC.
All twelve complete captures retained 1,080 frames and 72 whole-frame GPU samples,
with zero pending/discarded queries or GL errors. GPU timing sampled every
fifteenth frame, so it does not resolve every cache transition.

Initial readiness failed: CPU increased monotonically by **3.444%**, above 2.5%;
GPU spread was **5.175%**, above 5%. The single recovery retry passed, with CPU,
GPU and frame-interval spreads of **2.108%, 0.836% and 0.115%** respectively.

The first block produced these **excluded descriptive values**, in milliseconds.
They are not accepted speedup estimates or confidence bounds.

| Capture | CPU mean / p95 | GPU mean / p95 | Interval mean / p95 | Retained span, s |
| --- | ---: | ---: | ---: | ---: |
| A before | 4.957 / 6.7 | 13.173 / 16.028 | 16.865 / 18.8 | 18.197 |
| A scheduled | 4.940 / 6.7 | 13.197 / 16.467 | 16.883 / 18.9 | 18.217 |
| B scheduled | 3.928 / 5.2 | 8.312 / 10.473 | 16.667 / 17.6 | 17.983 |
| B scheduled | 4.033 / 5.1 | 8.020 / 10.291 | 16.661 / 17.6 | 17.977 |
| A scheduled | 4.974 / 6.8 | 13.087 / 17.128 | 16.869 / 19.0 | 18.201 |
| A after | 5.168 / 7.1 | 12.828 / 15.464 | 17.317 / 19.2 | 18.685 |

Each B capture recorded **1,077 hits, one capture and two full-render fallbacks**:
99.72% reuse across the entire cycle, versus 46.1% in the earlier prototype's
separate cohort. Moving shading no longer forced a whole-scene fallback on every
scan frame. CPU, GPU and pacing samples all looked better within this block.

However, chronological reference CPU spread reached **5.637%**, exceeding 5%,
and native OS pressure changed from nominal to fair at the block's end. The
within-block spread and per-capture coverage checks alone were insufficient to
accept it. The slower final reference remains in the report.

The harness took its 60-second block-recovery pause, then was stopped while
preparing the first new control. The complete remaining schedule could no longer
fit: 160 seconds of initial/retry/control waits + 5 within the failed block +
60 recovery + 20 new control rests + 80 for all four replacement/remaining blocks
would total **325 seconds**, above the 300-second cap. At interruption the report
had recorded **225 seconds** of inserted waits. The incomplete control has no
capture row; all twelve completed captures survive. The raw stop error says
“Replay stopped or hidden”; this was the explicit Stop control, not page hiding.

There were **zero accepted blocks, one excluded block, three unrun blocks and no
completed recovery controls/retried block**. No qualified block-effect median,
range or sustained-use result is available. No replacement timing cohort was run.

## Appearance, invalidation and automatic rest

Each [desktop](receivers-verify-1790527875878.json.gz) and
[portrait](receivers-verify-1790528205245.json.gz) replay produced **54 image
comparisons plus a release/wake record**. These covered all five rooms, six moving
dish checkpoints per room, hover, opening/closing doors, travel, arrival and cache
release. Moving B pixels were read before forcing a complete shadow/AO/color
render of the identical pose. This exercised existing target history instead of
only rebuilding both images at a stationary pose. Recorded GL errors were zero.
Moving door/early navigation states used full rendering with matching pixels;
reusable states exposed edge differences. No moving trails were found in the
sampled frames, but this is not proof for every possible camera or geometry edit.

Desktop held-room mean absolute RGB differences ranged **0.0665–0.2169 / 255**;
portrait at 900×1200 CSS and drawing resolution ranged **0.1346–0.3993 / 255**.
Desktop Contact had 12,768 of 3,686,400 pixels with a channel difference above 8,
with a maximum of 168. Small global averages do not establish visual equivalence.
Representative moving frames preserve the actual edge/occlusion tradeoff:

- Desktop overview: [cached B](receivers-verify-1790527875878-verify-3-before.png),
  [fresh A](receivers-verify-1790527875878-verify-3-after.png).
- Desktop Contact: [cached B](receivers-verify-1790527875878-verify-19-before.png),
  [fresh A](receivers-verify-1790527875878-verify-19-after.png).
- Portrait overview: [cached B](receivers-verify-1790528205245-verify-3-before.png),
  [fresh A](receivers-verify-1790528205245-verify-3-after.png).

Visual replays used snapshot `baa422d9-bce6-4418-a03f-ae5ed2e9e1e8`, before the
final exception-reset/unsupported-scene guards and formal validity-gate edits.
Their manifests identify those earlier files; they are not final-source checks
of the added exceptional paths. Final focused tests passed after those edits; the added exceptional paths did
not receive another browser sweep.

The ordinary scheduler was separately exercised on the final candidate in an
isolated Vinext development server, with no audit controller. The
[DOM observations](rest-wake.json) recorded **1,018 frames and 17.050 seconds of
active time unchanged across 25.248 seconds at rest**. Clicking Scene tools woke
the same renderer; it subsequently reached 1,857 frames and 31.016 seconds of
active time. This confirms zero submissions during the observed rest and resumed
work, not an energy comparison. Existing rest already does no rendering: any
cache benefit is confined to active frames. The timing replay bypassed that policy.

The candidate passed **579 full-suite tests** in a disposable source checkout,
fresh D1/R2, generated test-only secrets and explicit separate `TEST_BASE_URL`.
The owner setup/workflow check passed 12 tests; final focused cache tests passed
11. Typecheck, production build and affected lint passed. Independent review was
read-only. No native Safari, phone browser or reduced-motion browser sweep was
completed; existing reduced-motion model/scheduler tests passed in the full suite.

## Retained failures and exploratory records

All five original JSON reports are preserved losslessly as gzip, including raw
frames, query samples, manifests and conditions. Only the six linked PNGs remain;
other image filenames in the raw reports identify omitted temporary comparisons.

| Record | Scope and limitation |
| --- | --- |
| [Initial integration failure](receivers-verify-1790527373697.json.gz) | Direct shadow rendering lacked Three's active scene state. One held comparison preceded the exception; fixed with the scoped shadow callback. |
| [Desktop moving checks](receivers-verify-1790527875878.json.gz) | Successful bounded export after an earlier export exceeded the 96 MiB lab limit. That rejected export has no saved numerical report and supplies no claims. |
| [Exploratory scan/cycle timing](receivers-probe-1790528053160.json.gz) | ABBA samples without rested qualification; source predates final defensive guards. Conditions changed and A drifted. Mechanism counts only; cannot rescue the excluded formal block. |
| [Portrait moving checks](receivers-verify-1790528205245.json.gz) | Separate viewport/lighting and effective DPR 1; not pooled with desktop timings. |
| [Controlled run](receivers-timing-1790528565661.json.gz) | Failed initial readiness, passing retry, excluded first block, bounded interruption. No accepted gain. |

The useful case-study extension is that preserving moving receivers made a much
larger reusable region possible, while adding coupled shadow/AO invalidation,
edge and memory costs. Successful cache reuse and attractive samples still did
not meet the evidence required to retain this implementation.
