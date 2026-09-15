# Cached shadow map versus offline native-depth bake

Baseline: `25b23ca` (approved geometry compaction, current camera and 8K
Mediterranean Earth). Implementation commit: `2c4bcf1`. Candidate 3 was explicitly authorized on 15 September 2026.
This is a developer-only experiment; the delivered cached shadow implementation
is retained. No texture resolution, light, geometry, material, animation,
navigation, AO or visitor-visible control is changed.

## What was compared

The delivered renderer uses Three r185 PCF shadows: a native D24 depth attachment,
unsigned-integer allocation, linear comparison filtering, the existing bias and
normal bias, and five screen-rotated Vogel offsets. These are not the older
packed-RGBA shadow maps. Settled views and ordinary wide camera motion already
reuse the map. Portrait overview/room travel rotates the light rig and the
shadow camera's up vector relative to the stationary vessel.

The prototype copies native depth into a noncomparison depth target using public
`copyTextureToTexture`, samples its normalized Float32 values, and saves the exact
bits to a compressed developer asset. The offline readback/bake is **not visitor
work**. Loading uses gzip decompression and an RGBA8 upload followed by a fullscreen
`gl_FragDepth` restoration into an ordinary D24 target. Sampling then uses the
unchanged delivered PCF shader. It does not substitute a surface shadow mask or
change tone mapping.

The capture descriptor is diagnostic, not a production validity key. It records
light/map/caster state and is backed by a frozen source-and-asset manifest, but
geometry counts alone do not identify vertex contents, all material depth inputs,
or every layer/filter setting. No epsilon-based roll matching is installed:
existing flights can settle at small nonzero residual roll.

## Reproduce

```sh
node scripts/benchmarks/camera-invalidation-lab.mjs --experiment shadow --port 3020 \
  --thermal-sampler /absolute/path/to/compiled-native-sampler
```

The optional sampler is the existing device-agnostic protocol adapter. Omit it on
another platform and telemetry remains unavailable. The frozen server listens on
loopback, uses published seed content, has no application write APIs or watcher,
and saves immutable reports, PNG pairs and hashed bakes here. It serves bakes only
from its own in-memory inventory. It never changes the main development server.

Open the lab in a hidden built-in browser. **Bake and verify** advances the real
application with fixed 1/60-second steps and frozen background time. It covers all
four cabins, overview, travel/door states, hover, drag/release and open/closing
readers. Both sides regenerate AO at the same state. After each comparison, the
live map is restored and checked against a fresh render. PNGs capture the WebGL canvas, not the separate HTML overlay. These synchronous pixel
readbacks are untimed verification, not performance measurements.

The first verification in a page creates its bake. Repeating after a responsive
resize deliberately reuses that original bake/matrix, exposing stale-map errors.
A fresh page at another size instead bakes that initial lighting pose. Actual CSS,
drawing-buffer size, DPR, AO and initial shadow resolution are saved per run.
The public model is wide at every viewport; portrait framing is camera motion,
not a replacement compact model.

**Rested comparison** prepares the same main spacecraft pass with either native
map generation or uploaded/restored depth. It excludes the background, AO and
HTML. Both code paths warm first, then the lab idles for 60 seconds, runs three
reference controls 10 seconds apart, and accepts readiness only within the
five-percent spread/directional-drift rule. It uses ABBA then BAAB, one-second
sample pauses and 20-second block rests. A bad control/block stops the run; raw
failed/inconclusive attempts remain. These waits are engineering choices, not a
claim that a passively cooled Mac is cold or unthrottled.

CPU submission and asynchronous whole-operation GPU query times are separate.
No timer nests inside application frame/pass queries. Native context is anchored
to the readiness cohort; known thermal pressure, power/LPM changes, sticky page
hiding/resize/context loss and GL errors invalidate comparisons. Missing GPU
results are unavailable, not zero or GPU-qualified acceptance.

## Limits and decision boundaries

- The generation trial reuses its allocated target; restore allocates a new
  target, uploads and writes depth, then performs the same main render. This is
  warmed preparation, **not matched cold page startup** or total first-frame time.
- Loopback fetch and decompression are separately reported; loopback speed is not
  a prediction of internet delivery. No real-network or cold fallback benefit is
  claimed. Skipping the initial depth render could defer shader compilation and
  geometry upload to later work; measuring a warm shadow pass does not remove that
  cost from a visitor's first frame.
- Later steady-render ABBA/BAAB rows, if reached, are descriptive unless separately
  gated. Both versions use the same depth format/PCF shader, so no reduction in
  steady shadow sampling is established merely by eliminating generation draws.
