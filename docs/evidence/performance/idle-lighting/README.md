# Idle scene, sustained lighting work

Candidate 8 investigates the owner's longstanding report of heat/throttling while
the portfolio is left open. The verified target is redundant GPU shading in the
current renderer. This investigation does **not** establish that the patch
eliminates thermal throttling or quantify temperature, energy or battery savings.

Baseline: `216c8dd9f28a9e7c4b40c5bf8ac746bca747a778`, Three r185. The fix is
[`direct-light-work.ts`](../../../../features/spacecraft/materials/direct-light-work.ts),
installed once after model construction in the runtime. Exact measured source,
lockfile and Earth hashes are in [summary.json](summary.json); the frozen fixture's
dependency/harness identities are in [build-manifest.json.gz](build-manifest.json.gz).
No assets, resolution, animation cadence, navigation, lighting parameters, shadow
maps or AO quality were changed.

## What actually continues

| Work | Settled pointer | Additional work during interaction |
| --- | --- | --- |
| Hull and solar wings | Stationary. | Camera moves around them; their transforms stay fixed. |
| Dish | Two-axis scan, with holds: 9.5 moving seconds per 18-second cycle. | Its motion continues independently of cursor input. |
| Environment and signals | Earth UV scrolling, star twinkle, occasional meteors, Contact meters and signal arcs. Earth does not upload its bitmap every frame. | Background projection follows the world camera. |
| Main frame | Model/material updates, matrix traversal, HTML/projection work, background and lit spacecraft draws, AO composite. | Pointer picking, camera easing, hover feedback, projections and notebook occlusion updates. |
| Key shadows | Already cached; the dish invalidates the map while scanning. | Ordinary yaw/pitch reuses it. Navigation/portrait roll changes the lighting rig and requires refresh. |
| Contact shading (GTAO) | Already cached during geometry holds. Dish geometry changes refresh the scene-wide pass, including views where that can be unnecessary. | Camera/projection changes require screen-space refresh; material-only feedback reuses it. |
| Environment lighting | PMREM is built once. | Camera-dependent specular shading still runs; changing viewpoint does not mean the environment map must be rebuilt. |

Normal visible visits use RAF; hidden-page rendering is suspended and reduced
motion retains its existing resting/demand behavior. Stationary hull geometry
does not make the composed scene static. The moving dish amplifies the present
cost but was added later and cannot alone explain the reported history.

## Diagnosis and change

The [omission survey](omission-survey.json.gz) used the actual production-compiled
renderer and public seed scene, matched dish phase, whole-frame GPU queries and
render counters. In Projects, the hold phase still submitted **382 spacecraft
draws / 870,650 triangles per frame**, with no shadow or GTAO refresh. A dish
refresh added **409 shadow draws / 972,922 triangles** and a **342-draw GTAO pass**.
The main lit frame remains substantial even when those caches are reused.

Exploratory GPU means for the same 180-frame scan/hold sequence were 15.99 ms
normal, 13.61 without background, 13.79 without AO refresh, 15.35 with shadow
generation held, 10.65 at half main-buffer dimensions, and 4.02 without spacecraft
draws/AO refresh. These are diagnostic omissions, not acceptable visual variants
or additive costs. The final unchanged reference was 15.98 ms. The pass-query
survey showed overlapping-looking phase durations on this tiled renderer; all
comparative observations use **whole-frame queries**, never sums of pass timers.

Source inspection found eight finite-range cabin point lights evaluated by every
lit Standard-material fragment. Three still evaluates the direct BRDF, including
DFG texture lookups, when attenuation has already made the light color exactly
zero. Direct diffuse/specular also contribute zero when the normal faces away
from the light, yet directional shadow sampling still occurs there.

The specialization guards zero-contribution point-light BRDF work and
back-facing directional shadow/BRDF work. It preserves the original attenuation,
nonzero lighting, indirect illumination, materials and shadow generation.
Physical materials are excluded because clearcoat can use a different normal.
Existing paint/iris/keyboard shader hooks and their program keys are composed;
Three's global chunks are untouched. Installation follows cloning and batching.
Tests protect hook identity, shared materials, eligibility and upstream chunk
compatibility. Single-level DFG/PCF sampling assumptions are documented in code.

The [render-order probe](order-survey.json.gz) did not establish a reliable benefit
and was discarded. The [lighting probe](lighting-survey.json.gz) motivated the
final specialization. Offscreen dish/AO/notebook invalidation remains a possible
separate optimization; it was not silently frozen or approximated here.

## Comparison and limits

Hidden built-in **Chromium 154 / ANGLE Metal, Apple M4**, macOS 27.0. Battery power,
discharging, Low Power Mode off. No native Safari testing or privileged telemetry.
Builds and full tests finished before the final timing cohort. OS thermal pressure
was nominal during rested controls; it became fair during later scan/movement
observations. Pressure is not a measured temperature or clock speed.

