# Horizontal overview corner connectors

This iteration changes only landscape routing in `components/overview-annotations.ts`. A longer shared diagonal leaves each room; a horizontal run reaches the vessel’s outer left/right corners. Label endpoints reserve the full pill width at the viewport edge. The horizontal runs clear the complete projected top/bottom silhouette, including solar wings during dragging.

The approved portrait branch and anchors are unchanged. Spacecraft geometry, rooms, camera framing, lighting, background, label styling and navigation behavior are unchanged from `041c1f5`. [Source hashes](evidence/horizontal-corners/source-hashes.json) record the reviewed files.

Actual browser evidence:

- [Desktop overview, 1440×900](evidence/horizontal-corners/desktop.jpg).
- [Desktop at a drag limit](evidence/horizontal-corners/desktop-drag.jpg).
- [Compact landscape, 700×480](evidence/horizontal-corners/compact-landscape.jpg).
- [Approved portrait preserved, 390×844](evidence/horizontal-corners/portrait-unchanged.jpg).
- [Viewport, actual SVG paths, pill bounds and projected solar rectangles](evidence/horizontal-corners/browser-qa.json).

[Typecheck](evidence/horizontal-corners/typecheck.txt), [lint](evidence/horizontal-corners/lint.txt) and [production build](evidence/horizontal-corners/build.txt) passed. The build retains existing chunk-size and route-classification warnings. The browser captures are from the running development server; they are not production-runtime measurements. No broader feature or performance testing was needed for this routing adjustment.

The [independent critic report](CRITIC-REPORT.md) uses the current render-only threshold of 75/100 and 6/10 per area. The compact landscape craft remains small because existing camera reservations are outside this iteration’s line-only scope. Captures cover representative viewports and one drag limit, not every camera pose or owner-defined label.
