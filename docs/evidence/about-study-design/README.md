# Stage 05 — About personal study

24 September 2026. Baseline `f62b0e73379f2fd7404d03b18896e40cd070414b`
contains approved Stages 01–04. This pass owns the study's physical contents.

## Design and final result

The rest-left/study-right arrangement, clear floor, warm wood inset and personal
paper already gave this cabin a useful identity. The dense library grille hid
the books and made them look like industrial stowage. A broad bronze desk rail
competed with the notebook, and thin paper edges lacked convincing carriers.
Source-level construction inspection also found several approximate wall shoes
and the locker entering the real curved lining, plus small support gaps.

The final room keeps its arrangement and personal objects:

- An open carbon library captures the three existing books on a real shelf,
  between side cheeks and behind a low retaining strap. Their covers remain
  visible. The textile blanket pouch retains its appropriate straps and zipper.
- A carbon front handhold with small alloy collars quiets the desk edge. The
  unchanged wood inset, notebook, pen and lamps remain the working focus.
- Thin graphite carriers and satin alloy retainers seat the photograph and
  three social prints. Paper sizes, positions, content and interaction targets
  remain unchanged.
- Mounting shoes follow the actual rear lining at both furniture scales. The
  locker moves forward 0.105 local units to clear the cove; the berth assembly
  moves only 0.004 for clearance. Desk stays, foot loop, cradle stays, locker
  handle, lamp cable cuff and berth buckle now meet their supporting geometry.

The notebook pose, page animation, section/page state, physical picking,
application registration, paper artwork and reading-view presentation are
unchanged. The folded perch, bedding, photo/social availability and natural
material exceptions remain. No equipment, scene light or interactive decoration
was added. Shared architecture, camera fitting, navigation and approved rooms
remain protected.

## Before and after

| View | Before | Final |
| --- | --- | --- |
| Live landscape, 1440×900 | [Before](before-live-landscape.jpg) | [After](after-live-landscape.jpg) |
| Live portrait, 390×844 | [Before](before-live-portrait.jpg) | [After](after-live-portrait.jpg) |
| Fixed wide oblique, 1440×900 | [Before](before-oblique-wide.jpg) | [After](after-oblique-wide.jpg) |
| Fixed compact oblique, 390×844 | [Before](before-oblique-compact.jpg) | [After](after-oblique-compact.jpg) |

Additional final evidence: [landscape notebook](after-notebook-landscape.jpg),
[portrait notebook](after-notebook-portrait.jpg),
[landscape overview](after-overview-landscape.jpg),
[portrait overview](after-overview-portrait.jpg),
[settled drag release](after-drag-release.jpg) and
[approved Contact reference](reference-contact.jpg).

All images were inspected in **hidden built-in Chromium 153**, not native Safari.
CSS viewports, JPEG images and drawing buffers are 1440×900 or 390×844, unscaled at
browser/render DPR 1. Live captures use the preserved localhost:3000 server and
its current public content. Both live orientations use the wide model; landscape
enables GTAO and portrait disables it under the existing quality policy. Shadows
remain enabled. Live Earth/sky phases differ between captures.

The finite `scripts/benchmarks/spacecraft-polish-preview.mjs` comparison uses
the same camera per pair, time 0, FOV 38, RoomEnvironment intensity 0.24, fixed
lights and requested PCF shadows. It omits GTAO, Earth/sky, navigation and native
notebook content. Its right notebook page is blank, its photo uses the landscape
fallback, and social slots use their absent-content fallback artwork. The compact
oblique crops part of the berth at the unchanged angle; live frontal portrait
and the wide oblique provide complementary coverage. The existing portrait
notebook displays the whole spread at a small scale, with semantic Reading view
available; this stage does not redesign that Stage 13 interface policy.

The [source manifest](source-manifest.json) identifies 43 baseline / 44 final
transitive runtime sources, fixture and bundle hashes. Final source was frozen
at `2026-09-24T09:02:02.857Z`; the subsequent legacy-test assertion correction
does not change rendered code. [Capture metadata](browser-captures.json) records
camera poses, dimensions, effects, source version and image hashes.

## Verification and refinement

