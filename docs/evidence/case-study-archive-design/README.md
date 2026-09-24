# Stage 02 — case-study archive

24 September 2026. Baseline `57132c291d27bfd102a84ca5748ea1ea87cedc14`
includes the approved Stage 01 architecture. This is an authored design change,
not a performance optimization.

## Design and construction

The existing room had a clear choice hierarchy, but a punched shelving rack and
separate floor tablet read as two unrelated products. Repeated bronze end blocks,
splice plates and a second rack title diluted the labels. Geometry inspection
also found the rear feet penetrating the cabin's curved floor.

The new recorder dock retains the four cartridges above the fixed 16:9 terminal.
Continuous formed carbon cheeks carry the rear magazine onto forward shoes on
the flat deck. Low side ties join those shoes to the existing terminal supports;
the center approach stays open. Fitted ivory cheek covers and a narrow crown
relate the assembly to Stage 01's captured light cassettes. The secondary title,
perforations and splice blocks are removed. Each cartridge has two alloy
extraction bails outside the unchanged label face, with small bronze captive
releases. Terminal grips use carbon, alloy pins and restrained locking witnesses.

The terminal remains deliberately low and raked, leaving all four category
faces visible. Its glass is still 1.76 × 0.99 at the existing 0.85 rig scale,
with the same −0.55 rad tilt and application anchor. The apparent handling
hardware is passive; category faces and the terminal retain their existing
selection behavior. Populated categories pack above blank inert cartridges,
without a 3D hover rim. The fourth row is dark in the live sample because
Research has no stories. Screen artwork and native application layout are unchanged.

Existing retained recorder cores, transport case, data conduit and outboard
coolant loop already communicate a service workflow. They remain unchanged.
Stage 01, the other cabins, exterior, lighting, camera framing, navigation and
persisted content are unchanged. No held performance-ledger candidate is adopted.

## Current rendered evidence

All images are unscaled captures from the hidden built-in **Chromium 153** browser.
No native Safari or other native app was controlled. Live views reuse the main
server at `http://localhost:3000`. They show existing published sample content;
no content was seeded or modified there.

| View | Before | After |
| --- | --- | --- |
| Live archive, 1440 × 900 | [Before](before-live-landscape.png) | [After](after-live-landscape.png) |
| Live archive, 390 × 844 | [Before](before-live-portrait.png) | [After](after-live-portrait.png) |
| Matched finite oblique, wide / 1440 × 900 | [Before](before-oblique-wide.png) | [After](after-oblique-wide.png) |
| Matched finite oblique, compact / 390 × 844 | [Before](before-oblique-compact.png) | [After](after-oblique-compact.png) |

[Landscape application](after-application-landscape.png) ·
[Portrait application](after-application-portrait.png) ·
[Projects reference](reference-projects.png) ·
[Contact reference](reference-contact.png) ·
[Landscape overview](after-overview-landscape.png) ·
[Portrait overview](after-overview-portrait.png) ·
[Settled drag release](after-drag-release.png)

[Browser capture metadata](browser-captures.json) records final dimensions,
buffers, camera poses and exposed rendering settings. The live portrait uses
the app's wide model layout; the finite compact view explicitly tests the compact
model, not a claim that live portrait selected it. Live drawing buffers equal
CSS viewports at render DPR 1. Desktop contact shading is enabled; the app's
portrait policy disables it. Shadows remain enabled. The initial live baseline
screenshots and neighbor references predate the metadata recorder; their PNG
sizes establish their dimensions, not a measured camera/time match. Their
animation phases differ, so use the finite pairs for controlled geometry comparison.

The reusable [finite fixture](../../../scripts/benchmarks/spacecraft-polish-preview.mjs)
was run against `57132c2`, with current source frozen after the final geometry
correction. [Source manifest](source-manifest.json) includes transitive source
and bundle hashes. It uses the shared architectural fit, t=0, FOV 38,
RoomEnvironment intensity 0.24, fixed lights and requested PCF shadow generation.
It omits GTAO, orbital sky/Earth, navigation and live applications. Its empty
content intentionally exercises four blank cartridges and standby terminal.
These images are geometry checks, not an alternative lighting proposal.

## Refinement and verification

The first revision used separate straight/angled supports. Visual refinement
replaced them with one continuous formed cheek per side. The new floor-contact
test caught a rotated base tie dipping about 0.009 units below the deck; the final
tie keeps its rectangular section upright in plan. A temporary TypeScript spread
argument error was also corrected. All affected final evidence was recaptured.

The focused suite passed 16/16 checks: actual floor/cove clearance, pad contact,
solid support connections, visible labels/glass, category availability/reordering,
application registration and utility clearances. The new construction tests use
real geometry and ray intersections, including both layouts and room view limits.
The existing application tests cover 9 responsive viewports and computer angles.

The [isolated verification record](verification-checks.json) reports **528/528
tests passed on the first full run**, with no failures, skips or cancellations.
Typecheck, production build including geometry:check, and affected lint passed.
The disposable source checkout used a separate loopback server, fresh test-only
D1/R2 state and secrets, and explicit TEST_BASE_URL. The test owner was initialized
before the suite. Main state and private environment files were never copied.
[Logs](checks/test.log) retain the results; ANSI styling and trailing whitespace
were normalized only. Build warnings about Node DEP0205, large chunks and Vinext
route classification remain recorded in the [build log](checks/build.log).
The isolated server/store and finite preview server were removed/stopped; all
agent browser tabs are closed and the viewport override reset. The main server
remains available at localhost:3000.

[Browser smoke checks](browser-smoke.json) cover direct room entry, populated
category entry, keyboard Enter, portrait and landscape application registration,
Escape, physical cartridge selection, an inert blank
cartridge, drag/release without activation, semantic Reading view and
overview/neighbor composition. The drag image shows the settled hover response,
not a captured maximum-angle motion trace.
No reduced-motion browser override, native Safari, physical phone, rested timing,
startup, heat, power or battery measurement was performed. This stage changes no
motion policy. Browser images and geometry tests complement each other; neither
claims universal device coverage.

The [independent critic](critic-review.md) scored the final source and matching
evidence **95/100**, with no unresolved blockers. The rubric gives 40% weight
to visual design and composition. The completion wording was clarified as
requested; no runtime revision was required by the critic.

## Rendering cost

[Structural inventory](structural-costs.json), measured against a temporary
source-only Git baseline with the existing hardware inventory script, records
**+2,178 triangle inputs and +331,788 geometry-array bytes (0.3164 MiB)** in each
layout. Archive mesh candidates remain 67 and unique geometry count is unchanged.
The entire pressure architecture inventory, other-room furniture inventories,
scene bounds and shared framing metadata match exactly. Counts include production
batching and instance multiplicity, exclude browser canvas text/frustum culling,
and are neither actual GPU memory nor timing. No performance gain is claimed.
Finite browser draw counts include shadow generation and differ from this
structural inventory; they are recorded only as fixture observations.

## Stage 03 handoff — Projects workshop

Completed: the archive's physical rack, extraction fittings and shared terminal
base. Carry forward fitted shoes, thin graphite joints, satin-alloy handling
surfaces, small functional bronze releases and continuous load-bearing forms.
Check supports against the actual curved deck in both layouts. Keep screen
artwork/behavior and architectural camera fit stable when reshaping equipment.
Projects may have its own workbench silhouette; it need not copy this magazine.
Preserve the archive's four-cartridge/16:9 arrangement and the surrounding retained
service equipment. No out-of-scope follow-up blocks this stage.
