# Editing spacecraft assets

Use [project context](PROJECT-CONTEXT.md) for the owner's current design and
navigation decisions. This guide records construction contracts that are easy to
break when changing the procedural TypeScript asset.

## Entry points and contracts

| Responsibility | Start here |
| --- | --- |
| Scene assembly, metadata, update and reader anchors | `features/spacecraft/spacecraft-model.ts` |
| Renderer, picking, lighting and resource disposal | `features/spacecraft/spacecraft-runtime.ts` |
| Exterior sun, cabin emitters and material light linking | `features/spacecraft/lighting.ts` |
| Room furniture and equipment | `features/spacecraft/rooms/`, `features/spacecraft/equipment/` |
| Pressure surfaces, primitives and wall datums | `features/spacecraft/geometry/` |
| Camera, door sequencing and feedback | `features/spacecraft/navigation/` |
| Semantic content attached to scene surfaces | `features/portfolio/world-reader.tsx` |
| Earth, atmosphere, stars and meteors | `features/orbit/` |

Model coordinates are +Y up and +Z toward the cutaway. The website uses the wide
physical layout at every viewport; compact construction remains an asset-tool
and test API. Camera and annotations consume model anchors. Furniture bounds
must not redefine architectural camera fit.

Preserve `group.userData` framing/doorway/adjacency metadata and per-object names,
section ownership, semantic equipment metadata and attachment anchors: picking,
diagnostics and geometry checks consume them. `motionActive` includes lighting
and highlight changes, not just mesh movement. The internal `experience` identity
and persisted records intentionally back the public Case studies room; old
`/experience` URLs remain compatible.

Static batching and instancing must preserve room dimming, shadow flags,
passive/interactive distinctions and source metadata. Moving iris leaves and
reader assemblies remain separate. Shared geometry/materials must outlive every
consumer. Room highlights affect local materials/emission; exposed exterior
surfaces keep their own finish. Camera motion can invalidate cached lighting or
contact shading even though the spacecraft stays still.

Rounded cuboids choose bevel detail by radius as well as overall size: long,
thin hardware must not inherit the subdivision budget of broad rounded forms.
Keep their bounds, smooth normals and physical face UVs when changing detail.
The exterior crown spans straight sections directly. Its shared depth grid drops
only samples collinear in both the crown and rear-return profiles; keep curved
breakpoints shared by the roof, keel, bow and docking return. Re-tessellation can
change interpolated normals, so inspect grazing highlights as well as joins.

After ordinary batching, small immutable hardware instances can join an existing
opaque sibling draw with the same material, section, picking and shadow state.
Without an ordinary target, two or more compatible sibling batches can form one
draw, with a combined 2,048-triangle expansion limit. The same per-source limit
applies when joining an existing draw. Large repetitions stay instanced; animated,
reader, custom-render and per-instance-color paths remain separate. Do not cross
parent boundaries. Source names survive in `userData.parts`. Construction tests
needing individual solids must capture removed instance sources as well as
ordinary meshes.

## Interaction and accessibility

Contact's configured social monitors use native links over model anchors. Other
furnishings do not gain an action merely by receiving decorative text. Room and
door navigation and reading-view controls are separate. Social authoring lives in
[operations](OPERATIONS.md#contact-social-placement).

Pointer feedback follows the topmost visible target; keyboard feedback follows
focus. Pointer takeover retains DOM focus but clears the old visual highlight.
Native controls block picking behind them. Dragging, travel, cancellation, blur
and hidden-page transitions clear stale feedback; touch does not create hover.
Preserve semantic readers, native scroll, keyboard focus and contact form state
when changing attachments or renderer lifecycle.

## Provenance and specialized verification

[Texture provenance](../public/textures/README.md) identifies runtime versus
rebuild-only assets; [asset preparation](../scripts/assets/README.md) records
repeatable rebuilds. Keep source identity and license notices with derivatives.
Service-module forms draw functional inspiration from ESA's
[ATV service module](https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ATV/ATV_Service_Module)
and [proximity equipment](https://www.esa.int/ESA_Multimedia/Images/2013/06/ATV-4_docking);
the spacecraft remains an artistic interpretation.

Visual edits need rendered inspection of affected camera/layout states: geometry
checks cannot judge aesthetics. Finite preview helpers in `scripts/benchmarks/`
are useful for construction but omit parts of the live app; disclose their limits
when using captures. General scope-based verification is in [AGENTS](../AGENTS.md).
For performance measurements, use the
[diagnostics procedure](performance-diagnostics.md#thermal-aware-comparison-procedure);
workload counts alone do not establish rendering speed.
