# Fewer submissions and less invisible hardware detail

Consolidates former ledger entries **01–02** (14 September 2026). These are two
successive interventions, with separate baselines. Their figures must not be
added or compared across resolutions. The mechanisms remain in production;
subsequent authored room geometry makes these historical workload counts.

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
