# Earth coverage after inward portrait flights

This is a deterministic CPU geometry audit of the existing **2560×1536**
regional texture, retaining original 8K-source rows **384–1919** (exclusive end
1920). It does not render, decode the texture, measure frame performance, or
certify arbitrary browser viewports.

## Results

**Keep the existing texture.** All **118,508 exact sampled poses** retain the
crop and the existing 64-row filtering allowance. Every ordinary-state and
new-flight guarded bound also passes. No texture expansion or reduction is needed.
Each mesh has 59,254 poses: 54,749 ordinary states (including 39,744 direct-flight
samples) and 4,505 independent resize stress states.

| Domain / mesh | Directly visible source rows | Expanded source rows | Expanded north / south margin |
| --- | --- | --- | --- |
| Ordinary / desktop | 469.333–1448.281 | 469.333–1782.073 | 85.333 / 137.927 |
| Ordinary / compact | 512–1440.469 | 512–1782.003 | 128 / 137.997 |
| Direct travel / desktop | 469.333–1332.172 | 469.333–1691.997 | 85.333 / 228.003 |
| Direct travel / compact | 512–1332.450 | 512–1692.361 | 128 / 227.639 |
| Resize stress / desktop | 469.333–1593.315 | 469.333–2012.290 | 85.333 / **−92.290** |
| Resize stress / compact | 512–1600 | 512–2012.930 | 128 / **−92.930** |

The same four ultrawide resize expanded bounds per mesh fail to certify the
64-row allowance; two also extend beyond the crop. These are intentionally
independent extreme Earth/camera-roll combinations at 2560×600 and 4096×768,
not a demonstrated rendering failure. This stronger certificate remains
explicitly unavailable, as in the preceding camera audit.

All **5,832 exact perturbed frusta** around those exceptions pass the 64-row
allowance. Their maximum southern row is 1515.664 desktop / 1515.555 compact.
Those finite probes do not prove the whole expanded neighborhood. The minimum
guarded geometric seam clearance across domains is 115.3125° desktop /
116.2500° compact.

See [desktop](coverage-desktop.json), [compact](coverage-mobile.json),
[domain summary](coverage-domain-summary.json), and the
[desktop](coverage-perturbations-desktop.json) /
[compact](coverage-perturbations-mobile.json) supplementary results. Compressed
raw poses retain every sample, including the failed expanded resize bounds.

### Recorded browser trajectories

A supplemental [live-trace replay](coverage-live-traces.json) uses the final
built-in Chromium background-camera transforms directly at **390×844, DPR 1**:
149 Contact-entry frames, 193 return frames and the 1,200-frame recorded history
window including a Back interruption. Both sphere meshes were checked against
these same cameras (**3,084 frame/mesh cases**), without inferring a path from
endpoints. This does not mean both meshes were rendered in the browser.

Every exact footprint and guarded bound passes the 64-row allowance. The widest
guarded row envelope is **469.333–1596.645** desktop / **512–1596.758** compact.
The evidence includes trace-file hashes, final source hashes and compressed row
results. This directly checks that one captured history interruption, while
other possible interruption states remain unproven. Safari was not tested.

## Method and changed trajectory

The portrait overview angle now reveals room ceilings. Ordinary portrait room
entry uses a direct, eased interpolation of physical camera eye and focus, with
roll changing concurrently. There is no whole-hull clearance detour. The camera
may crop the spacecraft during travel; this is intentional.

The audit calls production `createOverviewFlight` and `sampleOverviewFlight` for
both directions to each of the four rooms. For each departure it samples a 5×5
grid of bounded drag angles, then follows that baked departure view through 23
interior times. Outbound paths also include four drag corners with the selected
room's overview hover translation and 2.5% dolly. The offsets are baked into the
start pose, rather than incorrectly reapplied throughout the flight. Entry uses
overview drag bounds; return uses room bounds. All endpoint states, readers and
the Contact application remain in the settled-state sweep.

