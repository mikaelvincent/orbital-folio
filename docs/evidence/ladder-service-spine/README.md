# Version 2 — engineering service bay

Static ladder bay implementation based on the approved contextual Version 2 concept.

The bay contains five fitted graphite closeouts, a bracketed ladder with satin alloy treads and amber grips, two captured conduit bundles in actual rear-wall recesses, two ventilation grilles, three guarded isolation controls, and contoured end mounts. Three protected diffusers follow the existing bay brightness levels. The curved passage stays clear.

Only the flat rear lining is cut for five matching service pockets. Their closed backs and returns remain inside the existing pressure shell. The cove, shoulder returns, docking assembly, four selectable rooms, doorways and camera/navigation code are preserved.

## Verification

- Independent visual review: **95/100**, scoped to this static bay. See `visual-review.md`.
- Desktop and portrait overview inspected; the existing Projects-room drag view confirms bracket depth and doorway clearance.
- Independent model audit preserves 1,413 components across 24 layout/state combinations.
- 108 doorway rays and 18 transit rays remain clear.
- 15,187 rear-wall samples exactly match the five intended recesses; all apertures have closed backs and returns.
- 43 mechanical join checks, 12 conduit endpoints, 36 conduit captures and 68 fasteners pass.
- Actual adjacent conduit surfaces have no intersections across 1.28 million tested triangle pairs.
- Exactly three diffusers emit, at 0.85 effective intensity in the default medium state and 1.7 on room hover/transit. Other bay materials remain non-emitting.
- Typecheck, lint, production build and diff whitespace check passed. The build reports the existing large-bundle and route-classification notices.

`audit-summary.json` records the exact model/builder hashes and links the numerical findings. Detailed companion reports retain the sampled evidence. These are implementation-time checks, not changes to runtime behavior.

## Render evidence

- `final-desktop-overview.png`: final desktop render.
- `final-portrait-overview.png`: final portrait render.
- `final-projects-oblique.png`: final bracket/header view through the adjacent doorway.
- `bay-detail-final.png`: detail crop used by the critic after the mechanical/material refinements, before the final diffuser-emission correction. The three final screenshots include that correction.

No new interactions, navigation, animations or reading interfaces were implemented. The local preview remains running at `http://localhost:3000/`.
