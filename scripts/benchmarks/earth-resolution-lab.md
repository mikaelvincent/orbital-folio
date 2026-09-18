# Earth resolution lab

A developer-only finite fixture compares the retained procedural-cloud implementation
with the current production Earth renderer at 2048×1024, 4096×2048 and 8192×4096.
It imports no spacecraft and adds no portfolio runtime work or routes. The older
`cloud-browser-lab` remains unchanged for its historical two-variant comparison.

## Current cinematic night comparison

Use `--night` to compare the current East Asian opening with the current
production cyan/cobalt atmosphere and Black Marble texture at 2K, 4K and 8K:

```sh
node scripts/earth-resolution-lab.mjs --night --port 3004 --thermal-sampler /tmp/orbital-folio-mac-thermal-snapshot
```

The optional sampler argument requires that executable to exist; omit it on other
devices or when unavailable. The mode is frozen in the server manifest, rendered
as `body[data-lab-mode="night"]`, and recorded as `configuration.mode`. A mismatch
between the fixture and manifest rejects the round. The ordinary command below
still selects the historical daytime/procedural comparison.

Use **Download JSON** after each completed or rejected round to preserve the full
report. Night filenames include the order and unique run ID, preventing accidental
replacement when a round is repeated. Copy and Show JSON remain available.

Night uses **A = 2K, B = 4K, C = 8K** and all six permutations, in this order:
**ABC, BCA, CAB, ACB, CBA, BAC**. Every resolution appears twice in every serial
position and every ordered predecessor/successor pair appears twice. Run all six
at a matched viewport, DPR and frozen time. Each round stops after three blocks;
the default is **10 warmup + 120 measured frames per block**, with **20 seconds of
blank, idle recovery before every block**. Six accepted rounds yield 720 measured
frames per resolution. Recovery is not proof of equal temperature or clocks.

The default frozen time is the opening at zero seconds. All three variants use
the same production geometry, material, East Asian orientation, atmosphere and
clock. Readiness checks require the actual requested bitmap dimensions, night
source diagnostics, the production non-tone-mapped `MeshBasicMaterial`, and the
exact current `NIGHT_EARTH_OPENING` values and elapsed time. Changing a night preview's frozen
time replaces its environment because the production clock accumulates forward
deltas; this prevents backwards preview seeks from introducing phase drift.

All three full environments remain resident during a night round, avoiding
allocation and upload churn between steady samples. Their Earth mip chains alone
total approximately **235 MB**; decoded images and the duplicated sky, buffers and
renderer add more. This fixture does not measure production peak memory with one
Earth. First import, fetch/decode readiness, shader preparation and first upload
are recorded separately from steady measurements, and later rounds declare reuse.
One first load per resolution is a local observation, not a replicated cold-network
benchmark. No continuous rendering runs outside the finite warmup/sample blocks
and one-shot preparation or preview renders.

The CPU/GPU separation, query validation, hidden-tab/resize aborts and optional
native thermal/power invalidation described below apply to both modes. Existing
`audit-earth-fourway.mjs` validates the historical day protocol only; do not feed
night reports into that auditor or combine the two designs into one timing table.
`audit-night-earth-results.mjs` is also retained as a historical auditor: it
validates the saved Mediterranean night records and their original source/asset
identities. It must not be used to validate the new East Asian baseline. Preserve
those old reports unchanged; new artwork requires a separately identified cohort
and an auditor matching its source and protocol.

## Historical daytime / procedural comparison

```sh
node scripts/earth-resolution-lab.mjs --port 3004
```

Open `http://127.0.0.1:3004/`. The server freezes compiled modules and copies public
assets on startup. Its `/build-manifest.json` records SHA-256 hashes of imported
source, built modules and copied assets. Changes to the workspace cannot alter a
running comparison; restart explicitly to test another build.

For optional read-only macOS thermal and power context, compile the existing
`mac-thermal-snapshot.swift` before the recovery period, then provide its binary:

```sh
node scripts/earth-resolution-lab.mjs --port 3004 --thermal-sampler /absolute/path/to/mac-thermal-snapshot
```

The server runs that explicitly supplied executable with `--pmset` for `/context`,
without a shell, with a six-second timeout and bounded output. The executable hash
and arguments enter the manifest. Sampling occurs before preparation and before
and after each measured block, entirely outside GPU queries and measured frames.
Without this optional provider, context is reported as unknown; all browser
rendering, timing and failure checks still work on other devices and browsers.

## Variants and balanced order

| Letter | Variant | Source |
|---|---|---|
| A | Original generative clouds | `cloud-reference.ts` |
| B | 2K satellite Earth | Production environment, width override 2048 |
| C | 4K satellite Earth | Production environment, width override 4096 |
| D | 8K satellite Earth | Production environment, width override 8192 |

The procedural reference remains the actual generative implementation, with no
external Earth image: desktop uses its 64³ RG8 noise field and 17 cloud samples;
mobile uses 32³ and 11 samples. It is different from the more recent developer-baked
satellite cloud-volume implementation. Its original geographic orientation is
preserved, while the three satellite variants share their production orientation.
These compare the costs of actual designs, not visually identical rendered pixels.

