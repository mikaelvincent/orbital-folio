# Centered iris shutters

Each physical doorway now has one six-leaf shutter centered between its wall faces. The six directed navigation targets reference four mechanisms: two cabin connections and two independent ladder entrances. One continuous graphite guide spans each wall, with a flush 0.002 lip at either mouth. There are no opposing blade sets or overlapping guide sleeves.

Four recessed amber light arcs on each side brighten smoothly on hover or keyboard focus. The graphite surround and white shutter keep their finish. The lenses are emissive surfaces rather than additional scene lights, so the cue does not change the room lighting.

The shutter seams are projected onto a shared plane and filtered using continuous derivatives. Coverage filtering smooths the moving opening; the fully closed shutter remains opaque. The thin overlapping stock retains physical depth without the previous broken seam pattern at oblique angles. Both directions have an explicit occlusion silhouette compatible with the renderer's front-face normal pass, and the continuous guide remains in that pass.

Motion is integrated once per physical mechanism. Existing opening speed, hover opening, early closure after crossing, uninterrupted ordinary room travel, and the ladder exit interlock are preserved. Only fixed guide geometry contributes to overview bounds, preventing concealed blade movement from changing the zoom after resizing.

## Verification

- Typecheck, all **99 tests**, and the production build passed.
- Geometry checks cover both closed faces, fully clear openings, intermediate coverage, strongly oblique rays, and the actual normal-material occlusion override.
- Integration checks cover centered stock, full-depth wall coverage, both hover directions, stable graphite paint, opening speed, ladder exclusivity, and fixed framing while resizing with a door open.
- Actual Contact → About travel: 47 samples, no door wait, closure during travel.
- Actual About → Projects ladder travel: 113 samples, one exit wait, zero overlapping ladder-door intervals, closure during travel.
- Visually inspected large desktop room views from both sides, opening and closing frames, narrow 390 × 844 room views, hover feedback, and vertical overview. No new renderer errors during final verification; the accessibility audit reported zero violations.
- Independent scoped critic: **98/100**, no blockers. The only minor deduction was faint physical stock-edge glints under close oblique inspection.

Actual preview captures and travel traces are in [evidence/centered-iris](evidence/centered-iris/). This revision supersedes the paired shutter construction in [iris-doors.md](iris-doors.md).
