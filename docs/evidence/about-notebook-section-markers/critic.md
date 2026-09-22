# Independent review — markers behind the first page

Reviewer: `/root/notebook_flow_review`, 23 September 2026. The reviewer inspected
the final application diff, regression assertions, current documentation and
supplied live screenshots/DOM observations. Only this review file was edited.

## Result

**95/100, accepted with no unresolved application, visual or verification
blockers identified.** The final isolated checks pass and source identity matches
the reviewed implementation. This score does not override subsequent owner feedback.

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Fulfillment and correctness | 44/45 | The current marker is left from its section's first page onward; future markers stay right. Forward/reverse boundaries move the correct section marker, while internal pages leave markers still. |
| Visual quality and cohesion | 29/30 | Readable labels, fixed spacing, adhesive overlap and physical paper attachment remain consistent in the initial reader, later section, room and portrait captures. |
| Scope and cost | 10/10 | Two narrow application changes use the existing shared layout and turn sequence. No new geometry, material, texture, camera behavior or render pass is introduced by source inspection. |
| Evidence and limits | 12/15 | Focused regressions and live desktop/portrait observations cover the requested cases. Native Safari, physical touch and live transitions between marker banks are not certified. |

## Review findings

The resting comparison changes from `index < section` to `index <= section` in
the shared marker layout. Both native controls and physical flags therefore put
the selected marker on the left, including initial section zero and a single-
section notebook. Boundary ownership changes to the higher of the two adjacent
sections. That carries the new section's marker left when entering it and the
same marker right when returning before it. The existing within-section sentinel
keeps every marker stationary through internal pages.

Regression assertions check initial/single-section placement, both printed faces'
registration and 30px overlap, stationary internal-page markers, forward/reverse
motion, moving physical labels, interrupted routes, reduced-motion settlement and
settled bank sides. No corrective application edit was needed after review.

- [First section](first-section.jpg) shows My story on page 1 of 3 with marker 01
  already left and the four future markers right. The heading outline is the
  existing keyboard focus indicator.
- [Section 3's first page](section-3-first-page.jpg) shows markers 01–03 on the
  left and 04–05 on the right; the current Learning notes label remains readable.
- [Reverse boundary](reverse-boundary-turn.jpg) shows marker 02 physically
  attached to the moving leaf while marker 01 remains on the left.
- [Room](room-view.jpg) and [portrait](portrait-reader.jpg) retain the same marker
  placement. Portrait deliberately keeps the small desktop spread.
- [DOM observations](browser-states.json) confirm unchanged sides on internal
  pages, the correct reverse settled states and an empty recorded console log.

The six-marker bank mechanism is unchanged. Crossing a bank boundary switches the
visible bank after settling; this change does not add an animation between banks.
The README explicitly records that behavior, and model assertions cover the
settled first marker of the next bank and the fully-left previous bank.

## Verification and limits

The 19 focused notebook regressions passed before the independent review. The
reviewer subsequently inspected the final [verification record](checks/verification.json)
and raw full-suite summary: **509/509 tests passed**, with zero failures,
cancellations or skips, in 197,052.136583 ms. Typecheck, affected lint, formatting
and production build also passed. All **443 final source hashes** independently
matched the current checkout. The only post-check source delta is the documented
Project Context update; application/test sources remained unchanged.

API/workflow tests used a disposable source checkout with fresh isolated D1/R2,
test-only secrets and explicit loopback port 3003. The records confirm cleanup of
that server/state/helpers and a continued HTTP 200 response from main `/about`.
Log normalization is documented and does not change test results. These are
implementing-agent runs inspected by the critic, not an independent rerun.

The implementing agent used hidden built-in Chromium with ordinary live scene
effects and existing published content: actual 1280×720/DPR 2 desktop and
390×844/DPR 1 portrait viewports. The reviewer inspected artifacts and source,
without independently driving the browser. The reverse-turn image is one sample,
not continuous animation evidence. Native Safari and physical touch were not
tested. Reduced-motion and additional marker counts/banks are model-test evidence.
No timing, memory, heat or battery claim follows from the small source diff.
