# Independent review

Reviewer: `/root/wall_hover_critic`, independent of implementation.
Task: evaluate the bounded contact-shading prototype, evidence, production
decision and maintenance quality. A visually different experiment can fulfill
this task only if it stays out of normal rendering pending user approval.

## Revisions before final review

- The Projects reader verification initially used an unsupported query route.
  The final replay uses a published project slug, asserts the reading state and
  includes the deployed reader in hybrid live zones. Invalid earlier reader
  observations remain marked as pilot evidence.
- Responsive testing exposed a stale-size saved AO target in the shared
  developer verifier. The final runtime matches its dimensions before copying.
  Each candidate pair now records/checks WebGL errors. The entire wide,
  portrait and narrow sequence was replayed against the final source.
- The reviewer requested an explicit historical assurance limit: old resized
  shadow/geometry checks did not have the new per-pair GL validation. This does
  not automatically invalidate their before/after images.
- Geometry storage is stated as candidate-minus-original arrays, separately
  from the lab retaining both geometries. No process-memory or timing savings
  are inferred from geometry counts.

The reviewer independently matched all 81 archived source files and inspected
final wide/portrait hybrid images for freeze
`38a41135-8427-4df8-9f7c-66f8656dc6da`. Preliminary conclusion:

> No remaining implementation blocker found. The matching images still show
> visible contact-shading artifacts, so retaining current GTAO remains the right
> recommendation.

## Final review — 94/100

The reviewer returned the following assessment after completed evidence and
documentation were available. Its optional Brotli wording correction was then
applied: that figure is a measured offline compressed size, while the browser
actually fetched gzip. No implementation changed after the reviewed freeze.

**Independent critic: 94/100 — no unresolved blockers.**

| Criterion | Score |
|---|---:|
| Request fulfillment and appearance constraints | 25/25 |
| Visual evidence and adoption decision | 24/25 |
| Correctness and maintainability | 18/20 |
| Performance methodology and interpretation | 18/20 |
| Documentation and reproducibility | 9/10 |

**Retaining production GTAO is the correct decision.** The prototype demonstrates genuine surface-space baking and a bounded hybrid, but visibly changes contact shading and adds substantial geometry. Neither qualifies as an appearance-preserving optimization. The candidates remain confined to the developer lab.

I independently verified:

- All **81 current source hashes** match final freeze `38a41135`.
- All **13 archived report hashes** validate.
- Final wide, portrait and narrow evidence contains **138 candidate comparisons with zero GL errors** and **141 exact baseline restorations**.
- Narrow-screen B/C correctly return to A; the separate subdivision diagnostic is explicitly distinguished.
- Reader tests now exercise the actual open state.
- Saved logs show **294 passing tests**, successful final type checking, affected lint and production build.

I inspected matching final wide and portrait images. The hybrid produces coarse gradients around fixtures, labels, bench supports and floor edges. Earlier reader and door pairs corroborate the dynamic-contact limitations. Portrait images were inspected at 900×1200; wide 2560×1440 originals were displayed at 2048×1152.

Review findings were addressed: unsupported input filtering, hidden-reader inclusion, material-hook and feedback preservation, subdivision-only controls, explicit hybrid-boundary limitations, corrected reader routing, and the shared verifier’s resized AO backup. Failed and superseded runs remain qualified.

The corrected rested run failed stability gates; the later 2,880-frame survey remains appropriately unranked. Its counts establish added geometry work, while drifting timings establish no causal speedup or slowdown.

Limitations remain explicit: no native Safari or cross-GPU validation, cold-network/startup measurement, complete HTML-reader accessibility audit, or thermal/battery benefit. The full suite preceded the small verifier resize correction; final static checks, build and responsive GL replay cover that correction. I reviewed saved evidence rather than operating a live browser.

The prototype is ready to retain as reproducible research and present for visual review. It should remain disabled in production.
