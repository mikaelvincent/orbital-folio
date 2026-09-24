# Independent critic review

24 September 2026. Reviewer: separate critic agent; no implementation ownership.
Reviewed the final source identified by `captures.json`, the current documentation,
rendered evidence, regression tests and final isolated verification logs.

**Result: 94/100. No unresolved blockers or failing required checks.**

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Fulfillment and visual design | 29/30 | Permanent destination captions and outward arrows make the social prints understandable without a floating tooltip. Whole-card brightness keeps the matte-paper treatment coherent. Marker underlining is quieter and better integrated than the prior box/wash/shadow. |
| Correctness and animation | 29/30 | The two actual layering defects are fixed: buried adhesive no longer appears over the turning page, and stationary native lettering is masked by the carried tab. Correct perspective occlusion remains. Anchors, UV placement, page timing and navigation semantics stay intact. |
| Accessibility and responsiveness | 14/15 | Native link labels, destinations and keyboard behavior remain; keyboard outlines are visible in corrected captures. Reduced motion removes the new CSS transition. Portrait preserves the explicitly approved scaled spread and its existing small-text limitation. |
| Verification and provenance | 13/15 | Final source and image hashes match; all required checks pass. Live Chromium captures cover both turn directions, hover, keyboard focus and portrait. Engine, DPR differences, finite sampling and omitted checks are disclosed. |
| Performance and maintainability | 9/10 | Captions reuse static canvas maps; the tooltip path and social rims are removed. The carried tab uses the existing depth-aware mask pipeline only during boundary turns. No unsupported timing or memory claim is made. |

## Review revisions

1. Initial social captions were small in the actual room view. The final type
   extent increased from 10% to 12% of card width, with a 7% arrow; proportional
   studio-preview styles now match. Final captures preserve clear icon hierarchy.
2. Current project context and authoring instructions initially described the
   superseded icon-only cards and boxed marker hover. They now describe the final
   behavior and identify prior evidence as historical.
3. The notebook investigation distinguished legitimate projected occlusion from
   the carried marker's incorrectly exposed adhesive. Cropping only the hidden
   flag region fixes the latter without forcing markers above physical pages.
4. Further reverse-turn inspection found stationary lettering showing through
   the carried tab. The final mask includes its real batched geometry; the
   focused overlap capture confirms that lettering is now hidden appropriately.
5. A refreshed keyboard screenshot initially retained pointer hover rather than
   keyboard focus. It was recaptured. `notebook-focus-check.json` confirms native
   focus visibility and a 2px outline; the corrected image visibly matches it.

## Evidence and checks

The critic inspected the source diff, before/after turn samples, focused overlap
sample, social idle/hover/focus images, notebook hover/focus images and portrait
room/reader images. All 14 final source hashes and 46 image hashes in
`captures.json` were independently checked and matched. The final verification
record identifies the matching application/test snapshot.

The isolated full suite passed **519/519 tests, with no skips**, followed by
typecheck, production build and lint of all 11 changed TS/TSX/MJS files.
`checks/validation.json` records the separate loopback fixture, fresh D1/R2 state
and test-only secrets. Tests exercise actual failure modes, including ray hits
against both turning-page faces and depth-correct masks after production batching.
`git diff --check` also passed during review.

Limitations: the critic reviewed captured live Chromium output rather than
operating the browser independently. Native Safari, physical touch and the live
authenticated studio preview were not tested; studio composition was inspected
in source. Turn captures are sampled rather than exhaustive. Investigation and
final screenshots have disclosed DPR differences and are not pixel-matched
benchmarks. The additional mask projection work has not been timed. These limits
constrain confidence and the score; they are not unresolved defects in this change.
