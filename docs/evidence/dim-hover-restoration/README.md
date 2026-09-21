# Dim idle / bright hover restoration — 22 September 2026

Baseline `53f1e4f`. The owner clarified that the dim resting state was desired,
and asked to apply the same dim/bright behavior to the archive cartridges while
explicitly deferring a separate solution for the highlight outline.

## Change

The shared feedback multiplier is restored to **0.65 at rest → 1.15 on hover or
keyboard focus → 0.65 after departure**. It is recalculated from the current room
material every frame, after room lighting. All four case cartridges and the All
terminal remain interactive, including empty categories. The rim's geometry,
color, opacity behavior and dimensions are untouched. There are no camera, room
lighting, texture, hardware or content changes.

Nonselectable contexts keep their existing behavior: overview/travel, unavailable
Project monitors, and the currently open application's own monitor do not use
selectable idle dimming. This does not change the room-lighting policy.

Runtime inspection found no separate timed reset to regular brightness in a
settled closed room. The independent room illumination ramp can change apparent
brightness while its level settles, but this was not established as the owner's
reported reset. This change restores the requested state model and verifies
sustained idle and hover departure; it does not claim to identify an additional
reset mechanism. The brighter-idle behavior from entry 42 is superseded.

## Verification

The model regression checks actual material color and emission, rather than only
the stored highlight level. It covers Projects, Case studies (including every
cartridge) and Contact main/social screens: final travel, ten seconds of idle,
each target highlighted independently, easing after departure and three seconds
of dim idle afterward. It also verifies no accumulation, isolation between
objects, smooth timing, unchanged rim color/opacity policy and an open Contact
application's existing behavior. Focused checks passed **5/5** ([log](focused-tests.log)).

The full suite passed **434/434** in a source-only disposable checkout with a
fresh D1/R2 store, generated test-only secrets and its own Vite cache at
localhost:3003, with explicit TEST_BASE_URL. Main development content, secrets
and uploads were not copied or modified. Typecheck, affected lint and production
build passed against the same source; geometry reproducibility passed as part
of the build. Existing Vinext classification and bundle-size warnings remain.
The disposable server/state were removed, and the main server remained available
at localhost:3000 (HTTP 200).

- [Full suite](tests.log)
- [Typecheck](typecheck.log)
- [Affected lint](lint.log)
- [Production build](build.log)
- [Matching production/test hashes](source-sha256.json)

## Live browser evidence

The hidden built-in Chromium browser is used with actual CSS viewports recorded
in browser-checks.json. Original browser JPEGs are retained without manual scaling;
WebGL drawing resolution may differ by recorded runtime DPR. Desktop uses normal
GTAO; compact layout uses its existing policy. Captures use live public sample
content and full rendering, not finite scene fixtures.

Keyboard focus is exercised through real browser input and drives the same scene
hover state as the pointer. Moving focus to the existing Tools button clears the
scene highlight without opening Tools. The captured hover-object attribute and
camera state document that distinction. Native pointer-hover automation is not
available in this browser API, so physical mouse movement is not claimed as tested.

| Capture | State |
| --- | --- |
| [Case studies idle](case-idle.jpg) | No hovered object; settled room |
| [Product cartridge focused](case-product-focused.jpg) | One brighter cartridge and the unchanged rim |
| [Focus removed](case-returned-idle.jpg) | All choices back at dim idle |
| [Sustained idle](case-sustained-idle.jpg) | Same dim state 50.5 seconds after the departure check |
| [Projects idle](projects-idle.jpg) | Selectable monitors dim, inactive Experiments unchanged |
| [Projects focused](projects-focused.jpg) | All projects brighter; neighboring monitors remain dim |
| [Projects focus removed](projects-returned-idle.jpg) | Selectable monitors return to dim |
| [Contact idle](contact-idle.jpg) | Computer and social monitors dim |
| [Contact focused](contact-focused.jpg) | Main computer brighter; social monitors stay dim |
| [Contact focus removed](contact-returned-idle.jpg) | Main computer returns to dim |
| [Portrait idle](case-portrait-idle.jpg) | Dim archive choices at 390 × 844 |
| [Portrait focused](case-portrait-focused.jpg) | Product cartridge brighter |
| [Portrait focus removed](case-portrait-returned-idle.jpg) | Product cartridge returns to dim |

[Browser checks](browser-checks.json) record every captured state. The
[browser console](browser-console.json) contained no captured warnings/errors.
Independent review: **96/100 — approved**, with no unresolved blockers or
required revisions. The [rubric and limitations](review.json) record the final
assessment. The sole documentation attribution correction was addressed.
No native Safari, physical touch or live OS reduced-motion check is claimed.
Small portrait targets remain an existing limitation. The outline contrast is
unchanged because the owner explicitly deferred that redesign. No CPU/GPU timing,
memory, heat or battery
measurements or improvements are claimed. Held performance candidates remain held.
