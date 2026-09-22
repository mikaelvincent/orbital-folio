# Section markers behind the first page

23 September 2026. Baseline: `a73ad6e`.

The current section's marker now rests on the left from its first page onward,
along with all earlier sections. Only future sections remain on the right. The
first section therefore starts with its marker on the left. Crossing a section
boundary carries the higher section's marker with the page in either direction;
turns within a section leave all markers in place.

The shared marker layout drives native labels and physical flags. The existing
six-marker banks, exposed click regions, paper overlap and reverse labels remain
unchanged. Changes are limited to the resting-side comparison and the section
whose marker travels at a boundary. No geometry, material, texture, camera or
render pass is added by source inspection. This is not a performance measurement.

## Visual checks

Hidden built-in **Chromium**, live main development server and existing published
sample content; no content writes. Desktop: **1280×720, DPR 2**. Portrait:
**390×844, DPR 1**. Images use actual viewport pixels, with normal scene effects;
these are live rendering captures rather than finite fixtures.

| State | Evidence |
| --- | --- |
| First section's first page: current marker left, future markers right | [Initial reader](first-section.jpg) |
| Section 3's first page: first three markers left, last two right | [Learning notes](section-3-first-page.jpg) |
| Reversing from section 2 to section 1 carries section 2's marker right; section 1 stays left | [Boundary turn sample](reverse-boundary-turn.jpg) |
| Closing the reader preserves the same physical marker arrangement | [Room view](room-view.jpg) |
| Portrait preserves the same desktop spread and marker layout | [Portrait reader](portrait-reader.jpg) |

[DOM observations](browser-states.json) also record unchanged marker sides through
internal page turns, forward and reverse settled selections, and empty browser
warning/error logs. The turn capture is one sample, not proof of every frame.
Native Safari and physical touch were not tested. The deferred mobile redesign
remains deferred; portrait intentionally scales down the desktop spread.

## Verification

All **19 focused notebook tests** pass. Their regression coverage includes initial
and single-section placement, both printed faces' alignment and adhesive overlap,
stationary markers within sections, forward/reverse boundary motion, native and
physical moving labels, reduced motion and settled marker-bank sides. Across bank
boundaries, the existing bank switches after the page settles; no new transition
between banks is introduced.

**509/509 full-suite tests passed**, plus typecheck, affected lint/format and the
production build. The [verification record](checks/verification.json) links exact
commands, source hashes and logs. Tests ran from a disposable source checkout on
loopback port 3003, with fresh D1/R2 state, test-only secrets and a private Vite
cache. No private environment, main database or uploads were copied. The fixture
and its server were removed; the main port 3000 server remained healthy.

Application source was frozen before the visual captures and is unchanged after
the checks. Later context/documentation changes are recorded separately. Retained
logs trim trailing whitespace and empty EOF lines without changing messages or
results. The [independent review](critic.md) records its rubric, score and limits.
