# Independent critic — Stage 08 service assembly

Final independent score: **95/100**. The visual/source, construction, documentation
and verification gates are complete. No unresolved blocker, required runtime
revision or failing required check remains. This assessment is bounded by the
recorded browser and geometric checks; later owner feedback takes precedence.

## Scope and reviewed source

The review covers the service housing, communications dish, solar wings and their
supports. Completed docking, cabins, ladder, exterior access equipment, content
and navigation are protected. The runtime diff is confined to the service branch
of `features/spacecraft/equipment/docking-service-assemblies.ts`; the preview adds
reusable inspection views, and `tests/spacecraft/service-construction.test.mjs`
adds actual-solid construction checks.

Baseline: `45d7894291421ddc80daaa71b5741067740a267a`.
Reviewed runtime SHA-256:
`c519fc19c63247150bb45d823c668e0290c8f0d741dc04edf906940e25e6d814`.
Final source tree:
`9b63c1065791ac1d5ffedc251ab0533c6523f48437752919fb362e32846c95e3`.
The critic independently checked all 44 runtime hashes against the working tree,
all three verified source-file hashes, all four retained verification-log hashes,
and all 20 JPEG hashes, encodings, dimensions and source-tree bindings. All six
finite before/after pairs match pose, dimensions, layout, DPR and time.
See [source manifest](source-manifest.json) and
[capture metadata](browser-captures.json).

## Rubric

| Criterion | Score | Reason |
| --- | ---: | --- |
| Visual hierarchy, silhouette and negative space | 24/25 | Retains the strong wing/dish arrangement and improves supporting forms; bearings remain conspicuous in close views. |
| Material balance and cohesion with completed spacecraft | 14/15 | Blue fields and ivory reflector lead, with restrained bronze; the repeated bright bearing rings are still assertive. |
| Construction readability and restrained detail | 9/10 | Booms, roots, laminate and radio cradle explain their assembly; rear rails remain subtle at ordinary viewing scale. |
| Fulfillment and protection of neighboring scopes | 15/15 | Runtime scope is confined to the service block; protected geometry, room-camera references and route metadata compare exactly. |
| Geometric correctness and maintainable implementation | 15/15 | Real-solid/instance tests, source audit and full isolated checks support the final construction; no source defect found. |
| Interaction and responsive presentation | 5/5 | Passive hardware stays inert; ordinary navigation and outboard cabin views remain intact in both orientations. |
| Rendering implications and evidence quality | 13/15 | Matching finite evidence, explicit costs and exact-source checks are strong; live portrait has final-state evidence rather than a matched live baseline, and native/device rendering remains unverified. |
| **Total** | **95/100** | **Complete within the stated scope and limitations.** |

Visual design carries half the available score. Passing tests cannot compensate
for an unsuccessful silhouette or composition.

## Design findings

The baseline already had a strong arrangement: two blue wings balance a compact
service core, with an offset ivory dish. Preserving that arrangement is justified.
The former round booms and upright cuffs did not clearly explain their hinge
axes; large bronze corner caps and the nozzle stripe spread emphasis across too
many small surfaces. The wing backs were unarticulated slabs.

The final box booms, transverse bearings and seated roots establish a legible
support path without adding another equipment cluster. Carbon corner shoes and
satin perimeter rails let the photovoltaic faces remain the large color fields.
The clean satin nozzle and darker jacket make the central assembly quieter.
Sparse rear rails and the center raceway explain panel construction without
turning the reverse side into a display or decorative grille.

The dish keeps its thin rim, clear concavity and three delicate stays. Its new
clevis and horn explain support more convincingly than the baseline rods and
bronze ball. The final recessed back hub is important: only the small satin feed
seat remains visible inside the bowl, preserving the reflector's visual calm.

At actual 390×844 portrait dimensions, the blue panel edges remain readable. The
bearing faces are assertive but subordinate to the wings and dish. Their spacing
along two booms reads as mechanical joints; no comparable face-like service-box
cue was observed. The live portrait presents the assembly as a clear spacecraft
end rather than a cluster of controls. The completed opposite docking assembly
retains a compatible ivory/carbon/alloy hierarchy with small bronze handling parts.

No visual blocker or required runtime refinement remains from the views reviewed.
The bearing rings remain deliberately stylized and prominent, and the rear rails
are low contrast against the panel backs; neither justifies additional decoration
or a broader material change.

## Revision record

