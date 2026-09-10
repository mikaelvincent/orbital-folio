# Projects and Contact room identification

Both rooms now have a centered physical identification rail above their equipment. The ivory rim, recessed navy face, paired amber indices and captive fasteners match the furnishings. Two short standoffs seat into the ceiling. Neither room's furniture needed lowering.

The new lettering is optically centered using glyph bounds, rendered on mipmapped canvas textures with anisotropy 8, and separated from the sign face. Its matte ink does not receive shadows. Header metadata uses the actual new location in both layouts. The existing About and Case Studies signs are unchanged.

Contact's world-space “Let’s talk” button is removed from the hotspot list. The console and doorway behavior remain available.

## Verification

- `npm run typecheck` and `npm run lint`: passed.
- Required Sites production build: passed. Existing Node deprecation, chunk size and Vinext route classification notices remain.
- Live render inspected at 1440 × 900 and 430 × 932, plus a dragged oblique angle for each room. Both signs clear the screens and lighting fixtures in these views.
- Live Contact DOM confirms zero “Let’s talk” buttons; doorway navigation remains present. Browser warning/error log is empty.
- Independent actual-model comparison against `4b0e87c`: all 1,170 original source meshes/lights unchanged across eight wide/compact selection states. Exactly 22 header source meshes added, with finite bounds and no existing geometry removed. This is a structural check, not a frame-rate benchmark.

Evidence is in [room-identification](evidence/room-identification/). Independent scoped visual scoring is recorded in [CRITIC-REPORT.md](CRITIC-REPORT.md). The previous full workshop review is archived in [CRITIC-REPORT-PROJECTS-WORKSHOP.md](CRITIC-REPORT-PROJECTS-WORKSHOP.md).
