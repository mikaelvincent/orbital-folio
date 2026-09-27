# Measuring spacecraft performance

Use this guide when performance measurement is part of the task. Ordinary edits
need neither benchmarks nor thermal monitoring. Candidate maintenance follows
[screening before shortlist review](performance-ledger.md#candidate-selection);
deferred proposals still need explicit authorization.

## Thermal-aware comparison procedure

Expect thermal drift and possible throttling during diagnostics/sustained rendering,
especially on the owner's passively cooled M4 Air. These are practical project
measurement rules, not hardware guarantees. Degrading timings do not confirm
throttling; stable timings can occur under throttling. Fixed rests and nominal OS
thermal pressure do not establish equal clocks or operating conditions.

Use this panel protocol for a **still-view diagnostic A/B**. A is Normal rendering
with all groups visible; B changes one declared diagnostic or group. For identical
A repeats, leave both variants Normal. The [frozen labs](#frozen-browser-labs) and
[CPU runner](#rested-cpu-candidate-comparisons) have explicit adjustments below.

| Default | Rested comparison | Sustained-use comparison |
| --- | --- | --- |
| View | 1280×720 CSS, Projects room settled, reader closed, pointer resting over the Earth playback panel; browser native DPR, logged numerically along with actual buffer/effective DPR. Repeat affected portrait work separately at 900×1200; never pool viewports. | Same view and controls. |
| State/quality | Reduced motion off; normal shipped quality, shadows/AO and all groups, except the declared B change. Seek Earth playback to **0.0 s**, leaving its panel open and paused in every capture. Other authored animation stays on. | Same; this isolates thermal exposure from Earth texture phase, not all animation. |
| Before controls | **60 s** without scene rendering. | **10 min** continuous A rendering, diagnostics open; no cooldown. |
| Readiness controls | Three A captures, **10 s** each, **10 s** nonrendering rest between them. | Three A captures, **60 s** each, continuously rendered. Judge within this sustained cohort, not against rested A. |
| Warmup / capture | Panel automatically warms **3 s** before every **10 s** capture. | Automatic **3 s** warmup before every **60 s** capture. |
| Blocks / rechecks | Four blocks: **ABBA, BAAB, ABBA, BAAB**. Add an A capture before and after each four-capture block: six captures/block. | Two blocks: **ABBA, BAAB**, also bracketed by A captures. |
| Between captures/blocks | **1 s** nonrendering rest within comparison blocks; **20 s** instead at block boundaries. | No inserted rest; render continuously through export, settings changes and telemetry. Log these gaps. |
| Limits | At most one initial-readiness retry and one failed-block retry (with fresh controls); **5 min total nonrendering waits**, **20 min wall time** from initial rest. | No automatic retry or conditioning extension; **30 min wall time** from the start of the 10-minute conditioning. |

1. **Prepare and identify.** For release conclusions use a disposable source
   checkout with fresh state per [operations](OPERATIONS.md#isolated-verification),
   then `npm run build` and `npm start -- --ip 127.0.0.1 --port 3019` (choose another
   unused loopback port if occupied). Finish compilation/tests before recovery.
   Leave the main server/store alone. Use the hidden built-in browser only; native
   Safari requires new authorization. Record commit plus any patch, lockfile and
   changed asset SHA-256s (`git rev-parse HEAD`, `shasum -a 256 package-lock.json
   public/textures/earth-europe-loop.webp`), browser/version, device/OS, viewport,
   buffers/DPR, camera, quality and exact B intervention. Keep one agent rendering
   tab. Stop only your competing builds/tests/renderers; do not close user apps or
   change their power settings. Record power source, charging/discharging state,
   battery percentage and Low Power Mode; hold source, charging state and LPM
   fixed within a cohort. Prefer already-configured AC/LPM-off; other configurations
   are separate named cohorts. Unavoidable competing load is a limitation.
2. **Observe conditions.** On macOS compile the optional sampler before recovery:
   `swiftc -O scripts/benchmarks/mac-thermal-snapshot.swift -o /tmp/orbital-thermal-snapshot`.
   Run `/tmp/orbital-thermal-snapshot --pmset --settings` at session start, before
   and after each readiness set and block, and at finish. Save timestamped JSON
   beside temporary raw exports, outside measured windows. It reports OS pressure/LPM and
   bounded read-only `pmset -g therm`, `batt`, `custom` results. It provides no
   reliable CPU/GPU frequency, temperature, utilization or energy measurement. Any
   reported `pmset` limit fields are OS limits, not measured clocks. Keep unavailable fields. On other devices, or if collection fails, mark
   telemetry **unknown**, record observable power configuration and apply the same
   timing gates; do not install tools, seek privileged access or wait indefinitely.
   Rested gates require nominal pressure when available. Sustained nominal or fair
   pressure may qualify only if unchanged across a block; report it. Serious or
   critical pressure ends measurement. Never infer a thermal cause from timing.
3. **Set the scene and qualify readiness.** Open **Tools → Earth playback**, seek
   **Loop position** to 0.0 s, and keep it open (closing resumes Earth). Open
   **Tools → Scene diagnostics → Advanced: parts, render settings and data**.
   Move over the Earth playback panel to clear scene hover, clear object focus,
   and wait **5 s** for camera settling. Return to that neutral position during
   captures; the scene host fills the viewport, so diagnostics alone is not a
   reliable hover reset. Verify matching camera/room state in the export. Use **Temporary diagnostic → Render one frame, then pause** for each
   rested wait; avoid input because it can request frames. Restore the intended
   A/B setting before recording. Follow the table's rest/conditioning and three A
   controls; apply step 5. If initial readiness fails, rested mode gets one new **60 s**
   rest then all three controls again, within the total wait budget; sustained
   mode is inconclusive without restarting its clock or extending the soak.
4. **Run and preserve.** Set **Capture length**, select each A/B via **Temporary
   diagnostic**, enter a unique **Optional capture name**, then **Record current
   settings**. Every A also requires **Spacecraft visibility → Show all groups**;
   Normal rendering alone does not clear the filter. For group B, use **Hide
   selected group** and the same **Spacecraft group** each time. **Change to compare**
   alone does not activate B; the simple baseline buttons restore A. Use the exact
   bracketing/order above. **Download report** after readiness and after every
   six-capture block: only six captures survive; closing/reloading loses them.
   Downloads include raw frames/GPU samples; the on-screen JSON is only a summary.
   Deduplicate exports by name + `startedAt`. Sustained runs measure interventions
   in a continuously warm session, **not each variant's thermal equilibrium**.
   Record animation/activity and shadow/AO refresh counts: neither the panel nor
   Earth pause resets every animation clock. Use a supported replay lab for motion;
   where phases still cannot be matched, phase-sensitive conclusions remain
   inconclusive.
5. **Gate and calculate from exports.** The panel's automatic drift warnings are
   looser than these rules; calculate them explicitly. For each same-workload A
   sequence use capture means for CPU callback, frame interval and each GPU metric
   being claimed: `spread = (max − min) / median`; require **≤5%**. For ≥3
   chronological controls with monotonic values also require
   `abs(last − first) / median ≤2.5%`. Use the conventional median (average the two
   middle values for even counts). Within an idle capture compare disjoint first/
   last **min(5 s, retained span/2)** windows in rested mode, **10 s** windows in
   sustained mode: `abs(lateMean − earlyMean) / earlyMean ≤5%`. Require positive,
   finite values. Apply gates to readiness, all A captures within each bracketed
   block, and the chronological A sequence across accepted blocks. Mean A in a
   block must also stay within **5%** of that regime's readiness median.
   CPU/frame windows need ≥30 frames; GPU windows need ≥3 resolved samples and
   each capture ≥10 per claimed phase, joined to frames by `frameId`. Missing GPU
   coverage makes that GPU comparison unavailable, not a CPU failure or zero.
   For each accepted block average its two scheduled A and two B capture means
   (bracketing A is control only); report `B − A` and `B/A − 1`, then the median and
   range of block effects. Report nearest-rank p95 and frame pacing separately.
   Use the largest measured A spread as the variation bound. An effect no larger
   than that bound, or with differing block directions, is inconclusive. Do not
   pool unmatched modes/viewports; these rules are not statistical confidence bounds.
6. **Exclude, finish, report.** Reject a block for failed gates, unexpected
   camera/activity/quality changes, resize, hiding, context loss, asset/readiness
   errors, power/LPM/charging or telemetry-availability changes, or competing agent work. Require actual
   duration within **±5%** of requested and retained span ≥**95%** of requested.
   Disjoint/discarded GPU queries invalidate GPU results; unsupported/pending/
   insufficient samples stay unavailable. Keep valid CPU results separately.
   Log every exclusion by capture/block name, conditions and reason beside the
   raw exports; never remove slow samples to pass. Export surviving captures from
   failed/interrupted blocks **before recovery controls can evict them**. Panel
   Stop/cancellation discards partial captures; record the interruption/time.
   Rested mode may retry one failed block once, after **60 s** paused and a passing three-control
   readiness set; if those controls fail, stop as inconclusive. Keep the same order
   and retain the failure. Include new controls
   in the A drift review. Remaining budgets can prevent a retry; never relax gates
   or rerun until favorable. Incomplete order sets or unsuitable conditions
   within those limits are **inconclusive**. Export before **Restore normal** and
   closing both panels; stop only temporary servers/tabs. Report source/assets,
   engine/device, actual view/buffers, settings/power, mode/order/durations,
   accepted/excluded counts, raw windows/sample counts, mean/p95/pacing, block
   effects and A variation, thermal observations and unknowns. Separate delivery,
   startup, counts and nominal storage from timing; claim no unmeasured heat or
   battery benefit. Keep temporary results only as needed for the task; durable
   evidence follows [candidate selection](performance-ledger.md#candidate-selection)
   or a demonstrated technical dependency, not an automatic dossier rule.

## Interpret the work correctly

| Diagnostic | Scope and limitation |
| --- | --- |
| Skip background | Omits Earth/space update and rendering, retaining clearing. |
| Skip contact shading | Omits GTAO refresh **and** composite; key shadows remain. |
| Half drawing resolution | Halves both main buffer dimensions; CSS text and CSS-sized AO buffer retain their resolution. |
| Skip spacecraft | Omits ship rendering and AO, retaining simulation and HTML. |
| One frame then pause | Pauses automatic scheduling; input may request frames. |
| Hide/show semantic group | Changes occlusion/shadows as well as submissions. Differences are not additive per-object GPU costs. |

- **FPS/frame intervals** describe delivered cadence, including p95/long frames;
  display-paced 60 FPS does not establish spare GPU capacity.
- **CPU callback** includes preparation and WebGL submission, not page/OS work or
  input handling outside the callback. Amortized cost per frame differs from
  per-execution cost of an occasional pass.
- **GPU queries** are asynchronous sampled elapsed measurements. Unsupported,
  pending or disjoint results are unavailable, never zero. CPU and GPU overlap;
  do not add them. Pass-query boundaries can perturb tiled-GPU scheduling; use
  independent whole-frame queries when pass attribution is suspect.
- **Draws/triangles** are actual per-pass submissions. Inventory counts include
  hidden variants and are not rendered counts. Room/part breakdowns are alternate
  views of the same work; unassigned shadow/fullscreen work stays unassigned.
- **Shadow generation versus reuse:** main ship timing includes generation when
  requested; it is not all shadow cost. `shadow-refresh` counts actual generation,
  with reasons/map/draw deltas. Nested generation CPU is a subset of ship CPU.
- **Fragment work versus draws:** identical submissions can have different shader
  cost. The spacecraft's Standard materials skip exactly zero direct-light
  contributions; their shadow/AO invalidation and draw counts stay unchanged.
  Faster frames can increase rendered cadence, so a per-frame reduction is not
  the same percentage reduction in sustained GPU work, temperature or energy.
- **AO refresh versus reuse:** camera/projection, geometry, reader stretch and dirty
  state refresh GTAO; material-only feedback reuses it. Reasons overlap. The
  legacy broad motion signal remains diagnostic context, not production policy.
- **Footprint versus time:** report download, decode/upload/first-ready submission,
  steady CPU/GPU, pacing, geometry arrays and nominal texture storage separately.
  Array/texture arithmetic is not measured physical GPU/process memory. First
  submission is not presentation. Counts do not establish heat or battery savings.

Choose affected rooms and motion states according to the hypothesis. Material
feedback, camera movement, doors and portrait roll exercise different invalidation
boundaries. Group isolation, AO noise and camera settling tolerances can produce
image differences without identifying the cause; compare identical states/noise
when claiming exact rendering. Record actual/scaled capture sizes and omitted
HTML/effects. Any authored appearance change needs visual judgment, not just counts.

## Rested CPU candidate comparisons

For an authorized CPU-kernel question, select only the affected names from
`local-matrix`, `lighting-settled`, `lighting-changing`, `iris-settled`,
`iris-moving`, `indexing-startup`. Example (macOS sampler prepared in step 2):

```sh
node --expose-gc scripts/benchmark-controlled-performance.mjs \
  --cases=lighting-settled,lighting-changing --blocks=4 --seed=20260914 \
  --burst-ms=120 --prelude-ms=100 \
  --initial-rest-ms=60000 --sample-rest-ms=1000 --block-rest-ms=20000 \
  --control-rest-ms=10000 --recovery-rest-ms=60000 \
  --thermal-poll-ms=5000 --max-cool-polls=12 --max-attempts=2 \
  --drift-limit=0.05 \
  --telemetry-argv='["/tmp/orbital-thermal-snapshot"]' \
  --context-telemetry-argv='["/tmp/orbital-thermal-snapshot","--pmset","--settings"]' \
  --out=/tmp/orbital-new-cpu-comparison.json
```

Choose an unused output filename; the runner overwrites its own JSON checkpoint.
Append `--dry-run` to validate configuration without constructing models or timing.
Without a sampler, omit both telemetry arguments and report unknown conditions.
A configured but unreliable sampler may use `--allow-unknown-thermal` only when
that fallback is declared before the run; known nonnominal pressure still fails.

This replaces panel timing with shared-iteration **120 ms target bursts**, one full
warmup burst per variant and **100 ms untimed prelude** per steady sample.
Construction measures one whole operation, without prelude; it is repeated warmed
construction, not cold startup. Four seeded blocks contain two ABBA and two BAAB
orders, each with an extra A before/after. Three readiness A controls use 10 s
rests. Automatic gates use 5% spread, 2.5% monotonic drift and 5% block-reference
change from initial controls; steady bursts over 360 ms are rejected.

The explicit arguments bound initial/recovery waits to 60 s, inter-sample waits
to 1 s and block waits to 20 s. Each thermal gate requires two acceptable readings
5 s apart, capped at 12 polls; readiness and each block allow two attempts. Use
**20 min wall time per selected case**, interrupt with Ctrl-C if exceeded, and keep
the partial JSON/event log. These runner bounds replace the panel's aggregate wait
budget; do not restart it automatically. Check raw full-context power/charging
changes manually (automatic detection covers LPM). Preserve failures, apply the
same cohort/claim rules, and report insufficient stable blocks as inconclusive.
Panel frame/window gates do not apply to kernels: use the returned per-operation
means and burst controls. This fixture cannot establish browser/GPU or sustained-use
improvements.

## Frozen browser labs

The reusable lab compiles actual portfolio modules/CSS with public seed content,
freezes source/assets, listens only on loopback and has no studio/contact write
APIs. It is a standalone production-React fixture, not the deployed Vinext server.
Run in a disposable source checkout so automatic evidence writes stay temporary
until screening. Use an unused port, keeping 3000 for the main app:

```sh
node scripts/benchmarks/camera-invalidation-lab.mjs --port 3019
```

Add `--thermal-sampler /tmp/orbital-thermal-snapshot` when the step-2 sampler is
available; otherwise report unknown telemetry. `/status` reports progress;
**Stop** preserves partial evidence.
Outputs go to the corresponding evidence folder with no overwrites. Source/asset
hashes identify the snapshot; today's build is not automatically the historical
baseline. Restore retained source snapshots/original revisions for exact repeats.

| Experiment | Command option | Specialized method and original outcomes |
| --- | --- | --- |
| Camera/AO | default `camera` | [Camera invalidation](evidence/performance/camera-invalidation/README.md): survey, paired runs and same-state cached/fresh images; separate pass versus whole-frame GPU queries. |
| Direct geometry | `--experiment geometry` | [Geometry](evidence/performance/offline-geometry-compaction/README.md): exact geometry swaps; `/startup` uses fresh iframe/context samples, still sharing driver caches. |
| Native shadow bake | `--experiment shadow` | [Shadows](evidence/performance/static-shadow-bake/README.md): resize with retained bake reveals stale maps; a fresh page bakes the new initial pose. |
| Static/hybrid contact | `--experiment contact` | [Contact](evidence/performance/static-contact-bake/README.md): subdivision-only controls and original restoration distinguish geometry artifacts from shading. |
| Irradiance probe | `--experiment diffuse` | [Diffuse](evidence/performance/baked-diffuse-probe/README.md): held-out actual GPU fit validation and same-state B/C comparisons. |

For the camera/geometry lab, use **Check setup**, **Frames per sample → 180**,
**Paired blocks → 4**, and **Paired workload → Both workloads** (camera) or
**Idle + camera motion** (geometry), then **Start paired runs**. This replaces the panel's seconds-based schedule: background time is zero,
simulation delta is 1/60 s, each sample prepares the room (up to 900 steps), settles
180 steps and warms 30 steps, then measures 180 frames on actual RAF. At 60 Hz the
settle/warm/measurement portions are 3/0.5/3 s; log actual wall duration, not an
assumed refresh rate. Model elapsed time continues across samples: inspect motion
checkpoints before claiming phase equivalence.

The lab waits 60 s, takes three 120-frame readiness A controls 10 s apart, and
allows two readiness attempts. It runs ABBA/BAAB/ABBA/BAAB per selected workload,
with 1 s sample and 20 s block pauses. A failed block is retained, **not retried**;
one new 60 s readiness cycle gates continuing to the next block. Apply the manual
5%/2.5% formulas above to same-workload controls and resolved whole-frame GPU
samples as well as its automatic CPU checks. For window drift use the first/last
half of measured frames; require ≥3 GPU samples per half, ≥6 per 120-frame control
and ≥10 per 180-frame sample. Require all requested frames instead of the panel
duration/retention checks; do not compare overview readiness with Contact feedback. The lab's automatic drift uses a different
denominator and is not a substitute. Bound one invocation to **20 min** wall time
and **5 min** total recovery pauses; use Stop on reaching either, preserve the
partial report and mark an incomplete order set inconclusive. No automatic rerun.
It cannot perform the sustained panel protocol. The other specialized labs listed above
retain their own replay methods; do not label them as this protocol without
recording their changed schedule and controls.

Use an AO-enabled portrait fixture (at least 700 CSS pixels wide and taller than
wide) for roll/shadow checks; phone width disables AO under existing quality rules.
Verify overview entry/return **inside recorded windows**, not only preparation.
The labs' unranked surveys cannot rescue failed timing gates. Comparison residency
(extra geometries/maps) is not normal production memory. Preserve raw/excluded
reports, source/asset identities and images that substantiate claims; routine
check logs and duplicate screenshots need not become permanent evidence.

Useful bounded commands (run the two geometry scripts in a disposable source
checkout: they write fixed historical evidence filenames):

```sh
node scripts/benchmarks/summarize-camera-invalidation.mjs \
  path/to/paired-report.json.gz --weighted-gpu --out /tmp/camera-summary.json
node scripts/benchmarks/geometry-compaction-inventory.mjs
node scripts/benchmarks/geometry-bundle-comparison.mjs
```

Weighted GPU output is explicitly an estimate correcting sampled AO/cached cohort
proportions, not every-frame measurement. Do not pool unmatched sessions. Geometry
inventory probes an unshipped broad array bake in `/tmp`; bundle comparison is a
standalone renderer projection, not an app waterfall. After changing installed
Three source, regenerate with `npm run geometry:generate` and verify exact inputs;
`npm run geometry:check` guards builds and the shipped license remains required.

Earth comparisons use the [resolution lab](../scripts/benchmarks/earth-resolution-lab.md)
and [cloud lab](../scripts/benchmarks/CLOUD-LAB.md). Current crop/seam investigations
start with the [Earth evidence](evidence/earth-consistent-loop/README.md#coverage-follow-ups).
These specialized procedures are optional entry points, not a mandatory reading chain.
