# Editing the spacecraft and orbital environment

Read [project context](PROJECT-CONTEXT.md) for approved art and navigation decisions.
This guide describes the asset contracts and how to work on them. The procedural
spacecraft remains editable TypeScript; no purchased model or Blender setup is
required. Content editing belongs in the studio, not in geometry source.

## Start with the owning responsibility

| Change | Starting point |
| --- | --- |
| Scene assembly, metadata and animation | `features/spacecraft/spacecraft-model.ts` |
| Shared materials, geometry cache and object builders | `features/spacecraft/geometry/model-primitives.ts` |
| React host and loading/fallback view | `features/spacecraft/spacecraft.tsx` |
| Renderer lifecycle, lighting, picking and disposal | `features/spacecraft/spacecraft-runtime.ts` |
| About berth, notebook and personal objects | `features/spacecraft/rooms/about-personal-study.ts` |
| Projects category bank and workshop | `features/spacecraft/rooms/projects-workshop.ts`, `features/spacecraft/rooms/projects-payload-module.ts` |
| Case studies archive | `features/spacecraft/rooms/case-study-archive.ts` |
| Contact console, audio hardware and social monitors | `features/spacecraft/rooms/contact-flight-console.ts`, `features/spacecraft/rooms/contact-flight-audio.ts` |
| Cabin utility and outboard equipment | `features/spacecraft/equipment/cabin-utility-fittings.ts`, `features/spacecraft/equipment/outboard-wall-equipment.ts` |
| Docking collar, service bus, solar wings and communications | `features/spacecraft/equipment/docking-service-assemblies.ts` |
| Exterior access routes and ladder fittings | `features/spacecraft/equipment/exterior-service-equipment.ts`, `features/spacecraft/equipment/docking-shoulder-equipment.ts`, `features/spacecraft/equipment/ladder-endcap-equipment.ts`, `features/spacecraft/equipment/ladder-service-spine.ts` |
| Pressure surfaces and window reveals | `features/spacecraft/geometry/continuous-exterior-skin.ts`, `features/spacecraft/geometry/rounded-cabin-interior.ts`, `features/spacecraft/geometry/flush-window-reveals.ts` |
| Shared architectural dimensions | `features/spacecraft/geometry/spacecraft-wall-layout.ts`, `features/spacecraft/rooms/cabin-composition.ts` |
| Door mechanisms and navigation | `features/spacecraft/navigation/iris-hatch.ts`, `features/spacecraft/navigation/iris-navigation.ts`, `features/spacecraft/navigation/door-navigation.ts` |
| Camera and responsive fit | `features/spacecraft/navigation/vessel-camera.ts`, `features/spacecraft/navigation/scene-controls.ts`, `features/spacecraft/navigation/cabin-itinerary.ts` |
| Callouts and scene feedback | `features/spacecraft/overview-annotations.ts`, `features/spacecraft/navigation/scene-feedback.ts` |
| Earth, atmosphere, stars and meteors | `features/orbit/orbital-environment.ts`, `features/orbit/earth-satellite.ts`, `features/orbit/earth-view-transform.ts` |

## Model coordinates and contracts

Model coordinates use +Y up and +Z toward the cutaway. The spacecraft remains
stationary; camera position and roll handle portrait overview, room entry, hover
and drag. Camera and annotations consume model-provided anchors instead of
copying room coordinates. The website uses the wide physical layout at every
viewport; the compact model API remains available to asset tools and tests.

`createSpacecraft(THREE, options)` returns the group, update function, room and
portal targets, social interaction targets, reader surfaces and content/page/
layout setters. Options include editable labels, projects, case studies, social
links, sample copy and the baseline instance-coalescing switch. Consult its types
for the complete contract before changing an entry point.

The model's `group.userData` publishes architectural bounds, framing points, room
and doorway metadata, adjacency and current motion state. Per-object names,
section ownership and semantic equipment metadata support picking, diagnostics
and geometry regression checks. Preserve these even when extracting builders.
`motionActive` also reflects lighting/highlight changes, not just moving meshes.

The internal `experience` identity and its persisted records are intentional;
the public room is Case studies at `/case-studies`, with `/experience` remaining
compatible. Project/category artwork and archive furniture do not automatically
create new content navigation. The existing page setters and reader attachment
contracts remain available independently of which physical actions are enabled.

## Geometry, materials and ownership

Use the existing cream, graphite, alloy and amber materials and the owning room's
builder. Shared pressure-wall datums keep shell openings, doors, signs, fixtures
and camera framing aligned. Put dimensions with their owning construction or
shared architectural module; do not let furniture bounds redefine room fit.

