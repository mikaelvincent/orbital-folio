# Consistent overview connectors

This iteration changes only overview annotation routing and the camera space reserved for it. Cabin geometry, spacecraft assets, Earth and the star background are unchanged from `ea0cfa9`. The independent review uses the current render-only target of 75/100 with a 6/10 floor.

Landscape uses one two-segment template for every room: a 20×20-pixel diagonal (28.284 pixels long), then a 16-pixel vertical segment. The same template scale applies to all four; upper/lower and left/right placements mirror it. Each label is positioned from its connector endpoint rather than clamped separately, preserving the two lengths and their 45-degree bend under camera movement.

Portrait uses two symmetric outer rails. Connectors begin at the outboard aperture corners nearest the central beam, leave diagonally beside their own cabin, then run vertically beyond the solar panels. Upper and lower label pairs extend inward from the rails. Perspective can vary the portrait segment lengths; the diagonal angles, paired rails, label order and terminal rows stay consistent. The portrait camera reserves a narrow 36-pixel side inset for this route, rather than entire label-width side columns.

The landscape label band is 72 pixels. This trades some craft size for predictable label space, particularly in short landscape windows. The native buttons, hover response, drag suppression and keyboard entry remain attached to the existing scene navigation. Cached world points preserve the labels' camera departure; the portfolio identity keeps its previous behavior.

## Evidence

[Browser records](evidence/consistent-connectors/browser-qa.json) pair screenshots with actual SVG paths, projected solar bounds, label rectangles and render state. Captures cover 1440×900 landscape, 700×480 compact landscape, 768×1024 tablet portrait, 320×740 portrait and opposite native drag states, plus fresh production 1440×900 and 390×844 views. The `production-*` captures use the final built Worker; earlier captures use the same source in development.

The independent [path audit](evidence/consistent-connectors/path-audit.json) parses exactly two segments per room. It compares landscape lengths and angles, and tests both segments against both projected solar bounding rectangles inflated by eight pixels in portrait. These recorded-state geometric checks complement actual GPU images; they do not establish every conceivable camera state, text size or physical device.

[Typing](evidence/consistent-connectors/typecheck.txt), [lint](evidence/consistent-connectors/lint.txt) and [build](evidence/consistent-connectors/build.txt) pass. The build retains the existing large-chunk and route-classification notices. [Source hashes](evidence/consistent-connectors/source-hashes.json) identify the reviewed implementation. Distinct project readers, contact forms, admin workflows, SEO and broad performance benchmarking are outside this iteration.

Recheck the saved actual paths with:

```sh
node scripts/leader-routing-audit.mjs docs/evidence/consistent-connectors/browser-qa.json /tmp/connector-audit.json
```

The latest independent assessment is in [CRITIC-REPORT.md](CRITIC-REPORT.md). The existing dummy database remains editable and the site remains running at `http://localhost:3000/`. No public deployment was performed.
