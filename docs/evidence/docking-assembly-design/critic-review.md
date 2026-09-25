# Independent review — Stage 07 docking assembly

25 September 2026. Baseline `f60ebf5`; final runtime snapshot frozen at
`2026-09-24T23:50:23.943Z` in [source-manifest.json](source-manifest.json).

**Final score: 95/100. No unresolved design, source or documentation findings;
no required runtime revisions.** Final live evidence and checks support the
initial design assessment. This verdict applies to the bounded Stage 07 change,
not mechanical certification or the untested browser/device cases below.

| Criterion | Weight | Final score | Assessment |
| --- | ---: | ---: | --- |
| Visual design, primary forms and material hierarchy | 45 | 42 | The satin flange, dark seal and ivory leaf establish a clear pressure assembly. Connected wheels and the fitted cassette improve construction without filling the sleeve. |
| Scope fulfillment and spacecraft cohesion | 15 | 15 | Changes remain in the docking assembly and inner hatch wheel; approved ladder equipment, rooms, exterior ladders and opposite service branch are preserved. |
| Construction correctness | 20 | 19 | Actual-solid checks address wheels, handles, fasteners and the curved saddle; finite sampling is identified honestly. |
| Usability and navigation evidence | 5 | 5 | Live room/transfer states remain coherent; the passive cassette click is inert and no new interaction is introduced. |
| Rendering implications | 5 | 5 | Additional geometry serves the design; inventory changes are not presented as measured timing or memory gains. |
| Verification and evidence integrity | 10 | 9 | Matching source/images, passing isolated checks and honest capture limits; native Safari and physical-device coverage remain unperformed. |
| **Total** | **100** | **95** | |

## Design and cohesion

I inspected the matched exterior, frontal, shoulder, inner-hatch and compact
exterior views, the final ladder context and every final live capture: **all 21
original JPEGs**. The former thick bronze ring
overpowered the mechanism; the flatter satin flange now frames the closed leaf
and exposes a deliberate dark seal. The three small bronze shoes interrupt the
metal face without becoming another continuous decorative band. The barrel's
ivory breathing room and its seated shoulder remain intact.

Both wheel silhouettes are more convincing. Spokes reach their hubs and rims,
while the carbon grip relates to the transfer ladder's handling surfaces. The
outer wheel does not compete with the two leaf handles. The vertical pair of
capped couplings gives the cassette a clear service role and avoids the
face-like composition of two side-by-side circles. Its fitted alloy saddle
establishes attachment to the curved barrel. The compact view keeps this same
hierarchy at a smaller scale. The final landscape overview and drag-release view
show that the quieter docking face still anchors the left end of the spacecraft.
The portrait overview suppresses tiny hardware detail; the barrel and collar
remain legible as a complete assembly, while the closer portrait transfer
preserves the cassette's restrained scale.

The visual deduction reflects the limited expressiveness of the static contact
shoes and small fittings at overview scale. Both are acceptable within this
stylized spacecraft; additional articulation or markings would expand the task
without a demonstrated need.

## Findings and revisions

No runtime revision was requested by this review. The documentation caution is
**resolved**: the README, project context and ledger describe the three bronze
parts as static contact shoes and avoid claiming articulated or mechanically
validated docking operation. The earlier 81/85 subtotal left live usability and
final evidence unscored; the total above includes their actual review.

The implementation record preserves the saddle refinement, clamp-seat placement,
cap-grip extent correction and vertical cassette-port arrangement. I reviewed
the final version and matching evidence, not superseded intermediate captures.
No further decoration or change to protected areas is justified.

## Source and verification

The source review confirms the AFT branch is outside the diff. All 44 runtime
hashes match the frozen manifest; only `docking-service-assemblies.ts` and the
inner-wheel portion of `spacecraft-model.ts` differ from baseline. The reusable
preview adds relevant docking views, including an explicit 90-degree inner-hatch
inspection lens, without altering the application camera. The final interaction
record reports an inert cassette click with empty hover targets and no travel,
successful overview/room/ladder routes, drag release and an empty browser-error
sample. These observations supplement automated navigation tests; still images
do not demonstrate every animation frame or all input sequences.

I independently verified all 44 final runtime hashes, the four files in the
completed verification snapshot, all 21 JPEG hashes/actual dimensions/encoding,
their source bindings, all five finite before/after pose pairs, the construction
audit's manifest identity, and all six retained completed/interrupted log hashes.

The [verification record](verification-checks.json) and retained output confirm
**568/568 tests**, zero failures/skips/cancellations, typecheck, production
build/geometry check and affected lint on the final source. The
[completion record](completion-checks.json) reports the four-file formatting
check passing on those same hashes. The two interrupted earlier suites remain
explicitly incomplete and are not final-source proof. The full suite ran in a
disposable source checkout against explicit loopback `TEST_BASE_URL`, with fresh
test-only D1/R2 and secrets. I inspected records and output; I did not rerun the
suite or independently operate the browser. The updated cleanup record confirms
the isolated fixture was removed, port 3003 closed and main localhost:3000
remained HTTP 200; review tabs and the viewport override were also cleared.

The [construction audit](construction-audit.json) reports eight final-source
contact checks passing in both layouts, exact protected-group/framing/route
comparisons, and the corrected dense saddle sampling. Its whole-model inventory
adds 3,872 triangle inputs and 290,528 geometry-array bytes per layout while
visible mesh candidates fall from 520 to 518. This is an authored design cost,
not an optimization claim. Matched wide exterior frames change from 926 to 922
calls and 1,940,442 to 1,948,186 triangle inputs, including requested shadow work.
No measured timing, process/GPU-memory, heat or battery benefit follows from
these counts. The small inner-wheel bound change remains within the unchanged
ladder bounds and does not change shared framing.

The README, current project context and ledger entry 59 accurately distinguish
current design, protected assemblies, actual costs and the static-fitting limit.
Their next-stage handoff preserves this docking baseline while leaving the AFT
service/dish/solar assembly to Stage 08. Evidence links and diff whitespace checks
pass.

## Limits

Finite images use hidden built-in Chromium 153 at actual 1440×900 and 390×844,
DPR 1. Their fixture omits GTAO, Earth/sky, navigation and live applications.
Inner-hatch close views use FOV 90; the other inspected finite views use FOV 38.
The compact fixture is a separate geometry layout. Both live orientations select
the wide model, with shadows enabled; GTAO is enabled in landscape and disabled
in portrait under the existing policy. Live Earth/sky phase and camera state can
advance between metadata sampling and capture, so live views are observations
rather than pixel-matched comparisons. Native Safari, a physical phone, a browser
reduced-motion override and rendering timing were not tested. Geometric contact
and saddle-footprint probes are finite samples of the actual solids, not proof
over every continuous surface.
