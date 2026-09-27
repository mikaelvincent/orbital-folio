# Measuring spacecraft performance

Use this guide for performance investigations or diagnostic changes. Candidate
status and historical comparisons live in the [ledger](performance-ledger.md);
read the relevant entry before repeating or proposing that experiment. An ordinary
edit does not require a benchmark. Deferred candidates need explicit authorization.

## Record a useful comparison

Open **Tools → Scene diagnostics** at the bottom-right; `?perf=1` is an optional
shortcut. Opening Tools alone must not instrument the scene. Normal visits have
no collector, GPU queries or diagnostic timers. The session is local and temporary.

1. Keep one rendering tab, browser/build, viewport, actual drawing buffer/DPR,
   camera, animation time, quality, motion and power settings matched. Finish
   builds/tests before timed work. Use a production build for release conclusions.
2. Choose **10, 30 or 60 seconds**, then **Record baseline**. It restores normal
   rendering, warms for three seconds and collapses the panel while recording.
3. Choose one experiment under **Compare one change**, then **Record this change**.
   Repeat the same pointer position or navigation route. **Record baseline again**
   restores normal settings and exposes drift.
4. Inspect the named comparison and retained duration, mean/p95, early/late trends
   and baseline variation. Repeat promising results in balanced ABBA/BAAB order;
   a single A/B and a passing capture are not an optimization verdict.
5. **Download report** preserves raw frames. Advanced retains semantic part
   rankings, manual controls, custom names and JSON. Only six captures are kept;
   closing diagnostics or reloading discards them and restores normal rendering.

Resize, hidden scene, context loss or changed settings/filter invalidate a capture.
Navigation is allowed and recorded as activity. Check shortened windows and missing
GPU samples rather than treating requested capture length as actual retention.
Report the engine tested: built-in Chromium is not Safari. Use only the hidden
built-in browser unless the owner newly authorizes native-browser interaction.
Keep the main development server available; stop temporary labs after use.

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

`node --expose-gc scripts/benchmark-controlled-performance.mjs` tests unactivated
local-transform, lighting-write and iris-inverse caches plus exact indexing.
These are CPU-only named kernels; they do not measure browser startup or rendering.
Finish heavy work and blank rendering tabs first. Keep power source/LPM stable.

On macOS the optional sampler is compiled **before** recovery:

```sh
swiftc -O scripts/benchmarks/mac-thermal-snapshot.swift \
  -o /tmp/orbital-thermal-snapshot
node --expose-gc scripts/benchmark-controlled-performance.mjs \
  --cases=all --blocks=4 --burst-ms=120 --prelude-ms=100 \
  --telemetry-argv='["/tmp/orbital-thermal-snapshot"]' \
  --context-telemetry-argv='["/tmp/orbital-thermal-snapshot","--pmset","--settings"]' \
  --out=/tmp/orbital-new-cpu-comparison.json
```

Use a new output path. Other platforms can supply a JSON sampler or omit both
telemetry options; thermal state is then unknown. Configured strict telemetry
rejects warm/unavailable readings. `--allow-unknown-thermal` permits unavailable
readings, not known warm pressure or a claim of cooling.

The runner records seeded ABBA/BAAB orders, shared iteration counts, initial
60-second rest, three controls ten seconds apart and inter-sample/block rests.
Its default 5% spread and 2.5% directional-drift gates are engineering choices.
A fixed pause and nominal OS pressure do not prove equal clocks, cold hardware
or absence of throttling on the owner's passively cooled M4 Air or other devices.
Do not relax gates after seeing results. Preserve all attempts and incomplete
case status. Split battery/AC cohorts when the source changes between blocks;
a constant LPM setting is not constant power. Process/thread CPU observations
are descriptive, not corrections to elapsed timing.

The declared 100 ms prelude warms each steady variant/control equally and resets
inputs immediately before measurement. It changes the question from idle bursts
to warmed repeated work. Indexing construction remains fully timed without that
prelude. See [protocol research](evidence/performance/rested-retests/research.md)
only when modifying the protocol; the [audit](evidence/performance/rested-retests/final-audit.md)
shows why power cohorts and excluded runs matter.

## Frozen browser labs

The reusable lab compiles actual portfolio modules/CSS with public seed content,
freezes source/assets, listens only on loopback and has no studio/contact write
APIs. It is a standalone production-React fixture, not the deployed Vinext server.
Use an unused port, keeping 3000 for the main app:

```sh
node scripts/benchmarks/camera-invalidation-lab.mjs --port 3019
```

An optional `--thermal-sampler /tmp/orbital-thermal-snapshot` records native context
outside timing. `/status` reports progress; **Stop** preserves partial evidence.
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
