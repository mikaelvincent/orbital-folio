# Integrated iris passages

Room entrances are circular cutouts in continuous side walls. The former rectangular frame, painted trim, and rectangular connecting sleeves are replaced by recessed circular guides and matching circular tunnels. Existing room furnishings, destination signs, route order, and camera poses remain intact.

Six white shutter leaves rotate and translate behind the wall. Broad overlapping cutting edges keep the opening connected as it grows from the center; flush spiral joins avoid parallax gaps at the strongly oblique room angle. An aperture shader masks concealed storage wings. Moving leaves do not enter static geometry batches or cached shadow/AO passes.

Hover and keyboard focus brighten the leaf finish and warm the painted guide ring. They do not open doors or introduce doorway emitters. Pointer, keyboard, touch, menu, and history destinations use the existing central navigation path. Each camera itinerary leg selects only its physical passage. Opposite faces of an adjoining cabin hatch open together, but the two ladder entrances are independent. An interlock closes the preceding hatch before the next opens; travel along the door-free ladder leg can continue while the previous entrance closes. Crossing waits for complete clearance. Retargets use the camera's actual position. Overview transitions, immediate resizing, and reduced motion clear opening intent.

Opening springs run modestly faster than closing springs (15 vs 12 frequency, with bounded speed and acceleration). Internal partitions use matte cabin ivory on both sides, including circular coupling liners. Blades use neutral white paint on both faces and share the passage's room lighting. Local diffuse hue correction reduces the scene's blue/amber cast on those paints while retaining luminance, shadows, dimming, and surface detail. Real exterior hull finishes remain separate.

## Verification

- Typecheck and production build pass. All 55 automated tests pass.
- Geometry tests verify closed coverage from both faces, fully clear openings, rigid/symmetric motion, intermediate opening connectivity, and 20,000 strongly oblique seal rays.
- Route tests cover adjacent rooms, the complete C route, independent ladder entrances, the close-before-open interlock, near-threshold reversal, mid-ladder retargeting, and unrelated aperture rejection. Integration tests check single-physical-hatch intervals, opening speed, finish consistency, and immediate closure.
- Native preview checks cover neutral/keyboard highlight, activation before travel, closure after arrival, menu retargeting, and portrait resize/overview/return. No browser runtime errors were observed.
- Recorded Contact → Case studies (343 frames) and Projects → Contact (143 frames) journeys: zero overlapping physical-hatch opening intervals and zero incompletely opened threshold crossings in either direction. Actual retarget while opening returned safely to Contact, and no browser errors were observed.
- Independent scoped critic: **98/100** (geometry/materials 39/40, interactions 39/40, regressions 20/20), with no blocking findings. Only the requested fixes were scored.

Actual preview captures are in `docs/evidence/iris-doors/`. `finishes.png` shows the current matching wall and blade finishes; the original geometry captures are `closed.png`, `opening.png`, and `hover.png`.
