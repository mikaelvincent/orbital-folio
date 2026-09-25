# Spacecraft idle motion — 25 September 2026

The owner authorized two quiet idle cues after the completed Stage 14 baseline:
an occasional trim at the communications dish and changing bars on the existing
Contact radio trays. The spacecraft remains stationary in the shared physical
world. The dish's reflector, feed and stays move together around the visible
axle; the hull, cradle, solar wings, doors and cabin lights keep their approved
poses. The meters are passive equipment artwork and make no claim about a sent
message or connected call.

## Source and method

- Baseline commit: `b0dce50a3108f88deb6300cc6ee08725f800033f`.
- The [finite renderer manifest](finite/manifest.json) records the exact
  transitive source files, fixture SHA-256, baseline tree SHA-256
  `7e5d92efb9225990c99c7f2be29642222737bacfce82e54fc9a33a025cbbe41a`
  and final model source tree SHA-256
  `5b0015365af1317743b1e11aa5fe7a97fe90b53803f96993f8eed723525606ea`.
  The retained images match the final source snapshot, including the restored
  feed-stay shadows.
- [Capture metadata](finite/captures.json) gives viewport, drawing buffer, DPR,
  camera pose, selected time, draw and triangle counts for every finite image.
  The fixture uses bundled Three.js with a RoomEnvironment, fixed lights and
  a forced DPR of 1. It omits the orbital sky, Earth, GTAO, live screen
  interfaces and navigation. Its draw counts are not full-application timings.
- The live browser review uses the hidden Codex Chromium browser. It does not
  exercise native Safari.

## Visual checks

| View | Baseline | Final |
| --- | --- | --- |
| Contact, wide, resting | [Before](finite/contact-before-wide.jpg) | [After](finite/contact-after-wide-rest.jpg) |
| Contact, wide, meter active | — | [At 30 s](finite/contact-after-wide-active.jpg) |
| Contact radio detail | — | [Rest at 0 s](finite/radio-after-detail-rest.jpg) · [Active at 30 s](finite/radio-after-detail-active.jpg) |
| Contact, oblique | — | [At 30 s](finite/contact-after-oblique.jpg) |
| Service front, wide | [Before](finite/service-before-wide.jpg) | [Dish mid-trim at 14 s](finite/service-after-wide-trim.jpg) |
| Dish support close | — | [At 14 s](finite/dish-support-wide-trim.jpg) |
| Service oblique, compact portrait | — | [At 57 s](finite/service-after-portrait-trim.jpg) |

The dish changes by at most 3.2° and holds still for most of its 198-second
cycle. The matched wide views preserve the feed-stay shadows on the reflector.
The motion is intentionally modest at overview scale and clearer when watching
the dish itself. Meter activity is legible near the Contact wall without changing
the room label, screen availability or interaction feedback. At reduced motion,
both return to their original resting pose.

The live integration review covers [wide overview](live/overview-wide.jpg),
[portrait overview](live/overview-portrait.jpg), [wide Contact](live/contact-wide.jpg)
and [portrait Contact](live/contact-portrait.jpg) in the hidden built-in Chromium
browser. Wide and portrait use actual CSS viewports and app drawing buffers of
1440×900 and 390×844 respectively, both at browser and renderer DPR 1. They
include the normal orbital environment, screen interfaces, navigation layout
and contact shading where enabled at the wide size. They check the implemented
scene in context; they are not pixel-matched baseline comparisons or native
Safari captures.

## Cost and verification

The radio cue adds no geometry and uses six shared channel materials. Moving the
existing dish changes static batching. In this finite fixture, Contact front
draws change **719 → 736** and service front draws **857 → 875**; service front
triangles remain **1,922,176** in the matched pair. The fixture regenerates
its shadow map for each still, so these counts do not represent steady live
passes. The live renderer refreshes the key-light shadow map and, on desktop
when enabled, GTAO while the dish changes pose, then reuses both during long
holds. The four trims occupy 16 of every 198 seconds (about 8.1%). Existing
visibility and reduced-motion rules can suspend them. Meter-only brightness
changes do not invalidate geometry, GTAO or shadows. CPU/GPU time, frame pacing,
memory, heat and battery effects have not been measured; no speedup is claimed.

Targeted motion, contact-shading, real-solid dish support and wall-mount tests
passed **17/17**. Full isolated suite, build, final live review and independent
critic are recorded in [verification](verification.json) and
[review](critic-review.md).
