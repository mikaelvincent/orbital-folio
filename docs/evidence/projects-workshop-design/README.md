# Stage 03 — Projects workshop

24 September 2026. Baseline `c8cfd5919291a2e10c8bf1c510fa09cfd2363c97`
includes approved Stage 01 architecture and Stage 02 archive. This is an authored
design change, not a performance optimization.

## Design and construction

The four screens were readable, but exposed rails and repeated top/bottom lights
made the bank look like four independent portable cases. The broad rounded apron,
bright handhold and bronze feet competed with the displays. Source inspection
found that the nominal rear-wall shoes floated off the wall; their lower ends
entered the curved deck. Additional decoration would not resolve these problems.

The new bench-supported instrument bridge gives all four removable displays one
continuous support chain. Two graphite uprights land on isolated alloy shoes on
the worktop, above the grounded bench legs. Crossrails sit behind the screen rows;
short rear standoffs join each enclosure to the rails. The enclosures are about
6.4% larger, slightly closer together and a little higher, while preserving the
shared room camera. Rounded shells, grab loops and captive hardware retain the
workshop's removable-payload character. Small bronze release tips replace broad
bronze levers. Eight repeated screen light assemblies and the rear floor lights
are replaced by one sheltered downward diffuser beneath the bank. This is an
emissive fitting; it adds no scene light.

The protected thin inset carbon worktop keeps its exact footprint and 0.731
working height. A closed tapered apron gives the front a lighter section, with
unchanged underside clearance. Slim service pulls, a carbon handhold with alloy
collars and satin foot retainers support the same material hierarchy as the
archive. The power trunk now clips directly to the right upright and reaches its
underbench junction. The two drivers, stowed test lead and two retained drawers
continue the maintenance workflow; the usable work surface remains clear.

Stage 01 architecture, Stage 02 archive, other rooms, orbital environment,
lighting sources, camera framing, navigation and persisted content are unchanged.
Only Projects values change in the shared furniture grid. The local screen glass
and artwork are unchanged; its existing emitted transforms automatically register
the larger physical monitors to the native application. Populated categories
retain their labels and feedback. The fourth display remains dark and inert in
the live sample because Experiments has no projects. Passive hardware has no
selection target. No held performance-ledger candidate is adopted.

## Current rendered evidence

All images are unscaled hidden built-in **Chromium 153** captures. No native Safari
or other native app was controlled. Live views use the existing localhost:3000
server and published content, with no main-store writes or fixture seeding.

| View | Before | After |
| --- | --- | --- |
| Live room, 1440 × 900 | [Before](before-live-landscape.png) | [After](after-live-landscape.png) |
| Live room, 390 × 844 | [Before](before-live-portrait.png) | [After](after-live-portrait.png) |
| Matched finite oblique, wide / 1440 × 900 | [Before](before-oblique-wide.png) | [After](after-oblique-wide.png) |
| Matched finite oblique, compact / 390 × 844 | [Before](before-oblique-compact.png) | [After](after-oblique-compact.png) |

[Landscape application](after-application-landscape.png) ·
[Portrait application](after-application-portrait.png) ·
[Approved archive reference](reference-archive.png) ·
[Contact reference](reference-contact.png) ·
[Landscape overview](after-overview-landscape.png) ·
[Portrait overview](after-overview-portrait.png) ·
[Settled drag release](after-drag-release.png)

[Capture metadata](browser-captures.json) records all image viewports, drawing
buffers and exposed camera/render settings, including the live baseline.
Browser and render DPR are 1. Live landscape uses contact shading; live portrait
follows the application's policy of disabling it. Shadows remain enabled. The
live portrait uses the wide model layout; the finite compact pair explicitly
exercises the compact model. That fixture's portrait oblique framing crops the
left edge identically in both versions. The complete wide view and geometric
checks cover those attachments. Live orbital animation phases differ, so use the
finite pairs for matched geometry comparisons.

The reusable [finite fixture](../../../scripts/benchmarks/spacecraft-polish-preview.mjs)
was run against `c8cfd59`, freezing the final runtime sources. Its
[source manifest](source-manifest.json) identifies transitive sources and bundles.
It uses the shared architectural fit, t=0, FOV 38, RoomEnvironment intensity 0.24,
fixed lights and requested PCF shadow generation. It omits GTAO, orbital sky/Earth,
navigation and live applications. Empty content intentionally shows four standby
displays. These are construction checks, not an alternative lighting proposal.

