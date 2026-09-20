# Earth coverage after the continuous portrait camera flight

This is a CPU geometry audit of the existing **2560×1536** regional texture,
retaining original 8K-source rows **384–1919** (exclusive end 1920). It does not
measure rendering performance, decode the map, or certify every browser viewport.

## Results

**Keep the existing texture.** All sampled settled navigation and both new
portrait flight directions retain the crop and the existing 64-row guarded
filtering allowance. The geometric UV seam remains hidden. No smaller texture
or performance optimization is proposed by this camera change.

Each mesh has **57,782 poses**: 53,277 ordinary states, of which 38,272 are
actual cubic travel samples, plus 4,505 independent resize stress states.
That is **115,564 poses across both meshes**.

| Domain / mesh | Directly visible source rows | Expanded source rows | Expanded north / south margin |
| --- | --- | --- | --- |
| Ordinary / desktop | 469.333–1448.281 | 469.333–1782.073 | 85.333 / 137.927 |
| Ordinary / compact | 512–1440.469 | 512–1782.003 | 128 / 137.997 |
| Cubic travel only / desktop | 469.333–1308.767 | 469.333–1629.733 | 85.333 / 290.267 |
| Cubic travel only / compact | 512–1308.417 | 512–1632.551 | 128 / 287.449 |
| Resize stress / desktop | 469.333–1593.315 | 469.333–2012.290 | 85.333 / **−92.290** |
| Resize stress / compact | 512–1600 | 512–2012.930 | 128 / **−92.930** |

All **exact** resize samples also fit the crop and 64-row allowance. As in the
preceding audit, four expanded ultrawide resize bounds per mesh do not certify
the allowance (two also extend beyond the crop). These are deliberately
independent extreme Earth/camera-roll combinations at 2560×600 and 4096×768.
They remain an explicit conservative **certificate limitation**, not a rendered
failure or universal crop safety claim.

The supplementary check replays those recorded transforms with neutral plus
26 translation directions at radius 0.25 and neutral plus 26 rotation axes at
5.5°. All **5,832 exact perturbed frusta** fit with the 64-row allowance; the
maximum southern row is 1515.664 desktop / 1515.555 compact. These finite results
do not prove the entire expanded neighborhood, and extreme base drags plus an
extra rotation can exceed production drag limits. No guard was reduced or case
removed to achieve the result.

The guarded sphere-seam clearance is at least **115.3125°** desktop /
**116.2500°** compact across all domains. See the [desktop report](coverage-desktop.json),
[compact report](coverage-mobile.json), [domain summary](coverage-domain-summary.json),
and [desktop](coverage-perturbations-desktop.json) /
[compact](coverage-perturbations-mobile.json) supplementary results.

## What changed in the audit

Portrait entry **and return** now call the production
`createOverviewFlight` / `sampleOverviewFlight` helpers instead of interpolating
the two endpoints. Each direction has 23 interior time samples per cabin, with
neutral and 5×5 bounded overview drag poses. Endpoints are included in the
ordinary settled-state sweep. Both directions are constructed independently,
even though this design traces the same geometric curve in reverse.

The two outward controls use the same camera fit as runtime: the model's actual
support points at 17 intermediate rolls, the production overview direction,
responsive lens, hover translation/dolly allowance and 1.02 clearance multiplier.
The audit keeps documented public-seed UI inset fixtures rather than loading a
browser DOM. Customized names/header wrapping/safe areas can therefore produce
different fitted controls. Navigation starts from settled poses in this audit;
it does not enumerate every interrupted resize or unsettled starting pose.

Landscape camera springs are unchanged. Their previous eleven-interpolant
endpoint envelope remains explicitly an approximation; it is not a replay of
those springs or the separate ladder/door routes. Readers, the Contact computer,
overview hover translations and settled rooms remain covered.

The Earth anchor stays fixed during each ordinary navigation scenario. A separate
orientation-resize stress domain crosses Earth composition fractions
0, .25, .5, .75, 1 with five independent overview roll fractions, room, reader and
Contact poses and applicable drag corners. It uses the public composition API.
Those independent combinations deliberately do not assume the two easings are
synchronized, and are not a record that every combination occurs in production.

