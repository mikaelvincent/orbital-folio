# Independent critic — Stage 04 Contact communications console

24 September 2026. Reviewer: independent `independent_critic` agent, separate from
implementation and automated verification. **94/100; no unresolved blockers.**
This verdict covers the final source, matching rendered evidence and completed
checks against approved Stage 01–03 baseline `a38ab355`.

## Rubric

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Visual design, proportions and focal hierarchy | 36/40 | The thinner console and dark captured handhold stop competing with the keyboard and main display. Raised, inward-facing social screens form a more deliberate three-screen arrangement. The clear floor and space below the header remain useful breathing room. Retained radios provide a convincing secondary equipment zone, although their small details and the audio hanger are naturally subdued at portrait room scale. |
| Cohesion, fulfillment and scope | 20/20 | Carbon handling surfaces, alloy collars and fitted joints continue the archive/workshop language without duplicating their silhouettes. Shared architecture, approved rooms, main glass, keyboard, artwork, content and camera/navigation remain protected. Changes to the common composition and outboard builders are limited to Contact's placement and physical seating. |
| Construction, correctness and usability | 19/20 | The console has connected floor and rear-wall supports; the suspended headset has a shoe, neck, padded saddle and plugged return lead. The microphone clears the social glass. Extraction grips remove misleading passive button rows. Actual-solid tests and sampled sightlines support these claims; the application and semantic targets remain usable in the supplied live evidence. |
| Evidence and verification | 14/15 | Fifteen source-identified images cover matched comparisons, both live orientations, applications, overview and approved neighbors. The final full suite and required checks pass. The critic's metadata finding was corrected and the compact oblique limitation is explicit. Native Safari/device and reduced-motion browser checks remain unavailable. |
| Rendering implications and maintainability | 5/5 | Local builders contain the design changes, and new tests address physical failure modes rather than an arbitrary whole-room geometry budget. Deterministic structural and browser counts are distinguished from unmeasured timing, memory and power effects. |
| **Total** | **94/100** | **Ready to complete Stage 04.** |

## Review performed

I reviewed the Stage 04 scope and protected decisions, repository instructions,
all four runtime changes and both test changes, current project context, ledger
entry 54, the README, manifests, inventory, browser smoke record and verification
logs. I inspected all 15 PNGs with `view_image`: live landscape/portrait before
and after, matched wide/compact obliques, both final application views, both
overviews, settled drag release, and archive/workshop references.

The main improvement is the removal of visual weight from the console's front.
Its former rounded lip, bulky saddles and bronze rail read as another focal
object. The new edge lets the conventional keyboard and invitation screen lead.
The slightly higher side displays connect more convincingly to that center;
their unchanged graphics remain readable and their mounting heels stay visible.
The main display grips look like handling hardware rather than inactive choices.

Audio storage now belongs to the workstation: the headset hangs outside the
knee space instead of occupying a separate floor pedestal, and its cable returns
to the hanger. The microphone keeps a distinct silhouette beside the left screen.
The resulting asymmetric audio placement is justified by use. Existing drawers,
radio equipment and cable paths explain the room without additional filler.
No new clipping, floating part, glass obstruction or application misregistration
was found in the reviewed images.

I independently matched all 43 current runtime hashes in both the render
manifest and structural inventory, the reusable fixture hash, all 15 PNG hashes
and their before/after source-tree identifiers. All six verification-source
hashes and five normalized check-log hashes also match current files. The source
remained unchanged during final review.

The [isolated verification record](verification-checks.json) and logs report
**544 passed, zero failed, skipped or cancelled**. Typecheck, production build
including geometry checks, affected lint and formatting passed. I read those
results and verified their hashes; I did not rerun the suite. The record identifies
the disposable source-only checkout, fresh test-only D1/R2 and secrets, explicit
test URL, cleanup and preservation of the main server/store.

The seven new construction tests inspect actual rounded solids and complete
support chains, deck contact, monitor separation, grip/socket seating, audio
attachments and sampled usable-glass sightlines in both layouts. Updating the
old floor-dock assumption to assert headset/cord clearance is appropriate for the
new hanger. Existing keyboard, application and social-link coverage remains.

## Findings and resolution

1. **Resolved — mutable layout metadata in the evidence.** The first structural
   record labeled compact room anchors/apertures as wide because the collector
   retained references through a later layout switch. The implementing agent
   regenerated the snapshots with immediate deep copies. I checked that the final
   wide Contact anchor is approximately `2.087` and that both layouts now report
   their own framing. This was an evidence defect, not a runtime change.
2. **Resolved — distinguish content bounds from camera fitting.** The original
   broad `sharedFramingIdentical:false` flag included diagnostic furniture corner
   points. The final record explicitly separates those changed Contact points
   from unchanged room anchors/apertures, `roomCameraFrame`, overview bounds and
   fitting metadata. The README and ledger accurately explain this distinction
   and the separate compact raceway inventory delta.
3. **Resolved — bound the compact oblique claim.** The fixed compact angle hides
   or crops the right social display in both versions. This is now disclosed;
   it is not presented as proof that all screens are visible from every angle.
   Live frontal portrait and the wide comparison provide complementary evidence.

No runtime or aesthetic correction was requested by this critic. The earlier
microphone connector gap and oblique neck obstruction were disclosed as findings
from implementation verification. Final source, affected captures and the full
suite include their corrections. The README, context and ledger accurately
describe the final physical scope and actual completed checks.

Contact furniture changes by **−6,448 triangle inputs, −3 mesh/material submission
candidates and −189,568 geometry-array bytes** in each layout. Compact Contact
raceway clipping contributes a further −8 triangles/−816 bytes. The tiny outboard
selector/guard seating changes bounds without changing counts. Protected room
furniture and architectural/overview framing remain unchanged. These measured
inventories do not establish frame-rate, GPU-memory, thermal or battery gains.

## Limits and Stage 05 handoff

This critic inspected saved hidden-browser **Chromium 153** evidence, rather
than operating a separate browser. Captures use actual unscaled **1440×900** or
**390×844** viewports and drawing buffers at DPR 1. Both live orientations use
the wide model; portrait disables GTAO. Finite obliques exercise wide and compact
models at matched time/pose with RoomEnvironment intensity 0.24 and requested
PCF shadows, omitting GTAO, orbital background, live applications and navigation.
Their standby social screens differ from the populated live displays. Live
orbital phases vary. A settled drag screenshot does not establish the entire
motion trajectory.

No native Safari, physical phone/virtual keyboard, reduced-motion browser override
or rested rendering-performance measurement was performed. The smoke record
reports navigation, form-choice/dismissal and read-only social inspection without
entering form fields, invoking send/call actions or altering inquiries. These
limits are explicit and do not conceal a failing required check.

Stage 05 should carry forward seated joints, quiet carbon handling surfaces,
small alloy/bronze retainers, honest cable terminations and intentional working
clearance. About's personal objects, warmer materials and different silhouette
remain appropriate exceptions. Contact's three-screen arrangement, full keyboard
and underslung audio storage are room-specific decisions. Use the final room,
oblique and neighbor images linked in the [evidence index](README.md); native
device keyboard verification remains a later interface check, not a blocker to
this completed physical design scope.