## Refinement and verification

The first apron profile was 0.0035 units too low because the existing assembly
lowering was applied twice. The worktop regression caught this; its bottom was
corrected before the final captures. A new flush-contact check initially rejected
a 3.8 × 10⁻⁹ Float32 boundary difference; a 10⁻⁷ tolerance now accepts the intended
joint without hiding a visible gap. A final source pass found the newly added release tips sitting 0.0025 units
off their levers. Their depth position was corrected and a solid-contact assertion
added; affected images and source manifests were refreshed. The initial broader focused run passed
25 checks; the strengthened final construction suite passed 9/9.

The new tests inspect actual rounded solids, probe their deck contact against
the real lining, follow monitor-to-deck support connections and check cable and
light attachments. They also check complete monitor-envelope separation and
emitted glass registration in both layouts, then ray-test usable glass against
the whole workshop at nine room camera samples in landscape and portrait.
Existing application tests cover responsive near-plane, bezel and hover/drag
registration. Finite geometric samples complement visual inspection; they are
not a continuous proof across every possible device or camera pose.

The [isolated verification record](verification-checks.json) reports **537/537
final-source tests passed**, with no failures, skips or cancellations. Typecheck,
production build including geometry:check, affected lint and formatting passed.
The disposable source checkout used a separate loopback server, fresh test-only
D1/R2 state and secrets, and explicit TEST_BASE_URL. The test owner was initialized
before the suite. Main state and private environment files were never copied.
[Logs](checks/test.log) preserve the results. The known Node DEP0205, large-chunk
and Vinext route-classification build warnings remain in the build log.

[Browser smoke checks](browser-smoke.json) cover direct room entry, keyboard room
and Systems entry, physical All projects/Interfaces selection, inert standby,
landscape/portrait application registration, Close/Escape, drag/release without
activation, semantic Reading view and overview/neighbor composition. The drag
image shows a settled hover response, not a captured maximum-angle motion trace.
All agent browser tabs are closed, the viewport override reset and the finite
preview server stopped. The isolated test fixture and its store were removed;
port 3003 is closed. The main server remains available at localhost:3000.

No native Safari, physical phone, reduced-motion browser override, rested timing,
startup, heat, power or battery measurements were performed. This stage changes
no motion policy. These limitations remain explicitly outside the completed
checks.

The [independent critic](critic-review.md) scored the final source and matching
evidence **94/100**, with no unresolved blockers. Visual design carries 40% of
the rubric. The critic independently checked source, image and verification-log
hashes and requested no further runtime changes.

## Rendering cost

The [structural inventory](structural-costs.json) compares a temporary source-only
Git baseline with final source using the existing hardware inventory tool.
In both layouts, Projects changes from **146,940 to 129,988 triangle inputs**,
**78 to 74 mesh/material submission candidates**, and **5,412,840 to 5,125,088
geometry-array bytes** (−287,752 bytes / −0.2744 MiB). Unique geometries change
from 74 to 70. All four pressure structures/utilities, other-room furniture,
ladder, docking/service/chassis, scene bounds and shared camera/framing metadata
match exactly. The finite renderer separately records eight fewer submissions
and 33,904 fewer triangle inputs in each oblique frame, including its shadow work.

These counts include production batching/instancing. Structural inventory omits
browser canvas text and frustum culling. They are not measured driver/GPU memory,
application timing, startup, heat, power or battery results. No performance gain
is claimed. The changed art establishes a new baseline.

## Stage 04 handoff — Contact communications console

Completed: Projects physical monitor bank, payload handling details, bench and
local power/light integration. Carry forward connected supports, fitted isolators,
smooth carbon housings, satin alloy, small functional bronze releases and clear
working space. Keep the thin inset worktop and room camera fixed. The workstation
may retain its removable payload character; Contact should express its own
communications workflow rather than copy the four-monitor bank. Shared screen
artwork/application design stays with Stage 13. Stage 01/02 remain protected.
No out-of-scope follow-up blocks this stage.