## Geometry and limits

The tool clips the actual front-facing sphere triangles against all six frustum
planes, retaining perspective-correct UV extrema. Desktop uses 128×96 segments;
compact uses 96×64. Spacecraft, atmosphere and HTML occlusion are ignored, so
occluded Earth pixels are conservatively retained.

Each pose also receives the existing **0.25 orbital-unit / 5.5°** expanded
half-space bound. It is a mathematical superset for those local changes relative
to Earth's fixed transform at the sample. This does not prove that the finite
neighborhood union covers every arbitrary aspect ratio, custom UI, interrupted
camera path, orientation or visual-viewport resize. A 64-source-row filtering
allowance is retained; it is a practical margin, not exact pixel identity at every
coarse mip level or an optimal crop-height proof.

The 17 unchanged viewport fixtures are 1280×720, 1440×900, 1920×1080,
2560×1080, 2560×600, 1024×768, 768×1024, 390×844, 360×800, 844×390,
768×4096, 320×568, 320×1200, 1080×1920, 4096×768, 700×701 and 701×700.
Texture playback scrolls U on a fixed sphere, so the geometric seam and V coverage
at each camera/viewport anchor hold throughout the loop. Image-edge joins and
filtered appearance still require visual checks.

## Source changes after the audits began

The final helper added an optional incoming-velocity tangent for an interrupted
flight. This crop audit deliberately omits that argument and samples settled
departures. Its default path is unchanged: a separate old-versus-final numerical
comparison matched **32,032 poses exactly**, across both directions, four
clearance scales, four room anchors and 1,001 times per case.
See [equivalence evidence](coverage-settled-equivalence.json) and its
[generator](verify-settled-flight.mjs).

The original full-audit source hashes are preserved. The
[source verification](coverage-source-verification.json) explicitly reports
that the final helper and runtime hashes differ, describes those changes, and
keeps every other input check. Runtime is context for this fixture and is not
executed by it. Interrupted flights with a nonzero incoming tangent remain
outside this audit; parent-task tests and browser checks address them.

The supplemental perturbation replay uses recorded camera transforms directly.
It requires unchanged orbital/clipping sources, records all source hashes, and
does not execute the changed camera helper/runtime. An initial replay attempt
stopped on the old all-files hash check before computing any result; that check
was narrowed to its actual executable dependencies, with other differences
retained in the output rather than silently replacing their hashes.

## Evidence and reproduction

The desktop and compact JSON reports include the source SHA-256 hashes and link
to compressed raw poses. The separate domain summary distinguishes ordinary
states, actual cubic travel and orientation-resize stress; failures, if present,
are retained explicitly.

The `coverage-provisional/` directory preserves a completed compact audit and
phone quick run from the earlier candidate that also changed landscape angles.
The owner's portrait-only scope was then enforced: landscape directions returned
to baseline and the additional tilt now fades out between aspect .85 and 1.
The unfinished desktop run was interrupted. Final full audits were rerun after
that correction; do not use provisional source hashes as final verification.

```sh
node scripts/benchmarks/earth-visible-coverage.mjs --gzip-samples \
  --out docs/evidence/portrait-continuous-flight/coverage-desktop.json
node scripts/benchmarks/earth-visible-coverage.mjs --mobile-mesh --gzip-samples \
  --out docs/evidence/portrait-continuous-flight/coverage-mobile.json
node docs/evidence/portrait-continuous-flight/summarize-coverage.mjs
node docs/evidence/portrait-continuous-flight/coverage-perturbations.mjs
node docs/evidence/portrait-continuous-flight/coverage-perturbations.mjs --desktop
node docs/evidence/portrait-continuous-flight/verify-settled-flight.mjs
```

These runs may overlap tests and builds because they are deterministic geometry
calculations, **not CPU/GPU timing benchmarks**. Parent-task evidence owns browser
appearance/motion, tests, build and critic review.
