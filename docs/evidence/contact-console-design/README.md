# Stage 04 — Contact communications console

24 September 2026. Baseline `a38ab355358d8bc569b9cb3f785f4697c2493807`
contains approved Stages 01–03. This pass owns Contact's physical equipment only.

## Design and final result

The original console had a heavy rounded front edge and broad bronze handrail
competing with the keyboard. The low social displays felt separate from the main
screen, ten passive bezel buttons looked actionable, and a small floor pedestal
made headset storage feel detached from its workstation. Existing radios,
drawers and cabling already explained the room's purpose; additional equipment
was unnecessary.

The final assembly keeps its footprint, working height and central screen scale:

- A thinner rounded carbon shell and captured carbon handhold make the keyboard
  and screens the focal point. Small alloy collars retain the handle; the service
  enclosure is raised to meet the thinner underside.
- Both social displays align with the main screen's lower edge and turn inward
  slightly more. Their fitted wall supports and local service raceways follow
  their positions. The screen art and available links are unchanged.
- Seated extraction grips replace the main display's passive button rows, echoing
  the archive's handling details. The main glass, application anchor and keyboard
  geometry/animation remain unchanged.
- The headset hangs from a padded under-console saddle with a captured shoe,
  short alloy neck and plugged return lead. Removing its floor pedestal clears
  the deck and ties audio storage to the place it is used.
- The retained microphone bends outboard to clear the social screen at oblique
  angles. Its connector gasket, deck restraint sockets, radio selectors and
  connector-bank guard now meet their actual supporting surfaces.

Architecture, archive/workshop furniture, shared camera fitting and navigation
remain protected. No contact-form, wallpaper, reading-view or content changes
were made. The scene keeps its current lights/material family; no light is added.

## Before and after

| View | Before | Final |
| --- | --- | --- |
| Live landscape, 1440×900 | [Before](before-live-landscape.png) | [After](after-live-landscape.png) |
| Live portrait, 390×844 | [Before](before-live-portrait.png) | [After](after-live-portrait.png) |
| Fixed wide oblique, 1440×900 | [Before](before-oblique-wide.png) | [After](after-oblique-wide.png) |
| Fixed compact oblique, 390×844 | [Before](before-oblique-compact.png) | [After](after-oblique-compact.png) |

Additional final evidence: [landscape application](after-application-landscape.png),
[portrait application](after-application-portrait.png),
[landscape overview](after-overview-landscape.png),
[portrait overview](after-overview-portrait.png),
[settled drag release](after-drag-release.png),
[approved archive reference](reference-archive.png) and
[approved workshop reference](reference-workshop.png).

All images were inspected in **hidden built-in Chromium 153**, not native Safari.
CSS viewports and PNG/drawing-buffer sizes are 1440×900 or 390×844, unscaled, at
browser/render DPR 1. Live views use the normal application and current public
content on the preserved `http://localhost:3000` server. Both live orientations
use the wide model; portrait quality disables GTAO while landscape enables it.
Shadows remain enabled. Live orbital phases differ between captures.

The reusable `scripts/benchmarks/spacecraft-polish-preview.mjs` fixture compares
the baseline and final source at time 0 with the same camera per pair, FOV 38,
RoomEnvironment intensity 0.24, fixed lights and requested PCF shadows. It omits
GTAO, Earth/sky, navigation and live applications. Its social displays are empty
standby hardware. The compact portrait oblique intentionally crops/hides the
right social screen at the unchanged angle; it is not evidence that all three
screens are visible from every angle. Live frontal portrait and wide oblique
provide complementary coverage. The [source manifest](source-manifest.json)
records all 43 transitive source hashes, fixture and bundle hashes;
[capture metadata](browser-captures.json) records poses, effects, dimensions,
source version and PNG hashes. Final affected captures follow the microphone
neck and connector refinement.

## Verification and refinement

