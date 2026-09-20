# Portrait right-drag follow-up — 20 September 2026

Baseline `610f8bf`. The owner approved the portrait composition but requested
slightly more visibility behind the outer-right wall because drag felt inactive.

## Change

The old +0.03-radian limit was smaller than the 0.036-radian hover range: hover
alone could exhaust it. The positive portrait yaw limit is now +0.10 radians,
about 4° more travel. The −0.40 left limit, ±0.32 pitch and neutral direction
remain. The existing smooth asymmetric mapping is reused; its shared neutral
slope also makes intermediate left-drag sensitivity slightly stronger. Landscape
controls remain unchanged. Shared containment/departure helpers consume the new
  limit without additional code paths.

The regression exercises the actual failure: with full right hover, half-right
drag previously added zero movement. It now adds 0.0575 radians while retaining
0.0065 radians before the cap. Geometry checks keep the right-side view modest
and the left roof more accessible.

## Verification and limits

- [Independent critic](critic-review.md): **95/100**, keep, no blockers.
- [Before](before/) and [after](after/) use the same actual 768×1024 CSS viewport
  and screen-coordinate drag in hidden built-in Chromium, DPR 1. Captured camera
  angles peak at 0.03 before and about 0.0886 after, followed by spring return to
  hover. The drag API releases quickly; this is not a held full-limit capture.
  Function tests cover the exact endpoint. [Final trace](drag-trace.json) keeps
  the last 250 frames. Earth/stars remain live, so backgrounds differ with time.
- [Phone overview](phone-overview.jpg) and [phone drag](phone-drag/) verify the
  same response at actual 390×844, reaching about 0.0834 radians then returning
  to hover. Captures include the developer audit banner. Images are saved as
  JPEG quality 88; capture timings are not frame-rate measurements.
- [Final focused camera suite](targeted-tests.log): 11 pass, including dense
  containment, neutral continuity, unchanged symmetric response and direct
  inward departure at signed drag extremes.
- [Typecheck](typecheck.log), [lint](lint.log), [build](build.log), and
  [full suite](tests.log) pass (354 tests, zero failures). Build has its existing
  informational Vinext notices.
- The follow-up Earth audit covers 390×844 and 768×1024 on both production meshes,
  including neutral/hover/drag, direct flights and conservative orientation-resize
  combinations. Reports retain final source hashes and compressed raw poses.
  It is finite evidence for these fixtures, not an updated universal certificate
  or a replacement for the prior 17-viewport historical audit. Safari is untested.
- [Coverage summary](coverage-summary.json): all **22,040 poses** pass both exact
  and guarded 64-row filtering allowances, across ordinary, direct-flight and
  resize categories. Final production source hashes match all four reports.

The existing content workflow suite temporarily uses a sample owner and restores
its original content. One reload coincided with that test; no candidate visual
evidence was captured until the configured portfolio was restored and reloaded.

No texture, mesh, material, pass or algorithm change; only the shared bound,
regression expectations and current decision records changed. View coverage can
affect GPU cost, so no timing, memory, heat or battery equivalence is claimed.
Held performance candidates remain held.

The hidden review tab was closed and viewport override reset. Captured console
warnings/errors were empty. The primary local development server is retained.
Final hashes and check status are in [verification](verification.json).
