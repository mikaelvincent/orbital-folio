# Stage 08 — Service assembly, communications and solar wings

25 September 2026. Baseline `45d7894291421ddc80daaa71b5741067740a267a`.

The existing arrangement was strong: two blue wings around a compact service
body, with an offset ivory dish. Its weak points were mechanical and material
hierarchy. Round poles and upright cuffs did not explain pivot axes, panel backs
were plain slabs, and repeated bronze corners, jacket panels and a nozzle stripe
competed with the principal forms. This pass keeps the silhouette and open spaces
while making the support paths legible.

## Implemented design

- Carbon box-section booms, hull saddles, root flanges and secondary ties carry
  matching transverse bearings. Small bronze pins identify the captive joints.
- The blue photovoltaic fields retain their positions and pattern. A continuous
  bonding sheet closes the former cell/chassis gap; recessed conductors now seat
  on that sheet. Satin frames, carbon corner shoes, rear rails, crossmembers,
  root tangs and a central power raceway make each panel a supported assembly.
- The reflector retains its profile, pose and thin feed stays. Its two-arm
  cradle reaches a real elevation axle and back hub. A small satin feed seat
  supports the stem and cylindrical feed horn, with one bronze cap.
- The existing pressure housing and nozzle silhouette remain. The dark throat
  now reaches the bell. Carbon replaces alternating bronze jacket panels, and
  the inner bronze stripe is removed to quiet the concentric composition.
  The small whip antenna foot is seated on the housing.

The initial draft exposed a broad black disc inside the dish. Both rendered
inspection and the independent critic found that it competed with the reflector
and bearing faces. The final hub is behind the bowl, with only the smaller satin
seat visible. No additional equipment or decoration was needed.

The baseline audit distinguished real defects from appearance: the old solar
root/collar/hinge chains and bronze nozzle ring did have solid contact. The
defects were the cell/backing and grid gaps, the unsupported start of the second
dish brace and feed stem, and the detached dark nozzle throat. Replacing the
booms and bronze treatments is an authored design choice, not a claim that all
old hardware floated.

## Before and after

| View                              | Before                                        | Final                                       |
| --------------------------------- | --------------------------------------------- | ------------------------------------------- |
| Service front, 1440×900           | [Before](before-front-wide.jpg)               | [After](after-front-wide.jpg)               |
| Service oblique, 1440×900         | [Before](before-oblique-wide.jpg)             | [After](after-oblique-wide.jpg)             |
| Core and reflector, 1440×900      | [Before](before-core-wide.jpg)                | [After](after-core-wide.jpg)                |
| Solar hinge, 1440×900             | [Before](before-hinge-wide.jpg)               | [After](after-hinge-wide.jpg)               |
| Rear structure, 1440×900          | [Before](before-rear-wide.jpg)                | [After](after-rear-wide.jpg)                |
| Compact geometry, 390×844         | [Before](before-oblique-compact-portrait.jpg) | [After](after-oblique-compact-portrait.jpg) |
| Live landscape overview, 1440×900 | [Before](before-live-landscape.jpg)           | [After](after-live-landscape.jpg)           |

Additional evidence: [dish mounting oblique](after-dish-support-wide.jpg) and
[actual rolled portrait overview](after-live-portrait.jpg). The compact fixture
is an alternative model layout; the live portrait uses wide geometry with the
ordinary 90° camera roll.

Outboard cabin interfaces were inspected in live [Archive landscape](after-live-archive-landscape.jpg),
[Archive portrait](after-live-archive-portrait.jpg), [Contact landscape](after-live-contact-landscape.jpg)
and [Contact portrait](after-live-contact-portrait.jpg). Navigation from overview
into Archive, onward to Contact and back to overview completes normally. The
[interaction record](live-interaction-check.json) records the passive hardware
check and browser error sample; no messages or forms were submitted.

All images use the hidden built-in **Chromium 153** browser. They are captured at
the stated actual CSS viewport dimensions, browser/render DPR 1, and matching
drawing-buffer dimensions, without image scaling. Exact poses, dimensions,
renderer state and image hashes are recorded in
[browser-captures.json](browser-captures.json).

Finite views use production model sources at time zero, FOV 38°, fixed lights,
RoomEnvironment PMREM intensity 0.24 and requested PCF shadows. They omit GTAO,
Earth/sky, live screen applications and navigation. Their extra inspection poses
are developer-only; visitor camera code is unchanged. Live views retain published
content, Earth/sky and shadows, with GTAO in landscape and no GTAO in portrait.
Live animation time and hover are not locked, so finite pairs are the controlled
geometry comparisons. No contact messages or persisted content were changed.

## Scope, construction and rendering cost

Only the AFT service block in `docking-service-assemblies.ts` changes at runtime.
The preceding completed docking implementation is byte-identical. The
[source manifest](source-manifest.json) identifies the final runtime and baseline.
The new construction tests exercise actual source solids, including each
instanced cell/conductor and the curved bowl/pressure housing, rather than proxy
boxes or exact decorative counts.

The [construction audit](construction-audit.json) records **8/8 passing checks**
against the final source. All protected groups, cabin furniture, architectural references,
room-camera inputs and navigation/door metadata remain exact. Panel perimeters,
poses and outermost X/Y extents remain; each new root tang changes its solar
subgroup's inward Y bound. Changed hardware naturally changes its coarse overview support
bounds: the existing nine-size harness measures at most 0.03225% distance change
and 0.632 px movement of unchanged cabin aperture corners. No camera, renderer,
Earth or spacecraft-model code changes are used to improve this assembly.

Final deterministic service inventory is **31,952→48,196 triangle inputs
(+16,244)**, **517,336→961,584 geometry-array bytes (+444,248)**, and **17→18 mesh
candidates**. The added support geometry is an art cost. These are not measured
rendering times, process/GPU memory, heat or battery results. No held performance
candidate is included. The audit distinguishes scene-graph candidates from
actual view-dependent renderer draws and documents the inventory method.

## Verification, limitations and handoff

The [isolated verification record](verification-checks.json) and retained logs
confirm **576/576 tests**, typecheck, production build/geometry check and affected
lint pass on the exact final source. Build warnings concern Node module
registration deprecation, large chunks and Vinext route classification; no check
failed. Formatting, local evidence links and `git diff --check` also pass.
The [independent review](critic-review.md) gives visual design half its rubric.
Final result: **95/100**, with no unresolved blockers or required revisions.

The test fixture uses a source-only checkout, fresh D1/R2 state, test-only secrets and
explicit `TEST_BASE_URL=http://127.0.0.1:3003`; main port 3000 and its store are
preserved. No private environment or main state was copied.

The source-only baseline, isolated verification checkout/state and temporary
preview server are cleaned up. Hidden review tabs are closed and viewport
overrides reset. The main site remains available at localhost:3000 (HTTP 200).

Native Safari, physical mobile devices and timed rendering measurements are not
covered. Solar articulation and dish tracking remain static authored hardware;
there is no new public control or simulated operation. Finite renders omit the
effects stated above.

For Stage 09, preserve the completed service end's paired construction, blue
cells, quiet carbon bodies, visible alloy joints and small bronze retainers.
General hull/access equipment remains its own scope; no additional equipment is
needed to fill the intentional gaps around this assembly.
