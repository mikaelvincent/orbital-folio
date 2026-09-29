# Measuring spacecraft performance

Use this guide when performance measurement is part of the task. Ordinary edits
need neither benchmarks nor thermal monitoring. Candidate maintenance follows
[screening before shortlist review](performance-ledger.md#candidate-selection);
deferred proposals still need explicit authorization.

For an unmeasured visual comparison, use **Tools → Rendering**. Its controls apply
immediately without opening diagnostics or collecting samples. Choices persist
when the panel closes; use **Reset defaults** to restore the site defaults
before a comparison. Diagnostic exports
record these choices; diagnostic experiments temporarily layer over them.

## Decide with the available evidence

The goal is a useful reduction in rendering work with acceptable appearance,
responsiveness, memory and maintenance costs. Benchmark qualification and the
choice to implement, retain, narrow, defer or revert a change are separate.
The bounded procedure below is a default, not a mandatory certification. Declare
the workload, order, intended checks and stopping budget before timing.

If testing requirements cannot be completed or diagnostic thresholds are missed,
**use the available valid statistics and general engineering analysis to make
the implementation decision**. Reference drift, incomplete schedules, unavailable
telemetry and exhausted wait budgets do not automatically require reverting.
Explain the missing checks, plausible confounders, confidence limits and why the
remaining evidence supports the decision. Do not call an unrun check passed or
retroactively relabel an excluded historical run as qualified.

- Separate measurement validity from stability. Wrong workloads, changed quality,
  hidden/context-lost frames or broken queries cannot establish the corresponding
  speedup. Usable CPU results can survive unavailable GPU timing.
- Compare the effect with observed variation, direction across alternating orders,
  expected removed work and regressions. A small effect near the variation needs
  stronger evidence than a large, consistent difference. Reference spread is a
  diagnostic, not a confidence interval or a bound on systematic bias.
- Start with two short opposing-order blocks. Add repeats or affected states only
  to resolve a material uncertainty, not until a desired result appears. One block
  or partial data may inform a provisional decision, explicitly limited to it.
- Assess net costs: cache creation/invalidation, active navigation, rest/wake,
  memory, startup, appearance and code complexity. Counts and architectural
  reasoning support timing evidence but do not manufacture a measured speedup.
- Required correctness and data-boundary checks still apply. If a check is
  unavailable, assess its actual risk and report the gap; performance cannot
  excuse known stale rendering, broken interaction or a privacy/data regression.

Report the decision separately from the claim: for example, "retain because the
tested active workload consistently costs less, with an acceptable memory cost;
the exact gain and other devices remain uncertain." Precise or broad published
claims warrant stronger repetition and device/workload coverage. Per-frame time
does not establish power, energy or battery savings. Hidden/offscreen suspension
submits no scene frames; visible scenes now animate continuously.

## Thermal-aware comparison procedure

Expect operating-condition drift during sustained rendering, especially on the
owner's passively cooled M4 Air. These are practical measurement heuristics, not
hardware guarantees or statistical confidence bounds. Stable timings, fixed rests
and nominal OS pressure do not establish equal clocks; timing changes do not
identify a thermal cause.

For a still-view panel A/B, A is Normal rendering with all groups visible; B changes
one declared intervention. Frozen labs and the CPU runner have adjustments below.

| Default                 | Rested comparison                                                                                                                                                                             | Sustained-use comparison, when relevant                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| View                    | 1280×720 CSS, Projects settled, reader closed, neutral pointer over Earth playback; log native/effective DPR and actual drawing buffer. Repeat affected portrait work separately at 900×1200. | Same view and controls.                                                     |
| State/quality           | Reduced motion off; shipped quality/shadows/AO/groups except the declared B intervention. Seek Earth to **0.0 s**, keeping playback open and paused. Other animation stays on.                | Same; Earth phase is controlled, not every animation.                       |
| Before controls         | **30 s** without scene rendering.                                                                                                                                                             | **10 min** continuous A rendering, diagnostics open; no cooldown.           |
| Readiness controls      | Two **10 s** A captures, with **5 s** nonrendering rest between.                                                                                                                              | Two **60 s** A captures, continuously rendered; compare within this cohort. |
| Warmup / capture        | Automatic **3 s** warmup, then **10 s** capture.                                                                                                                                              | Automatic **3 s** warmup, then **60 s** capture.                            |
| Blocks                  | **ABBA, BAAB**. Their A captures check reference variation.                                                                                                                                   | **ABBA, BAAB**, with an extra A before/after each block.                    |
| Between captures/blocks | **1 s** nonrendering within blocks; **10 s** at block boundaries.                                                                                                                             | No inserted rest; log gaps while rendering continues.                       |
| Limits                  | No automatic retries. At most one declared **30 s** recovery if useful; **2 min** total inserted waits and **10 min** wall time per workload.                                                 | No retries/conditioning extension; **30 min** from conditioning start.      |

For greater precision, predeclare three controls, 60 s initial recovery and four
alternating blocks, with a 20-minute wall-time limit. Extra bracketing controls are
also optional. These are additional evidence, not prerequisites for every decision.
A complete animation cycle can replace capture seconds: retain its frame count,
actual wall duration and query coverage; do not compare different phase windows.

1. **Prepare and identify.** Use a disposable source checkout with fresh state per
   [operations](OPERATIONS.md#isolated-verification). For the app, build and run
   `npm start -- --ip 127.0.0.1 --port 3019` on an unused loopback port. Finish
   builds/tests before recovery. Preserve the main server/store. Use the hidden
   built-in browser; native Safari needs new authorization. Record source/patch,
   lockfile and changed-asset hashes, engine/device/OS, camera, viewport/buffers/DPR,
   quality and exact intervention. Keep one agent rendering tab; stop only your
   competing work, not user apps. Log power source, charging state, battery level
   and Low Power Mode. Separate changed power configurations; do not pool them.
2. **Observe conditions.** On macOS optionally compile before recovery:
   `swiftc -O scripts/benchmarks/mac-thermal-snapshot.swift -o /tmp/orbital-thermal-snapshot`.
   Run `/tmp/orbital-thermal-snapshot --pmset --settings` before/after controls and
   blocks, outside measured windows. Save the timestamped JSON. It reports OS
   pressure/LPM and read-only pmset observations, not reliable clocks, utilization,
   temperature or energy. Preserve unknown fields; do not install tools, request
   privileged access or wait indefinitely for telemetry. Prefer nominal pressure
   for rested runs. Fair pressure, changed pressure or unavailable telemetry are
   confidence warnings: consider which variant ran under each condition. Serious
   or critical pressure ends measurement. Uncontrolled competing load is a limitation.
3. **Set the scene.** Open **Tools → Earth playback**, seek **Loop position** to
   0.0 s and keep it paused/open. Open **Scene diagnostics → Advanced: parts,
   render settings and data**. Clear object focus/hover by returning the pointer
   to Earth playback, then allow **5 s** camera settling. Verify exported state.
   Use **Temporary diagnostic → Render one frame, then pause** during rested
   waits; input can request frames. Restore the intended setting for each capture.
   Follow the declared controls. Valid but variable controls can continue with a
   warning; a bounded recovery must answer a specific concern, not erase failures.
4. **Run and preserve.** Set **Capture length**, **Temporary diagnostic**, a unique
   **Optional capture name**, then **Record current settings**. Every A also needs
   **Spacecraft visibility → Show all groups**. For group B use **Hide selected
   group** with the same group; **Change to compare** alone does not activate B.
   Follow the declared order. **Download report** after controls and each block:
   only six captures survive and closing/reloading loses them. Downloads contain
   raw frames/GPU samples; on-screen JSON is a summary. Deduplicate by name and
   `startedAt`. Record animation and shading-refresh activity. Earth pause does
   not reset every clock; use a replay lab for matched motion. Unmatched phases
   cannot establish a phase-sensitive speedup. Sustained runs are a continuously
   warm session, not each variant's equilibrium.
5. **Calculate and assess uncertainty.** Use positive, finite capture means for
   CPU callback, frame interval and each claimed GPU metric. Calculate reference
   `spread = (max − min) / median`; **5%** is a warning threshold. For three or
   more monotonic chronological controls, flag `abs(last − first) / median >2.5%`.
   Use the conventional median. Review readiness, each block's A captures and all
   chronological A captures. Flag block A means changing more than **5%** from
   the readiness median. Within idle captures compare disjoint first/last
   `min(5 s, retained span/2)` windows (10 s in sustained mode); flag a change
   above **5%**. Full-cycle replays replace idle-window drift with matched cycles.
   These warnings inform each metric's confidence; they do not automatically
   exclude a block or veto a change. Cadence variation alone does not invalidate
   CPU/GPU timing.

   CPU/frame windows need at least 30 frames. GPU windows need at least 3 resolved
   samples and captures at least 10 per claimed phase, joined by `frameId`.
   Missing coverage makes that comparison unavailable, never zero. For each valid
   block average its two scheduled A and two B means (bracketing A is control only)
   and report `B − A`, `B/A − 1`, then median/range across blocks. Report nearest-rank
   p95 and pacing separately. Compare effects with the largest A spread without
   treating it as a confidence bound. Similar-sized effects or opposing directions
   weaken the timing conclusion; assess whether other evidence supports a bounded
   implementation decision. Do not pool unmatched modes/views or cherry-pick blocks.

6. **Finish and decide.** Exclude affected comparisons for wrong camera/activity/
   quality, resize, hiding, context loss or asset/readiness errors. Separate changed
   power/LPM/charging regimes. Telemetry loss or competing load needs a limitation;
   exclude comparisons if load is tied to one variant or prevents fair comparison.
   Seconds-based captures require actual duration within **±5%** and retained span
   at least **95%** of requested; frame replays require all requested frames.
   Disjoint/discarded queries invalidate affected GPU results. Unsupported, pending
   or insufficient samples remain unavailable; preserve usable CPU evidence.

   Record exclusions/warnings by name and reason. Never remove slow valid samples.
   Export partial results before recovery can evict them. Stop discards partial
   panel captures: record the interruption. On reaching a budget, preserve the
   results and apply [the decision rules](#decide-with-the-available-evidence).
   An incomplete order set limits claims, not automatically implementation. Never
   change workload validity rules after seeing results or rerun until favorable.
   Export before **Restore normal**, then close temporary panels/tabs/servers.
   Report source, conditions, engine/device, settings, method/order, valid/excluded
   counts, warnings, samples, means/p95/pacing, effects and reference variation.
   State the implementation decision, tradeoffs, missing checks and remaining risk.
   Separate delivery, startup, counts, nominal storage and timing; claim no unmeasured
   energy benefit. Durable evidence follows [candidate selection](performance-ledger.md#candidate-selection),
   not an automatic dossier requirement.

## Interpret the work correctly

Scheduling changes need a **wall-time scheduling comparison**, separate from
per-frame timing: a suspended renderer has no frame samples to time. Keep Scene
diagnostics and Earth playback closed. Compare the scene host's
`data-rendered-frames` counter across fixed wall-time windows; record
`data-scene-visible`, document visibility, active time, room, camera, buffer and
motion setting alongside it. The counter publishes about every 200 ms while
active and flushes at visibility changes, so active-window endpoints have that
granularity. Visible scenes no longer stop after inactivity. The historical
automatic-rest cohort used `data-scene-resting` and its identified source.
Use an instrumented reference with the same counter and repeat both variants in
alternating order. Retain source, device/power, isolation and recovery records
from the procedure above. Count checks establish removed submissions; they do
not establish per-frame speedups or energy savings. Check hidden/offscreen
suspension, visible-but-unfocused activity, wake-up and navigation separately.

| Diagnostic               | Scope and limitation                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Skip background          | Omits Earth/space update and rendering, retaining clearing.                                          |
| Skip contact shading     | Omits GTAO refresh **and** composite; key shadows remain.                                            |
| Half drawing resolution  | Halves both main buffer dimensions; CSS text and CSS-sized AO buffer retain their resolution.        |
| Skip spacecraft          | Omits ship rendering and AO, retaining simulation and HTML.                                          |
| One frame then pause     | Pauses automatic scheduling; input may request frames.                                               |
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
- **Stationary pixel validation:** model revisions do not cover every visual
  edit. Keep live checks of topology, visibility/layers, lights, materials,
  texture versions/UVs, geometry attributes and world transforms. Notebook map
  replacement and asynchronous image uploads are examples outside the geometry
  revision contract. Fixed inventory membership can be retained; matrix snapshots
  compare current values and copy only changed matrices. This reduces signature
  construction, not the required invalidation coverage. Color-only changes still
  preserve AO, shadow maps and dish bounds; geometry changes take priority. CPU comparison:
  `scripts/benchmark-pixel-validation.mjs` (disposable checkout, original cache
  modules supplied with `--baseline-dir`, raw output with `--out`).
- **Detailed room-dismiss picks:** each picker caches its exact ray, near/far,
  layers and geometry revision. Only the independently counted dish motion is
  excluded: it belongs to none of the pressure-wall/furnishing target sets.
  Other geometry changes still invalidate conservatively. Content updates outside
  the model update must publish changed world matrices before clearing the cache.
  DOM hit testing remains live; `data-contact-wall-picks` counts detailed picker
  executions across all four rooms, not individual mesh raycasts or frame time.
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

### Legacy scene metadata

The scene host's data attributes remain available with diagnostics closed. The
legacy metrics block runs about every 200 ms during active animation and on each
drawn reduced-motion frame. Its values also support ad hoc browser checks; the
panel and local audit adapter call the environment's `getDiagnostics()` directly.

| Values                                                                        | Freshness contract                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Physical labels, exterior label bounds, room anchors                          | Serialized on the first metrics update and after `layoutVersion` changes. `setLayout` mutates some arrays in place; object identity is insufficient. Site/label changes recreate the runtime.                                          |
| Overview supports and corners                                                 | Reprojected when the layout revision, camera view/projection matrix or vessel world matrix changes. Exact matrix snapshots include in-place edits, resize and near-plane changes. Call the publisher after world matrices are current. |
| Reader corners, portals, routes, lighting, camera/motion and frame statistics | Continue through the existing live metrics path. Door and lighting metadata can change without a layout revision.                                                                                                                      |
| Environment report                                                            | Remains a fresh snapshot, including asset readiness/failure, camera/composition, playback, Earth texture offset and meteor streams. Constant descriptors share this report; retaining the whole object would stale its live fields.    |

Visibility and rendered-frame counters retain their publication cadence and
visibility-change flush. Reusing metadata does not suppress animation, change
rendering quality or gate observability on the diagnostics panel.

## Markdown interaction comparisons

Markdown parsing is content work during React updates, not part of the continuous
WebGL callback. Count actual lexer executions when opening readers, turning
notebook pages and updating previews before timing. Notebook measurement copies
also render, and reading contents links consume the same parser.

`scripts/benchmark-markdown.mjs` builds a production React/DOM comparison from
the current source and reference copies of the four Markdown consumer/parser
files listed in the script. Run it in a disposable source checkout with
`--baseline-dir=<reference source root> --out-dir=<temporary static directory>`;
serve that directory on a separate loopback port and use the hidden built-in
browser. It uses only shipped sample content. Check equivalent markup first,
then run the two opposing-order blocks. Retain `metadata.json` and the displayed
JSON with its raw samples. The runner warms both variants and records 60 updates
per capture in ABBA, BAAB order, with a ten-minute timing budget.

Compare warm five-section notebook updates, repeated reading renders and Studio
page controls alongside changing bodies and a 20-section saturation case. The
last two exercise cache creation/eviction costs; they are not expected cache-hit
workloads. Timings cover synchronous React/DOM updates, including work flushed by
those updates, but exclude paint, asynchronous measurement and WebGL. Reading
rerenders are a controlled replay, not a claim that an idle reader keeps parsing.
Mount samples occur in an already warmed document. Report reference variation
and cold/miss costs as well as saved parses; these results establish neither
whole-interaction latency nor frame-rate, GPU or energy gains.

## Rested CPU candidate comparisons

The frame loop already defers the model's final world-matrix update, then
synchronizes the complete scene after mutations and before transform consumers.
Automatic scene updates stay disabled across shadows, color and AO. Keep that
ordering: unchanged hull coordinates do not imply unchanged descendants, reader
anchors, lights or picking targets. Layout/content setters can also synchronize
immediately for their own bounds and input consumers.

Iris `setOpen` calls inside the model share that final synchronization. Standalone
hatch calls and standalone model updates still publish world matrices by default.
Do not skip an entire hatch subtree just because its opening progress is unchanged:
parents, attached descendants and manual matrices can change independently. This
removes duplicate traversal without transform snapshots or dirty tracking. Compare
the current model against reference copies of `features/spacecraft/spacecraft-model.ts`
and `features/spacecraft/navigation/iris-hatch.ts` with
`node scripts/benchmark-iris-sync.mjs --baseline-dir=<source root> --out=<report.json>`
from a disposable checkout. `--verify-only` checks exact world transforms, portal
metadata and AO silhouettes; timing covers settled, moving-door and layout-edit
updates in opposing orders, including synchronization and leaf callbacks. It is a
Node CPU comparison, not a browser frame-rate measurement.

Each hatch's six leaf callbacks share an inverse-matrix uniform, but currently
recompute its value from the live hatch world matrix. Leaf animation changes child
matrices, not this source; layout/parent/manual matrix edits can change the source.
AO uses a separate silhouette and the leaves do not cast shadows. Visibility and
stationary pixel reuse can reduce callbacks, so a six-callback kernel is not a
universal per-frame count. A proposed inverse cache must include validation and
miss costs, and preserve standalone rendering and live edits; fewer inversions
alone do not establish a saving.

This historical runner still has strict automatic qualification gates. Its
accepted/excluded labels describe that protocol, not the implementation decision.
Preserve the labels and use valid partial results under
[the decision rules](#decide-with-the-available-evidence) when it stops early.

The historical `lighting-*` kernels omit current application-wall feedback,
fixture brightness and derived object highlights. They do not measure the full
material update chain. For a new cache decision, compare the current model's
settled and changing updates, including lookup, validation and miss costs.
Room dimmers alone cannot validate cached colors: linked rooms, live cartridge
base colors, emission and wall focus also contribute. Radio meters multiply
room-lit colors in place and rely on the next update restoring them; object
highlights then read room sources into independent material copies. Reusing the
fixed source/copy pairings needs no color invalidation, but caching their values
must account for these writes and ongoing easing.

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

Older labs retain their original automatic qualification schedules. Follow their
recorded protocol when reproducing a historical claim; their failure/partial status
is not an automatic implementation veto. For a new decision, declare a bounded
schedule before timing and apply the uncertainty rules above.

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

| Experiment            | Command option          | Specialized method and original outcomes                                                                                                                                         |
| --------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Camera/AO             | default `camera`        | [Camera invalidation](evidence/performance/camera-invalidation/README.md): survey, paired runs and same-state cached/fresh images; separate pass versus whole-frame GPU queries. |
| Direct geometry       | `--experiment geometry` | [Geometry](evidence/performance/offline-geometry-compaction/README.md): exact geometry swaps; `/startup` uses fresh iframe/context samples, still sharing driver caches.         |
| Native shadow bake    | `--experiment shadow`   | [Shadows](evidence/performance/static-shadow-bake/README.md): resize with retained bake reveals stale maps; a fresh page bakes the new initial pose.                             |
| Static/hybrid contact | `--experiment contact`  | [Contact](evidence/performance/static-contact-bake/README.md): subdivision-only controls and original restoration distinguish geometry artifacts from shading.                   |
| Irradiance probe      | `--experiment diffuse`  | [Diffuse](evidence/performance/baked-diffuse-probe/README.md): held-out actual GPU fit validation and same-state B/C comparisons.                                                |
| Stationary pixels / live receivers | `--experiment receivers` | **Decision comparison** uses two A controls and ABBA/BAAB with complete 1,080-frame dish cycles, 30 s initial rest and the default bounded waits. Stability warnings retain usable CPU/GPU results separately. **Historical strict comparison** reproduces the earlier gates. [Evidence and tradeoffs](evidence/performance/stationary-pixel-cache/receivers/README.md). |

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
The labs' unranked surveys do not retroactively qualify failed timing gates;
valid observations can still inform a clearly limited implementation decision. Comparison residency
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
