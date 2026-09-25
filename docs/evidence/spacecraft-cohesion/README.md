# Whole spacecraft cohesion — Stage 11

25 September 2026. Baseline `60c723f85f5b1ad1d4e7d452599960731fb9c6f9`.
This is a restrained finish integration pass across the completed spacecraft.
Accepted arrangements, silhouettes, attachment geometry and detail density remain
intact. It does not redesign a room or brighten the scene globally.

## Observations and decision

The initial live overview and all four rooms already formed a coherent set.
Their clear central equipment, quiet dark floors and repeated mounting logic did
not justify more objects. Source inspection exposed two specific breaks:
workshop display fasteners used environment intensity 0.06 while the supporting
bench/gantry used 1; ladder cassette alloy used the graphite casing's roughness
0.68/metalness 0.12. The coefficient ratio is not a measured brightness ratio.
Other nominal alloy and bronze hardware had accumulated different finishes.

The correction is an explicit physical-hardware profile, applied at material
creation rather than by color matching or a global traversal:

| Affected scopes | Correction and concrete benefit |
| --- | --- |
| 01–05 cabin fittings and four rooms | Common satin finish connects fasteners, handles, display mounts and their supports without repeating furniture designs. |
| 06 connector and 07 shoulder | Cassette alloy reads as metal rather than graphite; maintenance tools and retainers share the neighboring equipment response. Bright tread alloy and dark backing remain distinct. |
| 07–09 docking, service and exterior access | Broader, quieter alloy highlights and restrained bronze connect rings, hinges, shoes and tether fittings to interior hardware. Both exterior routes inherit the same treatment. |
| Shared iris source | Route paint is separated from physical bronze, preserving the original signal finish and all door feedback. |

`hardware-finish.ts` defines alloy roughness 0.46, metalness 0.60, environment
intensity 0.35; bronze uses 0.46, 0.20, 0.35. Colors, emission, maps, interaction
multipliers and timing are retained. Carbon paint, architecture, dark floors,
bright ladder treads, glass, lamps, solar blues, paper, fabric, wood and media
are intentional exceptions. No global renderer, environment, light, camera,
navigation, Stage 10 overlay or stored-content changes were made. Held performance
candidates remain held.

## Matching evidence

[Source manifest](source-manifest.json) identifies the frozen before/after
transitive model sources, bundles and unchanged reusable fixture. Final model
source-tree hash is `7e5d92efb9225990c99c7f2be29642222737bacfce82e54fc9a33a025cbbe41a`.
The before source-tree hash is `922956c9d1fcc8c8f4192c4b7df074ebdebc5c8bcdeead227725ebc8930d23ac`.
[Image hashes](image-hashes.json) bind all 36 JPEGs to their dimensions and
capture records and verify the seven finite pairs' matching conditions.

All seven pairs below use hidden built-in **Chromium 153**, actual **1280×720 CSS
viewport**, **1280×720 drawing buffer and JPEG**, browser **DPR 2**, explicitly
forced renderer **DPR 1**. No screenshot rescaling/cropping was applied. They
are finite frames at t=0, wide layout, fixed matching poses and light rig:
RoomEnvironment intensity 0.24, hemisphere/three directional lights, PCF shadows.
They omit GTAO, orbital Earth/sky, live application interfaces and navigation.
Fixture screen content is synthetic/default, not a check of published content.

| View | Before | After |
| --- | --- | --- |
| Workshop / neighboring equipment | [Before](before-projects-oblique.jpg) | [After](after-projects-oblique.jpg) |
| Study / communications boundary | [Before](before-about-oblique.jpg) | [After](after-about-oblique.jpg) |
| Ladder / docking / cabin junction | [Before](before-ladder-detail.jpg) | [After](after-ladder-detail.jpg) |
| Docking pressure hardware | [Before](before-docking-detail.jpg) | [After](after-docking-detail.jpg) |
| Service end / solar hinges | [Before](before-service-detail.jpg) | [After](after-service-detail.jpg) |
| Roof access route | [Before](before-roof-detail.jpg) | [After](after-roof-detail.jpg) |
| Complete underside access route | [Before](before-underside-detail.jpg) | [After](after-underside-detail.jpg) |

