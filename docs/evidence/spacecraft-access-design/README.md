# Spacecraft access equipment redesign

15 September 2026 · Baseline `234de17` · Design requested and approved for
implementation; no performance-ledger candidate enabled.

## Delivered design

The user rejected anonymous cover boxes and explicitly prioritized design over
optimization. Their suggestion of exterior ladders became a continuous open EVA
route: raised graphite rails climb the docking shoulder and cross the roof,
with alloy rungs, visible mounting posts, split clamps and sparse amber tether
markers. A short lower transfer station completes the docking-side composition.

Inside the ladder room, rigid grab bars with straight grasp sections and rounded
alloy returns replace broad filler covers. Wound-rope reels, open spoked flanges,
connected safety leads and retained carabiners give the curved end spaces a
recognizable purpose. Two older docking-side cassette boxes were also replaced
with holstered rescue torches: flared heads, pale recessed optics, dark barrels
and amber releases. The small service-spine lids became recessed hose couplings
with retained dust caps. Graphite, alloy and restrained amber relate these pieces
to the existing ladder, door handles and docking ring.

The first interior attempt was rejected in review: its sinuous grips resembled
hoses and its shallow reel looked like a disk. The final rigid grips and deeper,
open spool are the revision. See the [brief](design-brief.md) and retained iteration
images. Empty hull is preserved between functional assemblies; surface coverage
was not the acceptance criterion.

## Visual record

All browser checks used the hidden built-in browser. No native application or
user-screen capture was used.

| Capture | What it establishes |
| --- | --- |
| [Exterior route](exterior-first-route.png), [roof detail](exterior-first-roof-detail.png) | Open route, rungs and seated stand-offs in finite developer views. |
| [Rejected first interior](ladder-first-transfer-overview.png), [lower](ladder-first-lower-detail.png), [upper](ladder-first-upper-detail.png) | Hose-like grips and shallow spool before the corrective iteration. |
| [Revised rigid grips](ladder-rigid-revision-detail.png) | Revised grasp silhouette; older cassette pair still present in this intermediate view. |
| [Ladder with rescue torches](ladder-with-rescue-lights.png), [detail](rescue-light-and-grips-detail.png) | Completed object vocabulary and mounting composition in finite views. These preceded the small final drum-core/lead-attachment correction. |
| [Desktop](final-overview-desktop.png), [laptop](final-overview-laptop.png), [portrait](final-overview-portrait.png) | Final live application at actual iframe layout sizes 1280×720, 1440×900 and 390×844. |
| [Live ladder transit](live-ladder-transit.png) | Final hardware exposed by the ordinary moving camera during a Projects→About journey. |

Finite geometry previews omit GTAO and use placeholder screen labels, so they
are inspection views, not production-render equivalence evidence. Live captures
use the running application, its 8K Earth and ordinary effects. The responsive
fixture scales a real-size iframe for presentation; screenshots therefore are
not pixel-for-pixel captures at the named layout resolutions. During the session
the outer browser changed from 1280×720 to 794×827. The transit capture still used
a 1280×720 iframe, presented at about 60% scale.

The early [drag record](exterior-first-live-drag.json) confirms a 401-pixel gesture
was classified as a drag without activation. Its screenshot caught the camera
already springing back; it does not prove a full-bound drag visual sweep. Existing
geometry/visibility checks cover the bounded poses separately. This task changes
no camera-control or navigation code; overview fitting naturally includes the new
exterior silhouette.

## Fitting and behavior evidence

- [Exterior mount rays](exterior-mount-fit.json): all 396 probes hit the actual
  hull across wide and compact layouts. Maximum mount-center error is below
  0.000003 scene units; feet embed approximately 0.0026–0.0051 units.
- [Exterior visibility](exterior-visibility.json): the tested landscape view
  exposes all 22 main rungs and three transfer rungs; the portrait view exposes
  19 of 22 main rungs. Open rails can read primarily as a handrail at shallow
  overview angles; higher views expose the ladder clearly.
- [Torch fit](torch-fit.json): all 72 pressure-liner rays hit. Maximum center
  error is below 0.00000005 units. Only bonded feet/support-post ends may enter
  the liner; body, optics and saddles have at least 0.10 units wall clearance.
- [Torch visibility](torch-visibility.json): both pale optics have visible samples
  in all nine tested default overview poses and the ordinary ladder-front view.
  The 844×390 overview partly occludes the upper optic, and the extreme developer
  docking-shoulder view is blocked by intervening cabins. These are exposure
  samples, not a claim that each torch is fully visible from every angle.
- [Exact surface clearance](ladder-surface-clearance.json): triangle-surface
  distances include shoes, rails, collars and grasp sleeves. Minimum hook/retaining
  peg to grip gap is 0.1191 compact / 0.1379 wide; reel-to-grip is 0.2071 / 0.2081;
  safety lead-to-grip is 0.2004 / 0.2067. Top and bottom agree. Positive depth
  separation excludes intersections. These are visual model-fit measurements,
  not certified engineering margins. The relocated reproducible audit was rerun
  against final source and produced identical JSON.
- [About→Projects trace](live-ladder-flight.json) has 79 sampled frames, including
  45 in the walkway; [Projects→About trace](final-ladder-flight.json) has 57 frames,
  including 30 in the walkway. At the recorded threshold of 0.001, neither trace
  has more than one ladder door open. Both end with travel stopped and preserve
  the vessel's identity transform. The trace durations are observation windows,
  not benchmark results.
- Added hardware remains passive and follows the existing room-brightness and
  geometry-disposal conventions. Targeted tests exercise disposal capability.
  Normal scene teardown was source-reviewed as traversing both visible and hidden
  layouts; that teardown itself was not executed as a new browser test.
- [Final browser error record](browser-errors.json) is empty.

## Checks and cost

All **249 tests passed**, with no skipped tests or failures: [full log](full-tests.log).
Type checking, production build, changed-component lint and diff checks passed.
The build retains existing framework warnings about large chunks and route
classification; the build completed successfully. Focused equipment test logs
are also retained beside this file.

The deliberate design cost is +96,792 triangles (+10.80%) and +2,255,376 bytes
(2.1509 MiB) in unique geometry arrays across the active wide model; visible meshes
change from 416 to 415. See the source-hashed [inventory](geometry-inventory.json).
These are structural counts, not frame timing, thermal, battery, total memory or
GPU-allocation measurements. No runtime performance improvement is claimed.
No new textures, scene lights or ongoing animation were added. The 8K Earth,
existing main room contents, eight retained header vents and held optimization
candidates remain unchanged. [Ledger entry 17](../../performance-ledger.md)
preserves the previous history and records this new baseline.

Reproduce from the repository root with the installed project dependencies:

```sh
npm test
npm run typecheck
npm run build
npm run lint -- components/docking-shoulder-equipment.ts components/exterior-service-equipment.ts components/ladder-endcap-equipment.ts components/ladder-service-spine.ts components/spacecraft-model.ts
node scripts/benchmarks/spacecraft-geometry-inventory.mjs 234de17
node scripts/benchmarks/ladder-transfer-clearance-audit.mjs
node scripts/benchmarks/spacecraft-polish-preview.mjs 234de17
```

The final independent rubric, score and limitations are in
[critic review](critic-review.md). Final source identities are recorded in
[source hashes](final-source-hashes.json). Changes are committed locally in logical
groups. The existing development server remains available on port 3000; this work
does not publish or deploy the site.

Implementation commits: `d50f4dd` (exterior EVA route) and `ef91e1a` (ladder-room
transfer and rescue equipment). Evidence and ledger changes are committed as a
separate documentation group.