The audit omits the optional incoming-velocity tangent. These are settled
starting views with bounded offsets, not every interrupted-history, simultaneous
resize or moving-input departure. The local neighborhood guard is not a proof
that its union covers those unenumerated paths. Customized headers, safe areas
and wrapping can also change the public-seed fixture fits. Runtime source is
recorded as context, but not executed by this CPU fixture.

Landscape springs are unchanged; their existing eleven-interpolant endpoint
envelope is retained as an approximation, not a playback of those springs or
separate door/ladder routes. The 17 viewport fixtures are 1280×720, 1440×900,
1920×1080, 2560×1080, 2560×600, 1024×768, 768×1024, 390×844, 360×800,
844×390, 768×4096, 320×568, 320×1200, 1080×1920, 4096×768, 700×701 and
701×700.

A separate orientation-resize stress domain independently crosses five Earth
composition fractions with five overview roll fractions, settled rooms, readers,
Contact and applicable drag corners. This uses the public composition setter and
easing API. It does not assume the two easings have synchronized clocks or that
every independent combination occurs in production.

## Geometry and limits

The tool clips actual front-facing sphere triangles against all six frustum
planes with perspective-correct UV extrema. Desktop uses 128×96 sphere segments;
compact uses 96×64. Ship, atmosphere and HTML occlusion are ignored, retaining
hidden Earth pixels conservatively.

Each pose also receives the unchanged **0.25 orbital-unit / 5.5°** expanded
half-space bound, a mathematical superset for local translation and frustum-plane
changes relative to that Earth transform. This does not certify every aspect
ratio, custom UI, resize history or arbitrary animation state. The 64-source-row
filtering allowance is retained as a practical margin, not pixel equivalence at
every coarse mip level or an optimal crop-height proof.

Texture playback scrolls U on a fixed sphere, so geometric seam and V coverage at
each sampled camera/viewport anchor hold throughout the loop. Authored image-edge
joins and filtered appearance still need visual inspection. No texture reduction
or performance optimization is part of this camera change.

## Reproduction and provenance

```sh
node scripts/benchmarks/earth-visible-coverage.mjs --gzip-samples \
  --out docs/evidence/portrait-inward-flight/coverage-desktop.json
node scripts/benchmarks/earth-visible-coverage.mjs --mobile-mesh --gzip-samples \
  --out docs/evidence/portrait-inward-flight/coverage-mobile.json
node docs/evidence/portrait-inward-flight/summarize-coverage.mjs
node docs/evidence/portrait-inward-flight/coverage-perturbations.mjs
node docs/evidence/portrait-inward-flight/coverage-perturbations.mjs --desktop
node docs/evidence/portrait-inward-flight/coverage-live-traces.mjs
```

JSON reports preserve source hashes and link compressed raw samples. The domain
summary separates ordinary states, direct portrait flights and orientation-resize
stress. Supplemental perturbations, if needed, keep every guard exception and
sample neutral plus 26 translation directions at radius 0.25 crossed with neutral
plus 26 rotation axes at 5.5°. They are finite actual-frustum checks and do not
certify a complete expanded neighborhood. No guard is reduced to force a pass.

These deterministic calculations may overlap tests/builds; they are not timing
benchmarks. Parent-task evidence owns browser motion, rendering, tests and critic
review.

## Final-source disclosure

The original audit source hashes are preserved. After the runs started, runtime
seeded its shared motion axes from the already-baked departure pose before
clearing input offsets, preventing an artificial first-frame velocity on an
immediate history interruption. An unused optional `pose` parameter was removed.
Runtime is context for this CPU fixture, not executed by it; these changes do not
alter the settled trajectories audited here.

The helper also changed a prose comment from “A room entry” to “Settled room
entry.” Reversing only that comment reconstructs the exact audit SHA-256. The
[source verification](coverage-source-verification.json) records the original and
final hashes, this reproducible comment-only check and both runtime changes.
Interrupted travel with a nonzero incoming-velocity tangent is deliberately not
claimed by this settled-departure audit.