Static parts use material batching and repeated fittings use instancing. Builders
must retain their names, diagnostic source metadata, room dimming, shadow flags,
passive/interactive distinction and attachment anchors through batching. Moving
iris leaves and reader assemblies remain separate from static batches. Geometry
and materials shared across objects must not be disposed while still in use.

Room highlighting changes local material multipliers and fixture emission;
exposed exterior surfaces retain their own materials. The lighting rig, cached
shadow map and cached GTAO are renderer responsibilities. Moving the camera can
invalidate lighting or contact shading even when the spacecraft is stationary.
Changes to these systems are performance work and require the ledger protocol.

## Interaction and accessibility

Only configured Contact social monitors currently register furnishing actions.
Their native links overlay physical anchors; the central display and other
passive furnishings do not become buttons by acquiring decorative text. See
[Contact social channels](contact-social-channels.md) for authoring and placement.
Room navigation, door navigation and explicit reading-view controls are separate.

Room callouts, physical doors, navigation controls and social monitors share one
feedback controller. Pointer input uses the topmost visible target; keyboard
input uses the focused control. Switching to the pointer retains DOM focus but
must clear its old visual highlight. Native controls block picking behind them.
Dragging, travel, cancellation, blur and hidden-page transitions clear stale
feedback; touch does not create hover.

`features/portfolio/world-reader.tsx` owns the semantic instrument content. Keep keyboard
focus, native scroll, reading fallback and contact form state functional when
changing model attachments or renderer lifecycle. Validate behavior through both
interactive and readable views rather than relying only on geometry tests.

## Earth and asset provenance

Production uses the local 8192×4096 Mediterranean night Earth image with the
cinematic atmosphere, stars and occasional meteor groups. It requests the chosen
map only. Public globe controls and old procedural-cloud trials are not part of
the current interface. Historical implementations and lower resolution assets
remain in developer comparison tooling where they are used.

[Texture records](../public/textures/README.md) carry NASA credits and manifests.
[Asset preparation](../scripts/assets/README.md) documents source verification
and repeatable encoding. Keep source identity and notices with derived assets.
The functional inspiration for the service module includes ESA's
[ATV service module](https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ATV/ATV_Service_Module)
and [proximity equipment](https://www.esa.int/ESA_Multimedia/Images/2013/06/ATV-4_docking);
this remains an artistic interpretation, not an engineering qualification.

## Verify an asset change

Use the related tests and inspect the actual rendered result at useful room,
overview, hover/drag and responsive states in the hidden built-in browser.
Geometry checks cover fit and continuity; they cannot judge aesthetics. Full
model/renderer/navigation changes also need type checking, the test suite,
affected lint and a production build.

`node scripts/benchmarks/spacecraft-geometry-inventory.mjs <baseline-commit>`
compares source-identified static geometry counts. The reusable finite preview
and Earth resolution lab live in `scripts/benchmarks/`; their documented omissions
matter when interpreting captures. A finite asset preview is not the full app,
and counts alone are not a rendering-performance result.

The standalone `scripts/chassis-geometry-audit.mjs`,
`scripts/case-studies-routing-migration-audit.mjs`, `scripts/scene-controls-audit.mjs`
and `scripts/render-input-audit.mjs` passed after the reorganization. They check
specific geometry, migration/routing or numerical input behavior, not browser
appearance. `scripts/orbital-environment-audit.mjs` runs the maintained Earth/cloud
correctness suites and accepts a comparison artifact.

Three older utilities retain potentially useful specialist checks and are not
part of `npm test`: `scripts/spacecraft-metadata-audit.mjs` and
`scripts/spacecraft-model-cost-audit.mjs` have preexisting Canvas fixtures without
`Path2D`, so direct execution fails; their numerical checks pass when an external
no-op `Path2D` fixture is supplied. That fixture cannot establish canvas appearance.
The cost audit requires explicit before/after models and includes checks specific
to the earlier rounded-box tessellation change. `scripts/leader-routing-audit.mjs`
reads saved browser records; it accepts the current portrait `mirrored-rails`
layout but skips the current landscape `corner-leaders` layout. Retain these until
their remaining comparison uses are resolved; do not treat them as complete
current scene validation.

For measured performance comparisons, follow [the diagnostics guide](performance-diagnostics.md)
and update [the running ledger](performance-ledger.md). Its candidates remain
held until authorized. Keep necessary comparison evidence; use Git history for
superseded one-off implementation reports rather than duplicating them here.
