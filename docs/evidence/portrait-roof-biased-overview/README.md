# Portrait reference and roof-biased drag — 20 September 2026

Baseline `73e576a`; implementation `7fb9022`. The owner requested a nearly frontal vertical overview like
their screenshot and clarified that “behind the top ceiling” means the outer
**left** hull, while “behind the bottom floor” means the outer **right** hull.

## Delivered behavior

- Portrait direction is `[0.10, 0.08, 1]` in the virtual camera frame. After the
  inverse quarter-turn it retains a small ceiling view and thinner end-wall
  silhouettes. Fitting retains space for the live callouts/header/navigation;
  the supplied screenshot was cropped and did not show those complete controls.
- Portrait yaw spans −0.40…+0.03 radians, exposing the left roof and restraining
  the right underside. Pitch spans ±0.32, restoring bow/stern travel comparable
  to horizontal overview. Landscape camera values and fit density are unchanged.
- The signed drag response uses two monotone Hermite spans with a shared neutral
  derivative. Existing symmetric controls retain their exact linear response.
  Input, fit, departure and coverage all use the shared orientation-specific range.
- Negative endpoints interpolate through the existing camera springs alongside
  positive endpoints. Departure includes their live velocity. Drag release,
  click suppression, stationary hull and direct inward navigation remain.
- The first four-division fit missed the denser verification grid by 0.60 pixels
  at tablet size. Portrait fitting now uses eight divisions and includes neutral
  explicitly; landscape remains at four. The first piecewise-linear asymmetric
  response was replaced after the critic identified a neutral velocity jump.

## Visual and motion evidence

Live main development app in hidden built-in Chromium, actual CSS viewports
390×844, 768×1024 and 1280×720, DPR 1. No native Safari or user screen recording.
No animation freeze; stars and Earth remain live, so image differences include
time changes and are not identical-frame performance comparisons.

- [Before tablet](before-tablet.jpg), [final tablet](tablet-clean.jpg),
  [phone](phone-clean.jpg), [landscape](landscape-clean.jpg).
- [Left roof near its limit](left-drag/03.jpg) and [capped right-side view](right-drag/08.jpg).
  The left sequence reaches yaw about −0.379; the right view reaches +0.03 after
  release through hover. This is not a held full-positive-drag capture. Pure
  function/geometry checks cover the exact endpoints.
- [Left sequence](left-drag/) and [right sequence](right-drag/) include release
  back to hover. Their last 250 recorded frames are retained in
  [left trace](left-drag-trace.json) and [right trace](right-drag-trace.json).
- [Entry](entry/), [return](return/), [motion summary](motion-review.json),
  [entry trace](entry-trace.json), [return trace](return-trace.json).
  Contact entry advances from world Z 17.306 to 7.129 across 192 frames, with
  zero outward steps; first-frame movement from the displayed hovered departure
  is about 0.000017 units. Return has 193 frames with no inward depth steps.
  The vessel matrix remains fixed. Capture cadence is not a frame-rate test.

## Checks and coverage

- [Independent critic](critic-review.md): **94/100**, recommendation keep,
  no unresolved blockers. Its neutral-velocity finding was addressed.
- [Full suite](tests.log): 354 passed, zero failed. It ran while the final neutral
  response adjustment was being completed; [final focused camera checks](targeted-tests.log)
  pass all 11 tests against the final source.
- [Typecheck](typecheck.log), [affected lint](lint.log), [production build](build.log)
  pass. Existing informational Vinext route/chunk notices remain.
- Tests cover physical roof/underside bias, monotonic and velocity-continuous
  signed input, exact symmetric behavior, dense real-model containment,
  direct inward flights including signed drag departures, endpoint rest and
  interrupted-flight momentum.
- The CPU Earth audit samples both production sphere meshes, 17 viewports,
  neutral/drag/hover, direct flights and orientation resize. It uses exact
  front-triangle/frustum clipping plus separate sufficient bounds for 5.5°
  angular/0.25-unit positional neighborhoods and a 64-source-row filter allowance.
  Resize samples conservatively combine both orientation envelopes. They are
  broader than the actual interpolated state; guard failures are inconclusive,
  not automatically visual defects or a universal crop certificate.
- [Categorized coverage results](coverage-check-summary.json): **118,508 exact
  poses pass** the 64-row allowance. Ordinary and direct-flight guarded bounds
  also pass. There are **16 resize-only guard exceptions per mesh**, compared
  with four per mesh in the preceding narrower audit. The new union intentionally
  combines the largest portrait angles with stale roll and landscape composition;
  all exact footprints still fit. Their neighborhoods remain inconclusive.
  [Desktop](coverage-desktop.json) and [compact](coverage-compact.json) reports
  retain source hashes and compressed raw poses.
- [Recorded-frame replay](coverage-live-traces.json): all **1,770** frame/mesh
  checks pass exact and guarded filtering allowances. These replay 885 final
  live frames from the 390×844 entry/return and 768×1024 drag captures, using
  their actual background camera transforms. Source/trace hashes and compressed
  raw results are retained; this supplements rather than replaces the fixture audit.
- Earlier audit attempts were interrupted before producing reports when the
  landscape fit and then smooth neutral response were finalized. Retained
  reports correspond to final source hashes. No timing results are inferred.

Browser locator-evaluation attempts timed out on the large audit DOM; direct
attribute reads succeeded. This was an automation-read limitation, not a captured
application error. A partial drag capture was replaced with the complete final
sequence. Final images were converted to JPEG quality 88 for evidence size.

## Cost and limits

Two additional scalar range springs, a few input-mapping operations, and denser
portrait pose-fitting samples are the added CPU work. No texture, geometry,
material, shader or pass changes. Different camera composition can alter visible
coverage, so no claim of identical GPU cost, frame rate, memory, heat or battery
life is made. Deferred performance candidates remain held.

These are finite live and mathematical checks, not every possible viewport,
custom content state, resize interruption or Safari behavior. Final source hashes
and check status are in [verification](verification.json).

Temporary review tab closed and viewport override reset. Main localhost:3000
remains available (HTTP 200); captured browser warnings/errors were empty.
