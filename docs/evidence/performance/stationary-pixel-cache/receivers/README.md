# Live dish and receiving surfaces: Option B

**Restored, retested and retained for the AO-enabled non-phone rendering path.**
Keeping the dish and affected receiving surfaces live preserves their motion,
shadows and contact shading while reusing the rest of the spacecraft. Six new
opposing-order desktop blocks favor B. The decision weighs that evidence against
memory, edge coverage and maintenance costs; it does not require the old strict
qualification gates to pass or establish a universal percentage gain.

This extends candidate **10**. The [first fallback prototype](../README.md),
original B trial and current retest have separate sources and measurements.
Historical exclusions remain intact. No energy or battery-life gain is claimed.

Current scheduling now keeps visible scenes moving continuously by owner choice;
hidden/offscreen suspension still releases the cache. The retest below predates
that scheduling decision: its active-frame comparisons still describe the cache,
while its automatic-rest checks describe the earlier source only.

## Restoration and decision retest

The implementation decision follows the revised diagnostics guide: valid statistics,
reference variation, removed work and product costs are assessed together. The
original excluded trial below remains excluded under its historical protocol.

The current renderer is the restored B implementation plus two guards: phone and
AO-disabled draws use normal rendering and release cache attachments; nonuniform
or sheared dish ancestry falls back to full rendering because its current pose
cannot establish a conservative whole-sweep bound. Diagnostic interventions bypass
reuse, although skipping the spacecraft draw can leave existing attachments resident.
Normal desktop and portrait authored scenes are unchanged by these guards.

Current main source: `163fc86` (runtime guards in `a881e8e`, restoration `69b860d`).
The disposable checkout used equivalent commits through `6e7a605`; its only local
app configuration difference was a checkout-local Vite cache directory. Frozen
snapshot `d4b13357-eaf3-4e0a-8010-d7945f281241` identifies the timing and portrait
source/assets. Desktop visual checks used `57cf09c0-e8d8-42f6-ba7a-b2228c4f4ca3`,
with the same renderer and before the final comparison-validity helper changes.

Each room had two A controls followed by ABBA and BAAB, 1,080 simulated frames per
capture (a complete 18-second dish cycle), actual RAF, a 30-second initial pause
and 51 seconds of inserted waits in total. No retries. Each report retained ten
captures, including controls. Earth/sky time stayed at zero; dish and Contact
animations replayed identically. A disabled B in the same warmed runtime; target
and program residency persisted between samples. This is not cold startup or
independent-process memory measurement. No builds/tests/other agent rendering ran
within the timing cohorts. Uncontrolled user-app load and clocks remain unknown.

GPU queries covered all 72 declared phases (frames 1, 16, …, 1066), with no pending,
discarded or skipped queries. CPU timing covers every frame. Each B cycle had
1,077 cache hits, one rebuild and two fallback frames. The rebuild occurs at frame
3 and is missed by periodic GPU sampling; CPU includes it. GPU percentages therefore
describe sampled whole-frame cost, not integrated cycle GPU time or energy. The
single rebuild's CPU cost, frame pacing, visual checks and removed work also inform
the adoption decision; the sampled percentage alone is not the entire net-cost test.

Desktop was 1280×720 CSS at native/effective DPR 2, 2560×1440 drawing buffer, GTAO
832×468, 32 AO/denoise samples and 2048² shadows. Hidden built-in Chromium 154,
ANGLE Metal Apple M4; no Safari or physical phone test. Portrait visual checks
were separately 900×1200 CSS/drawing pixels at effective DPR 1. Resizing the hidden
browser changed DPR; a fresh tab with the override reset restored native desktop
DPR before timing. Portrait timings are not pooled with desktop.

### Measured active-frame cost

These ranges are the two within-block `B/A − 1` reductions, not confidence
intervals. Means/p95 pool only the scheduled captures within each room/variant.
Raw controls and every valid scheduled capture are retained.

