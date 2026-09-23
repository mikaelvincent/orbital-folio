# Palette room refinements and desktop options

23 September 2026, following palette baseline `d77d3c0`.

Historical comparison: the owner subsequently selected A · Soft graphite.
The preview status below describes this earlier checkpoint; see the
[adoption record](../soft-graphite-desktop/README.md) for the current implementation.

## Implemented

- Empty Case studies categories have no printed title, icon or identifier and no
  interactive target. Their installed black cartridges pack at the bottom, below
  populated categories in canonical order. This interprets the request to hide
  empty categories while retaining the explicitly mentioned disabled hardware.
- Category cartridges have no 3D hover box. Their whole assembly eases from
  0.48 at rest to 1.15 on hover/focus, preserving the existing easing and travel
  behavior. Carbon text stays readable. The ordinary native keyboard focus
  indicator remains. The terminal and other screens keep their original response.
- Notebook paper markers have a stronger translucent ivory highlight, inset
  carbon keyline and small shadow on hover or keyboard focus. The marker colors,
  geometry, registered label positions and plain selected state are unchanged.
- The Projects bench has a thinner inset carbon work surface and fine gasket.
  Its working plane, grounded supports, monitor bank and camera framing remain
  fixed. Both clamps sit directly on the top. The physical builder retains the
  same 353 meshes and 146,916 instance-expanded triangles before batching;
  this is a design refinement, not a measured performance improvement.

## Desktop options — not implemented

`options/` contains comparison-only renders and source patches for a brighter
shared desktop. These patches were applied only to the disposable preview
checkout, then restored. Production `computer-desktop.ts` remains unchanged.
The comparison varies the existing folded gradient colors and lifts the Contact
secondary labels to ivory so they remain readable on the brighter screens.
Lighting, emission, typography, interaction dimming, geometry and room framing
are retained. Production Contact artwork is also unchanged.
`options/variants.json` identifies the exact proposals. No choice is authorized
by viewing or switching the comparison.

## Verification

The complete suite passed **516/516** from a disposable source checkout against
`TEST_BASE_URL=http://localhost:3003`, with fresh D1/R2, generated fixture-only
secrets, an initialized test owner, and isolated Vite caches. No main environment
files, store, uploads or inquiries were copied. Typecheck, production build and
final affected Oxlint passed. A contextual DOM-overload lint error in the canvas
test stub was corrected by inferring the stub separately; its six focused tests
and affected lint passed afterward. Check logs preserve both failed lint attempts,
tested/final hashes, and the comment-only highlight-header correction.
See [checks](checks/results.json). Initial focused test development also corrected
an old 0.65 cartridge assertion and a missing test-fixture section declaration.

Visual checks use the **hidden built-in Chromium browser**, with actual
1440×900 landscape and 390×844 portrait viewport captures. They use the live
application renderer, including its normal shadows/AO and adaptive drawing buffer.
No native Safari or iOS check was performed. Pointer hover uses virtual pointer
movement; keyboard focus uses real Tab navigation. Portrait notebook captures
show the preserved room-level composition, whose small mounted text is not a new
mobile-reader design. Reading view remains the readable alternative.

Review includes cartridge idle, pointer hover, keyboard focus and portrait order;
Projects worktop landscape/portrait; notebook idle, right-marker hover, left-marker
keyboard focus and selected rest. The live availability mask combinations and
anchor movement are covered by the production-model tests for all 16 subsets.
Browser resize/transition captures with a half-frame or unfinished flight were
rejected and refreshed; they do not support completion. Command-log trailing
whitespace is normalized for repository hygiene without changing outcomes.

[Capture inventory](captures.json) binds final source hashes to each image.
The inline comparison uses those same room renders, scaled from 1440×900 to
1024×640; its controls were checked at 992px and 320px content widths with no
horizontal overflow. See [comparison checks](options/comparison-check.json) and
[bounded rendered-contrast samples](options/contrast.json). The initial Contact
subtitle samples in brighter proposals were too low, so proposal-only secondary
ink was raised to ivory and captures refreshed. B/C Projects labels have less
contrast margin than A; final adoption requires checking the chosen treatment
in the remaining screens and interaction states. No wallpaper is implemented.

The disposable fixture, review servers (3003 and 3018) and temporary browser
tabs were removed; the viewport override was reset. The original main server
(PID 32334) remains at localhost:3000 and returned HTTP 200 after cleanup.

## Independent review

The [independent critic](review.json) scored the final source and matching
evidence **95/100**, with no unresolved blockers. It records the rubric, resolved
findings, source/capture checks and limitations. Implementation commit: `18784c9`.