1. Initial critique supported retaining the main arrangement and improving its
   support paths, while warning against treating additional hardware as quality.
2. The first rendered draft exposed a broad black hub inside the dish. The critic
   identified its competing concentric target as a regression and requested a
   recessed rear hub with a small connected feed seat.
3. The final core, support, oblique and portrait images resolve that finding.
   The final source remains connected through hub, seat, stem and horn. Final
   images replace the intermediate draft as acceptance evidence.
4. Final documentation initially said all wing X/Y extrema remained. The critic
   requested a distinction between unchanged panel perimeters/outermost extents
   and the root tang's changed inward subgroup bound. The README and ledger now
   make that distinction. This minor documentation finding is resolved.

## Correctness, cost and verification

The [construction audit](construction-audit.json) records 8/8 focused cases and
exact protected subgroup inventories, materials, transforms and geometry in both
layouts. It separates prior contact defects from deliberate design changes: the
old solar root rods/collars and bronze nozzle ring were connected. The pressure
housing, nozzle bell, reflector bowl, wing poses and photovoltaic pattern remain.
The completed docking source prefix is unchanged.

Room framing and route/door metadata compare exactly. Automatic overview fitting
does change slightly because authored service bounds changed: the nine-size,
two-layout harness records at most 0.03225% distance change and 0.632 px movement
of unchanged aperture corners. Its sampled coverage stays inside the existing
half-pixel tolerance. The documentation accurately distinguishes this from exact
overview equality, and no camera/model code was changed to improve the design.

Per layout, deterministic service inventory increases from 31,952 to 48,196
triangle inputs (+16,244), from 517,336 to 961,584 geometry-array bytes (+444,248),
and from 17 to 18 visible mesh candidates. Whole-model candidates increase from
518 to 519. The additions serve visible supports and panel construction. They
are an accepted design cost, not evidence of improved rendering performance;
candidate counts are not actual renderer draws, and array bytes are not measured
process/GPU memory.

The [isolated verification record](verification-checks.json) and matching retained
[test](checks/test.log), [typecheck](checks/typecheck.log),
[build](checks/build.log) and [lint](checks/lint.log) logs confirm **576/576 tests**,
typecheck, production build including geometry verification, and affected lint
pass. No failed, cancelled or skipped case is recorded. The reported build
warnings concern module registration deprecation, large chunks and route
classification, not a failing check. The critic did not rerun mutating tests;
the exact-source isolated record is the verification evidence.

The [interaction record](live-interaction-check.json) records an inert dish click,
overview → Archive → Contact → overview navigation, no submitted forms and an
empty browser-error sample. All four added live outboard-cabin captures were
inspected: no new service intrusion or changed content/framing was observed.
Cleanup is recorded complete: isolated fixture/server removed, review preview
stopped, browser tabs closed and viewport overrides reset; main port 3000 remains
HTTP 200. README, context and ledger accurately describe the final scope and costs.

## Evidence and limits

The critic inspected actual baseline and final JPEGs: front, core, hinge, rear,
wide oblique, compact portrait oblique and live landscape; also final dish support
and live portrait, plus Archive and Contact in both orientations. Useful
comparisons are the [hinge before](before-hinge-wide.jpg)
and [after](after-hinge-wide.jpg), [core before](before-core-wide.jpg) and
[after](after-core-wide.jpg), [compact before](before-oblique-compact-portrait.jpg)
and [after](after-oblique-compact-portrait.jpg), plus the
[final live portrait](after-live-portrait.jpg).

Recorded rendering uses built-in Chromium 153, DPR 1, 1440×900 landscape and
390×844 portrait. Finite inspection renders omit GTAO, orbital environment, live
screen interfaces and navigation. Live landscape includes GTAO; live portrait
does not. Live portrait uses the wide spacecraft model with portrait camera roll;
the finite compact image tests the separate compact layout. The critic inspected
saved evidence rather than independently operating the browser. No native Safari,
physical-device, thermal, GPU-time or battery test is claimed.

The new tests inspect retained source solids and real instances before batching,
including curved-shell contacts, both boom chains, panel laminate attachment,
nozzle closure and reflector winding. Their contact checks establish modeled
attachment, not load certification, real articulation or a complete collision
proof. The overview coverage harness samples a bounded set of states rather than
proving every continuous camera pose. No new articulation, tracking mechanism or
visitor control is claimed. No further runtime change is requested by this review.