Run **all four rounds at one viewport and DPR**, saving the JSON after each:

1. A B D C
2. B C A D
3. C D B A
4. D A C B

This Williams design places every variant once in each serial position and every
ordered within-round predecessor/successor pair once. Round boundaries include
manual scheduling/recovery and are not treated as balanced adjacent blocks.
The page runs only the selected four-block round and then stops with a blank canvas.
There is no automatic round continuation or background animation. Default is 60
measured frames per block: 240 per variant and 960 total after four valid rounds.
Repeat the complete design for another viewport; a phone-sized desktop viewport
is not a physical-phone performance measurement.

## Preparation and steady measurement

Load the page and start without previewing to capture initial preparation. The
report distinguishes module import, factory CPU submission, readiness/fetch/decode,
`compileAsync`, and the first fully loaded render including initial upload. The
first submitted frame milestone is a CPU-side wall duration, not OS presentation
latency; a reload does not guarantee cold HTTP or driver caches. Later rounds
explicitly report reused preparations rather than counting them as fresh starts.
Preparation snapshots are retained in partial failed reports as well.

All four complete environments remain resident before the first measured block.
This prevents allocations, texture uploads and environment replacement between
steady-state variants. It also means **aggregate lab memory is larger than a single
production Earth**: satellite RGBA8 textures with mipmaps alone total approximately
235 MB, before the procedural field, all duplicated sky textures, geometry, decoded
images, framebuffers and driver allocations. The report stores renderer texture
and geometry counts; those counts are not byte-level VRAM measurements.

Before every block the renderer clears once, followed by a blank 20-second rest
with no render loop. Each block performs ten warmup frames and then 60 measured
frames (or the explicitly selected 120). Every measured GPU timer query covers
only `renderer.render(environment.scene, environment.camera)`. Update CPU,
render-submission CPU, total CPU submission, frame intervals, draw calls, triangles,
points and individual query status/nanoseconds are stored for every frame. CPU
submission duration is not GPU execution time, and frame intervals include browser
scheduling and refresh-rate limits. Query drain is bounded and never calls `gl.finish()`.

The maximum texture size must support each requested texture. Source diagnostics,
loader success, expected dimensions and the actual decoded image dimensions must
all match before a satellite variant is accepted. Fallback or incomplete rendering
cannot silently become a faster result. The procedural baseline is validated
against its known generative mode, weather model and absence of Earth requests.

## Thermal context and invalidation

A rest duration is a scheduling control, not proof of cooling. Start under nominal
native thermal pressure, consistent power source/mode and low competing load.
Continue recovery when pressure is elevated or results drift. OS nominal pressure
still does not establish identical clocks, temperature or complete thermal recovery.

Native fair/serious/critical pressure, low power mode, reported CPU/GPU/scheduler
limits below 100%, or a power-source/mode change invalidates and stops the current
round. Both before- and after-block snapshots are checked. Keep all rejected raw
reports with the reason and repeat the complete round only after recovery. Missing
native telemetry is explicitly unknown; it cannot be interpreted as nominal.

Stop, hidden tab, viewport changes and lost WebGL context cancel the run and leave
available partial results. A disjoint GPU clock invalidates the whole affected
block, including earlier query values. Missing/invalid GPU results invalidate the
round's GPU comparison; unsupported GPU timers produce an explicitly CPU/frame-only
report. A stopped/failed round retains source identity, preparation, completed and
partial frames, and context flags. No rendering continues after completion or stop.

Use identical frozen time, viewport and DPR for visual previews. Preview renders
one frozen frame and can be hidden behind controls or shown fullscreen without
starting an animation. Restore the same viewport before comparisons; resizing
invalidates an active round. A retained frozen image does not consume a render loop.

This measures the **orbital background workload**. It excludes spacecraft, app UI
and interactive camera movement, and is not a battery, power or temperature-savings
measurement. Do not translate texture sample counts or these timings into a claimed
whole-site FPS or heat reduction without a separate end-to-end measurement.

## Audit saved evidence

After saving all four rounds for both declared viewports under
`docs/evidence/performance/earth-fourway/`, run the read-only evidence audit:

```sh
node scripts/audit-earth-fourway.mjs
```

It starts no renderer or native sampler. It verifies the source/asset identities,
Williams order, decoded-dimension diagnostics, draw counts, raw GPU query validity,
native pressure/power observations and deduplicated preparation records, then writes
`audit-summary.json` and `audit-summary.md` beside the unchanged raw reports.
`--partial` validates available reports and prints results without publishing final
artifacts; `--verify-only` suppresses summary writes; `--input-dir PATH` selects a
saved evidence directory with the same protocol. Additional raw rounds are detected
and disclosed so retries/exclusions cannot be silently omitted.

Browser fields named `CpuMs` record elapsed wall durations around JavaScript and
render submission using `performance.now`; they do not measure native process CPU
time or utilization. GPU queries measure a separate execution interval. Preparation
figures are single local preview observations, shared across later round exports,
not replicated cold-start measurements. Earth-only generative texture storage comes
from the retained 3D noise mip payload; it is not zero merely because no image is
fetched from the network.