The temporary standalone fixture used production React, the actual portfolio
runtime/CSS and public seeds, with no private database. Both variants used
1280×720 CSS, 2560×1440 drawing buffer, effective DPR 2, 832×468 GTAO and a 2048²
shadow map. For the final replay both the browser and the fixture's explicit
application override reported DPR 2. Both values are logged.
This is a controlled renderer replay, not a deployed-page/native-input benchmark.

All background time was frozen at zero, including stars/meteors, while model time
was replayed identically. Each sample had 180 warmup frames, then 240 measured
frames at fixed 1/60 simulation steps on RAF. Holds covered model seconds 14–18;
scans covered 5–9. Cursor replay used a full sine sweep over x=0.3–0.7 and
y=0.38–0.5, with the dish holding. Input-dispatch CPU was measured separately.
Counts and material/geometry activity were retained alongside each frame.

The planned rested comparison used 60 seconds without rendering, three A controls
with 10-second rests, and one permitted recovery retry. **Both readiness sets
failed:** CPU spreads/monotonic drift were 7.31% and 10.70%, exceeding the 5%/2.5%
limits. GPU spreads were 1.30% and 1.52%. No ranked blocks were accepted or run.
The complete [failed controls](failed-rested-controls.json.gz) are retained.

A subsequent bounded **exploratory ABBA**, outside the qualified comparison
protocol and with one-second nonrendering gaps, covered all three workloads.
It does not rescue the failed qualification:

| Workload | Before GPU means, ms/frame | After GPU means, ms/frame | Interpretation |
| --- | --- | --- | --- |
| Idle, dish holding | 14.126 / 14.143 | 11.028 / 10.974 | Observed ~22% lower per-frame GPU time; formal speedup remains unqualified. |
| Idle, dish scanning | 17.378 / 18.498 | 13.980 / 14.100 | Reference drift and changing pressure prevent a causal ranking. |
| Cursor/camera movement | 19.880 / 27.324 | 18.466 / 20.480 | Large drift; timing result inconclusive. |

Each sample has 240 CPU frames and 16 resolved whole-frame GPU samples. Raw
frames, CPU/GPU means and p95, cadence, input costs, settings and OS snapshots are
in [matched-observations.json.gz](matched-observations.json.gz); the small
[summary](summary.json) preserves each capture separately.

Quiet-idle callback CPU means were 4.108/4.113 ms before and 3.980/3.961 ms after;
replay cadence changed from about 55.3 to 60 callbacks/s. Thus the observed 22%
per-frame GPU reduction is **not** a 22% sustained-load or power reduction. Even
the simple sampled-time × cadence estimate changes by only about 15.5%, and is
not a utilization/energy measurement. During scanning, faster cadence consumes
most of the per-frame reduction. Long-duration thermal benefit is unverified.

The fix leaves draw counts and cache policy intact: quiet idle had 240 cached AO
frames, no shadow generations; scanning had 239 shadow and AO refreshes; camera
movement had 238–239 AO refreshes and **zero shadow generations**. The one-refresh
difference is consistent with initial camera settling and is another
motion-comparison limit. Synthetic pointer handling averaged 0.16–0.21 ms,
outside callback CPU.
Geometry/texture counts stayed at 501/58 across these observations; shader program
counts stabilized after warming the variants. This is not a long-term leak test.

## Appearance, checks and cleanup

Same-state, same-noise GPU pixel comparisons covered all rooms, metal and fabric,
iris/door travel, dish extrema, camera sweeps, and portrait overview/room roll:

| Fixture | Comparisons | Largest changed-pixel count | Largest channel difference |
| --- | ---: | ---: | ---: |
| [1280×720 landscape](visual-landscape.json.gz), DPR 2 | 74 | 63 | 1/255 |
| [900×1200 portrait](visual-portrait.json.gz), DPR 1, AO on | 39 | 16 | 1/255 |
| [390×844 phone width](visual-phone.json.gz), DPR 1, AO off | 39 | 6 | 1/255 |

These tiny differences are consistent with rounding; output is not bit-identical.
Visual inspection found no altered lighting, silhouette, material finish or motion. Phone-width
results are desktop Chromium emulation, not a physical phone. Pixel comparisons
cover WebGL; native HTML was inspected in the complete page.

Full isolated suite: 559 passing tests; three focused lighting tests passed
(including one added after the full run), plus typecheck, affected lint, production
build and independent code review. Source/test changes are limited to the shader
specialization and its installation. Temporary omissions, render-order changes,
replay controls, servers and fixture state were removed after verification.
Only the fix, useful regression tests and this bounded candidate evidence remain.