| Room / raw report | CPU mean A → B, ms | CPU reduction by block | Sampled GPU mean A → B, ms | GPU reduction by block |
| --- | ---: | ---: | ---: | ---: |
| [Projects](receivers-decision-1790531613311.json.gz) | 7.382 → 6.492 | 5.03–19.16% | 15.516 → 9.849 | 32.18–40.73% |
| [Overview](receivers-decision-1790532060945.json.gz) | 7.706 → 6.242 | 16.76–21.20% | 14.860 → 7.800 | 43.55–51.26% |
| [Contact](receivers-decision-1790532564692.json.gz) | 7.336 → 6.723 | 8.22–8.47% | 15.755 → 13.583 | 8.80–17.59% |

CPU p95 A → B: Projects **9.1 → 8.5 ms**, Overview **9.7 → 7.5 ms**, Contact
**9.2 → 8.1 ms**. Sampled GPU p95: **22.453 → 14.337**, **21.752 → 11.392**,
**19.206 → 18.869 ms** respectively. B's warmed rebuild-frame CPU callbacks were
**5.2–7.5 ms**; their GPU cost was not sampled. Cold allocation/program compilation
is not characterized by these warmed comparisons.

All **six blocks** have usable CPU/GPU coverage and no exclusions, GL errors or
retries. All had confidence warnings. Full reference spreads (CPU/GPU) were
**35.12%/38.66%** in Projects, **5.07%/35.26%** in Overview and **5.82%/37.63%**
in Contact. Contact's GPU signal is smaller than its reference variation and is
less certain; its consistent CPU improvement and both paired GPU directions
support retaining the same mechanism there, not a precise standalone GPU claim.

Each run used 51 seconds of inserted waits and finished within its declared
10-minute budget: about **7:00, 7:49 and 7:49**. Retained capture spans were
**17.982–35.965 s** in Projects, **35.965–35.967 s** in Overview and approximately
**35.965 s** in Contact. The authored cycle is 18 simulated seconds regardless of
RAF cadence. Power remained battery/discharging, Low Power Mode off, reported
OS pressure nominal; charge was 20→19%, 19%, then 19→18% across the separate runs.
These observations do not establish constant clocks or an energy comparison.

### Interpretation

All reported block effects include the scheduled A/B captures, with controls kept
for uncertainty assessment. Reference variation is substantial; it does not vanish
because the effects favor B. The Projects cadence transition began within the first
scheduled A, before any B, so it cannot be attributed to enabling the cache. The
reversed Projects block and subsequent rooms run at approximately 33.33 ms cadence.
No FPS gain is claimed. Percentages are observations of these cohorts, not stable
cross-device estimates. Automatic rest remains a separate zero-submission state.

### Correctness and visual checks

Desktop and portrait each completed 54 paired image comparisons plus a release/wake
record: all five rooms, six moving dish checkpoints per room, hover, moving doors,
travel, arrival and reconstruction after release. Zero WebGL errors were recorded.
Inspection of the current Overview/Contact desktop pairs and portrait Overview
found the edge-coverage differences acceptable for this implementation; these are
not pixel-identical renders or proof for every possible content/geometry edit.

A bounded [phone-layout fallback probe](receivers-probe-1790533099855.json.gz)
at 390×844 CSS/drawing pixels retained four complete A/B/B/A scan captures and
one A cycle before an explicit Stop during the next cycle. All five captures had
zero GL errors, cache eligibility false, no builds/hits and 1×1 placeholder targets.
The held A/B image comparison was identical. Its interrupted label is preserved;
this is a functional fallback check on Chromium, not a phone performance claim.

The [ordinary final-source lifecycle check](rest-wake-retest.json), with no audit
controller or Scene diagnostics, held **455 frames / 15.133 active seconds**
unchanged across **45.125 seconds** at rest. Opening Scene tools woke the same
renderer; the later observation showed **909 frames / 30.182 active seconds** and
rest again. Earth rotation advanced during the resumed activity. No console
errors were recorded. This checks zero idle submissions and wake-up, not energy.

Current representative PNG pairs have mean absolute RGB differences of
**0.06665/255** (desktop Overview), **0.21698/255** (desktop Contact) and
**0.14260/255** (portrait Overview). Pixels with a channel difference above 8
occupy **0.195%, 0.346% and 0.462%** respectively; maxima reach 161, 168 and 156.
These localized edge differences remain visible under close comparison; small
whole-image averages are not proof of visual equivalence.

