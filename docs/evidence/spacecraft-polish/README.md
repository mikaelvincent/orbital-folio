# Spacecraft fit, hull and sky polish

Implemented 14–15 September 2026. Approved baseline: `b64852f`.
This is requested visual/interaction work, not a performance optimization.
The four cabin interiors and their arrangement remain unchanged.

## Requested changes and decisions

| Request | Implementation and evidence |
| --- | --- |
| Rear bulge | The ladder and cabin exterior use one crown/depth profile and a shared rear plane. The keel reflects that crown around the ladder center. Compare `before-upper-rear-seam.png` and `after-upper-rear-seam.png`. |
| Lower ladder door clipping | Hatches use a shared 0.87 blade radius, centered vertically in the visible wall. The guide has more than 0.19 clearance from the rounded ladder opening. Actual geometry is checked in `ladder-jamb-clearance.test.mjs`. |
| Fitting between ladder doors | Its position derives from the two door centers, including the shared depth datum. |
| Empty docking-side wall | Two matching pressure-service covers conform to the curved wall above and below the docking hatch. Navy enclosures, cream covers, restrained metal seams and captive amber retainers use the existing palette. They are decorative, dim with the ladder room, and remain outside its passage. |
| Door/sign placement | Door center is Y=0.0675 in each cabin, with equal 0.4525 vertical guide margins. Horizontal center uses the rear return's visible edge and the front reveal, giving equal 0.1355 cabin / 0.113 ladder margins. Signs use the door's exact depth coordinate, with their own equal upper/lower clearance. |
| Sharp chassis edges | Both exterior rear side edges have physical quarter-round geometry and shared sampling at adjacent surfaces. Interior corner fillets have denser sampling; dark floor finishes now follow rounded outlines. Rear lining stays enclosed by the outer skin. |
| Drag return | Release preserves spring position/velocity and targets zero drag offset; ordinary hover resumes at the released pointer. Re-grabbing starts at the visible pose. `drag-release.json` and `drag-regrab.json` record real browser gestures. |
| Flickering ladder jamb | The old side wall overlapped the dark front reveal. Clipping it at the exact throat leaves a single owner for that surface. Both viewing directions and wide/compact geometry are checked. |
| Star twinkle | Independent seeded modulation is stronger and more visible in the first eight seconds, without field-wide blinking. |
| Shooting stars | About half as many arrivals; slower singles and loosely staggered pairs/triples with varied dim peaks and shorter trails. See [sky measurements](sky-review.md). |

The larger shared rear enclosure extends the ladder's exterior rear by 0.115;
it does not move the rear interior, ladder, docking opening or cabin boundaries.
The door radius reduction is intentional to give the guide breathing room within
the existing wall. Room camera and navigation datums use those same openings.

## Visual review

`before-*` and `after-*` are six matched finite geometry views: front and reverse
ladder angles, lower door, docking shoulder, upper rear seam and rear quarter.
The developer fixture uses the real model, with identical lighting/camera poses
and no GTAO, to make intersections and seams visible. It is not a replacement
portfolio scene: placeholder screen content and absent contact shading differ
from the live app. It draws only on view changes and disposes its resources.
`geometry-captures.json` preserves the camera poses.

`overview-final.png`, `projects-final.png`, `case-studies-final.png`,
`about-door-placement.png` and `contact-final.png` are live application captures.
The About image includes the development audit overlay. Live navigation and
dragging were checked in the hidden built-in browser at 1280×720. Native Safari
and the user's screen were not captured or controlled.

A requested 390×844 browser override returned without an error but did not change
the actual viewport (DOM and canvas remained 1280×720). No portrait screenshot is
claimed for this run. Geometry, room-framing and navigation tests cover compact
layouts; that is distinct from a native mobile or Safari interaction check.

The independent critic found an initially incomplete rear fillet and backing
panels protruding near the curved crown/keel. These required another geometry
iteration and full-footprint checks, beyond the initial center-ray checks.
The final rubric and score are recorded in [critic review](critic-review.md).

## Validation record

- `final-full-tests.log`: **226/226 tests pass** on the final source, including
  geometry, room framing, door navigation, input, sky, content and security
  regressions. Runner duration: 282.0 seconds.
- `typecheck.log`: TypeScript passes. [Production build](build-review.md) succeeds
  with non-blocking toolchain/chunk-size notices recorded.
- `full-tests.log`: the intermediate full suite, 222 passing tests, before the
  final rear-return test additions. It remains historical evidence.
- `final-exterior-tests.log`: **26/26 pass**, including 210 conservative backing
  footprint probes per layout with at least 0.009998 rear-skin clearance.
- `door-tests.log`, `geometry-focused.log`, `sky-tests.log`, `exterior-tests.log`:
  focused intermediate results, with their actual run durations retained.
- `rear-clearance.json`: 1,008 sampled inside-to-outside checks per layout with
  no missing/inverted outer surfaces, before the final side-edge rounding.
- `docking-fit.json`: initial cover fit/batching/dimming/disposal audit. Production
  subsequently increased contour sampling from 16 to 64; the final regression
  test uses the production contour and verifies the fit again.
- `ordinary-navigation.json`: live room flight/door trace; no new navigation
  delay or ladder-door overlap was introduced.

Test durations are runner wall times, not browser rendering timings.

## Cost and scope

The cover pair adds four static material batches and 8,688 triangles, without
new textures, lights, interaction targets or animation work. The hull rounds add
geometry while retaining the existing materials and pass structure. The complete
source-hashed model inventory against `b64852f` is 408 → 412 visible meshes,
820,490 → 887,896 triangles (+8.22%), and 28.32 → 31.22 MiB of geometry arrays
(+2.90 MiB). This includes all geometry changes in the task. It counts visible
scene objects without camera frustum culling; textures, render targets, instance
buffers and JavaScript overhead are excluded. See `geometry-inventory.json`.
Inventory
numbers are separate from browser CPU/GPU time; no thermal, battery or frame-rate
improvement is claimed. The performance ledger keeps all proposed optimizations
on hold and calls for a new baseline with this geometry when work resumes.

The 8K Mediterranean Earth, its horizon art direction, star count and reusable
meteor capacity are retained. The sky audit measures scheduling and analytical
brightness, not final display luminance or GPU performance.

## Reproduction

From the repository root:

```sh
node scripts/benchmarks/spacecraft-polish-preview.mjs
node scripts/benchmarks/spacecraft-geometry-inventory.mjs
node scripts/benchmarks/sky-motion-audit.mjs
npm test
npm run typecheck
```

The geometry fixture serves only `127.0.0.1:3017`; its baseline comes from Git
`b64852f` and its candidate from the checkout. Stop it after inspection. The sky
audit records source hashes and uses constants for this shader revision; review
those assumptions if the shader changes. Neither developer tool is imported by
the portfolio or started in production.
