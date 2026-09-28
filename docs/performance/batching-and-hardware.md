# Fewer submissions and less invisible hardware detail

Consolidates former ledger entries **01–02** and the current geometry budget.
Each comparison has its own source baseline. Do not add their gains or compare
them across resolutions; subsequent authored geometry changes workload counts.

## Current bevel and hardware budget

Against `33c29fa3bc92907cb72d96b4b1d70bdce98fe5ab`, rounded cuboids use their
bevel radius to select 5/7/9 segments, preserving the dense broad curves and
existing small parts. Small, immutable hardware batches join an existing opaque
sibling draw only when material, parent, section, picking and shadow state agree.
Animations, reader assemblies, custom shaders and instance colors stay separate;
the 2,048-triangle per-batch limit bounds expansion of repeated geometry.

The wide visible model inventory changes **1,021,076 → 860,804 triangles
(−15.7%)**, **533 → 496 meshes (−6.9%)** and **41,519,544 → 37,965,408 geometry
array bytes (−8.6%)**. Merging alone adds 454,152 array bytes; reduced bevels more
than offset that cost. Both wide and compact model bounds are unchanged. These
are scene inventory/array counts, not measured GPU memory or frame-time gains.

Nine matched finite views in hidden built-in **Chromium 154** use time 0, wide
construction, DPR 1, and 1280×720 CSS/buffer (900×1200 for portrait Contact).
Projects changes **831 → 773 draws**, including the fixture's shadow generation,
and **1,889,036 → 1,592,560 submitted triangles**. Across these views, draws fall
6.3–9.5% and triangles 15.3–17.0%. The fixture omits GTAO, Earth, live screen
interfaces and navigation; these counts cannot establish an application timing,
energy or battery percentage. Stationary cache hits already reuse the static
ship; the reductions chiefly affect reconstruction and direct rendering.

The accepted visual tradeoff is tiny bevel curvature/shading differences.
Matched checks cover all rooms, ladder/service equipment, roof and underside
access routes, and portrait Contact. In the eight desktop pairs, excluding the
top 110-pixel control strip, mean channel difference is 0.035–0.173 on a 0–255
scale; at most 0.0581% of scene pixels change by more than 16 in any channel.
These image statistics supplement visual inspection rather than guarantee every
camera/device. Live app checks include default shading, room/reader interaction
and responsive overview. Native Safari and GPU/CPU timing were not tested.

[Source identities, inventory, matched view counts and image differences](../evidence/performance/geometry-budget/comparison.json)
preserve this comparison separately from the earlier runs. Representative
[Projects](../evidence/performance/geometry-budget/projects-pair.png) and
[Contact](../evidence/performance/geometry-budget/contact-pair.png) pairs show
before on the left, after on the right (scene crops displayed at half size).

Regressions check closed bevel topology, dimensions, normals and UVs; expanded
hardware triangle inputs and resource ownership; render/picking exclusions;
both layouts; category repacking, dimming and display feedback. Full integration
verification uses disposable D1/R2 state under the operations guide.

## Exact batching and matrix reuse

At baseline `6689a72`, repeated compatible hardware batches and repeated hierarchy
walks were avoidable work. Static sibling batches now combine only when complete
geometry bytes, material, transforms and render flags agree. Interactive,
animated, transparent, transmissive and custom-render cases are excluded. The
runtime synchronizes scene matrices once after model/reader updates; standalone
model consumers retain immediate updates. Geometry and animation cadence stay
unchanged.

The matched overview changes **466 → 436 draws**, retaining **886,144 triangles**.
Projects/About/Case studies/Contact draws change 51→43 / 58→54 / 41→29 / 45→39.
Combined batches can submit previously culled instances, so savings depend on
view. Exact geometry/instance and animated world-matrix/raycast tests protect the
behavior; fewer draws alone do not establish a speedup.

The original Chromium 152 production investigation used 1200×800 CSS. Its DPR 2
part-isolation series drifted from 7.73 to 14.48 ms ship GPU between reference
captures, invalidating the component timing ranking. Hiding parts also changes
occlusion. A **separate DPR 1** comparison verifies the draw reduction but also
has unstable controls; no reliable end-to-end timing percentage is claimed.
The 60-second optimized capture retained 3,575 frames/59.98 seconds, averaging
59.58 FPS, 5.40 ms callback and 7.69 ms ship GPU. It is a descriptive sustained
sample, not thermal equilibrium or a heat/battery result.

Evidence retains settings, captures, trends and the nonzero image difference:

- [Targeted production survey](../evidence/performance/production-targeted-baseline.json)
- [Optimized captures](../evidence/performance/production-optimized-captures.json)
  and [matching-DPR reference](../evidence/performance/production-reference-dpr1.json)
- [Before](../evidence/performance/before-projects-dpr1.png),
  [after](../evidence/performance/after-projects.png) and
  [image comparison](../evidence/performance/projects-image-comparison.json).
  Fresh-page GTAO noise/history prevents treating these as pixel-exact pairs.

## Targeted hardware tessellation

The second baseline already includes batching/matrix reuse. The
[source manifest](../evidence/performance/hardware-detail/revision-manifest.json)
identifies it; original component files match `6689a72`. Projects bezel/gasket
corners were reduced from 32 to 12 samples; eight grab loops use eight corner
samples and one bevel layer. About's 20 page-edge strips use closed cuboids.
Dimensions, holes, placements, printed pages and room arrangements were retained.
The approved tradeoff is minute close-up curvature/bevel detail, not exact pixels.

[Geometry comparison](../evidence/performance/hardware-detail/geometry-comparison.json):
Projects furniture 188,252→144,476 triangles; About 90,154→70,954. The overview
loses **62,976 submitted triangles (7.1%)**, while unique visible geometry arrays
fall **36,227,100→30,961,596 bytes (14.5%)**. This is array storage, not measured
process or GPU memory. Both layouts preserve bounds and mesh counts.

Each selected room used A1→B1→B2→A2 production captures, ten measured seconds
after three warmup seconds, Chromium 152, 1200×800 buffer/DPR 1. Projects mean
ship GPU observed 9.30→8.33 ms; About 8.58→7.31 ms. Two runs per version/room
supply only 40 GPU samples, with appreciable variation. Both views stayed around
30 rendered FPS. This supports reduced submitted work and an encouraging local
GPU observation, **not an FPS, Safari, heat or battery claim**. The separate
native 2560×1440 overview check verifies 436 draws/823,168 triangles and is not
timing-comparable to the room captures.

[Timing summary/settings](../evidence/performance/hardware-detail/timing-summary.json)
indexes the retained A1/B1/B2/A2 raw recordings. Visual evidence includes
[Projects before](../evidence/performance/hardware-detail/before-projects.png)/
[after](../evidence/performance/hardware-detail/after-projects.png),
[About before](../evidence/performance/hardware-detail/before-about.png)/
[after](../evidence/performance/hardware-detail/after-about.png), native-DPR2
[hardware before](../evidence/performance/hardware-detail/before-projects-detail-dpr2.png)/
[after](../evidence/performance/hardware-detail/after-projects-detail-dpr2.png), and
[compact Projects](../evidence/performance/hardware-detail/after-projects-compact.png).

Reproduce a source-identified inventory with
`node scripts/measure-hardware-geometry.mjs [preserved-source-directory]`.
Use the [diagnostics guide](../performance-diagnostics.md) for new browser
comparisons; today's art is a new baseline.
