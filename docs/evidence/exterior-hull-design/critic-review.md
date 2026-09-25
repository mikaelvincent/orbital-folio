# Independent critic — Stage 09 exterior hull and access

Final independent score: **96/100**. The rendered design, source, construction,
documentation and verification gates are complete. No unresolved blocker,
required runtime refinement or failing required check remains. The initial
test failure and its narrow resolution are preserved below. Owner feedback
continues to take precedence over this score.

## Scope and identity

The review covers exterior pressure surfaces and the matching roof/keel access
routes. Completed docking, service assembly, rooms, internal ladder, visitor
content and navigation are protected. The runtime diff changes only
`features/spacecraft/equipment/exterior-service-equipment.ts`; preserving the
already coherent smooth shell is a deliberate design decision, not an omission.

Baseline: `60cfce84a208ae71f1bfde8a14d21e19a42c5ba4`.
Final runtime SHA-256:
`ffa56d871a880dfba3efab63a6b6da659b4eda4aabbdba3ceb5ba05fc323c788`.
Final runtime tree:
`922956c9d1fcc8c8f4192c4b7df074ebdebc5c8bcdeead227725ebc8930d23ac`.
The critic independently matched all 44 runtime source hashes and the four
finite before/after poses, dimensions, layouts, DPR and time against the current
[manifest](source-manifest.json) and [capture metadata](browser-captures.json).

## Rubric

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Silhouette, composition and useful negative space | 24/25 | Open routes strengthen the envelope without filling it. |
| Material hierarchy and cohesion | 14/15 | Carbon/alloy distinction is clear; repeated bright mount shoes remain conspicuous at close range. |
| Construction readability and detail restraint | 9/10 | Treads, webs and eyes have legible functions; smallest fasteners necessarily recede at normal scale. |
| Fulfillment and protection of completed scopes | 15/15 | Source and final protected-state audit support the limited scope and retained shell/routes. |
| Geometric correctness and implementation | 15/15 | Actual-solid checks and the complete recovery suite pass; the clearance exception preserves meaningful guards. |
| Interaction and responsive presentation | 5/5 | Final room/overview evidence and recorded passive/navigation behavior show no regression. |
| Rendering cost and evidence quality | 14/15 | Costs and exact-source verification are explicit; held drag extremes and native/device rendering remain outside the visual evidence. |
| **Total** | **96/100** | **Complete within the stated scope and limitations.** |

Visual design carries 50% of the score and earns 47/50. Automated success does
not substitute for this visual assessment.

## Design assessment

The baseline shell, continuous rails and shoulder turn already formed a coherent
silhouette. Its thin cylindrical rung sleeves and small disc/post mounts looked
underdeveloped beside the completed cabin and service hardware. The draft chose
the appropriate scale of intervention: improve the working assembly instead of
covering the quiet rear shell with more equipment or panel graphics.

Broad rounded carbon treads now read clearly against the ivory hull and provide
a recognizable bearing surface. Visible alloy crossbar ends keep them connected
to the rails. The retained open bays, rail continuity and rung cadence prevent
the route from becoming a solid decorative strip. In the final shoulder view,
tapered support webs and layered shoes communicate a firmer attachment than the
former slender posts. Their rounded edges remain compatible with the shell.

The complete underside has the same construction language and no conspicuous
orientation or shading discontinuity. Final rear and compact views preserve the
smooth pressure envelope. In live landscape and rolled portrait, the larger
treads and mounting feet remain secondary to the cabin openings, docking and
solar assembly. The intentionally empty rear surface still provides useful
contrast to the detailed access routes; no additional filler is justified.

The three bronze tether stations per route give a sparse functional rhythm.
Their rings are recognizable as open attachment eyes, not indicators or visitor
controls. The final close shoulder view shows the corrected open bore; the source
places each neck at the near rim instead of the center and locates each eye on a
supported station. The final outward offset avoids the draft's neighboring-collar
obstruction. No required visual refinement remains.

## Revision and findings record

1. Initial review supported the wider treads, tapered webs and deliberate shell
   restraint. It requested attention to broad-shoe seating over the shoulder,
   usable tread clearance, mirrored underside construction and the final eye bore.
2. The latest source and final roof/shoulder/underside views resolve those visual
   concerns. New actual-solid tests address the support chain, sampled shoe-back
   seating, tread/hull clearance and a finite 0.07-wide tether passage. The final
   audit substantiates 6/6 passing cases and protected-state comparisons.
3. The critic's image-header check found all 23 `.png` files contained JPEG data,
   with correct actual dimensions. The files are now named `.jpg` and the README
   and metadata are updated without changing image bytes. The critic rechecked
   all 23 names and JPEG encodings. This documentation finding is resolved.
4. The initial isolated suite passed 581/582; only the existing blanket
   0.16-unit front-clearance guard failed. The critic independently reviewed its
   purpose and recommended retaining the open-eye design with a narrow test
   exception. Measured eye max-Z 0.978 remains 0.143 behind the actual throat at
   1.121 and 0.042 behind the existing 1.02 access limit. The revised test reserves
   at least 0.12 for eyes only, preserves 0.16 for every other source part, and
   retains the global access limit. This is a documented design-margin revision,
   not evidence that the initial run passed. Runtime and captured images did not
   change. The final complete recovery run passes 582/582, resolving this gate.

