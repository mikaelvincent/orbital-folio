# Ceiling-facing portrait and direct inward flight — 20 September 2026

Baseline: `9b4ae30`. The owner rejected the previous clearance curve's residual
pullback despite its earlier positive critic review. Their explicit replacement:
show ceilings in vertical overview and approach a room smoothly without zooming
out or keeping the whole vessel on screen during rotation.

## Change and preserved behavior

Portrait virtual X is reversed, placing the physical camera below the room rather
than above it after the inverse quarter-turn. This applies even just below square;
all landscape direction values remain unchanged. Phone/tablet direction is
approximately `[+0.22, +0.22, 1]` before inverse roll.

A single ease now interpolates physical world camera position and focus between
the actual endpoints. There are no outward control points, sweep-fitted clearance
poses or intermediate stops. Hull cropping during the turn is intentional. The
lens, endpoint room fit, stationary vessel and shared Earth/sky viewpoint remain.

Navigation folds the currently displayed hover, drag and dolly into departure;
clearing those additive controls therefore cannot cause a small initial pullback.
Motion axes are seeded in that same frame before measuring velocity. History
interruptions retain incoming physical velocity through a short decaying tangent.
Normal room/door routing, queues, reduced-motion immediate arrival and resize
behavior remain. Removed the unused runtime roll override and clearance sweep.

## Live evidence

Hidden built-in Chromium only. Main development application, live animation,
actual CSS viewports 390×844, 768×1024 and 1280×720, DPR 1. No native Safari or
screen recording. Diagnostics sequences include a developer-only accessibility
banner; clean visitor-view images and tablet sequence supplement them.

- [Before overview](before-overview.jpg), [baseline trace](before-entry-trace.json).
- [Phone](phone-overview.jpg), [tablet](tablet-overview.jpg) and
  [landscape](landscape-overview.jpg) overview.
- [Fresh focused-Contact entry](entry/), [trace](entry-trace.json),
  [highlighted departure](hovered-departure.json).
- [Return](return/), [trace](return-trace.json).
- [Clean tablet Projects entry](tablet-entry/).
- [Browser Back during entry](history/), [trace](history-trace.json).
- [Motion summary](motion-review.json): the baseline's eye Z rises from 16.815 to
  26.290 before approaching. New highlighted entry drops from 16.277 to 7.129 with
  **zero positive depth steps** across 149 frames. First-frame movement from the
  displayed hovered pose is about 0.000016 world units; the vessel matrix is fixed.
  Return moves outward monotonically to overview, with no clearance overshoot.

The opening hover states differ, so these are not identical-input pixel or
performance comparisons. They directly establish removal of the backward phase.
Capture times include automation overhead; active flight durations describe the
motion design, not frame-rate performance. Earth texture animation remains live.

The first candidate trace was stale after HMR disabled audit mode at a URL without
its query flag. That [export](rejected-stale-hmr-trace.json) was rejected; the
[reason](rejected-stale-trace.md) is retained. The candidate entry was recaptured
from a fresh audit-enabled mount; it is numerically distinct and strictly inward.

## Verification

[Independent critic](critic-review.md): **93/100**, no unresolved blockers.

- **350 tests passed**, no failures: [full suite](tests.log).
- Final [focused tests](targeted-tests.log), [typecheck](typecheck.log),
  [affected lint](lint.log) and [production build](build.log) passed.
- The full suite ran during implementation. The later baked-axis seed correction
  was verified with the final focused checks, typecheck/build and fresh live
  hovered-entry/history traces. Subsequent source changes were comment/unused
  parameter cleanup; final hashes are in [verification](verification.json).
- Tests assert monotonic inward eye Z and eye-to-focus distance, smooth physical
  translation/roll, endpoint/rest/reversal/interruption behavior, ceiling-facing
  portrait orientation including near-square, and unchanged landscape values.
- 14,580 model/near-plane samples cover five portrait layouts and all four rooms.
  Their extra angular sweep is a safety stress, not a replay of cleared inputs.
- [Coverage method](coverage-method.md): 118,508 exact fixture poses, 5,832
  supplementary real-frustum resize perturbations, and 3,084 final live recorded
  frame/mesh samples pass the retained crop and 64-row allowance. Ordinary/direct
  flight guarded bounds pass. Four pre-existing extreme ultrawide resize bounds
  per mesh remain conservative exceptions; no universal certificate is claimed.

Fixture UI reservations cannot prove all custom content or future viewport
states. History evidence is finite; reduced-motion cancellation is source-reviewed,
not an automated device-preference test. Safari was not tested. Build retains its
existing informational Vinext route-classification and chunk notices.

## Cost and recommendation

Keep the new direct path and existing Earth texture. This is an authored motion
and composition correction. No texture, geometry, materials, render pass or
resolution changed. Setup no longer fits the clearance sweep, but no timing,
frame-rate, battery or thermal benefit is claimed. AO still refreshes during
camera motion; roll still invalidates cached shadows. Optimization candidates
remain held. Current decisions and the performance ledger are updated.

Temporary review tab closed and viewport override reset. Main localhost:3000
server returned HTTP 200 and remains running. Captured warnings/errors were empty.
