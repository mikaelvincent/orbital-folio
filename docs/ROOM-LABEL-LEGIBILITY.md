# Projects and Contact heading readability

The first identification rails regressed from the older room signs: their text surface was 0.14 units high versus 0.18 in About/Case Studies, pale print had weak contrast on the illuminated slate face, and the headings were crowded against the ceiling. Contact's heading also sat behind the overview roofline.

The revised signs use dark print on ivory enamel, a 0.24-high text surface, and a taller physical frame with the same restrained amber indices and fasteners. Their centers move from Y 1.32 to 1.16, and their ceiling mounts sit farther forward so Contact's title is visible in overview. Actual header/framing metadata follows the mounts.

Both equipment assemblies move down by 0.24 without scaling their displays or contents. Their feet and floor fixtures remain fixed; stanchions and relevant rack supports shorten to preserve continuous connections. Other rooms and camera controls remain unchanged.

## Checks

- Production build, TypeScript and lint: passed. Existing Node deprecation, chunk size and Vinext route-classification notices remain.
- Actual-model independent audit: 14 geometry checks passed, including lamp clearance, finite bounds, grounded feet, connected supports, unchanged equipment proportions/materials and 629 protected meshes across 12 states.
- Header mounts clear light bezels by 0.085 units and seat into the ceiling. There are no header/equipment intersections.
- Final GPU captures cover each selected room at desktop and portrait sizes, oblique views and both overview orientations. The prior signs remain available for comparison in `evidence/room-identification/`.

Evidence: [room-label-legibility](evidence/room-label-legibility/). Independent visual findings: [CRITIC-REPORT.md](CRITIC-REPORT.md). This is a scoped render/readability correction; no new category or contact workflow is implemented or evaluated.
