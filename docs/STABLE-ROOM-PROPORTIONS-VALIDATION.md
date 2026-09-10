# Stable room proportions during resizing

This correction keeps cabin dimensions and content placement fixed while the viewport changes. Resizing still changes camera framing, and portrait overview still rotates the vessel. It does not redesign the rooms or separate reading interfaces.

Baseline: `64c68d0`. Renderer SHA: `55bcd774fa88f95cf5d5402eb410b4dcfb198eb3a2321b02ce6b9380030e2f23`. The model source remains byte-identical to the baseline at SHA `d49e9153b13d6f221176e16ae522e487f3312ab5686f5608753f168b364a2c67`.

## Cause and fix

The renderer selected the compact physical model at width<900 or width/height<1.05. Portrait rotation happened separately at height>width. This left a landscape interval where cabin X scale changed from 1.4 to 1 while height/depth stayed fixed; furnishings also shrank to 0.84 and changed offsets. The clear aperture ratio dropped from approximately 1.231 to 0.879 before the ship rotated.

The website now creates the wide model at every viewport size. Resize no longer calls the model's layout mutation. It continues to synchronize interaction targets, update camera projection and fit the unchanged vessel. Mobile rendering quality and HTML reader sizing are untouched. The legacy compact asset API remains available to explicit callers and historical tooling, but the live site does not use it.

Each cabin's clear aperture stays **3.416×2.775 model units**, ratio **1.23099**. The camera may pull farther back in narrow selected-room views and show more surrounding hull; this is the tradeoff for retaining physical proportions and stable future content placement.

## Live verification

The [resize samples](evidence/stable-room-proportions/resize-samples.json) contain 14 records. One renderer stays alive through the overview sequence 1600×1000 → 1050×1000 → 1049×1000 → 1001×1000 → 1000×1000 → 999×1000 → 430×932 → 900×700 → 899×700 → 1600×1000, followed by selected Projects at 1600×1000, 1049×1000 and 430×932. A fresh portrait reload separately checks initialization.

All samples remain `wide`; room anchors and the complete doorway metadata stay identical. The root roll changes from zero to π/2 only in portrait overview and returns upright in selected rooms. All sampled overview framing support points stay inside the camera frustum. The [summary](evidence/stable-room-proportions/resize-summary.json) records these comparisons.

Root and the independent critic inspect these actual GPU views:

- [Above the old aspect breakpoint](evidence/stable-room-proportions/overview-1050.jpg) and [below it](evidence/stable-room-proportions/overview-1049.jpg).
- [Desktop overview](evidence/stable-room-proportions/overview-1600.jpg), [resized portrait](evidence/stable-room-proportions/overview-430.jpg), and [fresh portrait visit](evidence/stable-room-proportions/overview-fresh-portrait.jpg).
- Projects at [desktop](evidence/stable-room-proportions/projects-1600.jpg), [narrow landscape](evidence/stable-room-proportions/projects-1049.jpg), and [portrait](evidence/stable-room-proportions/projects-430.jpg).

These show fixed physical rooms with changing framing. Screen-projected ratios are not used as a geometry invariant because perspective and root rotation legitimately change the projection.

## Source and geometry evidence

The [actual-model audit](evidence/stable-room-proportions/geometry-audit.json) verifies that the renderer creates one literal-wide model, has no `setLayout` calls or compact breakpoint detector, and cannot request a layout through its update call. Resize still updates interaction targets and camera framing.

Across 11 orientation/update scenarios, all **763 generated objects** preserve vessel-space geometry and transforms. Reader anchors, picking bounds, doorway positions and required framing metadata stay fixed. This CPU check excludes the intentionally changing root roll; it complements rather than substitutes for live browser resizing.

```sh
node docs/evidence/stable-room-proportions/geometry-audit.mjs . 64c68d0 /tmp/stable-room-audit.json
```

Typecheck, lint and production build pass, with existing warnings in [checks.json](evidence/stable-room-proportions/checks.json). The [independent critic report](CRITIC-REPORT.md) scores this requested correction only. Coverage is finite desktop-browser viewport testing and CPU/source checks, not physical-device, performance, reader/admin or production-runtime certification.
