# Stage 01 — shared cabin architecture

24 September 2026. Baseline: `9e67dae352108f1583ad03fba05cb11bf02682c2`.
Final runtime and comparison-fixture sources are identified by
[source-manifest.json](source-manifest.json). This is an authored design baseline,
not a performance optimization.

## Design result

The four cabins already had a coherent rounded pressure envelope and correctly
fitted circular doors/window reveals. Their weak shared construction was at the
floor and ceiling: the inset dark floor read as a loose mat inside an ivory tray;
the warm light bars were separated from their oversized carriers; isolated black
blocks beside the lamps had no visible supporting assembly.

- **Continuous matte carbon deck:** partition the actual rounded lining at the
  side-return tangent, Y = −1.24. Carbon follows the flat floor, rear/side coves and
  entire front throat; ivory begins above the same continuous surface. No overlay,
  extra thickness, floor rails or ornamental panel pattern. A dedicated rougher
  carbon finish keeps broad reflection streaks subordinate to room contents.
- **Seated ceiling lights:** shallow graphite seals, ivory service carriers,
  captured warm diffusers and satin-alloy captive end shoes replace the separated
  bars and isolated roof blocks. Both assemblies match in every cabin. Their light
  sources and emission settings are retained.
- **Shared mounting language:** header enamel fills more of its existing carrier;
  short bronze retainers and alloy fasteners sit outside the unchanged text area.
  The existing fitted door-sign carriers and two flush header-side vents already
  meet that language and remain. The trial to recess vent blades was rejected
  because it broke the proven face alignment.

The ivory envelope, 0.08 side returns, pressure-wall thickness, opening proportions,
flush graphite/bronze reveals, door centering, sign positions and camera datums are
unchanged. Plain wall space remains intentional. No furniture, ladder, exterior,
overview callout, orbital, navigation, visitor-content or studio redesign is included.

## Live before/after evidence

Hidden Codex built-in **Chromium 153** on macOS; no native Safari or native-screen
capture. Landscape is **1440×900** CSS pixels; portrait is **390×844**. Images are
unscaled browser screenshots. The live renderer used a 1× drawing buffer at those
sizes (browser devicePixelRatio is 2). These are desktop browser viewports, not a
physical phone. Live rendering retains the application's lights, shadows, orbital
scene and responsive effects; portrait uses its existing quality policy. Animation
is live, so Earth phase and hover settling are not frozen A/B measurements.

| View | Before | Final |
| --- | --- | --- |
| Projects | [Landscape](before-projects-landscape.png) | [Landscape](after-projects-landscape.png), [portrait](after-projects-portrait.png) |
| Case studies | [Landscape](before-case-studies-landscape.png) | [Landscape](after-case-studies-landscape.png), [portrait](after-case-studies-portrait.png) |
| About | [Landscape](before-about-landscape.png) | [Landscape](after-about-landscape.png), [portrait](after-about-portrait.png) |
| Contact | [Landscape](before-contact-landscape.png) | [Landscape](after-contact-landscape.png), [portrait](after-contact-portrait.png) |
| Overview | [Landscape](before-overview-landscape.png), [portrait](before-overview-portrait.png) | [Landscape](after-overview-landscape.png), [portrait](after-overview-portrait.png) |

Most live baselines came from the original main server. The About baseline and
portrait-overview baseline came from a source-identical isolated checkout before
source sync, with fresh sample content: its photograph/social prints differ from
the owner's live content. They compare architecture, not content. Matched finite
About views below use identical default content on both versions.

Root inspected all four live rooms, both overview orientations, direct room entry,
physical Projects→Case studies door click, and a wall-drag release. The
[settled drag frame](after-case-studies-drag-release.png) is a mild released-camera
view, not a recorded maximum-drag envelope. The final keyboard/read-view smoke
check is recorded in [verification.json](verification.json).

## Matched construction views

