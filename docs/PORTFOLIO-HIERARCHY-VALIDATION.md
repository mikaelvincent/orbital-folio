# Portfolio hierarchy and Projects workbench

Date: 2026-09-10. Baseline: `8c24695`.

The portfolio name now scales with viewport width and height, without a desktop maximum that would let the physical room titles overtake it on larger displays. Its existing typeface, glow and overview-only behavior remain. Projects and Contact retain the legible dark-on-ivory signs, with lettering reduced from 0.24 to 0.18 scene units and smaller fitted frames. Standoffs still connect the signs to the ceiling.

Projects' working surface rises by 0.2365 scene units to match Contact at 0.731 above the cabin floor. The category bank moves rigidly with it; grounded feet stay fixed and supporting posts lengthen to meet the apron. Contact furnishings remain unchanged.

## Verification

- Visually inspected the live overview and selected rooms at 1440 × 900 and 430 × 932, plus a dragged Projects angle. Also compared overview and selected Projects at 2560 × 1440. The portfolio name remains larger than the indoor lettering; titles are readable and the bench looks grounded.
- Recorded portfolio font sizes: 63px, 30.1px and 100.8px respectively. No horizontal document overflow at those sizes. These DOM measurements supplement visual comparison of the actual glyphs.
- Actual-model comparison against the baseline passes: both work surfaces are 0.731 high, feet are unchanged, leg/apron overlap is 0.0095, and category/worktop clearance is 0.044. The 276 category source meshes retain their shapes and relative transforms. All 825 protected source meshes remain unchanged across eight wide/compact states.
- `npm run typecheck`, `npm run lint`, `git diff --check` and the required Sites production build passed. Existing build notices concern Node deprecation, chunk size and Vinext route classification.
- Captured live browser warning/error log is empty. The local development server remains running.
- Independent visual critic: 98/100, scoped to typography hierarchy, readable fitted signs, and workbench height/grounding. The sign-to-upper-module gap is close in some projections, but no text is occluded in the reviewed views.

Nine screenshots, typography measurements, browser console results and the actual-model audit are in [portfolio-hierarchy](evidence/portfolio-hierarchy/). The current review is [CRITIC-REPORT.md](CRITIC-REPORT.md); the previous readability review is archived as [CRITIC-REPORT-ROOM-LABEL-LEGIBILITY.md](CRITIC-REPORT-ROOM-LABEL-LEGIBILITY.md).
