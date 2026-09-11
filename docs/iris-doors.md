# Integrated iris passages

Room entrances are circular cutouts in continuous side walls. The former rectangular frame, painted trim, and rectangular connecting sleeves are replaced by recessed circular guides and matching circular tunnels. Existing room furnishings, destination signs, route order, and camera poses remain intact.

Six cream shutter leaves rotate and translate behind the wall. Broad overlapping cutting edges keep the opening connected as it grows from the center; flush spiral joins avoid parallax gaps at the strongly oblique room angle. An aperture shader masks concealed storage wings. Moving leaves do not enter static geometry batches or cached shadow/AO passes.

Hover and keyboard focus brighten the leaf finish and warm the painted guide ring. They do not open doors or introduce doorway emitters. Pointer, keyboard, touch, menu, and history destinations use the existing central navigation path. The actual camera itinerary selects required portal faces, including both ladder entrances. Camera travel waits for clearance, retains open hatches during passage, and closes them on arrival. Retargets use the camera's actual position. Overview transitions, immediate resizing, and reduced motion clear opening intent.

## Verification

- Typecheck and production build pass. All 52 automated tests pass.
- Geometry tests verify closed coverage from both faces, fully clear openings, rigid/symmetric motion, intermediate opening connectivity, and 20,000 strongly oblique seal rays.
- Route tests cover adjacent rooms, the complete C route, ladder entrances, near-threshold reversal, mid-ladder retargeting, and unrelated aperture rejection.
- Native preview checks cover neutral/keyboard highlight, activation before travel, closure after arrival, menu retargeting, and portrait resize/overview/return. No browser runtime errors were observed.
- Recorded Projects → Contact journey: 60 gate frames, four required hatch faces fully open before movement, 73 ladder-transit frames, and no incomplete-door travel frames. Maximum focus movement while waiting was 0.000402 scene units.
- Independent scoped critic: **97/100** (geometry/art 38/40, interactions 39/40, regression 20/20), no blocking issues. Only requested doors and affected behavior were scored.

Actual preview captures are in `docs/evidence/iris-doors/`: `closed.png`, `opening.png`, and `hover.png`.
