# Case Studies flight-recorder archive

Date: 2026-09-11. Baseline: `cdca876`.

The Case Studies room now contains five horizontal category cartridges in a floor-bolted graphite rack, with a tilted terminal underneath. The whole-room reference informed the cartridge stack, cream/dark hierarchy, amber end locks, and structural rails. The second reference informed the terminal's angle, inset display, paired side handles, and grounded stance.

The assembly includes layered enclosures, recessed pulls, captive pins, label fasteners, perforated uprights, track supports, floor bolts, terminal hinges and struts, vent blades, and an attached service loom. Display and printed-label surfaces preserve their aspect ratios and omit self-shadowing after geometry batching. The terminal count reflects the available case-study data; category names are static design placeholders.

The old Case Studies cabinet furnishings and their individual pick surfaces are replaced. No new cartridge/terminal interaction, animation, or camera behavior is implemented. Existing room signs, pressure walls, doors, other rooms, navigation, reader APIs, and background are preserved.

## Verification

- Visually inspected the selected room and overview at 1440 × 900 and 430 × 932, plus both desktop oblique angles. All five cartridges, terminal, and supports fit without visible clipping or floating parts.
- Actual-model geometry audit: 193 archive source parts; finite vertices and unit normals; fixed geometry through selected/hovered case state changes in both layouts; all 108 sampled passage rays clear.
- Minimum vertical gap to the existing header saddle is 0.0925 world units in wide layout and 0.4465 in compact layout. The rack feet meet the cabin floor. Paired terminal supports join feet, hinges, and rear saddles. Cable endpoints, junction, and remaining clip connect.
- The preservation audit matches all 1,258 protected source and live batch records against `cdca876` across 24 states. Geometry, transforms, materials, signs, shadow flags, navigation anchors, and instance matrices outside the replaced Case Studies furnishings remain identical.
- Updating the case count repaints its texture after batching. The terminal and printed labels retain disabled cast/receive shadows.
- `npm run typecheck`, `npm run lint`, `git diff --check`, and the required Sites build pass. Build output retains Node deprecation, large-chunk, and Vinext route-classification notices. The browser warning/error capture is empty.
- Independent visual critic: **95/100**, scoped to the requested static room implementation. No blocking issues. Further refinement could make the cartridges chunkier, vary material finish, and increase the gap beneath the room sign. Deferred camera/interaction/reader functionality was not scored.

Evidence: [case-study-archive](evidence/case-study-archive/). Final critique: [CRITIC-REPORT.md](CRITIC-REPORT.md). The preceding sign review is preserved in [CRITIC-REPORT-RECESSED-ROOM-SIGNS.md](CRITIC-REPORT-RECESSED-ROOM-SIGNS.md).

The development preview remains available at `http://localhost:3000/case-studies`.
