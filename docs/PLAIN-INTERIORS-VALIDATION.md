# Plain interior and doorway standardization

Scope is limited to the four requested fixes: the vacuum-chamber wall junction, complete doorway frames, sign-icon margins and plain cabin walls. The independent acceptance target is **95+/100** for these fixes and their verification only. The preceding report is archived in [CRITIC-REPORT-ALIGNED-CABINS.md](CRITIC-REPORT-ALIGNED-CABINS.md).

## Implemented changes

1. **Aligned docking wall.** The separate central wall formerly protruded beyond the curved shoulder outside and sat behind it inside. The wall now spans X=-0.75 to -0.665 before layout scaling and has depth 2.42, matching its neighbors. The outer rectangular bevel is removed. The circular barrel keeps its shared axis; the inner hatch follows the corrected wall datum.
2. **Four-sided doorways.** All six directed side entrances now have square 1.84-unit finished openings inside complete 2.03-unit frames. The rear jamb sits forward of the back wall. The wall holes, sleeves, labels and picking volumes share the revised center. The finished frame, sleeve, gasket and structural opening have separate clearances (1.84 / 1.90 / 1.92 / 1.94), preventing coincident inner surfaces. An oblique render exposed a frame/gasket shimmer in the first candidate; this clearance correction removes its cause.
3. **Padded signs.** The enamel face is 1.48 units wide. Paired icon centers derive from a 0.095-unit outer inset and actual symbol width, reserving the central text region. Destination labels retain their existing type style and plane.
4. **Plain walls.** All four raised rear panels and lower cove trims are removed. Original pressure surfaces provide the continuous walls, using one plain matte enamel with no texture maps. Ladder wall surfaces share that finish. Header mounts reach the underlying wall while their visible fronts and room contents keep their existing positions.

Final model SHA-256: `edfabdd791027046a2aad9074ac41739e01d24c56f276ddca7db1b86b24e1fe1`.

## Independent geometry evidence

- [Interior audit](evidence/plain-interiors/interior-standardization-audit.json): complete frame visibility from the wall-adjacent region, clear passages, exposed rear-wall coverage, plain materials, sign bounds and preservation of the preceding floor/roof corrections in wide and compact layouts. Ordinary furniture occlusion from farther inside the room is recorded separately from a buried jamb.
- [Doorway contour audit](evidence/plain-interiors/doorway-contour-audit.json): 6,240 radial rays across the layered doorway depths find no coincident parallel surfaces. A [sensitivity check](evidence/plain-interiors/doorway-contour-sensitivity.json) restoring the rejected gasket thickness detects 576 frame/gasket coincidences, confirming the audit catches the observed failure mechanism.
- [Docking junction audit](evidence/plain-interiors/docking-junction-candidate-audit.json): 15,958 rays cover the hatch enclosure, shoulder joins, vertical joins and wall planes. There are zero failures on the final source. Baseline slab extents from commit `08b1f26` are included for comparison.

These are actual-mesh checks, not metadata-only assertions. Finite sampling is not a universal watertightness or arbitrary-triangle-intersection proof.

## Render and interaction evidence

| Capture | Inspection |
|---|---|
| [Projects, left oblique](evidence/plain-interiors/projects-oblique-left.jpg) | Complete ladder doorway, paired icon margins and removal of rear overlays |
| [Projects, right oblique](evidence/plain-interiors/projects-oblique-right.jpg) | Ordinary adjoining-room frame, stable layered edge and sign margins |
| [About](evidence/plain-interiors/about-desktop.jpg) | Matching plain finish and closed wall behind the existing furnishings |
| [Docking interior](evidence/plain-interiors/docking-interior-overview.jpg) | Central hatch wall joins the curved shoulder without the rectangular inset |
| [Docking exterior](evidence/plain-interiors/docking-exterior-overview.jpg) | Barrel junction without the projecting rectangular slab |
| [320px overview](evidence/plain-interiors/overview-320.jpg) | Compact enclosure and rotated spacecraft |
| [320px Projects](evidence/plain-interiors/projects-320.jpg) | Compact walls and doorway frames |
| [320px oblique](evidence/plain-interiors/projects-320-oblique.jpg) | Doorway finish at a changed compact camera angle |

The implementation agent operated the browser; the independent critic inspected the images. Native camera drags exercised both opposing room views. Selecting the rendered Projects-to-About doorway arrived at `/about` with the About room and its controls. No distinct project reader, contact form or administration flow was changed or tested.

Typecheck, lint and the Sites production build passed on the final source. Existing build warnings remain: a large client chunk, Node registration deprecation and unknown static classification for `/case-studies`. [Check records](evidence/plain-interiors/checks.json) distinguish the successful build from the development-server GPU evidence; no production-runtime or frame-rate certification is claimed. The seeded localhost:3000 server stays running.

## Reproduce the bounded audits

From the repository with dependencies installed:

```sh
node docs/evidence/plain-interiors/interior-standardization-audit.mjs . /tmp/interior-audit.json
node docs/evidence/plain-interiors/doorway-contour-audit.mjs . /tmp/contour-audit.json
node docs/evidence/plain-interiors/docking-junction-candidate-audit.mjs . /tmp/docking-audit.json
```

The [independent critic report](CRITIC-REPORT.md) records final acceptance and its limits.
