# Archive interaction and screen brightness correction — 22 September 2026

Baseline: `7970fe61a1f097000e58c179f5dea830cac048bf`. The owner reported that
the four Case studies cartridges were not interactive and that screens in
Case studies, Projects and Contact darkened after room entry.

## Cause and correction

Case study category controls were gated by their assigned story count. Existing
uncategorized entries left every cartridge disabled. All four cartridges and the
All terminal now remain interactive, even when empty. Empty filters preserve
the selected category in the terminal, URL and Reading view and explain that no
stories have been added. Existing content is not rewritten or assigned inferred
categories. The cartridges use their existing active cream artwork and amber
hover feedback; hardware, target dimensions and camera fits are unchanged.
Projects retains its separate empty-monitor standby policy.

The shared object-highlight helper changed its multiplier from 1 while travelling
to 0.65 when selection became enabled after arrival. This reduced material color
and emission by 35% despite unchanged room lighting. Resting brightness now stays
at 1; hover/focus still reaches 1.15 with the same amber rim and easing. Room
dimming, wall feedback, lighting, textures and geometry are unchanged.

[Brightness reproduction](brightness-regression.json) compares the exact baseline
helper loaded from Git against final source in a pure material fixture. It
preserves hashes, unchanged authored material values, all transition stages and
the actual pre-fix regression assertion. It does not measure perceived luminance,
GPU output or performance. The integration regression separately compares all
screen material colors/emission in the real three-room model across the final
travel frame and twelve settled frames; it failed before the fix and passes now.

## Verification

All mutating/full tests use disposable source checkout
`orbital-archive-fix-sz0q5ffc`, a fresh D1/R2 store and test-only secrets, a separate
Vite cache and loopback server at `http://localhost:3003`, with explicit
`TEST_BASE_URL=http://localhost:3003`. No main environment file, database or upload
was copied. The main server at port 3000 was used read-only for visual checks and still returns
HTTP 200. The temporary test server, checkout/store and hidden review tab were
removed after verification; the browser viewport was restored.

The isolated full suite passed **434/434**, with no skips or failures
([log](tests.log)), including the new arrival regression and empty-category checks.
Earlier focused pure checks passed 17 brightness/object/AO/Project checks and 9
archive/model/rendering checks. Final [typecheck](typecheck.log) and affected
[lint](lint.log) passed. The [production build](build.log), including geometry reproducibility, passed.
Existing build chunk-size/route-classification warnings remain. Saved logs have
trailing whitespace normalized.

## Live visual and interaction evidence

Hidden built-in Chromium, actual CSS viewports 1280 × 720 and 390 × 844. Browser
JPEG captures are supplied at those CSS dimensions without manual resizing;
The initial desktop Case studies sequence used runtime DPR 2 (2560 × 1440
drawing buffer). After the first portrait resize, subsequent captures used DPR 1,
with drawing buffers matching the CSS viewports in
[browser-checks.json](browser-checks.json). This is not a matched pixel-brightness
comparison; the exact arrival regression is verified at the material level.
The desktop uses normal GTAO; the existing compact policy omits GTAO in portrait.
These are live scene renders with untouched public sample data, not static scene
fixtures. No native Safari or user screen was captured.

| Capture | Purpose |
| --- | --- |
| [Before categories](before-case-studies.jpg) | Original disabled cartridges; diagnostic capture before the category correction, not a controlled brightness comparison |
| [Corrected room](after-case-studies.jpg) | All five choices active, existing hardware/framing |
| [Empty Product category](empty-product-desktop.jpg) | Correct category title, zero count and empty state |
| [Portrait room](case-studies-portrait.jpg) | Four active cartridges and terminal |
| [Portrait Research category](empty-research-portrait.jpg) | Keyboard activation and empty filter preserved |
| [Portrait Reading view](reading-empty-portrait.jpg) | All five controls, including zero-count categories |
| [Projects desktop](projects-resting-desktop.jpg) | Settled idle screens, passive empty Experiments retained |
| [Projects portrait](projects-resting-portrait.jpg) | Same settled monitors in compact layout |
| [Contact desktop](contact-resting-desktop.jpg) | Settled main and social screens |
| [Contact portrait](contact-resting-portrait.jpg) | Responsive room after return from application |

Live checks cover clicking all four empty cartridges, the All terminal showing
three existing uncategorized cases, opening an existing story, returning to the
room, portrait keyboard activation, retained empty category in Reading view and
Projects/Contact application opening and closing. No contact form was submitted
and no social link was followed. A story-click attempt during the terminal entry
transition was ignored by the existing travel guard; the settled-state repeat
opened normally.

Native Safari, physical touch and live OS reduced-motion changes are untested.
The unchanged portrait cartridge targets remain small; keyboard and Reading
controls are available. No camera or orbital-environment source changed, so no new
Earth coverage claim is made. Prior finite filtering-envelope limitations remain.
No frame-rate, GPU/CPU timing, memory, heat or battery measurements or improvement
claims are made. Held performance candidates remain held.

## Review

Independent critic: **95/100 — approve**, with no blockers or required revisions.
The rubric and retained limitations are recorded in [review.json](review.json). [Source hashes](source-sha256.json) and [browser observations](browser-checks.json)
identify the final implementation. The tested fixture source exactly matches all
changed production and test files.
