# Exterior line and bar correction

Scope: the raised cream bars below cabin openings and the long dark strips above and below the cabin rows in the three annotated screenshots. This pass preserves the room contents, floor height, doorway geometry, ladder, background and interface.

Baseline: `641a70f`. Final model SHA-256: `d49e9153b13d6f221176e16ae522e487f3312ab5686f5608753f168b364a2c67`.

## Changes

- Removed the decorative `continuous-hull-edge-channel` boxes: two in each chassis layout. They sat in front of the hull surface and read as detached straight lines. The continuous pressure face behind them is unchanged.
- Shortened the four cabin decks at the front only. Their front edge previously reached Z=1.34, just ahead of the chassis face at Z=1.335. It now ends at Z=1.27. Width, floor top at local Y=−1.32, thickness and rear edge at Z=−1.12 remain unchanged. Contents were not shifted. The visible front threshold remains continuous inside the existing aperture.

No replacement bars, covering panels or transparent hiding geometry were added.

## Visual inspection

Root inspected fresh GPU views after reloading the final source. The independent critic reviewed the same evidence:

- [Landscape overview](evidence/hull-bars/overview-front.jpg): no raised bars or long exterior strips.
- [Oblique overview](evidence/hull-bars/overview-oblique.jpg): the aperture edges remain clean when the roof and floor depth are visible.
- [Selected Projects threshold](evidence/hull-bars/projects-threshold.jpg): the floor meets the opening without an exposed gap.
- [Portrait overview](evidence/hull-bars/overview-portrait.jpg): the rotated chassis has the same clean edges.

Each image includes a matching `*-state.json` with viewport, camera, renderer and scroll records. The landscape images use 1600×1000; the portrait capture uses the restored 430×932 viewport. These are final live views, not pixel-matched comparisons with the user's annotated screenshots.

## Geometry checks

The [actual-source geometry audit](evidence/hull-bars/geometry-audit.json) compares the baseline and final generated meshes. All four decorative channel meshes are absent. **742 unrelated geometries and transforms** are preserved in both layouts. Deck dimensions confirm the unchanged floor height, width and rear edge within floating-point precision.

Across both layouts, **180 targeted rays** that formerly hit the raised deck bars now hit the original pressure face. Another **360 downward and oblique threshold rays** across all four cabins find no newly exposed gaps. This bounded 540-ray check supplements the live images; it does not certify every possible angle.

Reproduce:

```sh
node docs/evidence/hull-bars/geometry-audit.mjs . git:641a70f:components/spacecraft-model.ts /tmp/hull-bars-audit.json
```

Typecheck, lint and production build pass; the existing build warnings are retained in [checks.json](evidence/hull-bars/checks.json). The [independent critic](CRITIC-REPORT-HULL-BARS.md) scores only this requested correction and its immediate regressions. No unrelated UI, production runtime or deployment claim is included.
