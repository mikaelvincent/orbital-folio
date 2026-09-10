# Ladder doorway panel removal

This correction addresses the overlapping ladder wall visible from selected Projects and About. It removes the geometry itself while preserving the preceding doorway-lighting fix. Room contents, readers, navigation, Earth and the space background are unchanged.

## Cause and correction

The rear liner’s flat edge had been extended from local X=0.585 to X=1.17, then folded back toward a rim at X=0.665. That placed a redundant sheet across the cabin doorway. The preceding revision corrected its lighting ownership but retained the overlap.

The extension, two room-side rear-return meshes and their clipping helper are now removed. The flat rear wall remains at X≤0.585, Z=−0.985. The existing right-side cove ends at X=0.672, Z=−0.975, against the actual rear door jamb. Its shortened depth is shared by the shoulder continuation. The left shoulder contour remains unchanged. No replacement panel or transparent hiding surface was added.

Removing the extension alone exposed a slit; moving only the rim sideways did not fix it because its endpoint was still inside the open doorway. Those candidates were rejected during live visual inspection. The final change seats the endpoint behind the doorway’s Z=−0.970 opening edge.

Final model SHA-256: `2654abc143b04057cab9c29c4cfef038d6fcb5813930964e7c3cc923d06d30c8`. Baseline: `ebde2b8`.

## Live visual inspection

The local renderer was reloaded after the final source change. Root and the independent critic inspected the actual GPU output from both adjacent rooms, including an oblique drag angle and stairs highlighting.

| View | Neutral | Stairs highlighted |
| --- | --- | --- |
| Projects | [Image](evidence/panel-removal/final-projects-neutral.jpg) | [Image](evidence/panel-removal/final-projects-stairs.jpg) |
| About | [Image](evidence/panel-removal/final-about-neutral.jpg) | [Image](evidence/panel-removal/final-about-stairs.jpg) |

The extra sheet and exposed black slit are absent in the final images. Doorway surfaces remain steady while the ladder brightens. Each final pair has matching recorded camera, quaternion, viewport, renderer ID and scroll position in its adjacent `*-state.json` files. Highlighting was activated through keyboard focus, which uses the same production handler as pointer entry; no separate physical-pointer sequence is claimed.

The [baseline About image](evidence/panel-removal/before-about.jpg) shows the overlapping sheet. Its camera differs from the final About camera by 0.0022 model units horizontally; it is a visually comparable removal check, not a pixel-identical comparison.

## Geometry and lighting evidence

- The [geometry audit](evidence/panel-removal/geometry-audit.json) instantiates baseline and final source. All 749 unrelated mesh geometries and their transforms are preserved in both layouts. Both redundant return meshes are absent; the remaining liner ends at the intended wall face.
- Across 30,616 cabin-view rays, removal introduces no new misses. In each wide-layout room, 628 sampled hits on the old panel now reveal existing cabin skin, frame or bulkhead. The compact pixel grid did not intersect the removed panel; its closure evidence comes from the targeted seam grid.
- All 5,412 direct seam rays across both rooms and layouts hit actual surfaces. The exact previously exposed slit samples also reach the liner or doorway reveal. The saved `ray-camera-state.json` supplies a repeatable geometric probe, not final-render evidence.
- The [material audit](evidence/panel-removal/material-audit.json) checks 952 frames across both rooms and layouts. Selected neutral materials have zero drift, the ladder follows its brightness transition, and portal tint remains separate. Its 72 surviving cove samples verify material behavior only, not seam closure.

Reproduce the focused checks:

```sh
node docs/evidence/panel-removal/geometry-audit.mjs . git:ebde2b8:components/spacecraft-model.ts /tmp/panel-geometry.json
node docs/evidence/panel-removal/material-audit.mjs . components/spacecraft-model.ts /tmp/panel-material.json
```

Typecheck, lint and the production build pass; see [checks.json](evidence/panel-removal/checks.json). Existing build warnings remain documented there. The [independent critic report](CRITIC-REPORT-PANEL-REMOVAL.md) scores only this removal and its immediate regressions. Finite CPU samples and desktop development-render captures do not certify every camera pose, device or production runtime.
