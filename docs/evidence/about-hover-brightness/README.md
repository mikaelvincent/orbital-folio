# Stronger About hover feedback

24 September 2026. Baseline `825a3a1`.

The owner's follow-up replaces the previous notebook underline with a whole-tab
brightness highlight. Its 62% white wash is stronger than the historical 30%
ivory wash, while the label ink remains dark and steady. There is no hover
underline, rim or shadow. Keyboard focus retains the separate 2px outline.
The background eases over 160ms and settles immediately under reduced motion.
Only the exposed tab region is affected; page geometry, ink masking and turns
are unchanged.

Social poster arrow strokes increased from 0.6% to 1.4% of card width (2.33×).
The studio preview arrow is also bolder. Caption and icon size, placement,
link behavior and the existing card brightness easing stay unchanged.

## Verification

The four pure icon-print tests passed, covering full custom icon proportions,
failed/disposed loads, bounded long titles and email arrow semantics. Typecheck,
affected source lint and production build passed; logs are alongside this file.
No new implementation-mirroring tests were added. The full 519-test isolated
suite passed for the preceding geometry/occlusion change and was not repeated
for this canvas-stroke and CSS-only appearance revision.

Hidden built-in Chromium, live main development server with normal scene effects:
1440×900/DPR2 desktop and 390×844/DPR1 portrait, captured at actual viewport size.
[Posters](posters.png), [marker rest](markers-rest.png),
[marker hover](markers-hover.png), [keyboard focus](markers-focus.png) and
[portrait](portrait-focus.png) show
final source. DOM observations confirm only the hovered tab receives the white
wash and there is no underline or shadow. Keyboard focus was checked after the
style settled. Native Safari, physical touch and the authenticated studio preview
were not tested. No performance measurement or claim is made.

The earlier underline review in `about-interaction-polish` records that revision;
it does not supersede the owner's later feedback. Current decisions are reflected
in PROJECT-CONTEXT.md. [Final source/capture hashes](verification.json) and
[independent review](review.md) are recorded with this evidence. Temporary review
tabs were closed and the viewport override reset; the main server remains
available at localhost:3000 and returned HTTP 200 after verification.
