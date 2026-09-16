# Contact desktop and input refinements — 16 September 2026

This is a user-authorized design/interaction revision, not a performance
optimization. Baseline: `b17d153`. Held ledger candidates are unchanged.

## Delivered behavior

- A static abstract navy/alloy-blue desktop surrounds the Contact application.
  Initially the centered window shows the two choices without any fields.
  Choosing a flow expands the window within the same glass; the inner pane alone
  scrolls. The close-button hover fills its header corner without top/right gaps.
- Call requests put date, time and explicit device time zone before the shared
  name, company, email, subject and message fields. Duration is omitted: this is
  a preferred-time inquiry, not an availability or booking system.
- Public sample badges/notices are removed, including the top status label and
  preview presentation. Sample metadata and studio controls remain. Working
  messages still use the existing private inbox. Calls still return before
  transport or persistence; the action-adjacent notice and result explicitly say
  nothing is sent/booked without a sample badge or false success claim.
- The computer supports canvas-origin drag, including movement across the HTML
  surface. Its 0.04 rad pitch / 0.12 rad yaw envelope is stronger than hover but
  bounded to protect keyboard clearance. Release preserves the existing spring
  and click suppression. Forms do not initiate camera drags.
- Contact pressure walls dim by a restrained material factor during screen use.
  Wall hover restores their light, warms their paint and shows a secondary
  “Click wall to return” cue. Screens, keyboard and desk retain their occlusion
  exclusions. Social screen hover and links remain available.
- Plain-text email copy first attempts the synchronous compatibility operation,
  then starts the modern API in the same click if needed. It removes the temporary
  readonly field and restores focus/selection before reporting a result.
- On macOS, Caps Lock receives a 140 ms momentary modeled press for each lock
  transition. Other platforms retain physical down/up behavior. Simultaneous
  keys, ordinary shortcuts and blur/disposal cleanup are preserved.

## Verification and limitations

The final 327-test suite, typecheck, affected lint and production build pass.
The build retains its existing large-chunk/classification advisories.
Final check results, source/image hashes and capture dimensions are in
[`verification.json`](verification.json); the raw suite, typecheck, lint and build
logs are retained beside it. The [independent critic](critic-review.json) scored
**95/100**, with no unresolved blockers, after checking final source and evidence.

Live visual/interaction checks used **hidden built-in Chromium**, not native
Safari, at 1280×720 and 390×844. Retained immersive captures have matching drawing
buffers at DPR 1 (`browser-captures.json`). Early exploratory viewing also ran at
DPR 2; it is not a retained comparison or performance sample. The reading image
is 390×844 with the scene paused; no WebGL buffer is attributed to that image.
These are live rendering captures including the normal scene effects. Native
Safari, physical Mac Caps Lock, and a device on-screen keyboard were not tested.

Observed checks:

- Fresh landscape and portrait entry: neither radio selected, no fields; desktop
  visible around the centered window. Call choice mounts date/time first.
- Native date/time controls accept 2026-10-20 / 14:30. Email/message and selected
  date/time survive portrait rotation and a reading/interactive view round trip.
  Inner scrolling exposes the action without covering the modeled keyboard.
- A valid call shows “Preview complete” and explicitly says nothing was sent,
  saved or booked. Unit tests assert the call branch never invokes transport.
- Canvas drag from (115,110) to (1110,100) crosses the application header. The
  gesture records 995.05 px excursion, `dragged=true`, `activated=false` and a
  bounded response [1,0.05556]. The release capture records residual spring
  response [0.16408,0.00426], then the wall-hover capture records [0,0]. The
  application remains open. These sampled states plus the established spring
  tests support return behavior; they are not a continuous recorded drag video.
- A keyboard-origin drag ending over X does not close the app. A later direct
  pointer click on the portrait X does close it. Wall click also closes it.
- Social hover resolves to `contact-social-left`; its native GitHub link opens a
  new tab while the app is active. Temporary tabs are closed afterward.
- Copy's first click shows “Email address copied.” The browser tool's **virtual
  clipboard** remains empty and its paste action cannot retrieve the page's copy,
  so clipboard payload was not verified through that tool. Unit tests cover
  synchronous success, same-stack modern fallback, denied/unavailable access,
  cleanup and focus/selection restoration. Native Safari first-click behavior
  still needs the owner's device check; no native clipboard success is claimed.

Investigation details and corrected checks:

- The previous copy handler already invoked `writeText` before awaiting anything;
  loss of activation from a preceding await was **not established as the cause**.
  The compatibility fallback avoids depending on a second click, without claiming
  to identify Safari's exact permission/focus condition.
- [WebKit's macOS event mapping](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/mac/PlatformEventFactoryMac.mm#L583-L595)
  maps Caps Lock flagsChanged to down when enabled and up when disabled.
  Physical hold duration is unavailable on that path, so the pulse is an honest
  approximation. [Apple's event explanation](https://developer.apple.com/library/archive/qa/qa1519/_index.html)
  and [WebKit clipboard guidance](https://webkit.org/blog/10855/async-clipboard-api/)
  informed the fixes. `execCommand` is deprecated and intentionally restricted
  to this plain-text compatibility path, followed by the modern API.
- The first expanded clearance fixture incorrectly applied the new drag limits
  to a distant entrance pose where dragging is disabled. It reported 1.103 px
  against a 2 px minimum. The corrected 648 projections apply full drag limits
  only to the settled computer view and preserve hover limits throughout entry;
  the 2 px minimum is unchanged. Geometry was not moved to satisfy the fixture.
- The first full suite passed 326 of 327 checks. The old wall-color assertion
  compared the open-app dimmed wall with the closed-app wall. The corrected test
  captures normal room paint before opening, asserts dimming, preserves the
  furnishing-color/AO-revision checks, and requires exact room-paint restoration
  on close. The original log is retained as `tests-initial.log`.
- An initial typecheck identified one remaining `Sample` import in `world-reader`;
  its markup and the now-unused badge CSS were removed. Initial lint required an
  explicit explanation for the intentional deprecated clipboard operation.
- The browser's generic date/time `fill` did not populate their values, and native
  required-field validation correctly blocked that initial call attempt. The
  supported native `setValue` operation succeeded; those values were verified
  before the successful call preview. No app validation was weakened.

## Authored cost record

[`model-costs.json`](model-costs.json) uses the existing source-identified
[`compare-model-costs.mjs`](../contact-computer/compare-model-costs.mjs). It retains
baseline and candidate source archives/hashes, with deterministic canvas doubles
and the real geometry branches. This is an offline inventory without frustum
culling, not a browser timing/memory measurement.

| Scope | Baseline → final potential submissions | Triangle inputs | Geometry arrays |
| --- | ---: | ---: | ---: |
| Wide visible model | 438 → 438 | 1,013,532 → 1,013,532 | 36,083,204 → 36,083,204 B |
| Compact visible model | 438 → 438 | 991,868 → 991,868 | 35,462,340 → 35,462,340 B |
| Contact console (both layouts) | 37 → 37 | 70,710 → 70,710 | 1,716,560 → 1,716,560 B |

Material/texture counts and nominal model texture bytes are unchanged. Wallpaper
uses three static CSS gradients with no image download or WebGL texture. Browser
painting/compositing storage and changed bundle bytes were not measured. The wall
cue adds one DOM element and paint interpolation; Mac Caps Lock adds a short timer
only on its events. New camera drag intentionally causes the existing camera/AO
work while moving. No CPU/GPU, battery, thermal or frame-rate improvement is
claimed. Timing comparison was not warranted for this requested art/input change;
retained counts cannot establish equal frame cost.
