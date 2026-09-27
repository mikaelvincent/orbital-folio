# Stationary spacecraft image caching

**Rejected after implementation and measurement, 2026-09-27.** Reusing rendered
spacecraft color and depth removed substantial drawing during stationary holds,
but the complete-cycle comparison failed stability controls and showed worse
frame pacing. No qualified net performance improvement was established. The
cache, integration, experimental harness and candidate tests were reverted;
production rendering remains identical to `c5efb26`.

This is candidate **10** in the [shortlist](../../../performance-ledger.md).
Its useful lesson is the gap between a cheap cache hit and a worthwhile cache
over the full animation cycle. It makes no energy or battery-life claim.

## Implementation and constraints

The prototype saved opaque Standard-material spacecraft pixels into a
multisampled color/depth target, restored their color and depth after the normal
background pass, then drew live meshes and the existing GTAO composite. Earth,
sky, transparent effects, Contact meters and alpha-to-coverage iris blades stayed
outside the image cache. Layer masking preserved live descendants of cached
meshes; shadow generation always received the complete scene.

Camera/projection, viewport, geometry, lighting, material and texture changes
invalidated reuse. Hover, navigation and room transitions requested fresh frames.
Unsupported scene topology or material changes fell back to full rendering. Two
unchanged frames preceded a capture. The cache was released on scene rest or
page hiding and recaptured after wake-up. Independent review identified missing
geometry-index identity, material/light inputs and shadow-update guards; these
were added before the controlled comparison.

The moving dish also changes shadows and contact shading on the stationary hull.
Keeping those interactions correct required full rendering through its scans.
Across each measured 1,080-frame dish cycle, B recorded **498 cache hits, four
captures and 578 full-render fallbacks**: only 46.1% of frames reused pixels.
An exploratory quiet hold reduced spacecraft-pass submissions from 382 to 50;
that count excludes the separate background and GTAO composite and is not a
complete-cycle speedup.

An initial half-float color target used 210.94 MiB of nominal attachments at
2560×1440. Applying the normal ACES/sRGB transform before resolve allowed RGBA8
color with unsigned-integer depth and four samples: **147,456,000 bytes
(140.625 MiB)** including multisample and resolved attachments. This is storage
arithmetic, not measured physical GPU/process memory. Reconstructed depth still
cannot reproduce all original per-sample edge coverage.

The existing [automatic-rest policy](../scene-rest/README.md) already stops all
recurring scene submissions after inactivity. A pixel cache cannot remove work
from those resting windows. This experiment concerns active rendering only; its
manual replay deliberately bypassed automatic scheduling. It did not repeat a
wall-time rest comparison or establish a power-consumption benefit.

## Source and method

- Production reference: `c5efb26`; initial prototype: `cca193c`; final measured
  implementation and harness: `ed352c7a2982b652e67e827f32b943dc9f1b62cd`.
  Rollback: `4285684`. Those commits preserve the rejected code without leaving
  it in current source. The final historical harness runs with
  `node scripts/benchmarks/camera-invalidation-lab.mjs --experiment pixels --port 3021`
  from an isolated checkout at `ed352c7`, using its **Rested comparison** button.
- Frozen production-React public seed fixture; no private database, uploads or
  contact-write API. A disabled the cache in the same candidate runtime; B enabled
  it. This isolates the mechanism, rather than comparing two separately built
  deployment bundles. The baseline wrapper bypassed caching and used the normal
  material shaders. Allocated cache attachments and driver/program caches stayed
  resident after B when switching back to A; this was not a comparison of fresh
  processes or independent memory footprints.
- Hidden built-in **Chromium 154**, ANGLE Metal on **Apple M4**, macOS
  27.0 (26A428), Three r185. No Safari verification.
- Projects room, settled camera, reader closed, neutral pointer, reduced motion
  off, 1280×720 CSS, native/effective DPR 2, 2560×1440 drawing buffer. GTAO stayed
  enabled at 832×468 with 32 AO/denoise samples; shadows stayed enabled at 2048².
  Exact camera, lighting, quality and buffer fields accompany every raw capture.
