# Fixed portrait Earth anchor: texture coverage recheck

This audit checks the retained **2560 × 1536** regional texture after separating
Earth's viewport composition from the camera's navigation roll. It is a CPU
geometry calculation, not a rendered-image or performance benchmark.

The current production `setViewportComposition` API selects the portrait or
landscape Earth anchor once per viewport. All ordinary overview, room, reader,
Contact, hover, drag and travel poses then use `followCamera` without changing
that anchor. The existing crop retains source rows **384–1919** (exclusive end
1920). Results and practical filtering margins are recorded in the two full
reports, with compressed raw samples linked from each report.

**The ordinary navigation domain passes the existing 64-row guarded allowance.**
All sampled orientation-resize states also fit the crop and allowance. However,
the deliberately independent resize cross-product has four poses per mesh whose
expanded half-space bound does **not** certify the allowance. These failures are
retained, not removed or fixed by reducing the guard. A targeted investigation
below distinguishes this conservative bound from exact-frustum observations.

| Domain and mesh | Directly visible rows | Expanded rows | Expanded north / south margin |
| --- | --- | --- | --- |
| Ordinary, desktop | 469.333–1448.281 | 469.333–1782.073 | 85.333 / 137.927 |
| Ordinary, mobile | 512–1440.469 | 512–1782.003 | 128 / 137.997 |
| Resize cross-product, desktop | 469.333–1593.315 | 469.333–2012.290 | 85.333 / **−92.290** |
| Resize cross-product, mobile | 512–1600 | 512–2012.930 | 128 / **−92.930** |

Each full report has **28,662 poses**: 24,157 ordinary poses plus 4,505 resize
poses, for **57,324 poses across both sphere meshes**. The guarded geometric UV
seam remains hidden by at least **115.3125°** (desktop) / **116.2500°** (mobile)
in every domain. The maximum guarded longitude envelope remains **87.1875°** /
**86.2500°**, narrower than the 112.5° texture period. See the
[desktop report](coverage-desktop.json), [mobile report](coverage-mobile.json)
and [domain summary](coverage-domain-summary.json).

## Conservative resize-bound investigation

The four expanded-bound exceptions occur only at the **2560×600 / 4096×768**
ultrawide fixtures, with extreme negative drag. The strongest case combines an
Earth composition already fully landscape with a camera still fully rolled to
portrait. The cross-product intentionally allows the two independent easings to
be at unrelated fractions. It is not a replay establishing that this combination
actually occurs in production. Two exceptions per mesh exceed the crop itself;
the other two fit the crop but do not retain the requested 64-row margin.

The supplementary audit evaluates actual frusta around each exception while
preserving the original **0.25-unit / 5.5°** bounds: neutral plus 26 normalized
`[-1,0,1]^3` translation directions, crossed with neutral plus 26 camera-rotation
axes. That is **729 exact frusta per case**, not independent expansion of all
clipping half-spaces. No generated texture padding or smaller bound is introduced.
The check is finite and does not replace a mathematical proof of the complete
neighborhood; its extra rotation can also extend beyond the configured drag
limit because the base camera is already at the drag extreme.

The exact perturbed frusta retain the crop and 64-row allowance. The detailed
[mobile results](coverage-perturbations-mobile.json) and
[desktop results](coverage-perturbations-desktop.json) retain each offending pose
and its worst perturbation. The much looser half-space bound therefore remains
an explicit **certificate limitation**, not evidence that these sampled cameras
expose missing pixels. Keep the current texture; do not claim universal resize
coverage or expand the asset solely from this conservative bound.

## Method and finite domain

The audit clips the actual front-facing sphere triangles against all six camera
frustum planes and carries perspective-correct UV extrema through the clipping.
It ignores spacecraft, atmosphere and interface occlusion, conservatively
retaining Earth pixels that these foreground elements might hide. Desktop uses
128 × 96 sphere segments; mobile uses 96 × 64. It does not decode texture images.

