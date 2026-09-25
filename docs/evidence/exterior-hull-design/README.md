# Stage 09 — Exterior hull and access equipment

25 September 2026. Baseline `60cfce84a208ae71f1bfde8a14d21e19a42c5ba4`.

The continuous ivory shell and curved access routes already established a clear
silhouette. Close views revealed a weaker construction language: thin round
rungs, small disc feet and slender posts looked lighter than the completed
interior and service hardware. The tether stems also terminated at the centers
of their rings, blocking the openings. This pass strengthens that working
assembly while retaining the quiet roof, keel and rear pressure envelope.

## Implemented design

- Both complete routes retain identical carbon rail paths, rounded endpoints,
  rung cadence and stand-off distances. Broader rounded carbon tread sleeves
  now surround the alloy crossbars, improving contrast and bearing area.
- Elongated carbon mounting pads seat on the shell. Satin-alloy shoes, captive
  fasteners and tapered webs connect each pad to its split rail clamp.
- Three tether rings per route coincide with supported rail stations. Their
  short stems meet the near rims, leaving usable openings. Small bronze
  retainers identify these nodes without coloring every rung or mount.
- The shell, openings, cabin interiors, ladder bay, docking hardware, service
  assembly and camera code are unchanged. Rear emptiness is deliberate; no
  panel lines, filler boxes, extra vents or interactive-looking markers are added.

The first rendered draft confirmed the wider treads and stronger mounts. A
second clearance refinement moved the tether eyes slightly outward and shortened
their necks so the nearby bronze collars also leave the bore clear. Final images
and the source manifest describe that revision.

## Before and after

| View                         | Before                             | Final                            |
| ---------------------------- | ---------------------------------- | -------------------------------- |
| Roof access detail           | [Before](before-roof.jpg)          | [After](after-roof.jpg)          |
| Shoulder and mounting detail | [Before](before-shoulder.jpg)      | [After](after-shoulder.jpg)      |
| Complete underside route     | [Before](before-underside.jpg)     | [After](after-underside.jpg)     |
| Rear envelope                | [Before](before-rear.jpg)          | [After](after-rear.jpg)          |
| Live landscape overview      | [Before](before-live-overview.jpg) | [After](after-live-overview.jpg) |
| Live rolled portrait         | [Before](before-live-portrait.jpg) | [After](after-live-portrait.jpg) |

[Compact geometry](after-compact.jpg) is a separate finite model check at
1440×900. The actual 390×844 portrait overview uses wide geometry with the
production camera roll. Live checks also cover the four rooms and the ordinary
Projects→About ladder crossing. See [capture metadata](browser-captures.json)
and the [interaction record](live-interaction-check.json) for exact states.
The drag captures show released drag states; a held maximum endpoint was not
captured. The geometry/coverage suite checks the permitted camera envelope.

All images use the hidden built-in **Chromium 153** browser, actual 1440×900 or
390×844 CSS pixels, browser/render DPR 1 and matching drawing buffers. No image
scaling is used. Finite comparisons render production model sources at time
zero, FOV 38°, fixed lights, RoomEnvironment PMREM intensity 0.24 and PCF shadows.
They omit GTAO, Earth/sky, live applications and navigation. Live views retain
published content, orbital effects and shadows; GTAO is enabled in landscape
and disabled by the application in portrait. Live animation/hover time is not
locked, so the finite pairs are the controlled visual comparison.

## Construction and rendering inventory

The deterministic wide access assembly changes from **100,272 to 105,376
triangle inputs (+5,104)** and **2,803,744 to 5,726,400 geometry-array bytes
(+2,922,656)**. Compact changes from **80,064 to 83,648 triangles (+3,584)** and
**2,226,944 to 4,487,360 array bytes (+2,260,416)**. Both retain three material
batches; the visible spacecraft retains 519 mesh candidates. The model retains
both layouts, so the combined scene-graph increase is **8,688 triangles** and
**5,183,072 geometry-array bytes**. These counts are
not view-dependent renderer draw timings, actual process/GPU memory or an
optimization gain. The new extruded support/tread solids add retained array data;
design quality takes priority over the earlier geometry budget.

Source-solid comparison finds the protected pressure structure and retained
rail paths, rung spars, sockets and clamps exact. The final visible scene bounds
are unchanged, as are shared room references, door and route metadata. The
changed shoulder tether extends the chassis subgroup's coarse minimum-X bound
by about 0.047 units, so the unchanged automatic overview fitting produces a
small refit; this is not a camera-code change or exact equality of every overview
support point. The nine-viewport-per-layout harness finds landscape fit-distance
growth of 0.0387–0.2815%; all tested portrait targets/distances remain exact.
The finite drag/hover coverage envelope remains within the established 0.5 px
tolerance (worst 0.1224 px). This harness uses its test safe-area recipe, so its
absolute distances are distinct from the browser measurements. The
[audit](construction-audit.json) preserves both method and comparison.

## Verification and limits

Only `features/spacecraft/equipment/exterior-service-equipment.ts` changes at
runtime. Six new construction tests examine the real source solids before
batching: support-chain contact, broad shoe backing against curved pressure
skin, tread clearance and finite unobstructed tether bores in both layouts.
Existing tests retain mirrored endpoints/spacing, positive winding, passive
materials, hull joins and supported-view exposure checks.

The initial isolated full suite passed 581/582. The old front-clearance guard
reserved 0.16 units behind the throat for every part; only the new open eyes
exceeded it. Their measured max-Z is 0.978, leaving **0.143 behind the actual
throat** and **0.042 behind the pre-existing access front limit**. The auditor
and critic agreed that this was a conservative test margin, not a crossed
architectural boundary. The revised test retains 0.16 for every other part,
requires at least 0.12 for the eyes, and checks the overall authored front limit.
The runtime and matching renders did not change for this test correction; the
initial result is retained alongside the final isolated rerun.

The corrected final snapshot passes **582/582 tests**, typecheck, production
build/indexed-cylinder geometry check and affected lint. Full suites ran only
from a disposable source checkout at loopback port 3003, with explicit
`TEST_BASE_URL`, fresh test-only D1/R2 state and test-only secrets. The main
server/store were preserved. Build warnings were Node module-registration
deprecation, large chunks and Vinext's incomplete route classification.

[Source manifest](source-manifest.json), [construction audit](construction-audit.json),
[isolated checks](verification-checks.json) and [independent review](critic-review.md)
identify the final implementation and verification. The critic scores **96/100**,
with 50% of the rubric assigned to visual design and no unresolved blockers.
Temporary review tabs, preview server and isolated verification state are removed;
the main server remains available at `http://localhost:3000`. Safari/device testing and
CPU/GPU timing, heat, battery and process/GPU-memory measurements are not part
of this art pass. Geometry inventory is an authored cost, not a speed claim.
No held performance-ledger candidate is implemented.

## Next-stage handoff

Stage 09 carries forward continuous ivory pressure surfaces, open carbon access
rails, readable dark treads, fitted satin-alloy support shoes and bronze limited
to purposeful tether nodes. Keep the full matching underside route even when
partly hidden by overview. The rear shell remains intentionally quiet. Stage 10
can refine overview labels and callouts against this silhouette without changing
these physical routes or using camera changes to hide geometry.
