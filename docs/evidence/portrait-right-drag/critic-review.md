# Independent critic review

20 September 2026. Reviewer: independent `portrait_right_drag_review` agent.
Reviewed final production source, tests, phone/tablet evidence and current
decision records. The reviewer ran and independently parsed the four Earth
coverage jobs; no production files were edited by this reviewer.

**Score: 95/100. Recommendation: keep. No unresolved blockers.**

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Request fulfillment | 29/30 | The positive portrait yaw allowance increases from +0.03 to +0.10 radians, giving the requested slightly greater view behind the outer-right wall. Neutral direction, pitch and left endpoint remain, with the physical roof still favored. |
| Visual quality and interaction | 28/30 | Tablet and phone captures show a modest increase in right exterior depth without overwhelming the room openings or losing the established composition. Drag adds visible movement beyond hover and springs back smoothly. |
| Correctness and regressions | 24/25 | One shared bound supplies input, containment, departure and coverage. The regression targets the actual failure: full positive hover previously consumed the entire drag allowance. Dense framing and signed-flight checks pass, as do the complete 354-test suite, typecheck, lint and build. |
| Organization, costs and evidence | 14/15 | The change stays focused, reuses existing controls and records the small neutral-slope consequence honestly. Source-identified coverage, actual viewport captures and current decision links are retained without claiming unmeasured performance gains. |

## Review details

- Read the one-line production change and the physical roof/underside and
  hover-plus-drag regressions. Inspected the unchanged runtime consumers for
  overview fitting and interpolated signed limits, and the shared smooth input
  mapping. No duplicate portrait control path was introduced.
- Independently evaluated full right hover followed by half-right drag: the
  baseline remains at 0.03 radians with no added movement; the candidate moves
  from 0.036 to 0.0935, adding 0.0575 radians with 0.0065 still available.
- Viewed baseline tablet frames, candidate near-limit and release frames, the
  final phone overview and phone drag. Recorded peaks are about 0.0886 radians
  on tablet and 0.0834 on phone. The added right-side body remains restrained.
- Reviewed final verification logs: 354 full-suite tests and 11 focused camera
  tests pass; typecheck, affected lint and production build pass. Existing
  informational Vinext build notices remain. Captured browser warnings/errors
  are empty.
- Ran the CPU coverage audit for 390×844 and 768×1024 against both production
  Earth meshes. Independently categorized all 22,040 scenarios into ordinary,
  direct-flight and orientation-resize groups. Every visible exact footprint
  and every guarded bound fits the 64-source-row filtering allowance, with the
  fixed geometric seam outside each tested view. All four reports and compressed
  raw samples match the final source hashes; no failures or exclusions occurred.
- Reviewed the README, project-context update and ledger follow-up. The current
  +0.10 rule links to matching evidence. The older 17-viewport audit remains
  historical. The common Hermite neutral slope changes intermediate left-drag
  sensitivity slightly; the documentation correctly avoids claiming its entire
  response is unchanged.

## Limits

Captures use hidden built-in Chromium at actual 768×1024 and 390×844, DPR 1;
Safari was not tested. The drag API releases quickly, so captures demonstrate
near-limit motion and release rather than a held exact +0.10 endpoint. Function
tests cover that endpoint. Images include the developer audit banner and use
JPEG quality 88. Earth and stars remain live, so background changes between
frames are not visual regressions or timing comparisons.

The two-viewport coverage audit is finite evidence, not a new universal camera
or crop proof. It does not repeat the previous full 17-viewport investigation,
nor certify every viewport, custom header, interrupted resize or history state.
The production asset, geometry, materials and passes are unchanged; different
visibility may still affect rendering cost. No frame-rate, GPU-time, memory,
thermal or battery equivalence is claimed.
