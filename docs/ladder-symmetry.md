# Symmetric ladder bay

The ladder bay now shares the combined cabin roof and keel lines. Its curved ends join those lines tangentially, removing the raised top shoulder and the larger bottom shoulder. The bow, front cutaway, seal, inner lining, outer skin and rear closures use the same symmetric envelope. Nominal pressure-wall thickness remains 0.17.

The usable ladder envelope is 5.72 high, centered at Y=0.0675, matching the two cabin rows. The docking sleeve, wall aperture and inner hatch share that center. The existing service fittings and their actual wall recesses are fitted together at 90% of their former vertical span. Their widths and mounting depths remain unchanged.

Both ladder terminals have identical protected warm lamps, bezels and mirrored anchor housings. Rail ends, joint markers and paired vent slats are balanced about the ladder center. The former bottom-only amber strip is removed. Cabin dimensions, furnishings, door clearances and navigation behavior remain unchanged.

## Verification

- All 64 automated tests pass: the 61 existing checks plus three focused ladder tests. Typecheck, lint on changed code, and production build pass.
- Actual outline samples verify horizontal roof/keel joins and mirrored bow curves in both layouts.
- Equipment geometry checks verify identical paired lamps and anchor housings, centered rails, mirrored grips and joint markers, and uniform rung spacing.
- Independent preservation audit: all 330 cabin mesh instances retain exact geometry/material hashes, room-relative placement, room anchors, and dimensions.
- Actual desktop, portrait, upper-terminal and lower-terminal views were inspected, including the passage between Projects and About. No clipping, exposed holes, or browser errors were observed.
- Independent scoped critic: **98/100**, above the required 95+ threshold. No blocking findings.

Visual evidence is in `docs/evidence/ladder-symmetry/`.
