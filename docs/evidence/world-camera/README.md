# Stationary vessel and shared world camera

14 September 2026. This is a camera/art-direction change, not a performance
optimization. Production retains the approved 8K Mediterranean night Earth.

## Implementation

The former portrait overview rolled the rendered vessel while the orbital scene
used an independent camera. `lib/vessel-camera.ts` now applies the inverse roll
to the real camera. For old camera transform C and vessel roll R, the new camera
is R⁻¹C, giving view matrix C⁻¹R. The fixed vessel therefore has exactly the old
model-view matrix. A non-rendered virtual frame preserves exterior annotation
ordering, endpoints and fade timing. CSS objects and raycasts use the real camera.

The orbital camera uses a fixed registration relative to the overview camera,
at 32 orbital-to-vessel scale. It is re-established on viewport changes only.
Earth, stars and meteors remain in that registered world during room travel and
drag. The nebula samples its atlas using the actual viewing ray. Earth stays
outside the camera, including unusually tall viewports.

The external light rig, shadow-camera up direction and reflection orientation
compensate for the former vessel roll, preserving room lighting. Atmosphere
illumination is also world fixed. This does not eliminate shadow invalidation:
the light rig still changes relative to the fixed geometry during roll.

## Validation

- `full-tests.log`: **213 passed, 0 failed**. Includes route/door interlocks,
  room framing, pointer/hover behavior and the new camera tests.
- `tests.log`: the earlier focused run, **41 passed, 0 failed**.
- `typecheck.log` and `lint.log`: successful checks of the delivered source.
- Required Sites build wrapper completed successfully. See `build-result.md`
  for the command, result and build warnings.
- Independent critic: **94/100**, with no blocking findings. The rubric,
  resolved atmosphere finding and limitations are in `critic-review.md`.
- `tests/vessel-camera.test.mjs` checks old/new projection equivalence over
  132 poses, shadow projection through 17 roll steps, and the actual orbital
  camera/environment over desktop, portrait and extreme-aspect paths.
- The independent reviewer additionally checked 4,883 projected points across
  257 poses: maximum projection difference 3.33e-11. Numerical comparison is
  the evidence for equivalent vessel-only framing; there is no matched
  before/after production pixel-difference measurement.

## Browser evidence

Initial landscape screenshots were captured in Safari before the user requested
background-only testing. All files prefixed `iab-` were captured in a hidden
Codex built-in browser. No native screen control was used after that request.
The portrait viewport was 390×844; the normal built-in viewport was 1280×720.

`runtime-summary.json` summarizes actual DOM diagnostic flight traces:

| Route | Samples | Result |
| --- | ---: | --- |
| Projects → Case studies | 69 | Ordinary travel, no door wait |
| Portrait room → Overview | 452 | Camera rolls through 90°; vessel matrix remains identity |
| Portrait Overview → About | 452 | Inverse return through 90°; vessel matrix remains identity |
| Portrait About → Projects | 151 | 77 ladder samples; entrance and exit never simultaneously above 1% open |
| Direct `/contact?audit=1` load | 113 | Starts at overview camera and travels to Contact |

Across every captured flight the maximum vessel matrix identity error is zero.
The independent reviewer recovered a constant background registration throughout
the portrait return, with maximum numerical drift 2.14e-14. Background translation
and orientation both change along the route.

`iab-drag.json` records a real overview drag: camera position changes from
[-5.8345, 3.5592, 23.2785] to [-3.3452, 5.0087, 23.3450], while vessel rotation
remains [0, 0, 0]. Contact's GitHub link receives keyboard focus and resolves to
`contact-social-left`; Tab transfers focus to LinkedIn. Link targets were inspected
without opening external sites. Door buttons successfully navigate after camera
orientation changes. `iab-console.json` has no browser warnings or errors.

The clean portrait overview is `iab-portrait-clean.png`. Other diagnostic captures
include the development accessibility HUD, which is absent without `?audit=1`.
Those captures establish scene behavior, not header visibility behind the HUD.

## Limits and performance follow-up

No new render passes or textures are added, but camera-ray sky projection adds
per-pixel matrix/normalization and atan/asin work. GPU cost has not been measured
for this change; unchanged draw counts are not evidence of unchanged GPU time.
The ledger requires a new baseline before any optimization experiments proceed.
Existing benchmark results remain historical, and no heat/battery saving is claimed.

See [horizon comparison](../horizon-softening/README.md) for the selected dimmer,
broader blue crest and [performance plan](../../performance-ledger.md#next-candidates)
for the explicitly held shadow/AO experiments.