Eight new tests inspect actual source vertices and closed solids at wide/compact
scales: lining clearance, shoe-to-wall/equipment attachment, desk/cradle/handhold
load paths, lamp/locker/buckle/pen attachment, shelf/book/webbing seating and paper
carrier/target alignment. The focused About/framing/hardware checks passed **52/52**.
They found small cradle, cuff, latch and handle gaps during refinement, which
were corrected before final evidence was captured. The new mount variants are
built once and switched with the existing furniture scale, without rebuilding
geometry during navigation.

All **552 tests passed** in a disposable source-only checkout with fresh test-only
D1/R2, test secrets, a separate Vite cache and explicit
`TEST_BASE_URL=http://127.0.0.1:3003`. No private environment or main store was
copied. Typecheck, production build/geometry check and affected lint passed.
The initial full suite passed 551/552, exposing only a legacy assertion requiring
the removed library mesh. That assertion now requires the retained strap and
keeper; the focused 2/2 checks and complete recovery suite pass. Final lint and
formatting also pass. Exact commands,
source hashes, failure/recovery logs and cleanup are recorded in
[verification checks](verification-checks.json).

After the passing full suite, the formatter wrapped the new retention assertion
and added a trailing comma. Its parsed TypeScript AST remains identical; runtime
bytes and images are unchanged. The record distinguishes the full-suite snapshot
from this final test-file snapshot and its passing focused 2/2, lint and format
follow-up.

[Browser smoke checks](browser-smoke.json) cover physical notebook click and
keyboard entry, next/previous pages, section selection, remembered selection,
Escape and exposed-wall dismissal, Reading view/return, overview entry and room
drag/release. Social destinations were checked without following external links.
No published content or private inquiries were changed during browser inspection.

The independent critic scored final source and matching evidence **94/100**, with
no unresolved blockers. The [review](critic-review.md) preserves its design-weighted
rubric, resolved documentation/provenance findings and verification limitations.
No runtime correction was requested after the final captures. Build warnings
concern Node DEP0205, chunk size and Vinext route static analysis; no required
check remains failing. Final live console error sampling returned no entries.

## Rendering implications

[Structural inventory](structural-costs.json) measures visible production
batching/instancing in Node, excluding canvas text and frustum culling. About
changes from **66 to 73 mesh/material submission candidates**, **59 to 67 unique
geometries**, and **69,230 to 66,610 wide / 66,602 compact triangle inputs**.
Visible geometry arrays change from **1,923,020 to 1,889,204 wide / 1,888,388
compact bytes** (−33,816 / −34,632). The small extra submission count is accepted
for the more legible shelf and correct mounting. This inventory excludes hidden
layout variants; it is not total retained process/GPU memory.

Protected pressure structures, utilities, other furniture, exterior and ladder
inventories/bounds match. Whole-scene bounds, architectural camera and overview
framing, notebook root/application/opening/turning-leaf transforms and photo mounts
match exactly. About's diagnostic content-bound corner points change with its
furniture; they do not drive shared room camera fitting. Each layout's metadata
was deep-copied immediately, before changing layouts.

The finite renderer separately records **802→816 calls and
1,850,618→1,845,378 triangle inputs** in wide; compact records **849→863 calls and
1,816,502→1,811,246 triangle inputs**. These include requested shadow generation
and differ from structural counts. No startup, CPU/GPU timing, heat, power or
battery gain is claimed. This is an authored baseline; no held performance-ledger
candidate was implemented.

Native Safari, a physical phone and a reduced-motion browser override were not
checked. Existing automated behavior coverage passes in the isolated suite.
The finite preview was stopped, the hidden review tab closed and the viewport
override reset. The isolated test server and fixture/state were removed;
port 3003 is closed. Main localhost:3000 remains HTTP 200.

## Stage 06 handoff

Stage 05 is complete. The study keeps its personal identity through paper, fabric,
wood and retained objects. Carry forward actual lining-fitted shoes, thin graphite joints, carbon
handling surfaces, small satin collars and restrained bronze release accents.
Keep a clear floor and make each restraint/support meet its load. The warm
materials and open book shelf are deliberate About exceptions, not templates
for ladder equipment. Stage 06 should preserve the paired stowed spanners and
two grab bars at each end, including the empty intervening spaces. Use the final
room/oblique evidence above; notebook content and portrait reading presentation
remain Stage 13 work.
