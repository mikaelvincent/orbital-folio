# Continuous exterior and rounded ladder opening

The exterior roof, keel, right-side wall, and rear now share one continuous
surface. The old per-room exterior faces and exposed divider rims have been
removed, eliminating overlapping roof layers, the differently lit divider
stripe, and square wall caps outside the rounded front frame. The right corners
follow that frame's existing rounded contour throughout the ship's depth.

The bow skin now uses the same contour as the front frame. Rear closure wedges
follow every sampled vertex of the bow, and the ladder divider stops at the
actual rear-wall plane. These remove the small overlapping seams and rearward
sheet edges found during the broader audit.

The ladder opening has matching 0.25-radius right corners across the aperture,
seal, and interior return. Its left shoulder run is adjusted to leave smooth
tangent joins without folded or overlapping curves. Upper and lower curves
remain mirrored; overall opening extents and ladder fittings are preserved.

The old thick navy block beneath each floor also protruded through the lower
corners. A flush navy floor finish preserves its visible appearance while the
existing pressure floor provides the structure. Furniture, room dimensions,
door clearance, navigation, camera behavior, and the space background are unchanged.

Visual evidence: `docs/evidence/continuous-shell/`.

## Verification

- Independent geometry audit: 1,832 exterior probes pass across both layouts,
  with no duplicated rear surfaces or protruding ladder divider vertices.
- New tests cover rounded right corners, consistent exterior lighting, single
  roof ownership, rounded ladder contours, rear panel bounds, and rear seam
  overlap. Restoring the two rear defects in temporary copies makes their four
  focused regression checks fail as expected.
- All 330 protected furniture meshes and room/aperture dimensions match the
  prior revision exactly. Rendered wall thickness and door clearances still pass.
- Desktop 1440×900, narrow desktop 1024×768, tablet 768×1024, and phone
  430×932 were visually inspected, including opposing tilt directions.
- Enlarged 1920×1200 render details verify both right corners and the exact bow
  bevel join. Matching the front frame's actual bevel vertices removes the tiny
  dotted seam that was still visible under enlargement.
- Typecheck, all 78 automated tests, changed-file lint, and production build pass.
- Independent scoped critic: **98/100**, with no blocking findings. The final
  enlarged bow seam and both right corners are clear, and the navy floor finish
  is preserved. Unrelated or unfinished features did not affect the score.
