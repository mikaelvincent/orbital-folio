# Stage 07 — Docking assembly and shoulder

25 September 2026. Baseline `f60ebf56421e115bbae07b0c5b6e627d738a44f7`.

The owner later rejected the service cassette's face-like port/latch arrangement.
Only that box is superseded by the [current access-cover correction](../docking-service-hatch/README.md).
The collar, main hatch, barrel and surrounding fittings below remain current.

The pressure barrel and its coaxial shoulder mount already provided a coherent
silhouette. The weak points were the thick bronze bumper around a stack of discs,
disconnected wheel/handle details and two separate side panels. The final assembly
uses a satin mating flange, dark seal and closed ivory leaf, with three small
bronze contact shoes. These are static authored fittings; no articulated latch
or mechanically validated docking operation is claimed.

The exterior wheel now has a carbon grip, connected alloy spokes and a bronze
hub. Both feet of each leaf handle and all twelve collar fasteners reach their
supports. The inner hatch keeps its leaf, gasket and locking tabs; its bronze
spokes now connect to a carbon rim in the same plane. One low carbon service
cassette replaces the luminous side panel and separate lower latch panel. Its
curved alloy saddle follows the sleeve, with two vertically stacked capped
couplings, seated fasteners and a side latch.

The broad ivory barrel remains intentionally quiet. The completed ladder's dark
backing, alloy treads, bronze support stations, spanners, end grips and clear
spaces remain unchanged, as do the four cabins, exterior access ladders and
opposite service/dish/solar assembly. Shared framing and overview support points
remain exact in both layouts.

## Before and after

| View | Before | Final |
| --- | --- | --- |
| Exterior oblique, wide, 1440×900 | [Before](before-exterior-wide.jpg) | [After](after-exterior-wide.jpg) |
| Exterior face, wide, 1440×900 | [Before](before-face-wide.jpg) | [After](after-face-wide.jpg) |
| Inner hatch, wide, 1440×900 | [Before](before-inner-hatch-wide.jpg) | [After](after-inner-hatch-wide.jpg) |
| Shoulder and cabin interface, wide, 1440×900 | [Before](before-shoulder-wide.jpg) | [After](after-shoulder-wide.jpg) |
| Exterior oblique, compact, 390×844 | [Before](before-exterior-compact-portrait.jpg) | [After](after-exterior-compact-portrait.jpg) |
| Live landscape overview, 1440×900 | [Before](before-live-overview-landscape.jpg) | [After](after-live-overview-landscape.jpg) |

Final context: [ladder bay](after-ladder-wide.jpg),
[live portrait overview](after-live-overview-portrait.jpg),
[landscape drag release](after-live-overview-drag-release.jpg),
[landscape transfer](after-live-ladder-transit-landscape.jpg),
[portrait transfer](after-live-ladder-transit-portrait.jpg),
[Projects landscape](after-live-projects-landscape.jpg),
[Projects portrait](after-live-projects-portrait.jpg),
[About landscape](after-live-about-landscape.jpg) and
[About portrait](after-live-about-portrait.jpg).

All 21 original JPEGs were inspected in hidden built-in **Chromium 153**.
Actual CSS viewports, drawing buffers and images are **1440×900** or **390×844**,
browser/render DPR 1, without scaling. The finite compact layout is checked
separately; both live orientations use the wide model. Live shadows remain on;
GTAO is enabled in landscape and disabled in portrait under the existing policy.
The main server and published content were reused without data edits.

The finite fixture holds time at 0, uses RoomEnvironment intensity 0.24, fixed
lights and PCF shadows. It omits GTAO, Earth/sky, navigation and live screen
applications, with fallback neighboring content. FOV is 38°, except the **90°
inner-hatch inspection view** taken from within the narrow bay. Its inspection
lens does not change the application camera. Matched pairs use identical poses.
Live images are observed moving-scene states, not pixel-matched comparisons:
Earth/sky phase and the brief interval between DOM metadata and capture can differ.

[Capture metadata](browser-captures.json) records exact dimensions, poses, effects,
image hashes and source identities. The [source manifest](source-manifest.json)
freezes 44 transitive sources per version at `2026-09-24T23:50:23.943Z`; only
`docking-service-assemblies.ts` and the inner-wheel block of `spacecraft-model.ts`
change at runtime. The [interaction record](live-interactions.json) documents
successful overview/room/ladder travel, bounded drag, inert cassette clicking
and an empty final browser error sample. Transit images are finite observations;
the full suite separately checks automatic door interlocks.

## Refinement and verification

The source audit found unsupported original wheel, handle and bolt contacts.
The first new saddle also exposed an important geometry issue: the rounded-box
helper concentrates vertices at bevels, so simply warping it left a flat chord
across the back. Transverse sampling now follows the real sleeve continuously.
Clamp seats were moved onto the flat flange face to remove an intersection, and
the cap-grip extent was adjusted to retain exact overview support points. A live
close-up exposed a face-like port/latch composition; the vertical pair and side
latch resolve it. All affected final images were refreshed after these changes.

The [construction audit](construction-audit.json) records **8/8 final-source
checks** using actual solids and instances in both layouts, including 25 sampled
saddle contacts. It also confirms exact protected assembly, material, transform,
framing, aperture and route comparisons. These are finite geometric checks,
not physical engineering certification.

The [isolated verification record](verification-checks.json) reports **568/568
tests**, typecheck, production build/geometry check and affected lint passing
against the final source. Tests ran from a disposable source-only checkout,
fresh test-only D1/R2/secrets, its own Vite cache and explicit
`TEST_BASE_URL=http://127.0.0.1:3003`. No private environment or main store was
copied. Two earlier runs interrupted for visual refinements remain explicitly
incomplete, with their source hashes and partial logs preserved. Non-failing
build warnings concern Node DEP0205, chunk size and Vinext route analysis.

The independent [critic review](critic-review.md) scored **95/100**, with 45%
weight on visual design and no unresolved blockers or requested implementation
revisions. It records the rubric, resolved wording caution and verification limits.

## Rendering implications and limits

Per layout, exterior docking changes from **14,396 → 18,268 triangle inputs** and
**9 → 8 mesh candidates**. The inner hatch keeps **6,684 triangles**, with batches
**5 → 4**. Whole-model change is **+3,872 triangle inputs, +290,528 geometry-array
bytes and −2 visible mesh candidates** (520 → 518). Nested inventories overlap.
The extra geometry supports the rounded flange and properly curved saddle.

Matched finite wide exterior frames record **926 → 922 calls** and
**1,940,442 → 1,948,186 triangles**, including requested shadow work. These fixture
counts do not establish faster rendering, reduced process/GPU memory, heat or
battery gains. No timing benchmark or held optimization candidate is included.
Native Safari, a physical phone and a browser reduced-motion override were not
checked; those checks remain unperformed. Hidden review tabs are closed, the
viewport override is reset, and the finite preview and isolated test server are
stopped. The disposable test checkout/state was removed; main localhost:3000
remains HTTP 200.

## Next-stage handoff

Stage 07's completed reference is the quiet ivory pressure barrel, satin mating
face, dark seals and handling surfaces, restrained bronze shoes/hub/handles, and
visibly seated hardware. Preserve the completed ladder and exact shared camera
frame. Stage 08 owns the opposite service bus, dish and solar wings; carry forward
curved mounting seats and clear support paths while retaining that assembly's
distinct purpose. There are no deferred runtime blockers from this stage.
