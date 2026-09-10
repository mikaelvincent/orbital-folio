# Independent critic — stairs hover lighting

**95.8/100. The scoped fix passes; no remaining blocker was found.** This is a fresh assessment of the selected Projects/About doorway lighting defect, not a score for the whole portfolio. Model SHA: `9593e93f3dab21813db8d56a85b7c3fbc883935fb9442e109f27c0216b27fc94`.

| Equally weighted area | Score /10 | Evidence |
| --- | ---: | --- |
| Selected-room neutral surfaces retain their brightness | 9.8 | Doorway reveals and the narrow rear return now share the selected room’s lighting. Actual neutral material color/emission remained identical throughout all tested frames. |
| Stairwell still responds independently | 9.7 | Broad ladder walls follow the 0.5→1→0.5 transition, including quick reversals; the visible ladder wall and rail brighten in both final room pairs. |
| Navigation accent remains distinct | 9.5 | Pure stairs hover leaves route paint unchanged. Explicit portal hover changes only the permitted accent in the selected room; its emission remains zero. |
| Both layouts, transitions and geometry preservation | 9.7 | Both room directions and layouts pass; clipping partitions lighting ownership without moving the wall surface or unrelated geometry. |
| Fresh visual and source-matched verification | 9.2 | Final oblique GPU pairs show stable doorway surfaces with a responsive stairwell. The evidence is bounded desktop rendering plus CPU material/geometry checks. |

The independent animated [material audit](evidence/stairs-lighting/material-audit.json) covers **952 frames** across Projects/About and wide/compact layouts. Hover-on, leave, short reversals and separate portal tint produce zero selected-neutral material drift. Its **72 boundary samples** verify that the broad rear ladder wall follows stairs brightness while the room-side return stays at selected brightness. These are actual material checks, not conclusions drawn from aggregate room-level metadata.

I inspected the final [Projects neutral](evidence/stairs-lighting/final-projects-neutral.jpg) / [stairs highlighted](evidence/stairs-lighting/final-projects-stairs.jpg) and [About neutral](evidence/stairs-lighting/final-about-neutral.jpg) / [stairs highlighted](evidence/stairs-lighting/final-about-stairs.jpg) pairs. Within each pair the recorded camera, quaternion, viewport and renderer match. The neutral throat, sill and room-side rear edge stay steady; the ladder behind them brightens. The route paint and focus outline are visibly separate. The earlier shifted About captures are excluded.

The diagnosis agent’s [geometry and first-hit audit](evidence/stairs-lighting/geometry-audit.json), which I inspected alongside the source, preserves all **1,838 doorway triangles and attributes** and **746 unrelated meshes/transforms**. The rear partition’s maximum surface deviation is approximately **1.2×10⁻⁷** model units. Across **2,632 sightline rays**, each room’s previously changing 46 tunnel hits and three rear-strip hits become stable; 718 visible ladder hits per room still respond. No sampled new holes or hit-position shifts occur. This closes the secondary rear-return issue that the first reveal-only fix missed.

[Recorded checks](evidence/stairs-lighting/checks.json) report successful typecheck, lint and production build, with existing build warnings retained. GPU highlights were entered through keyboard focus using the same handler as pointer hover; this is not an independently recorded physical-pointer hover sequence. GPU pairs cover desktop views; compact behavior is verified by the actual-model audit. Finite rays and frames do not prove every view or device. No production-runtime, reader, admin or unrelated feature claim is included in this score.
