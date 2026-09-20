# Texture coverage certificate and its limits

This is a CPU geometry audit, not a rendering benchmark. It supports the delivered
2560 × 1536 atlas at original source column 3712 and row 384. It does **not** prove
that 1536 is the globally smallest safe height for arbitrary browser dimensions.
The application has no hard minimum/maximum viewport or aspect ratio, and this
work adds no camera restrictions.

## Final bounds

| Mesh | Directly visible source rows (outward-rounded) | Continuous-neighborhood source rows | Largest sampled same-latitude span | Guarded global span |
| --- | --- | --- | --- | --- |
| Desktop | 469–1479 | 469.333–1805.333 | 84.375° | 87.1875° |
| Mobile | 512–1471 | 512–1795.195 | 86.250° | 86.250° |

The retained rows are 384–1919 (exclusive lower edge 1920). Across both meshes,
this leaves at least 85.33 source rows above and 114.67 below the expanded
footprint. Both exceed the practical 64-row allowance. The largest guarded
longitude envelope is 25.31° narrower than the 112.5° repeat. The geometric
U=0/1 boundary stays at least 115.31° away in longitude in the guarded results.
A complete traversal takes 436.332 seconds at the unchanged 0.0045 rad/s rate.

The combined expanded base footprint needs 1337 integer rows; adding the chosen
64-row border on each side yields 1465 rows. Rounding that authoring budget to
128-row increments yields the selected 1536. **1465 is conditional on this audit
and the chosen filter allowance; neither number is a universal optimal height.**

See [desktop summary](coverage-desktop.json) and [mobile summary](coverage-mobile.json).
Each contains 24,157 pose records in its linked compressed raw-data file; together
48,314 actual-mesh poses are evaluated. The final summaries distinguish the hashes used for the geometric calculation
from the final crop-metadata hashes. After the complete responsive-lens sweep,
only the crop origin changed from 320 to 384, the audit default was updated to
match, and a runtime-only annotation projection synchronization changed. All
mesh, world-transform, camera-fit, FOV and clipping inputs retain matching
hashes. Normalized UV footprints therefore remain applicable without another
identical sweep. `normalizedFootprintRebase` records this explicitly; compressed
raw files retain their original computed source hashes. No rerun is implied.

## What is mathematically bounded

`mesh-uv-coverage.mjs` reads the actual sphere's indexed triangles and UVs. It
culls backfaces and clips each triangle against the six homogeneous camera
frustum planes. The clipper carries interpolated UVs along the clipped edges.
Within a clipped polygon, perspective-correct UV interpolation is a ratio of
affine functions with positive denominator. Its extrema occur on the polygon
vertices. Consequently the reported row bounds cover **every fragment of every
retained triangle at that pose**, rather than merely sampled rays. Calculations
use ordinary JavaScript doubles, not an exact-arithmetic theorem prover.
Spacecraft, HTML and atmosphere occlusion are ignored: retaining obscured Earth
pixels is conservative.

The longitude envelope is also evaluated at shared latitude. Polygon edges are
affine U(V); between successive polygon-vertex V levels, the outer span is
`max(affine U) − min(affine U)`, a convex function whose maximum is at an interval
endpoint. Checking those levels bounds simultaneous same-latitude duplication.
A diagonal footprint can have a much wider global longitude envelope than any
single latitude. The final report preserves both quantities.

A second calculation expands the frustum to cover a **continuous neighborhood**
around each audited pose. For camera translation at most δ and a change of each
unit frustum-plane normal by at most θ, signed point-to-plane distance can change
by at most:

`δ + 2 sin(θ / 2) × D`

Here D is bounded by the camera-to-sphere-center distance plus the world-space
sphere radius. Expanding each plane by that value and allowing potentially
front-facing triangles under the translation bound produces a conservative
superset of all those neighboring projections. The final run uses δ = 0.25
orbital units (8 spacecraft units) and θ = 5.5°. Changing aspect ratio or lens is
included only when its resulting frustum-plane changes remain within θ. This is
a conditional geometric bound, **not** a proof that every possible application
state lies in the union of those neighborhoods.

Earth's sphere now remains fixed while its texture U offset advances. Therefore
visible base V rows and geometric sphere-seam location remain fixed through the
entire loop at a given camera pose. The authored width's 112.5° period does not
divide 360°; rotating that sphere would eventually expose a mismatch between U=0
and U=1. Scrolling its map instead leaves that boundary in the audited hidden
region. RepeatWrapping handles the joined image edges independently of the
hidden geometric boundary. Seam-image and filtering quality require rendered
inspection; this geometric certificate does not certify artwork continuity.