- Battery power, discharging, Low Power Mode off; recorded charge 53→52%.
  Native context records accompany the run. OS state changed from nominal to
  fair by the end, an additional reason not to rank the block. No measured clocks
  or energy data; unrelated user-app load was not controlled.

The [comparison rules](../../../performance-diagnostics.md) were adapted to
replay one complete authored dish cycle per capture: **1,080 simulation steps at
1/60 s**, executed on actual RAF, with identical dish/Contact time. Earth was
reset and background playback held at zero for both variants. Each sample
prepared/settled the room, warmed 30 frames, positioned the cycle and invalidated
B before measurement, so captures and moving boundaries were included.

The schedule used a 60-second nonrendering recovery, three A readiness captures
with ten-second rests, then planned ABBA/BAAB/ABBA/BAAB blocks, each bracketed by
A, with one-second sample and twenty-second block rests. The 5% reference-spread
and 2.5% monotonic-drift gates applied to CPU callback, whole-frame GPU query and
frame-interval means. All 1,080 requested frames were required. First/last idle
window checks were inapplicable: those portions of a cycle contain different
authored motion. Actual retained spans are reported below, not treated as
fixed-duration panel captures.

Source snapshot `a29498c2-b167-4253-a7d4-6aa6cf0df4a3` was built at
15:25:39.434 UTC. The raw manifest hashes every input, output bundle and public
asset. Key SHA-256 values:

| Input | SHA-256 |
| --- | --- |
| `package-lock.json` | `3d5ccb3561102f4b28ccdc1ab60109b377eaa520641ea5f8d430d4c2e9aaadc4` |
| `public/textures/earth-europe-loop.webp` | `19ac5ed0c9796d81a36c2619a67396e1630f36b9915e1bd716c0057b65bf3cf1` |
| Candidate cache module | `addf19206ec0f943358a106e5a69837d6b4c7f4aabc4f4aedabe1938f0327fa0` |
| Candidate runtime | `acb684fc9305ad8ac6beeca27d5f79fdca1be58c44d041d4a81749449adbd3e2` |

## Timing result: no accepted blocks

[Raw controlled run](pixels-timing-1790522746824.json.gz), 15:25:46.824–15:30:25.370 UTC.
Three readiness controls passed: CPU spread 0.897%, GPU spread 0.378%, frame
interval spread 0.559%. Each capture retained 1,080 frames and 72 resolved
whole-frame GPU samples, with zero discarded samples, pending queries or WebGL
errors. GPU queries sampled every fifteenth frame; they do not measure every
cache transition.

The first bracketed ABBA block failed. These are descriptive samples from that
**excluded block**, not an accepted effect or a performance ranking. All timings
are milliseconds; p95 is nearest rank within each capture.

| Capture | CPU mean / p95 | GPU mean / p95 | Interval mean / p95 | Retained span, s |
| --- | ---: | ---: | ---: | ---: |
| A before | 4.980 / 6.5 | 12.150 / 14.145 | 16.744 / 17.8 | 18.067 |
| A scheduled | 5.035 / 6.6 | 12.151 / 14.003 | 16.744 / 17.8 | 18.067 |
| B scheduled | 4.873 / 6.9 | 10.125 / 13.523 | 17.286 / 18.5 | 18.652 |
| B scheduled | 4.873 / 6.8 | 10.225 / 13.515 | 17.193 / 18.1 | 18.552 |
| A scheduled | 5.032 / 6.5 | 12.201 / 14.033 | 16.744 / 17.7 | 18.067 |
| A after | 5.629 / 11.1 | 15.317 / 29.040 | 18.364 / 26.1 | 19.815 |

The final A slowed substantially: within-block A spreads were **12.897% CPU,
26.013% GPU and 9.677% interval**, all above 5%. The slower reference was retained,
not removed from calculations. B's lower sampled GPU means coincided with longer
frame intervals and scan-boundary callback spikes up to 18.1 ms. These observations
motivated rejection but cannot establish either a general speedup or slowdown.