The sweep uses current spacecraft supports, camera fitting, responsive field of
view and public-seed interface insets. Seventeen viewport fixtures are checked:
1280×720, 1440×900, 1920×1080, 2560×1080, 2560×600, 1024×768, 768×1024,
390×844, 360×800, 844×390, 768×4096, 320×568, 320×1200, 1080×1920,
4096×768, 700×701 and 701×700. The direct 390×844 quick report is a subset of the
full desktop sweep, not additional coverage.

For each viewport, ordinary states include 5×5 bounded drag samples, hover
extrema, room-hover translation/dolly, close readers and the Contact application.
Eleven interpolants per overview-to-room path include the changing camera roll,
with drag samples. These are a conservative fixture, not frame-for-frame
acceleration-limited springs or every ladder clearance route. The reverse journey
uses the same geometric endpoints, but its exact transient trajectory is not
independently replayed by this tool.

Orientation resize is tested separately. The destination viewport projection is
applied immediately; the public composition setter and `update` advance Earth's
presentation through fractions 0, .25, .5, .75 and 1. For an interior fraction
`f`, the elapsed time is `-ln(1-f)/8`, matching the production exponential easing.
No Earth transform is mutated directly by the audit. Each presentation angle is
crossed independently with five overview camera-roll fractions, rather than
assuming that the camera and Earth's easing have the same speed. Room, reader
and Contact poses plus applicable drag corners are also checked under each
presentation angle. This adds **265 orientation-resize poses per viewport**.

Every sample also expands the clipping half-spaces for a 0.25-orbital-unit camera
translation and a 5.5° change of each frustum-plane normal **relative to Earth's
transform at that sample**. The resulting neighborhood is a mathematical
superset under those bounds; the finite union is not a proof for every runtime
trajectory, interrupted resize, old-camera target/distance, browser keyboard
resize or arbitrary viewport. Custom content, safe areas and header wrapping can
also change camera fitting. The tool retains these limitations in its reports.

Texture playback scrolls U while leaving the sphere geometry fixed. For a fixed
camera and composition angle, V coverage and the geometric U=0/1 seam location
therefore remain unchanged throughout playback. The authored image-edge join
and mip filtering still require visual review. A 64-row allowance is a practical
margin, not proof of pixel identity at every coarse mip level or a universal
optimal crop height.

## Historical behavior and provenance

`--revision` snapshots the orbital modules from the requested Git revision, while
using current camera/model fixture helpers. The script detects the new viewport
composition API. With older revisions it instead passes each sampled layout roll
to `followCamera`, preserving that revision's former roll compensation when
implemented. The historical portrait quick report uses
`e238e60a20ce8c26049ec3cc2370f96daa454ca3`, reproduces **1,421 poses**, and
retains the old live-roll presentation. It has no new independent composition
resize API, so no such resize samples are added to that historical result.

All JSON reports and compressed raw samples retain SHA-256 hashes of their actual
source inputs. The [final source-verification record](coverage-source-verification.json) checks those hashes against
the source used by the completed task. Parent-task evidence owns browser visuals,
application tests and build results; this audit makes no GPU timing claims.

## Reproduce

```sh
node scripts/benchmarks/earth-visible-coverage.mjs --gzip-samples \
  --out docs/evidence/earth-stable-navigation/coverage-desktop.json
node scripts/benchmarks/earth-visible-coverage.mjs --mobile-mesh --gzip-samples \
  --out docs/evidence/earth-stable-navigation/coverage-mobile.json
node scripts/benchmarks/earth-visible-coverage.mjs --viewport 390x844 \
  --gzip-samples \
  --out docs/evidence/earth-stable-navigation/coverage-portrait-quick.json
node scripts/benchmarks/earth-visible-coverage.mjs \
  --revision e238e60a20ce8c26049ec3cc2370f96daa454ca3 --viewport 390x844 \
  --gzip-samples \
  --out docs/evidence/earth-stable-navigation/coverage-historical-portrait-quick.json
```

The targeted perturbation generator is retained alongside its evidence:

```sh
node docs/evidence/earth-stable-navigation/coverage-perturbations.mjs
node docs/evidence/earth-stable-navigation/coverage-perturbations.mjs --desktop
```

It refuses to proceed if the current source differs from the recorded full-sweep
inputs and records its own generator hash. Preserve the checked-in evidence
before overwriting it with a later source run.