## Audited domain

Both actual desktop (128 × 96 segments) and mobile (96 × 64 segments) sphere
meshes are audited. The spacecraft is generated from current production builders.
Camera frames use current production helpers and the fixed canonical orbital
reference. Every fit and Earth projection uses the delivered responsive lens:
38° vertical in landscape, at least 38° horizontal in ordinary portrait, with a
78° vertical cap for unusually tall windows. The 390×844 viewport uses approximately
73.384° vertical. Per-pose and per-viewport FOV values are retained in the reports.
Changing this lens invalidates earlier fixed-38° crop conclusions. Public-seed identity/navigation inset assumptions are recorded in each
JSON; custom identity wrapping or safe-area dimensions can change these fits.

The 17 viewports include 1280×720, 1440×900, 1920×1080, 2560×1080, 2560×600,
1024×768, 768×1024, 390×844, 360×800, 844×390, 768×4096, 320×568,
320×1200, 1080×1920, 4096×768, 700×701 and 701×700.

Each run includes neutral overview and four rooms; 5×5 drag samples; hover
extremes; overview hover-target translation/dolly; the three document readers;
the Contact computer's real screen/keyboard fit; and eleven interpolated
Home-to-room states with 5×5 drag samples. There are 24,157 poses per mesh.

Travel is a **finite linear interpolation envelope**, not a replay of every
spring, clearance route, ladder traversal, reverse transition or resize timing.
Dedicated reader/computer endpoints are included, but every intermediate
close-up spring is not separately replayed. The continuous-neighborhood bound
covers additional nearby states; we have not established complete neighborhood
coverage of all runtime trajectories. Extreme unsupported/unbounded viewport
sizes are not silently treated as proven safe.

## Height and filtering decision

The reports separate directly visible base rows, expanded-neighborhood rows,
retained-crop margins and a practical 64-source-row filtering allowance. The
smallest 128-row-aligned height satisfying that **chosen certificate and margin**
is reported; this alignment is an authoring convenience, not a GPU requirement
or universal mathematical optimum. The selected crop retains native source
texel density, with no downsampling of Europe.

64 rows is a conservative practical authoring allowance, **not** a proof of
pixel identity at all mip levels. Coarse mip texels summarize larger regions,
and constructing a new mip chain after cropping changes their averages. No
finite narrow border can guarantee byte-identical filtering against the old
atlas at every possible minification. The actual rendered comparisons judge
boundary color influence and retained detail. The regenerated bridge covers the entire final 384–1919 source-row range;
the earlier repeated-last-row padding is not accepted for this wider lens.

The preliminary row-256 crop was first revised to row 320 under a fixed 38°
lens. The accepted wider portrait lens then exposed more southern terrain in
the continuous-neighborhood certificate: the row 320 crop missed the chosen 64-row
margin, and its generated-edge padding began inside that certificate. The final
crop starts at row 384 and the bridge was regenerated for the full matching range.
Superseded summaries preserve their source and raw-data hashes; duplicate
intermediate raw pose files are omitted because these were coverage iterations,
not timing measurements. See [superseded calculations](coverage-superseded.json).
The height remains 1536. This placement correction is not a rendering-speed claim.

## Reproduce and inspect

A fresh invocation below computes the entire sweep against the final source and
row 384 crop directly. The checked-in reports instead preserve the original
responsive-lens computation and its documented metadata-only crop rebase.

```sh
node scripts/benchmarks/earth-visible-coverage.mjs --gzip-samples \
  --out docs/evidence/earth-consistent-loop/coverage-desktop.json
node scripts/benchmarks/earth-visible-coverage.mjs --mobile-mesh --gzip-samples \
  --out docs/evidence/earth-consistent-loop/coverage-mobile.json
node --test tests/orbit/mesh-uv-coverage.test.mjs
```

Each summary records source hashes and links its compressed raw pose data.
The five focused tests cover clipping boundary UVs, same-latitude versus global
span, containment of real triangle raycast UVs, containment under bounded
camera perturbations, and newly exposed rows under a wider portrait lens. `--revision` snapshots orbital source only; current
spacecraft/helper source hashes remain separately identified. Earlier report
schemas based on analytic-sphere ray sampling describe earlier work, not this
certificate.