The frozen harness stopped on that first failed block. Recovery was not run:
review and retry preparation left insufficient time for a new sixty-second rest,
fresh controls and all four blocks under the original twenty-minute wall limit.
There were **zero accepted blocks, one excluded block, three unrun blocks and no
recovery retry**. No block-effect median/range or sustained-use result is available.
No replacement timing run was started.

## Appearance, invalidation and wake-up

The corrected integrated renderer produced 44 paired image comparisons plus a
release/wake lifecycle record: all five rooms at held dish phases, hover positions,
opening/closing doors, navigation checkpoints, arrival and recapture after release.
Recorded WebGL error checks were zero. Moving door/navigation checkpoints used
full-render fallbacks with matching pixels; reusable states showed small edge
differences rather than exact equality. The final cache module hash matches the
controlled run; the later harness update reset Earth before timing samples.

Across the five desktop room views, mean absolute RGB differences ranged from
0.0095 to 0.0346 on the 0–255 scale. Contact had 1,836 of 3,686,400 pixels with any
channel differing by more than 8, with a maximum of 120 at an edge. Small global
means therefore do not prove pixel equivalence. The retained full-resolution
[Contact reference](pixels-verify-1790522595118-verify-10-before.png) and
[cached result](pixels-verify-1790522595118-verify-10-after.png) show the appearance.

A separate earlier RGBA8 portrait check covered all five rooms at 900×1200 CSS
and 900×1200 drawing resolution (effective DPR 1), with AO enabled. Its room mean
differences ranged from 0.0158 to 0.0499. The retained
[Projects reference](pixels-verify-1790521970050-verify-5-before.png) and
[cached result](pixels-verify-1790521970050-verify-5-after.png) document that version;
they are not final-integration portrait sign-off. No phone, reduced-motion browser
sweep or normal-scheduler wall-time wake test was completed before rollback.

Candidate checks passed in the disposable checkout with fresh isolated state and
an explicit separate test URL: 573 full-suite tests, typecheck/build and affected
lint; five focused cache tests were rerun after review fixes. An isolated owner
workflow check also passed 12 tests. Unit tests covered complete shadow casters,
live child meshes, material/light/geometry/texture invalidation, unsupported-state
fallbacks, release and recapture. Those checks establish specific behavior, not
a performance gain. Final delivery changes only documentation/evidence; the
rollback was checked against the original production source.

## Raw and excluded records

All eight original JSON reports are retained losslessly as gzip, including full
manifests, raw frames/sampled queries, native contexts, comparison counts and
failures. Only the four linked PNGs are retained; other image filenames inside
historical reports identify intentionally omitted temporary captures. Earlier
development reports have their own source hashes and must not be pooled with
the final measured commit.

| Record | Interpretation |
| --- | --- |
| [Half-float visual checks](pixels-verify-1790521646571.json.gz) | 25 comparisons; superseded by the smaller display-color target. |
| [Exploratory timing probe](pixels-probe-1790521713317.json.gz) | Quiet-hold, scan and camera ABBA samples; no readiness qualification, earlier target and tooling work during the session. Counts only; cannot rescue the failed controlled run. |
| [Shader compilation failure](pixels-verify-1790521852018.json.gz) | Missing newline in shader-chunk composition; WebGL error 1282. Excluded, then fixed. |
| [RGBA8 desktop checks](pixels-verify-1790521911250.json.gz) | 25 earlier lab comparisons with cache reuse; no timing claim. |
| [RGBA8 portrait checks](pixels-verify-1790521970050.json.gz) | 25 separate portrait comparisons; no timing claim. |
| [Integration inventory failure](pixels-verify-1790522371768.json.gz) | Inventory taken before picking meshes were added caused conservative fallback everywhere. Zero image differences with zero cache hits are not evidence of correct cache reuse. Initialization was moved after scene assembly. |
| [Corrected integration checks](pixels-verify-1790522595118.json.gz) | 44 paired comparisons and one lifecycle record; active reuse and full-render boundaries distinguished. |
| [Controlled timing failure](pixels-timing-1790522746824.json.gz) | Passing readiness, failed first bracketed block, incomplete order set; no qualified net gain. |