All **544 tests passed** in a disposable source-only checkout with fresh test-only
D1/R2, test secrets, an isolated Vite cache and explicit
`TEST_BASE_URL=http://127.0.0.1:3003`. No private environment or main store was
copied. Typecheck, production build/geometry check, affected lint and formatting
also passed. [Exact source hashes, commands, logs and cleanup](verification-checks.json)
are retained. Build warnings concern Node DEP0205, chunk size and Vinext's route
static analysis; there were no failing checks.

Seven new tests examine actual rounded solids, deck/console/wall load paths,
hanger/saddle/plug/cable contact, cabin clearance and screen sightlines at sampled
wide/compact room-view extremes. Existing tests retain keyboard/Caps Lock,
application clearance, social availability and dismissal coverage. Focused
verification initially exposed a small microphone gasket gap and a neck overlap
on the left social screen at an oblique extreme. Both were corrected; the final
33 focused Contact checks and full suite pass.

[Browser smoke checks](browser-smoke.json) cover main-screen click, keyboard
entry, both form choices, close/Escape/exposed-wall dismissal, drag/release,
Reading view, both overviews and neighboring approved rooms. Social destinations
were checked without opening external sites. No form fields were entered, no
send/call action was invoked, and no stored inquiry was altered. The call branch
retains its explicit notice that requests are not sent. Final live console error
sampling returned no entries; this is not exhaustive historical logging.

The independent critic scored the final source and matching evidence **94/100**,
with no unresolved blockers. The [critic report](critic-review.md) preserves the
design-weighted rubric, resolved evidence findings and verification limits.

## Rendering implications

[Structural inventory](structural-costs.json) counts the real batched/instanced
model in Node, excluding canvas text and frustum culling. Contact furniture in
both layouts changes from **35 to 32 mesh/material submission candidates**,
**66,854 to 60,406 triangle inputs**, **25 to 22 unique geometries**, and
**1,775,916 to 1,586,348 geometry-array bytes** (−6,448 triangles,
−189,568 bytes / approximately 0.1808 MiB). Compact Contact raceway wall-fit
clipping adds a further −8 triangles/−816 bytes to the whole-scene difference.
Radio selector/guard seating changes tiny outboard bounds but no counts.

The four pressure structures, other room furniture, other cabin utilities,
archive outboard assembly, ladder, docking, service and chassis inventories are
unchanged. Whole-scene bounds, room anchors/apertures, shared `roomCameraFrame`
and overview fitting metadata match. Contact's diagnostic `cabin-content` corner
points change with its furniture bounds; they do not drive the shared camera fit.
Supplemental framing snapshots were regenerated with immediate deep copies after
the critic found wide metadata references had been mutated by the later compact
layout switch. This corrected the evidence, not application source.

The finite oblique renderer records 815→809 calls and 1,893,204→1,880,308 triangle
inputs in wide; compact records 802→796 calls and 1,812,824→1,799,912. These include
requested shadow generation and use different accounting from structural counts.
Geometry-array bytes are not measured GPU/process memory. No startup, steady
CPU/GPU timing, heat, power or battery gain is claimed. This is a new authored
baseline; no held performance-ledger candidate was implemented.

Native Safari, a physical phone/virtual keyboard and a reduced-motion browser
override were not checked. Their existing automated behavior coverage remains
passing. The isolated server/state and finite preview were removed; the hidden
review tab was closed and viewport override reset. Main localhost:3000 remains
HTTP 200.

## Stage 05 handoff

Contact's physical console is complete. Carry forward fitted mounting shoes,
thin graphite joints, carbon handling surfaces, small alloy collars and restrained
bronze releases. Supports and cables should meet real geometry and leave the
working plane and knee space clear. The three-screen communications arrangement,
unchanged keyboard and underslung audio storage are purposeful room-specific
choices. About can retain its personal objects and warmer materials. Use the
final room/oblique and archive/workshop references above; contact UI/artwork
remain reserved for Stage 13. Native-device keyboard verification is a concrete
future interface check, not a Stage 04 implementation change.
