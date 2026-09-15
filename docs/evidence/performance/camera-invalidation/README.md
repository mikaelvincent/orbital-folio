# Delivered camera and invalidation audit — 15 September 2026

Scope: ledger candidate 1, explicitly authorized by the owner. Other candidates
remain held. The comparison retains the approved 8K Mediterranean night Earth,
geometry, materials, camera springs, doors, lighting, drawing resolution and AO
quality. The candidate changes when the existing AO texture is recomputed.

## Reproduction and source identity

Run the local lab with the command in [the diagnostics guide](../../../performance-diagnostics.md).
It mounts the actual `ImmersivePortfolio`, spacecraft lifecycle, model,
navigation, shaders and application CSS with public seed content. It uses
production React compilation in a frozen standalone harness, not the deployed
Vinext server or native Safari. Each result contains source, bundle and public
asset SHA-256 inventories. The server has no watchers or application write APIs.

The delivered baseline is Git `3e9bd67`, plus shared measurement instrumentation
and a dormant geometry-revision signal. Both policies run in the same mounted
scene; selecting **Delivered baseline** retains its original AO refresh rule.
Selecting **Geometry invalidation** changes only that rule. The default remained
legacy during measurement; **normal visits now use geometry invalidation**.
Both implementations were present during the comparisons. The subsequent runtime
change selects the measured candidate by default; it does not change its rendering
logic. Archived input sources preserve the exact measured implementation
independently of subsequent formatting and default selection:

- [Measured source](measured-source.tar.gz) and [manifest](measured-build-manifest.json):
  corrected survey and Contact comparisons.
- [Verification/continuation source](verification-source.tar.gz) and
  [manifest](verification-build-manifest.json): same renderer/model, with targeted
  workload selection and additional early-motion image checkpoints in the lab.
- [Roll-coverage source](roll-coverage-source.tar.gz) and
  [manifest](roll-build-manifest.json): same runtime, with explicit overview-entry
  and return-overview replay scenarios. This fixes a coverage gap: earlier runs
  performed portrait roll while preparing a room, outside verification windows.

The archive excludes installed dependencies and public textures; their exact
versions/hashes remain in the manifest and the repository. Restore archived
inputs in an isolated checkout, use the existing lockfile and retain asset hashes.

## Method and limits

- Hidden built-in Chromium, ANGLE Metal / Apple M4. Wide viewport 1440×900 CSS,
  native DPR 2, renderer DPR 1.7568209223, actual buffer 2529×1581. GTAO 936×585,
  32 AO / 32 denoise samples, 2048² key shadow map. Normal scene/filter; 8K Earth.
- Fixed simulation steps of 1/60 second on actual browser RAF. Earth/sky time
  stays at zero so matched inputs render the same environment. Frame intervals
  are actual RAF cadence; they do not measure elapsed-time-driven travel duration.
- Events exercise the mounted focus/pointer handlers; navigation goes through
  the real React callback and queue. This does not verify native Safari input,
  OS touch delivery or every possible user gesture.
- Pass survey: five idle views, Contact focus, room focus, pointer hover, door
  open/close, ordinary and ladder travel, drag/release, reader deployment and an
  arrival tail. State checkpoints record actual camera/projection, vessel,
  light/shadow, reader and door transforms. Raw frames retain AO reasons/revisions.
  The final visual sweep also includes both overview transitions inside the
  captured window, so portrait camera roll and light-relative changes are checked.
- Paired timing: 180 frames per sample; equal settling and shader warmup; balanced
  ABBA/BAAB blocks; 60-second initial recovery; three readiness controls separated
  by 10 seconds; 20 seconds with **no scene rendering** between blocks. Builds,
  tests and other agent renderers stopped during timed trials. Other user workload
  was unobserved. Five-percent baseline spread and 2.5-percent monotonic readiness
  drift gates were fixed before results; rejected data was retained.