- Depth roundtrip and zero pixel differences prove transport on this tested GPU
  and browser. They do not prove a developer's rasterized depth map matches native
  rasterization on Safari, another GPU, driver or browser.
- The lab keeps the live and restored maps together for reversible comparisons.
  It also uses temporary copy/pack targets during developer readback and an RGBA8
  upload texture during restoration. These lab allocations are not a measurement
  of process/GPU memory, nor an unavoidable proposed production memory cost.
- A single baked **surface mask** would also fail the rotating light and cannot
  duplicate the current screen-dependent PCF offsets through hover/drag/resize.
  It is a different, appearance-changing proposal, not a lossless replacement.

Primary API references: [Three WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
and [DepthTexture](https://threejs.org/docs/pages/DepthTexture.html). The exact
implementation authority is the installed r185 source identified by each frozen
manifest. The project's [rested protocol research](../rested-retests/research.md)
explains the thermal observations and limits.

## Results and decision

**Retain the existing cached map.** A fixed native-depth bake preserves landscape
sampling on this engine but cannot cover the moving portrait lighting. It adds
transport/decompression/upload work without reducing steady shadow sampling.
There is no demonstrated net startup benefit. A hybrid would still need live
rendering through roll, a complete validity mechanism, and cross-engine fidelity
checks; that integration is not justified by these results. No appearance change
is proposed for adoption, and no approval-dependent visual change was made.

The final source freeze is **56654f28-c66b-4f08-a4d9-ae5180c0eba3**. It uses Three
185, production-compiled React and the delivered renderer/model in built-in
Chromium 152 / ANGLE Metal on the owner's M4 Air. It is not native Safari or a
cold deployed-page test. The 8K Earth is fully ready for verification/survey.

### Exactness and invalidation

- Final landscape run `shadow-verify-1280x720-1789466802414`: 1280×720 CSS,
  2560×1440 buffer, DPR2, AO on, 2048² map. All **31 comparisons** and **31 restored
  live-map checks** are zero-pixel. The **16,777,216 transport bytes** reread
  identically with no GL error.
- Retained landscape bake after resize,
  `shadow-verify-900x1200-1789466995507`: 900×1200 CSS/buffer, DPR1, AO on. Six of
  31 states differ while roll changes; the initial overview has **70,192 changed
  pixels**, max channel difference **82/255**. All 31 live-map restoration checks
  are zero. Settled cabins match again in this finite replay; this is not a
  general epsilon-based validity guarantee.
- Fresh portrait bake, `shadow-verify-900x1200-1789467086895`: its initial overview
  matches exactly, but 28 of 31 later states differ. Example: About has **199,882
  changed pixels**, max **58/255**. The return overview retains a small residual
  mismatch (24 pixels, max3); snapping or epsilon-matching the light would change
  existing behavior. All 31 restored live-map checks are zero.

- Fresh mobile bake, `shadow-verify-390x844-1789467255168`: 390×844 CSS/buffer,
  DPR1, AO off, 1024² map. Its **4,194,304 transport bytes** and initial overview
  match exactly; 26 of 31 later states differ, and all 31 live-map restoration
  checks match. This tests the desktop browser's small-viewport configuration,
  not an actual phone or mobile Safari.

Across the four final verification runs there are **124 comparisons** (60
intentional stale-map failures) and **124 zero-pixel live-fallback checks**.

Matched original PNGs:
[landscape before](shadow-verify-1280x720-1789466802414-verify-10-before.png) /
[landscape restored bake](shadow-verify-1280x720-1789466802414-verify-10-after.png);
[portrait overview before](shadow-verify-900x1200-1789466995507-verify-0-before.png) /
[stale landscape bake](shadow-verify-900x1200-1789466995507-verify-0-after.png);
[About before](shadow-verify-900x1200-1789467086895-verify-10-before.png) /
[stale portrait bake](shadow-verify-900x1200-1789467086895-verify-10-after.png).
The latter two candidates are rejected visual examples, not changes to the site.

### Storage and preparation

| Bake | Raw transport | gzip | Brotli |
| --- | ---: | ---: | ---: |
| 2048² landscape | 16,777,216 B | 2,603,223 B | 1,746,731 B |
| 2048² portrait | 16,777,216 B | 2,899,403 B | 1,908,089 B |
| 1024² portrait | 4,194,304 B | 757,235 B | 526,224 B |

Brotli sizes are measured offline encodings; the actual browser trial fetched
**gzip**, not Brotli. SHA-256 names identify uncompressed depth and the report also
hashes its compressed payload. Both retain ordinary D24 shadow sampling. D24
logical texel depth is 24 bits; physical allocation/alignment is driver-dependent.
Do not equate nominal attachment or typed-array sizes with measured GPU memory.

The unranked ABBA survey (`shadow-survey-1280x720-1789466922063`) has:

| Per prepared main spacecraft pass | Native generation | Upload + restore |
| --- | ---: | ---: |
| Draws | 759 | 439 |
| Triangles | 1,992,212 | 1,013,141 |
| CPU submission, individual A/B samples | 1.94 / 5.18ms | 8.80 / 8.34ms |
| GPU query, individual A/B samples | 9.71 / 15.41ms | 24.58 / 26.85ms |

The existing main pass is 438 draws / 1,013,140 triangles. Generation adds 321 draws
/ 979,072 triangles; restoration adds one fullscreen draw/triangle instead, plus
upload and target preparation. **This is not a steady per-frame reduction.** The
native target is reused; the candidate includes new-target allocation/disposal.
The large A1→A2 change makes the timing rows unsuitable for a causal comparison.
They locate costs and do not establish that either approach is universally faster.

### Steady rendering and failed timing controls

Four 120-frame ABBA survey windows retain all CPU/GPU/pacing samples. Both versions
have 438 spacecraft draws / 1,013,140 triangles, zero shadow generation, 120 cached
AO frames, and identical background/composite counts. Whole-frame GPU means were
A:11.55/11.40ms and B:11.55/11.21ms; callback CPU means A:3.81/4.13ms and
B:3.96/4.06ms. These small, ungated differences do not establish an improvement.
Individual frame intervals and query samples are retained in the raw report.

The two rested attempts used the preceding **9aaeecd6-f2e3-4f19-bd0f-93e91d44ef46**
source freeze. The final freeze only adds the explicitly unranked survey action;
it does not change preparation or rested-comparison logic. Both attempts stopped
before any ranked candidate block:

| Raw run suffix | CPU control values | Rejection | GPU control values |
| --- | --- | --- | --- |
| `1789466387249` | 5.300 / 5.275 / 5.075ms | 4.27% monotonic drift | 16.686 / 15.946 / 16.213ms; spread4.56% |
| `1789466575173` | 5.475 / 5.350 / 5.288ms | 3.50% monotonic drift | 18.014 / 15.684 / 16.888ms; spread13.79% |

Both had nominal native thermal pressure, AC Power reported and Low Power Mode
off. Raw power records show battery discharge while AC is reported; do not
interpret this as fixed clocks or infer a cause for drift. Other user workload
was uncontrolled. No agent builds/tests or other scene ran during timed samples.
After one bounded recovery, testing did not relax thresholds or keep retrying
until a favorable result. The later survey is explicitly excluded from rankings.

Earlier reports remain as preliminary evidence: `1789465583457` is the first
22-check proof; `1789465833489` and `1789466272995` are 31-check proofs on earlier
harness freezes. `shadow-timing-1280x720-1789465971537` failed **before samples**:
a direct internal shadow renderer call lacked Three's active render state. It was
replaced with public `renderer.render`, preserving the failure rather than
silently dropping it. No performance claim uses those preliminary checks.

Cold page preparation, real-network delivery and cold first-fallback latency were
not measured; once the static candidate failed the current lighting requirement
and no steady saving existed, a larger production startup integration was not
warranted. First-use helper submission, local fetch/decode and developer capture
times remain in each verification report as descriptive context only.


## Evidence and checks

[summary.json](summary.json) indexes every compressed raw report, original raw
JSON hash, source snapshot and outcome. gzip report compression is archival only;
its pixel/image paths still refer to the original PNGs in this folder.
[final-build-manifest.json](final-build-manifest.json) identifies all source,
installed dependency, bundle and public asset inputs. [source.tar.gz](source.tar.gz)
contains the five changed/new implementation files: apply them over baseline
`25b23ca` to reconstruct the final lab source. This archive contains no private
configuration, database or user content.

All **282 tests passed** ([log](checks/tests.log)), alongside
[type checking](checks/typecheck.log), [affected lint](checks/lint.log) and the
[production build](checks/build.log). The normal application hook stayed unchanged
after those full checks; later changes only corrected/extended developer
measurement orchestration, which was typechecked, linted and frozen/replayed.
Build warnings concern Node's existing module-registration deprecation, large
chunks and Vinext's route classification limits. No new dependency was added.
The final small-viewport browser run reported no console errors. Temporary lab
server/tab/viewport override were removed; the main localhost:3000 server returned
HTTP200 and remains available. No native Safari or screen capture was used.

The implementation is subject to the independent critic record in
[critic-review.md](critic-review.md). The evidence hash manifest is finalized
alongside that review.
