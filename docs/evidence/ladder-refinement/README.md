# Ladder refinement

Baseline: `243112d` (engineering service bay).

## Changes

- One 0.38-unit rung pitch now drives all 13 rungs, grip intervals, joint markers, and wall-anchor locations.
- Grip radius reduced from 0.035 to 0.0235 (about 33% slimmer); rails, sockets, end caps, and anchors have matching proportions.
- Graphite grips replace broad orange sleeves. Small amber rings repeat at each rung joint, complementing the existing service controls.
- Two warm worklights add fitted housings, bezels, lenses, protective guards, and mounting screws. Their emissive lenses follow existing bay brightness without adding light sources.

Only the ladder builder and its bounds metadata changed. Other rooms, chassis, camera behavior, navigation, and interaction remain as before.

## Visual verification

Actual localhost captures were inspected in desktop overview, the oblique Projects doorway view, and portrait overview. The independent critic scored the four requested refinements **96/100**, with no corrective iteration requested. See `independent-review.md`.

## Focused geometry audit

A separate read-only audit built the baseline and revised models independently:

- All 414 spine parts have finite attributes and valid normals.
- All 20 tested joint families, four end-cap anchors, and 36 changed fasteners connect to their supports.
- Both worklight housings seat 0.002 units into the existing lining; lenses and guards connect to their housings.
- All 108 sampled doorway rays and 18 center-transit rays remain clear.
- All 115 protected spine parts retain baseline geometry, transforms, and materials.
- Actual ladder bounds match the updated metadata.

Connection checks use triangle-ray and vertex/face samples, not exact solid-volume analysis; rendered evidence was reviewed separately. Unchanged bay recesses and conduits were compared with baseline rather than exhaustively retested.

## Validation

- Production build: passed.
- Typecheck: passed.
- Lint: passed.
- Diff whitespace check: passed.
- Browser console check: no errors or warnings returned.

The local website remains running at `http://localhost:3000/`.
