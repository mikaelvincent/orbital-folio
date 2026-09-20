# Continuous portrait flights — 20 September 2026

Baseline: `f907b7b`. The owner's request was a more artistic vertical overview
angle and seamless overview↔room travel without the staged zoom/rotate/zoom stops.

## Delivered behavior

Portrait direction is `[-0.22, 0.22, 1]` on phone/tablet, smoothly fading the added
yaw/pitch over aspect .85→1. All landscape directions retain their prior formula.
The spacecraft remains stationary; the real camera and shared orbital viewpoint
move. Earth's viewport-selected world anchor stays fixed during navigation.

The old two clearance waypoints are control points of one cubic curve, driven by
one quintic ease. Target, distance, direction and roll overlap; only endpoints
rest. Conservative sweep-fit distances shape its outward arc; this does not
promise whole-hull containment at room endpoints, which intentionally frame rooms.
Normal phone entry/return traces each span about 3.73 active animation seconds.
Incoming history-interruption velocity gets a short decaying tangent rather than
being discarded. Normal settled departures remain exactly the reversible curve.
Immediate/reduced-motion navigation clears the curve and sets the final pose.
Ordinary cabin routing, door interlocks, input springs and destination queue remain.

## Visual and interaction evidence

Hidden built-in Chromium; main development app at localhost:3000. No native
Safari or screen recording. Actual viewports: 390×844 phone, 768×1024 tablet,
1280×720 landscape; DPR 1. No paused/static fixture was used for screenshots.

- [Original phone overview](baseline-overview.jpg) and [original entry sequence](baseline-entry/).
- [New phone overview](phone-overview.jpg), [tablet](tablet-overview.jpg), [landscape](landscape-overview.jpg).
- [New entry sequence](entry/) and [return sequence](return/), with per-frame timing JSON.
  The latter includes the development-only accessibility-audit banner, not visitor UI.
- [Clean About return sequence](clean-return/) and [settled return](clean-return-overview.jpg),
  captured after the final source changes; [direct About arrival](direct-about.jpg).
- [Browser Back during entry](history-back/), [motion review](history-review.json),
  and [full trace](history-back-trace.json) confirm momentum continues briefly before
  reversing, then reaches overview with a fixed hull.
- [Entry trace](entry-trace.json) and [return trace](return-trace.json): 224 frames each;
  fixed vessel world matrices, continuous central movement and settled endpoints.
- [Queued Overview during Contact entry](queue-during-flight.json) and
  [completed queued return](queue-completed.json) verify one deferred destination.

Capture timing includes automation overhead; traces describe motion, not a rested
performance experiment. Earth animation phase continues naturally, so comparisons
are composition/motion evidence, not matching-phase pixel diffs. Settled-flight
captures precede the optional history tangent addition; it is inactive in these
flights and their coordinates are unchanged. Final source hashes identify changes.

## Verification and limitations

The camera tests use the actual spacecraft geometry with fixed public-content UI
insets. They check responsive overview containment, continuous rotation, endpoint
rest, reversibility, history-tangent velocity, and 14,580 eye/near-plane samples
across five portrait layouts, four rooms, 81 times and nine drag positions.
Browser checks exercise actual DOM insets separately. Reduced-motion cancellation
was source-reviewed; native device preference changes were not automated.

Independent critic: [**94/100, no unresolved blockers**](critic-review.md).

Final verification: **349 tests passed**, typecheck, affected lint and production
build passed. See [tests](tests.log), [typecheck](typecheck.log), [lint](lint.log),
[build](build.log) and the [source/check manifest](verification.json). Build retains
its existing informational Vinext route-analysis and chunk-size notices.

The [Earth coverage method](coverage-method.md) records exact sampled paths,
viewport fixtures, margins and remaining limits. It now samples both directions
of the actual settled portrait curve: 115,564 poses across both meshes. All
ordinary/curve guarded samples retain the 64-row allowance. Four extreme resize
neighborhood bounds per mesh still exceed it; exact resize poses and 5,832 extra
real-frustum perturbations fit. This sufficient-bound limitation is unchanged. It does not prove all possible interrupted
routes or arbitrary future viewport/content combinations. No crop or texture
change was made. Earlier provisional audits remain explicitly superseded.

The initial full suite had 347 passing tests and one stale continuity assertion:
it assumed a flat derivative at aspect .9, now inside the smooth portrait blend.
The assertion was corrected to check convergence at all joins, plus exact
landscape preservation; the failure log is retained. The corrected final suite passed; independent critic results are recorded alongside this evidence.

## Cost

No resource counts or Earth asset changed. This is an authored camera/motion
change, not an optimization. Continuous travel still refreshes AO and roll-driven
shadows; different visible pixels can change GPU work. No performance, battery or
thermal saving is claimed; ledger candidates remain held.

Temporary browser tab/viewport override were cleaned up. The existing localhost:3000
server remains available. Captured browser warning/error entries were empty.
