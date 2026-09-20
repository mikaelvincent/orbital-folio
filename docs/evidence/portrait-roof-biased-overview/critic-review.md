# Independent critic review

20 September 2026. Reviewer: independent `portrait_roof_critic` agent. Reviewed
the final source, tests, instructions/context, ledger entry 33 and matching
evidence. No production files were edited by this reviewer.

**Score: 94/100. Recommendation: keep. No unresolved blockers.**

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Request fulfillment | 29/30 | The gentler portrait opening follows the supplied reference. The clarified physical roof at screen-left is accessible; the screen-right underside remains restrained. Landscape values and the direct inward transition are preserved. |
| Visual quality and interaction | 28/30 | Clean phone/tablet views keep a balanced silhouette, readable callouts and a slight ceiling view. Left/right evidence shows the intended asymmetry. The revised response crosses neutral smoothly. Exact pixel matching to the cropped reference is neither claimed nor necessary. |
| Correctness and regressions | 24/25 | Shared signed limits drive input, fit and departure; negative-limit motion participates in interrupted-flight velocity. Dense containment, endpoint, monotonic-response and inward-flight tests cover the relevant failures. Live traces show fixed vessel matrices and no entry pullback. |
| Organization, costs and evidence | 13/15 | Changes remain focused and reuse existing springs/flight infrastructure. Documents record the new instruction and distinguish design costs from optimization. Source-identified coverage is extensive but finite, with resize guard exceptions explicitly retained. |

## Finding addressed

The initial asymmetric response multiplied each side of neutral by its own
range. Its yaw gain changed from 0.40 to 0.03 at zero, causing an angular-velocity
discontinuity despite smooth input springs. The final implementation uses two
monotone Hermite spans with a shared derivative. I reviewed that correction and
its continuity/monotonicity regression test; symmetric controls retain their
exact prior linear mapping.

## Evidence checked

- Read final `scene-controls.ts`, runtime changes, the coverage-script changes,
  composition/flight tests and the unchanged direct world-eye/focus flight helper.
- Viewed the supplied reference, before/candidate/final tablet images, clean
  phone view, near-left-limit and capped-right views, release frames, and sampled
  entry/return frames.
- Reviewed full-suite output: 354 passed; final focused camera suite: 11 passed;
  typecheck, affected lint and production build completed successfully.
- Reviewed live motion results: 192 entry frames with zero outward depth steps,
  193 return frames with no inward steps, and about 0.000017 units of initial
  movement from the hovered departure.
- Independently parsed both coverage reports and compressed raw samples:
  59,254 poses per mesh, zero exact filtering-allowance failures, zero ordinary
  or direct-flight guarded failures, and 16 resize-only guard exceptions per
  mesh. Every recorded source hash matched the reviewed working files.
- Reviewed the README, AGENTS/context clarification and ledger entry 33 for
  consistency, current-versus-historical framing and honest cost claims.

## Limits

Live captures are hidden built-in Chromium, not Safari. The right-side image
reaches its cap through post-release hover rather than a held full-positive
drag; the exact drag endpoint is covered by tests. Finite fixtures and their
sufficient neighborhoods do not prove every viewport/resize interruption. The
32 conservative resize-neighborhood exceptions are not evidence of visible
crop failure, but must not be described as universally certified states.

The completed supplemental replay covers 885 recorded frames against both Earth
meshes: 1,770 mesh/frame checks, with zero exact or guarded 64-row-allowance
failures. I checked the result and verified that its source and trace hashes
match the reviewed files. The clean landscape screenshot also retains the
established composition. The score remains **94/100**, with no unresolved
blockers. This review does not claim unchanged frame rate, GPU cost, process
memory, heat or battery use.
