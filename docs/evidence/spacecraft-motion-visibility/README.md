# Spacecraft motion visibility — 25 September 2026

The owner could not notice the earlier [quiet equipment motion](../spacecraft-idle-motion/README.md)
in the normal experience. This revision gives the exterior dish a clear scan
and puts visible signal motion on the main Contact display, with its small
physical radio meters as a supporting detail. The aim is visible care in the
animation: movement should be easy to find without abrupt starts, stops or
competing motion across the spacecraft. Mechanical realism is secondary to
that experience.

## Decision and source boundary

- Comparison baseline: commit `21e0a9b73007d415c7e1aa49a74394a7f86bec84`,
  which contains the 3.2° dish trims and quiet six-channel meter modulation.
- The dish's reflector, feed, stays and rim still move as one assembly around
  the existing axle. Its fixed cradle and the solar wings do not animate.
- Three eased sweeps cover 0 → +18° → −18° → 0 over an 18-second loop. The
  second rotation axis follows at 60% of that angle. Movement starts after a
  0.75-second rest and occupies 9.5 seconds per loop, with short endpoint holds
  and a longer home hold.
- The Contact UPLINK and VOICE trays retain their geometry and labels. Their
  existing bar arrays display a contrasting fill from 3 to 9 lit bars on
  independent 5.2- and 6.4-second cycles. The larger idle Contact display
  traces its three existing printed signal arcs in sequence on a 3.7-second
  loop. Three small transparent overlays provide the glow; the static screen
  artwork remains in place, and reading view hides the idle display. These are
  passive graphics; they do not indicate that a message was sent or a call
  connected.
- Reduced-motion preference holds the original dish pose and all-lit radio
  appearance, with the screen glow off. The spacecraft remains stationary in
  world space while the camera follows its existing navigation behavior.
- The overview fit uses the full supported dish sweep so camera framing does
  not shift according to the dish's phase when layout is recalculated.

## Visual and cost checks

The [finite renderer manifest](finite/manifest.json) freezes the final comparison
source, including the central-display refinement, and lists transitive source hashes. Its fixture
SHA-256 is `4057f132112dff555e4adff116f054adcf44d5d8abb9c10c3f3c2c51ace0beb7`;
the baseline and revised model trees are
`5b0015365af1317743b1e11aa5fe7a97fe90b53803f96993f8eed723525606ea`
and `3836c6d66ed2f09e2b13e4b6bf9d3a13ebaf0a7956601c24b685e00e75c44b48`.
The revised Contact display source SHA-256 is
`7bc897adf7188870e8cdc42b5d87660eea54ac31914ed90b8c8c9a46817f98d9`.
The [19-capture record](finite/captures.json) gives each selected time, camera pose,
actual CSS viewport, drawing buffer, DPR, draw calls and triangle count. Both
versions use the same bundled Three.js fixture, RoomEnvironment, fixed lights,
PCF shadows and DPR 1. Wide views use 1440×900; compact portrait views use
390×844. The fixture omits GTAO, Earth, stars, live interfaces and navigation.
These stills show pose and composition, but cannot by themselves establish how
the eased movement feels at playback speed. The radio change is clear at close
range; the hardware remains small in an ordinary room view, so its room-scale
visibility needs to be judged in live playback.

