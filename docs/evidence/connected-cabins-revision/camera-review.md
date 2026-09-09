# Final v8 camera/input verification

The current wide model is feasible in all eight tested desktop room cases. The previous small desktop crop conflict is resolved by the final caption geometry and framing metadata. Required portal points now use physical `plateSize`, and header framing width is 1.4.

| Viewport / layout | Rooms | Valid distance interval | Current chosen distance |
|---|---|---:|---:|
| 1440×1000 / wide | All four | 4.123614–4.216319 | 4.138447 |
| 1920×1080 / wide | Projects, Experience | 3.718850–3.761803 | 3.725723 |
| 1920×1080 / wide | About, Contact | 3.530107–3.761803 | 3.567179 |

At 1440×1000 the outer side-jamb nameplate corners determine minimum distance. At 1920×1080 the deck nameplate determines the Projects/Experience bound, and the upper jamb nameplates determine the About/Contact bound. Headers and room contents remain inside their required bounds. The chosen distance uses the current implementation’s 16% interpolation from the closest safe bound toward the maximum crop bound.

The portrait limitation remains:

| Viewport / active layout | Rooms | Required minimum | Maximum for frame crop | Current fallback distance |
|---|---|---:|---:|---:|
| 768×1024 / compact | All four | 5.961862 | 4.248288 | 6.011862 |
| 390×844 / compact | All four | 9.657013 | 4.261613 | 9.707013 |

These intervals are empty, so the current fallback prioritizes visible controls and intentionally leaves front frame in view. The outer horizontal/upper-jamb portal plates drive the limit. Even excluding portals, the phone’s contents require distances 7.470746–7.891263 and its header requires 4.496058, exceeding the crop maximum 4.261613. This cannot be resolved by a small camera or caption adjustment; a fully cropped portrait room would require a different compact physical layout. The new phone overview separately prioritizes cabin bounds while allowing peripheral hardware beyond the horizontal edge, and keeps roll zero so canonical room order is retained.

Input finding resolved: both local hotspot `enter()` and `leave()`/blur now return while `down.gesture.dragging` is true. Capture retargeting no longer clears the latched hover through the previously unguarded leave callback. The final cancel/lostcapture path can still clear it normally.

Current helper checks passed for sticky out-and-back drag recognition, the exact 8 CSS-pixel threshold, second-pointer rejection, and shared cursor angular bounds ±0.025 pitch / ±0.045 yaw. Source review confirms delayed capture, capture-phase click suppression restricted to `detail > 0`, native button clicks excluded from manual pointerup activation, reader-surface/primary-pointer guards, navigation/resize cancellation, and zero room/overview roll. Actual browser event delivery was not exercised by this numeric audit; the parent retains CUA verification.

Method: instantiated the latest actual model with nine project fixtures and a non-rendering canvas stub that creates label-plane geometry. Reused current `lib/scene-controls.ts`, actual `innerApertureBounds` and `requiredFramingPoints`, FOV 38, target `[aperture.center.x, aperture.center.y, 0.16]`, direction `[0,0,1]`, nine rest/extreme cursor views, overscan 1.015. As requested, top inset is 88 px desktop / 120 px at width <700, bottom is 60 px, horizontal inset is 24 px desktop / 14 px mobile. The browser source measures its real header inset dynamically, so unusually different header dimensions should be checked through its framing diagnostics. All 32 combinations of both layouts, four viewports and four rooms are retained in the raw JSON.

Verified source hashes:
- Model: `791d0ed5ffc63eff438c95bf2474221aa1ea2a3a086df966e01900955d7e56f0`
- Spacecraft integration: `3476ee3287232ab3767ae17483c2165168fed46b1d0c128b36b17cbe99f18524`
- Scene controls: `900d72b4d055f551f630d946d923cd9b93a6d59104c8b61f9e55ce5afd279698`

Evidence:
- `/tmp/final-v8-framing-audit.json`
- `/tmp/final-v8-input-audit.json`
- `/tmp/final-v8-model-framing-snapshot.ts`
- Reproducer: `node /tmp/audit-current-v8-framing.mjs /absolute/path/to/project`

No checkout edits, browser interaction, Sites tools or shader work were performed.
