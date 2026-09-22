# Stable object brightness through room entry — 22 September 2026

Baseline `be4d98bca73e8ef67287f53aa3c70dbbdd34ea3d`. The owner reported that
screens were undimmed during room entry, then dimmed when the camera settled.
This follows the dim-idle restoration in entry 43 and corrects its travel exception.

## Cause and change

The model used the same boolean for object input availability and idle dimming.
It was false outside the settled current room, giving screens a multiplier of
**1** during room previews/travel, then **0.65** on arrival. The room light could
already be at **1** in both frames. Departure produced the reverse jump.

The [baseline reproduction](baseline-states.json) records those seven stages on
the real model. The [matching candidate](candidate-states.json) keeps the object
multiplier at **0.65** throughout, with the exact same room-lighting sequence.
These reproduction files record model state, not pixel measurements. The
regression additionally checks actual material color and emission.

Available screens and cartridges now retain dim idle in overview, neighboring
room previews, travel and settled idle. Input availability separately controls
hover brightness and the rim: only an actual target in the settled current room
brightens toward **1.15**. Travel suppresses departing/stale object feedback.
Unavailable Project monitors and the currently open application's own monitor
retain normal brightness. Room illumination, camera/navigation, geometry,
materials' authored colors and rim styling are unchanged.

## Verification

The focused suite passed **15/15** ([log](focused-tests.log)). It covers Projects,
Case studies and Contact, including every cartridge and linked social monitor:
overview, overview preview, another room's preview, entry before reaching the
destination, final travel, first settled frame and departure. A stale hover id
cannot highlight controls during preview/travel. The regression compares actual
colors/emission exactly across the arrival boundary, then exercises ten seconds
of idle, individual hover and eased return. Existing availability/application
tests cover passive and open-monitor exceptions. Hidden desktop wallpaper has
its existing independent lighting policy and is checked separately from room-lit
surfaces.

The full suite passed **434/434**; typecheck, affected lint and production build
passed, including geometry reproducibility. Existing bundle-size and Vinext route
classification warnings remain. Checks ran
in a disposable source-only checkout at localhost:3003 with fresh D1/R2 data,
generated test-only secrets, an isolated Vite cache and explicit TEST_BASE_URL.
Main development data and secrets were not copied or modified. Independent critic:
**96/100 — approved**, with no unresolved blockers or required revisions; the
[rubric and limitations](review.json) preserve the assessment. A stale helper-test
label was corrected during review. No production changes followed the captures.
The temporary browser tab, verification server and fresh test state were removed;
the main development server remains available at localhost:3000 (HTTP 200).

- [Full suite](tests.log)
- [Typecheck](typecheck.log)
- [Affected lint](lint.log)
- [Production build](build.log)
- [Matching source hashes](source-sha256.json)

## Live browser checks

Hidden built-in Chromium uses the running public site, actual 1280 × 720 desktop
and 390 × 844 portrait CSS viewports. Original JPEGs are retained without manual
scaling. Runtime DPR, drawing buffer and GTAO policy are recorded in the browser
checks: desktop DPR 2 / 2560 × 1440 buffer with GTAO, portrait DPR 1 /
390 × 844 buffer without GTAO under the existing compact-layout policy. These
are live scenes with public sample content, not finite fixtures.

The Case studies entry starts from a focused overview room preview. Projects
entry follows a neighboring-door preview. Contact entry crosses the ladder and
About from Projects. Captured late-travel/settled pairs show stable object
brightness; room lighting continues its ordinary transitions earlier in travel.
The model regression supplies exact frame-boundary material checks; screenshots
are visual evidence, not photometric or performance measurements. DOM state is
read immediately before the screenshot request, so a late-travel screenshot can
cross the settlement boundary. The [browser trace](browser-checks.json) retains
each observed state and timestamp. No warnings/errors were captured in the
[browser console](browser-console.json).

| Flow | Late travel | Settled | Focus after arrival |
| --- | --- | --- | --- |
| Case studies | [Late travel](case-entry-7.jpg) | [Settled](case-entry-8.jpg) | [Product cartridge](cartridge-focused.jpg) |
| Projects | [Late travel](projects-entry-5.jpg) | [Settled](projects-entry-6.jpg) | [All projects](projects-focused.jpg) |
| Contact | [Late travel](contact-entry-12.jpg) | [Settled](contact-entry-13.jpg) | [Contact computer](contact-focused.jpg) |

[Overview preview](overview-preview.jpg) and [neighbor preview](neighbor-preview.jpg)
retain the room-lighting feedback. Earlier entry images provide camera context:
[Case studies](case-entry-5.jpg), [Projects](projects-entry-4.jpg),
[Contact](contact-entry-11.jpg).

Portrait Case studies entry also retains its dim appearance between
[late travel](portrait-entry-12.jpg) and [settlement](portrait-entry-13.jpg).

The browser API uses genuine keyboard focus for hover-equivalent feedback;
native pointer movement is unavailable. Navigation uses native controls. No
native Safari, physical touch or live OS reduced-motion check is claimed. The
existing cartridge rim and small portrait targets remain unchanged. No CPU/GPU
timing, memory, heat or battery improvements are claimed.