[Finite capture metadata](finite-captures.json) records actual poses, dimensions,
DPR and fixture draw/triangle counts. These comparisons show a subtle finish
change, clearest on the service throat, docking rim and access shoes. No new
clipping, attachment, silhouette or density problem was found.

## Live rendering and interaction

The existing port 3000 server supplied all live checks with its published
content. No inquiry was sent, draft changed or store copied. Before/after
screenshots cover overview and every cabin in desktop and portrait; filenames
use `before-` / `after-`, room name and `-desktop` / `-portrait`.
[Live metadata](live-captures.json) preserves camera/framing, effects, route and
settled state per capture.

- Before desktop: 1440×900 CSS/buffer, browser/render DPR 1. After desktop:
  1280×720 CSS/JPEG, browser/render DPR 2, 2560×1440 buffer.
- Before portrait: 390×844 CSS/buffer, DPR 1. After portrait: 390×844 CSS/JPEG,
  browser DPR 2, renderer 1.75, 682×1477 buffer.
- Shadows were enabled throughout; live GTAO (`contactShading`) was on for
  desktop and off for phone portrait. Live Earth, stars and animation continued.
- Live images are contextual checks, **not pixel-matched comparisons**: viewport
  and resolution differences above, plus unfrozen background phase, prevent that
  claim. Use the seven finite pairs for matched material judgment.
- A temporary browser viewport override produced half-scale compositor output
  and command timeouts. Rejected captures were replaced, not used as approval
  evidence. Resetting the override and creating a fresh hidden tab restored
  normal output. Portrait sizing was set before page navigation.

All room finishes were inspected at actual viewing scale. Menu navigation,
ordinary room entry, About→Projects through the ladder and return to overview
completed. Portrait Contact entry through the callout's Enter key and return
also completed; final desktop/portrait browser warning/error logs were empty.
A released desktop drag was captured in
[after-overview-drag-desktop.jpg](after-overview-drag-desktop.jpg); it is not a
held maximum endpoint. Navigation logic and framing sources remain unchanged.
Safari, physical touch devices and OS reduced-motion settings were not exercised.
Automated navigation/feedback coverage supplements these bounded live checks.

## Construction and rendering implications

[Full model audit](model-audit.json) builds source-identified snapshots in both
wide and compact layouts. Geometry attributes/indices, transforms, hierarchy,
metadata (including bounds/anchors/targets/readers), and 50 texture signatures
are exact. Its canvas stub records deterministic drawing commands; this is not
GPU texture readback. Ten additional state cases cover five door/hover/transit
states in both layouts. Feedback fields and iris signals are exact.

Only 48 named hardware finish signatures differ. The 239 protected material
signatures are exact. Both layouts retain 610 mesh nodes, 545 unique geometries,
and **56,231,352 bytes of geometry typed arrays**. Wide/compact visible triangle
potential remains **1,020,976 / 997,776**; these are scene traversal counts,
not camera-culled production draw counts. Material instances referenced by
meshes remain 351. The separate route-paint source adds one construction-time
material template, not a rendered mesh or texture; its process-memory cost was
not measured.

No measured CPU/GPU timing, process/GPU memory, heat or battery conclusion is
claimed. Material response can change rendering work despite unchanged counts.
This establishes a new authored baseline, not an optimization result.

## Verification and handoff

Focused hardware/palette/iris/ladder checks passed 20/20. The final full suite
passed **588/588**, with typecheck, production build/geometry precheck and affected
lint all passing. [Verification and normalized logs](verification-checks.json)
record the disposable source checkout, explicit `TEST_BASE_URL`, fresh test-only
D1/R2/secrets and final source hashes. No private environment or main state was
copied. Build warnings for the deprecated Node registration API, large chunks
and Vinext's unclassified `/experience` route remain recorded; no failed check
was waived.

Temporary review tabs, viewport overrides, comparison/test servers and isolated
state are cleaned up; the main server remains HTTP 200 at port 3000. The
[independent review](critic-review.md) scores **95/100**, with 50% visual-design
weight and no unresolved blockers. It records its rubric, revisions and limits.

Carry forward the explicit alloy/bronze finish profiles, restrained highlights,
functional material exceptions and each room's separate identity. Stage 12 owns
Earth/sky refinement; preserve the world/camera relationship, approved regional
Earth registration and current hardware baseline. No deferred geometry or
furniture correction blocks that stage.
