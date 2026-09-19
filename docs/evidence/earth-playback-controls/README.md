# Earth playback controls — 20 September 2026

Temporary inspection helper added on top of regional-Earth baseline `9f841ec`.
The globe button beside diagnostics opens a video-style loop timeline,
Play/Pause/Restart and a 1–60× speed slider. Scrubbing pauses Earth; closing resumes
1× from that phase. Reload restores the Europe opening. No settings are persisted.
Stars, meteors and camera keep their existing clocks. Assets and quality are unchanged.

## Verification

- **338/338 tests passed**, including six new orbital playback tests covering
  readiness, independent clocks, seeks, pause, wrap, reset/close, finite bounds,
  global motion gating, resource stability and disposal. Typecheck, affected lint
  and production build passed. Build retains its informational route-classification
  caveat. See [checks.json](checks.json) for final source and image hashes.
- Hidden built-in **Chromium 153**, actual **1280×720** and **390×844**, DPR 1.
  Live application with its existing effects, not a frozen/scaled lab fixture.
  Native Safari and native OS reduced-motion preference were not tested.
- Native sliders checked with mouse dragging and Home/End/arrow keys. Seek pauses;
  speed reaches 60×; Play wraps the loop; X/Escape restore normal speed and launcher
  focus. Escape from About closes only the helper. Portrait resize preserves a
  paused position. Reading/interactive view switching cleans up/reconnects the
  controller; Restart restores the opening at 1×. No captured browser warnings
  or errors. Reduced-motion behavior is covered by API tests and UI/source review.
- Input targeting on both the launcher and body-mounted panel excludes the scene's
  capture handlers, so manipulating a slider does not trigger camera drag or room
  hover. Explicit X/Escape dismissal avoids the earlier helper's Safari-sensitive
  outside-focus dismissal behavior; this is not a claim of Safari verification.

[Browser observations](browser-observations.json) retain two periodic DOM-published
clock samples: **9.693s** of normal scene time corresponds to **581.58s** of Earth
time, confirming the 60× multiplier and a loop wrap. These are functional clock
checks, not frame-time or performance measurements. Published metadata can lag
fresh inputs: the pointer-scrub sample still reports an intermediate speed of 41×
while the final visible speed after dragging was 30×. No benchmark or heat,
battery, memory or rendering speed improvement is claimed. UI polling is 10Hz
only while open; the former angle/preset/day helper remains retired.

## Final visual evidence and revisions

- [Desktop overview](desktop.jpg): opening paused, native focus indication,
  controls visible beside the Earth.
- [Portrait overview](portrait-overview.jpg): full timeline end, panel clear of
  the site title. This verifies responsive controls and their stacking order.
- [Portrait About](portrait.jpg): panel remains usable within a room. This is
  a UI/layout check, not an Earth-composition comparison.

The initial JSX keyboard handler failed the accessibility lint rule and was
replaced by a cleaned-up document Escape listener. Repeated clock outputs have
live announcements disabled to avoid screen-reader chatter. A later portrait
check exposed title overlap because the panel inherited the toolbar's stacking
context; mounting it into the document body fixed that. All three captures were
refreshed after that correction. The full suite passed before this UI-only portal
change; typecheck, affected lint, build and affected browser checks passed again
after it. No orbital clock/runtime source changed after the full suite.

## Independent critic

Independent critic **94/100**, no unresolved blockers. Rubric: fulfillment **24/25**,
interaction/correctness **29/30**, visual quality/usability **18/20**, organization
**10/10**, verification/evidence **13/15**. The critic inspected final source,
all refreshed captures, matching hashes and the 60× clock samples. Native range
steps reach 698.1s rather than the exact 698.1317s loop endpoint (about 0.03s
short); the API supports the exact endpoint and the visual difference is negligible.
Safari, physical touch and native reduced-motion preference remain untested.