## Audit, construction and rendering implications

The [construction audit](construction-audit.json) matches the frozen runtime,
new construction-test hash and revised existing-test hash. All protected groups,
pressure skin, retained rails/spars/sockets/clamps, route centerlines, rung
cadence, mounting stations and shared room references compare exactly. Tether
locations and replacement support/tread geometry are intentional exceptions.
The old tether eyes were attached; their center bores were obstructed. The audit
does not falsely describe every replaced part as floating.

The six recorded actual-solid tests cover both layouts. They report 320 wide and
256 compact shoe-back samples seated shallowly into the real shell, with about
0.165 minimum tread-to-hull clearance. Each eye has nine unobstructed finite
axial rays across a 0.07-wide central passage. These checks directly address the
preliminary critic's attachment and use-clearance concerns without claiming a
continuous proof or physical certification.

Wide access inventory changes by +5,104 triangle inputs and +2,922,656 geometry
array bytes; compact by +3,584 triangles and +2,260,416 bytes. Three access
material batches and 519 visible-model mesh candidates remain. Both layout
variants are retained, giving +8,688 triangles and +5,183,072 array bytes in the
combined retained scene graph. The array growth is substantial relative to the
triangle increase and is explicitly disclosed as an authored geometry cost.
It is not a claim about actual renderer time, process/GPU memory or power.

Whole visible-scene bounds remain exact, but the relocated shoulder eye expands
the chassis subgroup's coarse minimum-X bound by about 0.047 units. The existing
nine-size harness records a 0.0387–0.2815% landscape overview-distance increase;
tested portrait distances and targets remain exact. Finite coverage remains
within the existing 0.5-pixel tolerance. The README and ledger correctly explain
this automatic refit instead of claiming exact equality of every support point.
No camera code or artificial bound was introduced to accommodate the design.

The [interaction record](live-interaction-check.json) records ordinary room
navigation and the Projects/About ladder crossing in both orientations, an inert
access-rail click, drag return to neutral, and no browser errors. No forms were
submitted. The critic independently verified all 23 JPEG hashes, encodings,
actual dimensions and before/after source-tree bindings, all three final checked
source-file hashes, the audit's manifest hash, all 44 runtime hashes and all six
retained verification-log hashes.

## Completed verification

The [verification record](verification-checks.json) preserves separate initial
and recovery snapshots. The [initial log](checks/test-initial-failure.log) reports
581/582; the [final full-suite log](checks/test.log) reports **582/582**, with no
failed, cancelled or skipped case. The complete final run includes the two test
files and unchanged rendered runtime. The critic reviewed the records and hashes
rather than rerunning mutating tests in the shared workspace.

[Typecheck](checks/typecheck.log) and the [production build](checks/build.log),
including indexed-cylinder geometry verification, passed against the final
unchanged runtime. The record accurately notes their timing before the final
JavaScript-test correction. Final [three-file lint](checks/lint.log) and the
[corrected-test format check](checks/format.log) pass. Build warnings concern
module-registration deprecation, large chunks and route classification; none is
a failed required check.

Verification used the disposable source checkout and explicit loopback port 3003
with fresh test-only D1/R2/secrets. Recovery reused only that disposable state.
Cleanup is recorded complete: fixture removed, port 3003 closed and main port
3000 HTTP 200. No private environment or main store was copied. Final README,
context and ledger preserve the design cost, narrow test exception and small
automatic overview refit without claiming an optimization or camera rewrite.

## Evidence and limitations

The critic viewed all six baseline captures and all 17 final captures: matched
roof, shoulder, underside and rear; final compact geometry; live default overview
in both orientations; two drag-release states; and every cabin in landscape and
portrait. No intrusion or changed room composition was observed in the eight
room captures.

Useful comparisons are the [roof before](before-roof.jpg) and
[after](after-roof.jpg), [shoulder before](before-shoulder.jpg) and
[after](after-shoulder.jpg), [underside before](before-underside.jpg) and
[after](after-underside.jpg), and [final portrait overview](after-live-portrait.jpg).

These are hidden built-in Chromium 153 captures at actual 1440×900 or 390×844,
DPR 1 and matching drawing buffers. The finite compact view is 1440×900 and tests
the separate compact geometry; live portrait uses the wide model and production
camera roll. Finite pairs use time zero, FOV 38°, fixed lighting and shadows,
and omit GTAO, Earth/sky, live applications and navigation. Live landscape has
GTAO; portrait does not. Live animation and hover are not locked, so the finite
pairs provide the controlled geometry comparisons.

The drag images are released states, not captures held at maximum drag. Neither
those images nor finite inspection angles prove every continuous camera state.
The critic inspected saved browser evidence rather than operating the browser.
Native Safari, physical mobile devices, timed CPU/GPU rendering, thermal behavior,
battery use and actual process/GPU memory are unverified. Geometric contact and
finite clearance probes do not certify real EVA hardware or every point of a
continuous surface. No optimization or physical certification is claimed.

The four finite pairs are controlled before/after comparisons. The compact view
and room captures are final-state checks; live before/after time and hover are
not identical. These are explicit limits on evidence, not unreported passes.
No further runtime revision is requested by this review.