- Native snapshots occurred outside timing. Accepted Contact blocks report nominal
  OS thermal pressure, Low Power Mode off and `AC Power`, but the battery also
  reports **discharging**. These labels do not establish stable mains power,
  equal clocks, a cold laptop or absence of throttling. No energy/heat claim.
- CPU is callback elapsed time, including WebGL submission and opt-in diagnostic
  overhead. It excludes other page/OS work and input handling outside the callback.
  Geometry counts are submissions, not isolated component GPU costs.

The exploratory pass GPU timings strongly covary: the one-triangle composite
often reports nearly the spacecraft duration. ANGLE's Metal timer implementation
flushes command buffers at query boundaries, a plausible instrumentation effect,
not proof of the exact cause in this browser build. Do not sum these pass times or
call them independent shader costs. [ANGLE implementation](https://chromium.googlesource.com/angle/angle/+/8ce63479cbe11d0e9c94cfe884b5e80f2800a729/src/libANGLE/renderer/metal/QueryMtl.mm)

Acceptance comparisons therefore use one **whole-WebGL-frame** elapsed query,
from background clear through final composite, mutually exclusive with pass
queries. CPU phases and draw counters still work. Queries sample every 15 frames;
missing/disjoint results are unavailable. Fixed sampling catches 6 AO frames in
12 Contact samples, versus 75 in 180 actual frames. Report the raw sampled mean
separately from any estimate reweighted by the actual refresh fraction. CPU/GPU
time must not be added; neither is device utilization.

## Findings

Idle views reuse AO on all 180 measured frames. Wide camera hover/drag/travel does
not move the vessel or light rig and generates no new shadow maps. Camera changes
still require screen-space AO. Room/material brightness and highlight opacity
also set the old broad `motionActive` flag, despite changing none of GTAO's
overridden normal/depth inputs.

Contact focus supplies the clean affected workload: 75 refreshes per 180 frames,
with bit-identical camera/projection, geometry, lights and shadow state. Each
refresh submits 238 draws / 823,712 triangles, including two fullscreen passes.
The candidate reuses the same AO texture through all of those color changes.
Overview room focus remains camera-driven (180/180 refreshes), a control where
savings should not be expected. Arrival-tail measurement found no redundant
refreshes; it was not selected as an optimization target.

Three accepted Contact blocks (six runs per policy, 1,080 frames per policy):

| Metric | Legacy | Geometry invalidation | Interpretation |
| --- | ---: | ---: | --- |
| Mean CPU callback | 4.559 ms | 4.082 ms | 10.47% lower; block reductions 9.39–11.42% |
| Pooled CPU callback p95 | 5.700 ms | 4.700 ms | Retained raw frames, not an average of run p95 values |
| Mean actual frame interval | 20.749 ms | 18.800 ms | 9.39% lower in this replay |
| Pooled actual frame interval p95 | 26.800 ms | 22.500 ms | Host render cadence at fixed simulation steps |
| Raw sampled whole-frame GPU | 16.267 ms | 13.937 ms | 14.32% lower at sampled frames |
| Pooled sampled whole-frame GPU p95 | 22.606 ms | 15.660 ms | Sampled executions, not every-frame GPU percentiles |
| GPU estimate weighted by actual AO/cached proportions | 15.926 ms | 13.937 ms | Estimated 12.49% lower; block reductions 6.62–15.51%, not every-frame measurement |
| AO refreshes per 180-frame run | 75 | 0 | 17,850 fewer draw submissions per run |

The fourth Contact block failed baseline spread (6.16%). Its subsequent recovery
also failed, so the overall file deliberately remains **inconclusive-recovery**.
The three earlier pre-gated accepted blocks support the narrow result; the entire
session must not be relabeled successful. An initial readiness control failed
monotonic drift, followed by a passing readiness group. All raw/excluded samples
and native context remain in the evidence.

Survey submission ranking: overview 438 main draws / 1,013,140 triangles; shared
chassis 241,576 triangles, Projects furniture 146,396, ladder utilities 82,312.
About furniture leads draw count (53), then Projects furniture (43), About door
batches (42) and Contact furniture (37). Cabin main passes submit 245–296 draws
and 825,498–866,722 triangles. Occluded geometry can still be submitted; these
counts are not GPU invoices for invisible objects. Main ship CPU submission
(2.55–3.22 ms) exceeds camera math (0.023–0.038 ms). Conditional AO costs
1.13–1.54 ms CPU per refresh in this exploratory survey. Do not generalize these
unrested survey timings into optimization savings.

## Visual acceptance and follow-up

Verification compares the candidate's cached framebuffer with freshly recomputed
AO **at the exact same state, in the same GTAO instance and noise texture**. It
backs up/restores the cached AO target; simulation, camera, lighting and materials
do not advance between images. Readback happens synchronously after drawing.
Verification timings are excluded from performance analysis; the full suite may
run concurrently with these untimed pixel checks. PNGs contain the WebGL image,
not CSS overlays. CSS rendering/navigation code is unchanged.

### Wide verification

The [wide comparison](wide-visual-comparison.json) joins the
[candidate run](verify-1789450788844-631233fe.json.gz) with the
[legacy run](verify-1789451061413-e8bd9d72.json.gz): **142 checkpoints per policy**.
All cached-versus-fresh pixel-difference metrics match, including the six nonzero
settling checkpoints that already occur with the legacy camera cache tolerances.
The only per-frame AO refresh-mask differences are the 75 removed Contact
material-only refreshes. The Contact, partially open door and ladder PNG pairs
are byte-identical between policies.

The first three idle scenarios are **not matched cross-policy camera evidence**.
The candidate began at the exact initial overview; the legacy run returned from
Contact through the existing arrival tolerance. Maximum camera-matrix differences
are 0.00263543 in overview, 0.0000193676 in Projects and approximately 3.47e−9 in
Case studies. The overview PNGs consequently differ and must not be presented as
matched before/after images. All later checkpoints have exactly matching camera
matrices. The comparison file records the affected checkpoints explicitly.

### Portrait and roll verification

The final [portrait comparison](portrait-visual-comparison.json) uses the
[legacy run](verify-1789451794524-e757afc4.json.gz) and
[candidate run](verify-1789452088115-4fd0730b.json.gz) in the same mounted scene and
GTAO/noise instance. Actual viewport and drawing buffer are **900×1200**, DPR 1,
with AO enabled at 585×780 and the unchanged 2048² key shadow map.

Across **170 checkpoints per policy**, every captured camera/projection, light,
vessel, door, reader and feedback state matches. All cached-versus-fresh difference
metrics match, and all six selected cross-policy PNG pairs are byte-identical:
overview, entry, return to overview, Contact feedback, partially open door and
ladder passage. The only AO refresh-mask difference remains the 75 Contact
material-only refreshes. Shadow-refresh masks are identical.

Both overview transitions run for 300 recorded frames. Each produces **140 actual
shadow refreshes per policy** as camera roll changes the light-to-vessel transform;
entry performs 293 AO refreshes and return performs 294, identical between
policies. This confirms that preserving the fixed spacecraft does not make its
rolled lighting universally bakeable into one static shadow map.

Six cached-versus-fresh checks are nonzero in both policies: pointer settling,
two door/peek settling points and three drag-release settling points. Their exact
counts/ranges are retained in the comparison JSON. They reproduce the existing
cache tolerances, not a newly introduced difference; this optimization does not
tighten those tolerances or claim every cached frame equals a fresh calculation.

The earlier [142-check portrait sweep](verify-1789451400276-51b67c74.json.gz) remains
as exploratory evidence. It did not capture the roll transitions and is not used
as a matched reference for the final 170-check comparison. The first survey's
invalid focus workloads are separately retained and excluded in
[exclusions.json](exclusions.json); the [corrected survey](survey-1789449807987-0556a031.json.gz)
and [Contact paired timing](paired-1789450018903-bd25f214.json.gz) supply the findings
above.

These checks support enabling the geometry-based reuse rule with **no new
user-visible change**. They do not establish equivalence for every future model
edit or every browser. Preserve the geometry-revision tests and repeat relevant
route/image checks when adding animated geometry.

### Completion checks and continuation

- Full application suite: **267 tests passed** in [tests.log](tests.log).
  Final targeted checks: **26 passed**, including the three new summarizer checks
  and overlapping collector, shadow and geometry regressions. These are not 293
  distinct tests.
- Final typecheck and production build passed. All changed files pass affected
  lint. Full-repository lint still reports **199 existing diagnostics**, compared
  with 213 in the independently checked baseline; it is not a globally clean
  lint result.
- The normal application at `http://localhost:3000` was visually checked in hidden
  Chromium: direct Contact entry, live diagnostics launcher/CPU/GPU readings and
  no observed console errors or warnings. This was not native Safari automation.
- The requested two-block overview-camera timing continuation stopped as
  **inconclusive-readiness** before any comparison block. Both readiness groups
  failed: the first had 5.37% spread / 5.57% monotonic drift; the second had
  23.73% spread. Gates remained 5% / 2.5%. The fresh scene used the same wide
  viewport, DPR and drawing buffer as Contact, without a verifier backup target.
  Native pressure stayed nominal; that does not identify the cause of the drift.
  Its unchanged camera-driven AO workload is a control, not a measured gain or
  proof of timing equivalence. No third attempt was made and no gate was relaxed.
- [Independent critic](critic-review.md): **94/100**, no unresolved blockers.
  Reviewed final source, matching images/data, preserved exclusions, checks and
  limitations. Its rubric and the corrections prompted by review are retained.

### Evidence index

Raw JSON is stored losslessly as gzip; the [inventory](raw-inventory.json)
records both compressed and uncompressed hashes. The [paired summary](paired-summary.json)
can be regenerated with the documented summarizer; it preserves each session's
status, accepted/excluded blocks, CPU/interval/GPU distributions and conditions.

| Evidence | Use |
| --- | --- |
| [Initial survey](survey-1789449261591-2f0558ce.json.gz) | Exploratory; three invalid focus workloads excluded |
| [Corrected survey](survey-1789449807987-0556a031.json.gz) | Passes, actual geometry/camera/light state and invalidation reasons |
| [Contact timing](paired-1789450018903-bd25f214.json.gz) | Three accepted blocks; fourth rejected, overall inconclusive-recovery |
| [Overview continuation](paired-1789452644248-366f5ed7.json.gz) | Two failed readiness groups; no accepted timing comparison |
| [Wide comparison](wide-visual-comparison.json) | Links matched and unmatched images to the two underlying runs |
| [Portrait comparison](portrait-visual-comparison.json) | Final 170-check same-instance comparison, including both roll routes |
| [Tests](tests.log), [targeted tests](targeted-tests.log), [typecheck](typecheck.log), [build](build.log) | Required checks and final targeted regressions |
| [Changed-file lint](lint-changed.log), [current lint](lint-current.log), [baseline lint](lint-baseline.log) | Clean changed files; existing repository-wide findings retained |

Matched wide Contact feedback: [before](verify-1789451061413-e8bd9d72-verify-54-before.png)
and [after](verify-1789450788844-631233fe-verify-54-before.png).
Matched portrait roll entry: [before](verify-1789451794524-e757afc4-verify-54-before.png)
and [after](verify-1789452088115-4fd0730b-verify-54-before.png).
These pairs have identical PNG bytes. Their capture dimensions are recorded above.

All other ledger candidates remain held. No shadow bake, geometry compaction,
new lighting system, quality reduction or animation change was introduced.
