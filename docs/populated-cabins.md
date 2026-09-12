# Cabin population

Passive equipment fills the lower and peripheral spaces without competing with
the room signs, door labels, or main displays.

- Projects: retained drivers, a bench cooling column, and shallow tool drawers.
- Case studies: a restrained recorder transport case, cooling column, and clipped
  data conduits beside the archive rack.
- Contact: covered corner raceways and retained power/service units beneath the
  console, clear of the existing supports and central service housing.
- About: two retained fabric pouches and a folded fabric perch beneath the desk.
- Ladder: mirrored service feeds with covered terminations and a shallow isolation
  cassette on the solid wall between the hatch openings.
- Cabins share a small paired air-return detail outside the central sign band.

The fittings use the existing cream, graphite, alloy, and restrained amber palette.
Floor space stays clear. Existing furniture, texts, camera framing, door operation,
and interaction targets are unchanged.

## Construction

`components/cabin-utility-fittings.ts` builds equipment in floor-relative cabin
coordinates. Separate wide/compact variants fit the available clearances; each
mounting shoe follows the rendered pressure-wall profile. The roots are batched
and excluded from picking. The ladder cassette uses the shared wall datum, while
the narrow service feeds remain behind the ladder handholds.

## Verification

- `npm run check`: 108 tests passed, including TypeScript checking.
- Targeted lint on all changed source and tests passed.
- Sites production build passed.
- New geometry tests verify both layouts: containment against the actual rear
  wall, passive targets, clear label/display sightlines across the normal camera
  range, and ladder cassette clearance from both iris apertures.
- Ladder symmetry tests include the new feeds, cases, and termination fittings.
- Independent geometry review found no substantive intersections with existing
  furniture in any cabin/layout combination. The cassette's sampled mounting
  footprint meets the actual wall.
- Actual browser views checked at 1280×720 and 390×844, plus an enlarged ladder
  overview. No browser errors were reported. The existing narrow-view camera
  scale is unchanged; the additions do not occlude its smaller text.
- Independent visual review: 96/100 for population quality, fit, and preservation
  of text hierarchy.

Screenshots are in `docs/evidence/populated-cabins/`. This is a local-preview
change; nothing was deployed.