| View | Quiet baseline | Visibility revision |
| --- | --- | --- |
| Service front, 3.25 s | [Before sweep](finite/service-before-early.jpg) | [Positive sweep](finite/service-after-positive.jpg) |
| Service front, return and negative sweep | — | [Home](finite/service-after-home.jpg) · [Negative](finite/service-after-negative.jpg) |
| Dish support close | — | [Positive](finite/dish-after-positive-close.jpg) · [Negative](finite/dish-after-negative-close.jpg) |
| Service oblique, compact portrait | — | [Positive](finite/service-after-portrait-positive.jpg) · [Negative](finite/service-after-portrait-negative.jpg) |
| Radio detail, 2.5 s | [Quiet bars](finite/radio-before-low.jpg) | [Lower fill](finite/radio-after-low.jpg) |
| Radio fill progression | — | [Home](finite/radio-after-home.jpg) · [Low](finite/radio-after-low.jpg) · [Recovery at 5.2 s](finite/radio-after-recovery.jpg) |
| Contact front, 2.5 s | [Quiet bars](finite/contact-before-wide.jpg) | [New fill and signal](finite/contact-after-wide.jpg) |
| Contact signal sequence, wide | — | [Home at 0 s](finite/contact-after-home.jpg) · [Inner at 0.9 s](finite/contact-after-arc-inner.jpg) · [Middle at 1.75 s](finite/contact-after-arc-middle.jpg) · [Outer at 2.6 s](finite/contact-after-arc-outer.jpg) |
| Contact signal, compact portrait | — | [Outer at 2.6 s](finite/contact-after-portrait-arc.jpg) |

The matched service-front stills at 3.25 s report **875 draws and 1,922,176
triangles** for both versions. At 2.5 s, the matched Contact-front stills
report **736 → 737 draws** and **1,796,856 → 1,796,952 triangles**; the active
signal arc adds a visible submission. The Contact home frame at 0 s retains
736 draws and 1,796,856 triangles. These are fixture submissions that include
a shadow-map render for each still, not full-app frame timings. The previous
evidence remains a historical baseline and is not overwritten.

The normal Contact room makes the physical radio meters small. The new central
signal arcs address that room-scale visibility gap. They read in the wide room
view but remain small in compact portrait; the finite captures establish their
distinct poses, while live playback is needed to judge salience and pacing.

The [live capture record](live/captures.json) identifies six ordinary-app views
from the hidden built-in Chromium 153 browser at `http://localhost:3000`. Wide
views use actual 1440×900 CSS pixels and drawing buffer; compact portrait uses
390×844, both at DPR 1. These include Earth, stars, the normal interface,
navigation and the app's contact shading where enabled. They match the final
model source tree above, but are not pixel-matched to the quiet baseline and do
not test native Safari.

| Live view | Captures |
| --- | --- |
| Wide overview dish scan | [Positive at 3.217 s](live/overview-wide-positive.jpg) · [Negative at 8.916 s](live/overview-wide-negative.jpg) |
| Wide Contact, normal room | [Outer signal arc at 2.583 s](live/contact-wide-outer-arc.jpg) |
| Portrait overview dish scan | [Positive at 3.233 s](live/overview-portrait-positive.jpg) · [Negative at 9.033 s](live/overview-portrait-negative.jpg) |
| Portrait Contact, normal room | [Outer signal arc at 10.05 s](live/contact-portrait-outer-arc.jpg) |

In the live wide Contact view the illuminated arc reads on the central display,
while the physical radio meters remain a close-view detail. Portrait retains
the cue at a smaller on-screen size. Static captures confirm the endpoints and
display state; they cannot establish frame pacing or replace watching the eased
motion at normal speed. The first isolated full suite exposed real overview
framing drift during `setLayout`: it sampled the dish at different animated
phases. The model now fits a fixed envelope over the full supported sweep,
without weakening the original iris test. A fresh disposable D1/R2 fixture
passes the final full suite **591/591**. Focused motion and integration tests
pass **18/18**, as do typecheck, affected lint, formatting and production build.
The [independent critic](critic-review.md) scored the revision **91/100** with
no blocking finding. The [verification record](verification.json) links these
checks to the final source commit.

The dish and radio revisions create no new geometry; the Contact display adds
three small transparent arc overlays. The more frequent dish movement asks the
renderer to refresh the key-light shadow map and desktop contact shading where
enabled; Contact indicator changes do not request either refresh.
No CPU/GPU timing, frame pacing, memory, heat or battery result is inferred
from the motion schedule or still-frame draw counts.
