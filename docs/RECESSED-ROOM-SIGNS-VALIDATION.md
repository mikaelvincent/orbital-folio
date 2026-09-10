# Room and doorway sign consistency

Date: 2026-09-10. Baseline: `c0dc435`.

All indoor room signs now share the doorway labels' physical text scale, width-fit rule, 0.25 sign height, 0.22 enamel height, and Y1.11 center elevation. Longer names such as Case Studies receive the same fit reduction on both signs. The Projects/Contact style and the legacy About/Case Studies style remain distinct.

Room heading faces move rearward to Z−0.427. Projects and Contact now use two rear wall standoffs rather than ceiling hangers. The legacy saddles are refitted to the same rear position. The supports reach the actual curved pressure wall, leaving 0.8685 depth clearance from the ink to the ceiling fixture.

Projects' four complete screen enclosures scale uniformly to 78%, preserving circles, fasteners, and display graphics. The rows, rack rails, standoffs, and power trunk are refitted around them. Contact's main screen becomes shorter with its lower edge retained; its canvas aspect ratio now matches the glass, avoiding stretched text and signal arcs. Both table surfaces and their floor supports remain unchanged.

## Verification

- Visually inspected all four selected rooms at 1440 × 900, Projects and Contact at oblique angles and 430 × 932, and desktop/portrait overviews.
- The independent actual-model audit passes in wide and compact layouts. Minimum heading/equipment gaps in wide layout are 0.18533 for Projects and 0.295 for Contact. The screen rows, bench clearance, rear rails, and enclosure standoffs have positive clearances or joining overlaps as appropriate. No heading/furniture collisions were found.
- Actual room and door frame/enamel heights match. Font-scale parity includes the width-fitted Case Studies title. Font verification records canvas drawing with native Arial metrics; the live screenshots provide the visual check.
- `npm run typecheck`, `npm run lint`, `git diff --check`, and the required Sites build pass. Existing Node, chunk-size, and Vinext classification notices remain. The captured browser warning/error log is empty.
- Independent visual critic: 98/100, scoped to the requested sign consistency, rearward placement, and clear equipment spacing; no required fixes.

The rear-mounted lower-deck headings can be occluded by the cutaway ceiling in overview. They are clear in selected room views; exterior callouts continue to identify the rooms in overview. Camera movement, interactions, readers, and room lighting behavior are unchanged.

Evidence: [recessed-room-signs](evidence/recessed-room-signs/). Independent visual assessment: [CRITIC-REPORT.md](CRITIC-REPORT.md). The preceding hierarchy review is archived in [CRITIC-REPORT-PORTFOLIO-HIERARCHY.md](CRITIC-REPORT-PORTFOLIO-HIERARCHY.md).
