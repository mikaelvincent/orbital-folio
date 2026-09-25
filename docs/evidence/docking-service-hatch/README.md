# Docking service-box correction — 25 September 2026

The owner found the two round caps and separate latch face-like, including after
the prior Stage 07 approval. This correction supersedes **only that small box**.
The [owner's reference](owner-reference.png) is an unchanged copy of their supplied
crop. The earlier critic approval did not resolve the owner's concern.

The carbon cover is now lower and elongated (0.53 × 0.25, previously 0.53 × 0.45),
with one continuous alloy pull, attached feet/returns and a restrained bronze
keeper. Removing the circular pair eliminates the strongest facial cue even when
the spacecraft rolls 90°. The curved alloy saddle follows the barrel. Cover and
saddle depth are unchanged; the pull preserves the previous front extent. This is
passive access hardware, with no screen, status light or new interaction.

The collar, main pressure hatch, barrel, bands, shoulder, ladder, service assembly,
rooms and camera/navigation code are unchanged. Carry forward carbon access
covers, visible mechanical attachment, satin alloy and small bronze keepers; do
not restore the paired ports on this box.

## Rendered comparisons

| View                                          | Before                                          | After                                          |
| --------------------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| Service box, wide geometry, 1440 × 900        | [Close view](before-service-box-wide.jpg)       | [Close view](after-service-box-wide.jpg)       |
| Docking exterior oblique, wide, 1440 × 900    | [Exterior](before-exterior-wide.jpg)            | [Exterior](after-exterior-wide.jpg)            |
| Docking exterior, compact geometry, 390 × 844 | [Compact](before-exterior-compact-portrait.jpg) | [Compact](after-exterior-compact-portrait.jpg) |
| Live landscape overview, 1440 × 900           | [Overview](before-live-landscape.jpg)           | [Overview](after-live-landscape.jpg)           |
| Live rolled portrait overview, 390 × 844      | No matched baseline capture                     | [Portrait](after-live-portrait.jpg)            |

All screenshots are actual hidden built-in **Chromium 153** captures, at browser
DPR 1 and renderer DPR 1, with no image rescaling. The actual viewport and canvas
dimensions, poses, renderer state and image hashes are in
[browser-captures.json](browser-captures.json). The portrait live scene uses the
ordinary wide spacecraft geometry and 90° overview roll. The separate compact
fixture tests the alternative geometry; it is not a phone or live portrait claim.

Finite comparison images use the same frozen production sources, view, FOV 38°,
time zero, fixed lights, RoomEnvironment PMREM intensity 0.24 and PCF shadows.
They omit GTAO, Earth/sky, live screen applications and navigation. Their close
view is a developer-only preview preset, not a change to visitor camera framing.
Live captures include Earth/sky and published content, with shadows enabled;
landscape uses GTAO and portrait does not. Live time/hover poses are not locked,
so use the finite pairs for controlled comparisons.

The final box was checked for face cues, support, edge continuity and visual
weight in close, oblique and actual rolled overview views. The live app entered
Projects from portrait overview and returned to overview. A click on the visible
box remained inert, with no sampled browser errors; see
[live-interaction-check.json](live-interaction-check.json). No forms were submitted
and no inquiries or stored public content were changed.

## Source identity and construction

Baseline: `56b312e8841dfa2e5e861308b11fa59a1f456408`.
[source-manifest.json](source-manifest.json) identifies 44 transitive source files
per version, frozen at `2026-09-25T00:29:58.372Z`. Only
`features/spacecraft/equipment/docking-service-assemblies.ts` changes at runtime;
its content outside the service-box block is byte-identical.

The [construction audit](construction-audit.json) verifies the actual saddle
against the curved sleeve and the support chain through cover, feet, returns,
pull and keeper. All **8 construction tests pass**, covering both layouts. All
33 non-service docking source mesh objects match exactly, including geometry,
transforms, materials and instances. All protected assemblies, scene/docking
bounds, room framing, overview support points, routes and door metadata match.

Docking inventory changes from **18,268 to 18,344 triangle inputs (+76)** and
**1,025,048 to 1,024,672 geometry-array bytes (−376)**; **8 mesh candidates remain**.
These are deterministic geometry counts, not measured renderer draws, CPU/GPU
timings, process/GPU memory, heat or battery results. No held optimization is
included.

## Verification and limitations

The [isolated verification record](verification-checks.json) and its linked logs
confirm **568/568 tests**, typecheck, production build (including geometry check)
and affected lint pass on the final source. Build warnings concern the Node module
registration deprecation, large chunks and Vinext route classification; no check
failed. Runtime/test/preview hashes match the inspected evidence. Formatting,
local evidence links and `git diff --check` also pass.

The [independent review](critic-review.md) inspects the final source and all nine
images, with 50% of the rubric assigned to visual quality and face-cue removal.
Final result: **96/100**, with no unresolved findings or required revisions.

The main local server was absent at the beginning of this correction and was
started with the existing store at port 3000, without setup/reset. Mutating tests
use a disposable source-only checkout, explicit loopback `TEST_BASE_URL`, fresh
D1/R2 state and test-only secrets. Private environment files and the main store
are not copied.

The isolated server, disposable state and finite preview server were removed or
stopped after verification. Hidden review tabs are closed and the viewport
override is reset. The preserved main site responds HTTP 200 at localhost:3000.

No native Safari, physical mobile device, timed rendering comparison or manual
reduced-motion override was exercised. The finite fixture omits the effects
listed above. The folding pull is a static model in its stowed position; no hatch
opening interaction is introduced. Future Stage 08 work remains separate.
