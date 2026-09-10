# Stairs hover lighting ownership

The doorway between the ladder and a selected Projects/About room now keeps the selected room’s brightness while the ladder responds to hover.

Two ladder-owned surfaces caused the leak:

- The inner wall of each doorway and its bevel were grouped with the flat ladder wall.
- A narrow rear-wall return extended through the shared wall into the adjacent room but still used the ladder’s dimmer.

Both now use the brighter of the adjacent room and ladder lighting, matching the existing passage coupling. The broad ladder-facing wall and ladder contents keep their own dimmer. The doorway’s painted route accent still changes tint as navigation feedback; it emits no light.

The doorway split retains every original triangle and attribute. The rear return is clipped at the ladder-facing wall plane, local X=0.672, and divided between cabin rows at Y=0. Crossing triangles retain their original surface positions and interpolated normals/UVs; no panel was shifted or added.

Baseline: `9363cc6`, model SHA-256 `052c89287d2dcebf943f7afb13c04972c334521a33ebafcf256d7fc3d4f01d26`.

Final model SHA-256: `9593e93f3dab21813db8d56a85b7c3fbc883935fb9442e109f27c0216b27fc94`.

## Visual verification

| Selected room | Stairs unhighlighted | Stairs highlighted |
|---|---|---|
| Projects | [Neutral](evidence/stairs-lighting/final-projects-neutral.jpg) | [Highlighted](evidence/stairs-lighting/final-projects-stairs.jpg) |
| About | [Neutral](evidence/stairs-lighting/final-about-neutral.jpg) | [Highlighted](evidence/stairs-lighting/final-about-stairs.jpg) |

Each pair includes saved `*-state.json` camera and lighting records. Root and the independent critic inspect these images. The neutral doorway and room-side rear edge remain steady; the ladder wall and rails brighten. The keyboard focus outline and route accent are separate feedback.

Browser testing used native camera dragging and doorway focus; pointer-enter and focus call the same production highlight handler. About’s focus initially scrolled the viewport; pressing Home restored its position without changing the highlighted doorway. Only the corrected final captures are used. This is not a claim of direct native pointer-hover automation.

## Runtime and geometry evidence

The [animated material audit](evidence/stairs-lighting/material-audit.json) checks Projects/About in wide/compact layouts through 952 frames of highlight entry, exit and rapid reversal. Selected-room neutral materials stay exactly unchanged, while ladder materials follow their own dimmer. It also verifies 72 points on opposite sides of the rear-wall ownership boundary and checks route tint independently.

The [geometry and sightline comparison](evidence/stairs-lighting/geometry-audit.json) preserves all 1,838 doorway triangles/attributes and 746 unrelated meshes/transforms. The clipped rear surface deviates by at most 0.00000012 model units, with total area differing by 0.00000000167. Across 2,632 first-hit rays, each room’s 46 previously changing doorway hits and three rear-strip hits now stay steady; 718 visible ladder hits per room still brighten. There are no new holes or shifted first-hit positions in those samples. The [independent critic report](CRITIC-REPORT.md) assesses this lighting defect only.

Reproduce the material check from the repository root:

```sh
node docs/evidence/stairs-lighting/material-audit.mjs . components/spacecraft-model.ts /tmp/stairs-material-audit.json
node docs/evidence/stairs-lighting/geometry-audit.mjs . git:9363cc6:components/spacecraft-model.ts /tmp/stairs-geometry-audit.json
```

Typecheck, lint and the Sites production build pass; details and existing build warnings are in [checks.json](evidence/stairs-lighting/checks.json). Finite ray samples, synthetic material updates and saved development GPU views do not certify every camera pose or physical device. The separate readers/admin workflows were outside this correction.

The site remains available at `http://localhost:3000/`. The previous shoulder-strip report is retained in [CRITIC-REPORT-LADDER-LIP.md](CRITIC-REPORT-LADDER-LIP.md).
