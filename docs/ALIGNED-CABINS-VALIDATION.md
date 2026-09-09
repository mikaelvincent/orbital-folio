# Cabin alignment correction

This revision addresses only the four reported enclosure defects: added roof padding, thick floor padding, unwanted ladder platforms, and the exposed strip beside the ladder doorway. The independent target is **95+/100**, scored only on these corrections and their verification. The previous assessment is archived in [CRITIC-REPORT-CHASSIS-GLASS.md](CRITIC-REPORT-CHASSIS-GLASS.md); it does not establish acceptance of this revision.

## Geometry changes

- **Roof:** removed the `solid-cabin-ceiling-return` slabs. The existing C-shaped pressure skin now reaches the front frame and provides the roof itself. Its flat visible underside is at local Y=1.430 (nominal profile Y=1.455 before the bevel). Ceiling fixtures attach to this surface. Original skin end faces close the forward join inside the frame.
- **Floor:** replaced the 0.44-unit fascia with a 0.105-unit thin deck whose top is Y=-1.32. Room furnishings move with the walking surface. Compact furnishings scale about the original floor anchor, avoiding a floating gap caused by scaling about the room origin. The internal arrangement of furnishings stays intact.
- **Ladder shaft:** removed both projecting platforms, their guides and their wall cleats. Rails, rungs, stand-offs and actual side-door thresholds remain.
- **Ladder wall:** extended the existing continuous rear liner into the shared bulkhead. Its back surface sits at Z=-0.985. The repaired strip is part of that wall, while the doorway stays open to the ladder interior.

## Independent checks

The [actual-mesh audit](evidence/aligned-cabins/aligned-cabin-fixes-audit.json) passes **492 rays and eight content-anchor checks** across wide and compact layouts. It checks a single aligned roof surface, the closed roof/frame join, deck thickness and elevation, scaled furnishing anchors, rear-wall coverage and 108 clear passage rays. Removed parts are absent from the generated model, including hidden meshes.

The [same-camera comparison](evidence/aligned-cabins/aligned-cabin-seam-comparison.json) casts 1,316 rays through the photographed About doorway region. Against baseline commit `99b9c78`, 111 rays escaped into space. The revised model closes all 111 through the continuous ladder rear liner; there are zero remaining or newly introduced misses in that sample. The [recorded camera pose](evidence/aligned-cabins/about-oblique-pose.json) comes from the development browser.

Audited model SHA-256: `4897d7e8d4ba5bee06aa7c8f53b762448b5aa73196f8e8337d1fdfd2c5619223`.

## Render evidence

The implementation agent operated the browser; the independent critic inspected these captures and ran the geometry comparisons independently.

| Capture | What it exposes |
|---|---|
| [Desktop overview](evidence/aligned-cabins/overview-desktop.jpg) | Thin decks at the aperture edges and the ladder shaft without platforms |
| [Projects close-up](evidence/aligned-cabins/projects-desktop.jpg) | Original roof alignment, lowered rack and thin floor |
| [Projects oblique](evidence/aligned-cabins/projects-oblique.jpg) | Upper cabin doorway and the ladder interior |
| [About oblique](evidence/aligned-cabins/about-oblique.jpg) | Lower cabin doorway formerly showing the star/Earth strip |
| [320px overview](evidence/aligned-cabins/overview-320.jpg) | Rotated compact hull and uninterrupted ladder bay |
| [320px About](evidence/aligned-cabins/about-320.jpg) | Compact roof and floor alignment with correctly lowered furnishings |
| [320px oblique](evidence/aligned-cabins/about-320-oblique.jpg) | Compact doorway enclosure under camera drag |

`npm run typecheck`, `npm run lint` and the Sites production build completed successfully. The build retains its existing large-client-chunk warning, Node registration deprecation and unknown static route classification for `/case-studies`. See [check records](evidence/aligned-cabins/checks.json).

These are targeted geometry checks and development-server GPU captures, not a complete watertightness, physical-device or production-runtime certification. No distinct project reader, admin or contact workflow was changed or tested in this revision. The seeded localhost:3000 server remains running.

## Reproduce the geometry evidence

Run from the repository with the supported Node version and installed dependencies:

```sh
node docs/evidence/aligned-cabins/aligned-cabin-fixes-audit.mjs . /tmp/cabin-audit.json
git show 99b9c78:components/spacecraft-model.ts > /tmp/aligned-cabins-baseline-model.ts
node docs/evidence/aligned-cabins/aligned-cabin-seam-comparison.mjs . /tmp/aligned-cabins-baseline-model.ts docs/evidence/aligned-cabins/about-oblique-pose.json /tmp/cabin-seam-comparison.json
```

Final acceptance is documented in the [independent critic report](CRITIC-REPORT.md).