The reusable [geometry fixture](../../../scripts/benchmarks/spacecraft-polish-preview.mjs)
freezes baseline/current source at startup and renders finite frames at time zero.
It uses real room anchors and shared architectural bounds, matching FOV/pose,
RoomEnvironment intensity 0.24, fixed lights and PCF shadow refresh. It **omits GTAO,
Earth/sky, native screen interfaces and navigation**; live captures above are the
material/interaction authority. Empty fixture displays are deliberate default data.
It does not resize furnishings or alter production camera fitting.

| Oblique room | Before, wide | Final, wide | Final, compact |
| --- | --- | --- | --- |
| Projects | [View](fixture-before-projects-oblique-wide.png) | [View](fixture-after-projects-oblique-wide.png) | [View](fixture-after-projects-oblique-compact.png) |
| Case studies | [View](fixture-before-case-studies-oblique-wide.png) | [View](fixture-after-case-studies-oblique-wide.png) | [View](fixture-after-case-studies-oblique-compact.png) |
| About | [View](fixture-before-about-oblique-wide.png) | [View](fixture-after-about-oblique-wide.png) | [View](fixture-after-about-oblique-compact.png) |
| Contact | [View](fixture-before-contact-oblique-wide.png) | [View](fixture-after-contact-oblique-wide.png) | [View](fixture-after-contact-oblique-compact.png) |

Wide fixture images are 1440×900; compact are 390×844, both render DPR 1. Compact is
an explicitly selected geometry variant; the current live portrait app still
reports the wide model layout. [Finite-view data](finite-views.json) records actual
viewport/buffer, browser, poses, omissions and renderer counts per capture.
[Image index](image-index.json) records every PNG's actual dimensions.

Inspection found continuous floor/window joins, smooth coves, seated light parts,
clear door throats, consistent headers and balanced vent spacing. Furniture remains
room-specific. Oblique occlusion of the far header/vent in compact geometry is a
viewpoint effect shared with the existing architecture, not a new selectable cue.

Reproduce with `node scripts/benchmarks/spacecraft-polish-preview.mjs 9e67dae352108f1583ad03fba05cb11bf02682c2`,
then select a room's oblique view and Wide/Compact. Before/After links preserve the
view parameters. Restart after source changes and save `/manifest.json` again.

## Verification and rendering implications

[Verification record](verification.json) preserves the isolated check results and
rejected runs. New tests raycast real deck surfaces at the front, sides and rear,
reject raised/coincident layers, and check ceiling→seal→case→diffuser attachment
in both layouts. Existing geometry, reveal, sign, vent, framing, picking, navigation
and full API/workflow coverage are included in the isolated suite.

[Structural inventory](structural-costs.json) uses the existing hardware-inventory
script against a fresh archived baseline and final source. Each layout adds
**23,016 triangle inputs, 8 visible mesh candidates and 2,237,552 geometry-array
bytes**; these are scene-graph potential and unique CPU-side arrays, not GPU-memory
telemetry or frustum-aware application draw counts. Furniture inventories and shared
framing are unchanged. The removed roof blocks formerly extended 0.005 above the
ceiling; the pressure-structure wrapper bound shrinks there, while the actual lining,
whole-scene bounds and camera references stay unchanged.

Finite fixture renderer counts include requested shadow generation and are separate
from the inventory. No rested CPU/GPU timings, startup, heat, power, battery or Safari
performance were measured. There is no speedup claim or adoption of held ledger
candidates. The new details cost geometry; the deck uses a distinct material finish.

The final independent review is preserved in [critic-review.md](critic-review.md).
The reviewer evaluates visual quality alongside correctness and evidence; its score
does not replace the owner's judgment.

## Next-stage handoff

Stage 01 establishes continuous ivory pressure surfaces over a matte carbon deck,
shallow sealed fittings, fitted carriers, fine graphite joints, alloy fasteners and
small bronze retainers. Carry these attachment/material relationships into Stage 02
archive furniture while preserving its four cartridges and 16:9 terminal. Furniture
proportions, contents and purposeful details may vary; room-camera fitting, two-vent
policy, door/reveal geometry and this shared architecture remain common references.
No out-of-scope follow-up is required to accept this stage.
