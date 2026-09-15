# Ladder, exterior equipment and responsive composition

Implemented 15 September 2026, against committed baseline `a907e22`.
Implementation commits: `25c0405` (ladder/exterior) and `9d15ae1` (camera and
responsive sizing). This is approved visual work. Held performance candidates
were not implemented.

## Design choices

- Two matching circulation returns fill the top and bottom curved ends of the
  ladder bay. They follow the existing liner, use rounded cream/navy housings
  with captured metal airfoils, and stay clear of lamps, handholds and doors.
- Two shallow thermal-louver trays occupy the exposed roof, centered on the
  cabin columns. Navy carriers, cream vanes, metal rails and restrained amber
  retainers reuse the spacecraft palette. Both assemblies are visible in the
  normal overview and supported drag views. There is no new concealed rear or
  underside equipment. Low views can naturally occlude the roof.
- The overview shows slightly more roof and shoulder depth on broad screens,
  with a quieter lean in portrait. Bounded callout gutters recover useful space
  on short screens. Ordinary pointer tilt is 16% smaller vertically and 20%
  smaller horizontally; drag ranges, springs and room navigation are retained.

Thermal louvers are a real spacecraft equipment class; [NASA describes their
use for passive thermal control](https://www.nasa.gov/missions/small-satellite-missions/nasa-repurposes-passive-thermal-control-technology-for-cubesats/).
These panels are an artistic interpretation, not an engineered thermal system.
They have a static pose and introduce no temperature simulation or animation.
The original numerical camera record is available at
`8f99ba7:docs/room-camera.md` in Git history. The current camera contract is in
[project context](../../PROJECT-CONTEXT.md#interaction-contract).

## Responsive review and a defect caught by the critic

Live captures cover 1280×720 desktop, 2560×1080 ultrawide, 768×1024 tablet,
390×844 portrait, 360×800 small portrait and 844×390 short landscape. The
hidden browser's viewport override did not change its actual dimensions.
Instead, `responsive-portfolio-preview.mjs` serves a same-origin, read-only
iframe with real layout dimensions, scaling only its screenshot presentation.
The caption in each capture records the dimensions and presentation scale.
No native apps or screen recording were used.

The critic rejected the first short-landscape result: two existing 480-pixel
resize guards skipped camera/render-buffer initialization even when the visitor
explicitly selected Interactive view. That stretched the canvas. Rotating from
that initial state could also leave the callouts using stale landscape
coordinates while the camera had already changed to portrait.

The guards now ignore only transient panels below 240 pixels in either axis.
The React shell still defaults to Reading view below 480 pixels in height.
The corrected 844×390 canvas uses a 1688×780 drawing buffer at DPR 2, with an
844×390 SVG view box. Rotating directly to 360×800 now yields a 360×800 SVG,
mirrored leaders and four 44-pixel callout buttons safely inside the viewport.
See `portrait-rotation-recovery.json`. Existing diagnostics also report camera
aspect to help catch future sizing regressions.

Short landscape remains compact: the identity, labels and footer occupy much
of a 390-pixel screen. Reading view remains the automatic default; this is not
claimed to offer desktop-equivalent room-detail readability.

## Evidence map

| Files | What they establish |
| --- | --- |
| `camera-before-*`, `camera-after-*` | Real application composition. Before images use the old camera; ladder returns had already been added. The two `before-resize-fix` images intentionally preserve rejected states. |
| `ladder-after.png`, `ladder-upper-after.png`, `ladder-lower-after.png` | Real model geometry showing the paired air returns and their seating on the curved liner. |
| `roof-after.png` | Close inspection angle for the thermal trays; this inspection angle alone is not proof of visibility in the supported camera range. |
| `overview-drag-release.png` | Both roof trays visible during an actual permitted drag/release gesture in the live app. |
| `overview-room-focus.png` | Projects focus, room feedback and callout readability with the revised camera. |
| `projects-arrival.png`, `projects-flight-trace.json` | Normal room navigation and a readable settled arrival. |
| `camera-projection-comparison.json` | Conservative geometry-only comparison over nine sizes, 169 angles, four extreme room-hover offsets and 112 assembly supports. No projected overflow. |
| `exterior-fit.json`, `exterior-visibility.json` | Geometry fit and ray checks using the proposed camera family. Roof-ray counts establish group exposure, not that each individual vane is unoccluded. |
| `geometry-inventory.json` | Integrated baseline/final structural counts with model source hashes. |
| `motion-summary.json`, `overview-*-trace.json` | Actual browser drag, re-grab, return and stationary-vessel evidence. |

Finite geometry views use the production model with fixed inspection lighting
and no GTAO. Their placeholder content differs from the live site. Live
before/after images have different Earth phases; they compare the spacecraft,
not a controlled background or shading experiment. The geometry comparison
uses conservative UI reservations, while the live camera measures actual UI
bounds. These responsive checks do not substitute for native Safari touch tests.

## Validation

- **233/233 full-suite tests passed** (`full-tests.log`), including geometry,
  navigation, camera, input, content and security checks.
- After the critic's resize correction and clarified roof-visibility assertion,
  **13/13 focused tests**, TypeScript and the production build passed
  (`final-focused-tests.log`, `typecheck.log`, `build.log`). The full suite
  predates that final narrow correction; the actual browser sizing and rotation
  checks above verify it directly. There was no second full-suite run.
- The build retains existing large-chunk, Node deprecation and route-classification
  notices. They do not fail the build. No deployment was performed.
- The motion audit recorded 1,118 drag samples, 84 re-grab samples and 56 flight
  samples. All vessel matrices stayed identity; camera positions remained finite.
  Drag returned to zero and final angles matched the live pointer's reduced
  hover range. The drag file retains its first seven seconds plus the original
  settled state, omitting the idle tail; the summary records the original count.
- A wait for the brief `travelling=true` state began after navigation had finished.
  The retained flight trace contains actual travelling frames and a settled
  Projects arrival. This was an observation race, not a missing transition.
- The live browser reported no console errors/warnings (`browser-console.json`)
  and the existing development accessibility audit showed zero violations.
- Independent critic: **94/100**, with the rejected state, corrections, rubric
  and limits in [critic-review.md](critic-review.md).

These sample counts and test durations are not rendering performance metrics.

## Added structural cost

| Active wide-layout inventory | Before | After | Change |
| --- | ---: | ---: | ---: |
| Visible meshes | 412 | 419 | +7 |
| Triangles including instances | 887,896 | 895,624 | +7,728 (+0.87%) |
| Unique geometry attribute/index arrays | 31.2235 MiB | 31.9752 MiB | +0.7517 MiB |

The ladder pair uses three material batches and 3,984 triangles; the roof pair
uses four and 3,744. They reuse materials and add no textures, lights, picking
targets or recurring object updates. The inventory includes the active layout
without frustum culling. It excludes textures, render targets, instance buffers,
JavaScript object overhead and other scene layers. Retaining both layout
variants requires more geometry than this active-layout count.

These figures do not measure GPU allocation, process memory, frame time,
thermals or battery use. No speedup or unchanged rendering cost is claimed.
The [performance ledger](../../performance-ledger.md) records the new baseline
and leaves the next optimization candidates on hold. The approved 8K
Mediterranean night Earth, atmosphere and star art are unchanged.

## Reproduce

With the local app on port 3000, use the responsive fixture for real viewport
layouts and the finite fixture for geometry inspection:

```sh
node scripts/benchmarks/responsive-portfolio-preview.mjs
node scripts/benchmarks/spacecraft-polish-preview.mjs a907e22
node scripts/benchmarks/spacecraft-geometry-inventory.mjs a907e22
npm test
npm run typecheck
```

The review fixtures bind only to loopback ports 3018 and 3017. They are not
imported by the production app and were stopped after inspection; port 3000
remains available. The inventory command records current source hashes so later
measurements can identify which geometry they actually tested.
