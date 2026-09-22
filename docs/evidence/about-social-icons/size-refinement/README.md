# About icon size refinement — 22 September 2026

The owner found the About icons too large and preferred Contact's icon size.
Baseline: `a50880b`. The mark now occupies **50%** of its card instead of 72%,
a **30.6% reduction in width and height**. Both preset and custom icons use the
same extent, and the cream-card Studio preview matches. Card mounts, full-card
click/touch targets, the portrait and labeled-reader/picker icons retain their
existing sizes.

Contact draws its mark at 30% of a 0.62-unit glass surface: 0.186 local units.
About now uses 50% of a 0.38-unit card: 0.190 units. This matches the nominal
physical mark closely; perspective/depth/yaw can vary exact apparent pixel size.
The Contact proportion should not be copied directly onto the smaller About card.

## Visual checks

Hidden built-in Chromium, live rendering, unscaled viewport captures:

- [Contact reference](contact-reference.jpg), [About before](about-before.jpg)
  and [About after](about-after.jpg): actual 1280 × 720 CSS viewport.
- [Phone after](about-phone.jpg): actual 390 × 844 CSS viewport. Native targets
  remain 26.31 × 26.31 CSS pixels, despite the smaller printed mark.

The live Studio preview measures 94 × 94 pixels inside its 188 × 188-pixel
content box (190 pixels including its border), confirming the same 50% extent.
No form values were edited or saved.

Preset/custom images stay centered and contained. No runtime warnings or errors
were reported by the reviewed room tab. Native Safari and physical touch were not
tested. The main studio/database were not changed, and no timing/memory comparison
was performed.

## Validation

The five existing About canvas/model tests pass, covering contain sizing, legacy
image inactivity, fallback/disposal, safe targets, shared focus/travel states and
portrait/card clearance. Typecheck, affected lint and production build (including
geometry precheck) pass. Build retains existing module-registration, large-chunk
and route-classification notices. No new implementation-mirroring test or full
mutation-bearing API suite was needed for these two visual scale constants;
shared renderer, model, navigation and data code are unchanged.

[Source hashes and check results](verification.json) identify the final code.

[Independent review](review.md): **95/100**, no unresolved blockers. Temporary
review tabs were closed and the viewport reset; the main About route returns
HTTP 200.