The final guarded renderer passed 581 full-suite tests in the disposable checkout,
fresh isolated D1/R2, generated test-only secrets and explicit separate TEST_BASE_URL.
The 12-test owner workflow, 56 benchmark tests, typecheck, production build and
affected lint passed. Independent review informed the quality/transform guards
and the phase-coverage/power checks. Reduced-motion behavior has model/scheduler
coverage but no separate browser preference emulation in this retest.

### Why retain it

Both orders in each tested room reduced CPU callback means and sampled GPU means.
Projects and Overview have particularly strong directional evidence; the original
B trial separately supports Projects. Reuse remains **99.72%** across the full
cycle, with motion/shading preserved. Navigation uses complete rendering while
needed. The rare warmed rebuild showed no large CPU stall, and its additional GPU
work is an amortization uncertainty rather than evidence that the repeated savings
are absent. This is an engineering retention judgment, not a passed historical
qualification protocol or an integrated GPU/energy measurement.

The accepted costs remain **140.625 MiB** of nominal cache attachments at the
measured desktop resolution (**41.199 MiB** in the portrait check), slight edge
coverage changes and additional renderer complexity. The drawing-buffer cap can
reach about **152.6 MiB** of extra attachments; these are not measured physical
GPU/process memory. Rest/hiding releases them, and the phone/AO-disabled path does
not build the cache. No speedup is claimed during rest or camera transitions, and
other hardware/engines remain unmeasured.

Current paired renders, after restoration, supersede the earlier copies:

- Desktop Overview: [cached B](receivers-verify-1790531159243-verify-3-before.png), [fresh A](receivers-verify-1790531159243-verify-3-after.png).
- Desktop Contact: [cached B](receivers-verify-1790531159243-verify-19-before.png), [fresh A](receivers-verify-1790531159243-verify-19-after.png).
- Portrait Overview: [cached B](receivers-verify-1790531352887-verify-3-before.png), [fresh A](receivers-verify-1790531352887-verify-3-after.png).

The complete [desktop](receivers-verify-1790531159243.json.gz) and
[portrait](receivers-verify-1790531352887.json.gz) numerical reports remain.
Other temporary PNGs are omitted. The six superseded historical PNGs are
recoverable in `3cc4a55`; historical raw reports still identify their original
filenames and have not been rewritten.

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

## Historical strict trial: source and method

- Production reference: `4161a44`. Final prototype/harness: `14d1972`.
  Original rollback: `ad80c03`. That rollback was checked against the reference; runtime,
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

## Historical strict result: promising samples, excluded block

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
range or sustained-use result is available. No replacement strict-protocol cohort
was run at that stage.

## Historical appearance, invalidation and automatic rest

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
The current paired renders above illustrate this edge/occlusion tradeoff; the
historical copies are recoverable in `3cc4a55`.

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

## Historical failures and exploratory records

All five original JSON reports are preserved losslessly as gzip, including raw
frames, query samples, manifests and conditions. Current paired renders supersede
the historical PNGs; other image filenames identify omitted temporary comparisons.

| Record | Scope and limitation |
| --- | --- |
| [Initial integration failure](receivers-verify-1790527373697.json.gz) | Direct shadow rendering lacked Three's active scene state. One held comparison preceded the exception; fixed with the scoped shadow callback. |
| [Desktop moving checks](receivers-verify-1790527875878.json.gz) | Successful bounded export after an earlier export exceeded the 96 MiB lab limit. That rejected export has no saved numerical report and supplies no claims. |
| [Exploratory scan/cycle timing](receivers-probe-1790528053160.json.gz) | ABBA samples without rested qualification; source predates final defensive guards. Conditions changed and A drifted. Mechanism counts only; cannot rescue the excluded formal block. |
| [Portrait moving checks](receivers-verify-1790528205245.json.gz) | Separate viewport/lighting and effective DPR 1; not pooled with desktop timings. |
| [Controlled run](receivers-timing-1790528565661.json.gz) | Failed initial readiness, passing retry, excluded first block, bounded interruption. No accepted gain. |

The useful case-study extension is that preserving moving receivers made a much
larger reusable region possible, while adding coupled shadow/AO invalidation,
edge and memory costs. The former protocol caused a rollback despite lower sampled costs. The revised
evidence-based decision and new retest above supersede that retention decision
without changing the original run's qualification status.
