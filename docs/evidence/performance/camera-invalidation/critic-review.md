# Independent review — delivered camera invalidation

Reviewer: independent `camera_audit_critic` agent, 15 September 2026.
Final result: **94/100 — ready to commit, no unresolved blockers.**

| Criterion | Score |
| --- | ---: |
| Request fulfillment and scope control | 19/20 |
| Correctness and preservation of behavior | 24/25 |
| Visual equivalence | 20/20 |
| Measurement quality and interpretation | 17/20 |
| Maintainability and reusable diagnostics | 9/10 |
| Documentation and verification | 5/5 |

The reviewer independently checked the final source, recorded images, raw frame
data, aggregate calculations, source archives, compressed hashes and validation
logs. Final runtime source differs from all three measured archives only by
selecting the validated geometry policy as the normal default.

Material-only AO invalidation is removed while camera, door, reader, projection
and explicit invalidation paths remain. Shadow diagnostics count actual generation.
All other ledger candidates remain held. Contact's accepted blocks support the
narrow 10.47% callback CPU reduction; failed sessions and GPU sampling limitations
remain visible in both the raw evidence and written conclusions.

The final portrait replay matches across 170 checkpoints per policy. All captured
camera/light/vessel/door/reader states and shadow masks match. The 75 removed
Contact refreshes are the only AO-mask difference. All 12 corresponding PNG files
(six displayed images and six forced-fresh references) are byte-identical.
The reviewer also visually inspected the Contact and portrait-entry captures.

## Iterations prompted by review

- Fixed synthetic keyboard events to originate from an Element and added focus
  acquisition assertions; retained and excluded the defective initial workloads.
- Separated whole-frame GPU queries from exploratory pass queries; preserved raw
  frame IDs and documented the fixed-cadence sampling bias.
- Added measured overview-entry and return routes to cover portrait roll and
  actual light/shadow changes, rather than excluding them in warmup.
- Disclosed unmatched initial wide camera poses and reproduced the six inherited
  cached-versus-fresh settling differences under both policies.
- Retained rejected Contact blocks and the failed overview readiness continuation
  without relaxing acceptance gates or claiming universal performance gains.
- Independently reproduced 213 baseline lint errors; final changed-file lint is
  clean and the remaining 199 repository-wide findings are pre-existing.

## Verification and limits

Logs substantiate 267 full-suite passes and 26 overlapping targeted passes
(including three additional summary tests), successful typecheck and production
build, and clean lint for changed files. Documentation links and every compressed
and uncompressed raw-report hash were checked.

There are no native Safari measurements and no accepted overview timing-equivalence
result. Instrumentation overhead, fixed GPU sampling bias and inherited camera
cache tolerances limit generalization. Nominal OS pressure does not prove equal
clocks or no throttling. These limitations do not block the narrow, visually
unchanged optimization supported by the accepted Contact comparisons.
