# Case studies room flow — 22 September 2026

Baseline: `747aeac4dcef1f3495896dcec670a93db741f78f`. The owner approved the proposed
flow before implementation. [Source hashes](source-sha256.json) identify the final
changed source; the Earth audit files additionally identify their unchanged orbital
and shared camera dependencies. This is a feature/design baseline, not a measured
performance optimization.

## Delivered behavior

The four existing recorder cartridges select Product engineering, Systems &
reliability, Research & experiments, or Design & interfaces. All case studies lives
on the existing terminal. Every populated option approaches that same raked 16:9
screen, whose archive uses numbered rows with summaries and optional organization/
period metadata. Empty cartridges have subdued category labels and no target; an
empty All terminal displays STANDBY.

Opening a story and returning to its collection retain the monitor and camera,
category and scroll positions. Close, Escape and an exposed pressure wall return
to the room; terminal hardware blocks dismissal through to walls. Category and
story URLs work with history, Reading view, private preview and the `/experience`
compatibility route. The obsolete Case studies paper reader is removed; About's
reader remains.

Case studies share Projects' safe Markdown renderer and editor, including managed
images, video posters/captions, tables, lists and code. Optional metadata and
explicit overlapping categories are editable in Content studio. Existing legacy
context/decisions/impact content remains readable, with no migration or inferred
categories. Draft saving, preview and publication remain separate. Publication
validates media dependencies, and published story references protect their media
from unpublishing/deletion. Project ZIP import/export stays project-specific.

## Verification and isolation

The main loopback server at `http://localhost:3000` was used read-only to inspect
existing uncategorized sample entries and left available. Its database, uploads
and environment files were neither copied nor changed.

All mutating API/workflow tests ran from disposable source checkout
`/tmp/orbital-case-studies-hlJfsR`, against its own server at
`http://localhost:3003`, with fresh D1/R2 state, generated test-only secrets and
explicit `TEST_BASE_URL=http://localhost:3003`. The checkout shared installed
`node_modules`, but used a separate Vite cache. Private environment files and the
main emulator state were excluded. The temporary server, checkout/store and review
browser tabs were removed after verification; the main server still returns HTTP
200 for `/case-studies`.

| Check | Result | Evidence |
| --- | --- | --- |
| Isolated full suite | 433/433 passed; no skips or failures | [Full log](tests-full.log) |
| Final case-study/Project rendering tests | 23/23 passed | [UI log](tests-final-ui.log) |
| Typecheck | Passed | [Log](typecheck.log) |
| Affected source lint | Passed | [Log](lint.log) |
| Production build and geometry asset reproducibility | Passed | [Log](build.log) |
| Live browser flows | Passed in hidden built-in Chromium | [Checks](browser-checks.json) |
| Final archive, studio and preview browser console | No captured warnings/errors | [Console](browser-console.json) |

The full suite includes the final shared model, navigation, runtime, backend and
media safeguards. After it ran, optional subtitle rendering and Reading collection
colors received the final 23-test rerun, typecheck, lint and production build. The
last changes were studio label/guidance copy and documentation; the studio capture
was refreshed and typecheck/lint passed after that copy. The build retains existing
bundle-size/framework warnings; it is not represented as warning-free. Saved logs
have trailing whitespace normalized, with their output otherwise retained.

## Live browser evidence

The hidden built-in browser used Chromium at DPR 1. These are original JPEG
captures at the actual CSS viewport sizes below, with no rescaling. They show live
WebGL and DOM rendering. Normal scene effects were enabled; the existing compact
viewport policy disables GTAO in portrait. No native Safari or user screen was
captured. Synthetic published test stories/media are recorded in
[fixture-content.json](fixture-content.json); the portrait standby room alone uses
the main server's untouched public sample content.

| Capture | Actual viewport | Content |
| --- | --- | --- |
| [Desktop room](room-desktop.jpg) | 1280 × 720 | Four populated cartridges and All terminal |
| [Portrait standby room](room-standby-portrait.jpg) | 390 × 844 | Existing uncategorized samples; All active |
| [Desktop collection](collection-desktop.jpg) | 1280 × 720 | Filtered Product engineering archive |
| [Desktop story](detail-desktop.jpg) | 1280 × 720 | Rich Markdown story |
| [Story media](story-media-desktop.jpg) | 1280 × 720 | Scrolled story with managed media |
| [Portrait collection](collection-portrait.jpg) | 390 × 844 | All archive above navigation dock |
| [Portrait story](detail-portrait.jpg) | 390 × 844 | Same monitor with readable responsive story |
| [Portrait Reading view](reading-portrait.jpg) | 390 × 844 | Semantic light story page |
| [Content studio](studio-desktop.jpg) | 1280 × 900 | Case study Markdown/categories and private draft |

Observed interactions include all five physical controls, correct category
filtering, keyboard Enter activation, collection/story navigation without a camera
flight or renderer replacement, X closing, hardware dismissal blocking and an
exposed wall closing at 1600 × 720. Browser Back restored story scroll to 874;
Forward returned to the filtered collection. All collection scroll restored to
311 after opening a story and using its Back button. The portrait application
bounds were 18/74/354/628 (left/top/width/height), clear of the bottom dock.

The studio was exercised against the disposable store: categories, Markdown
preview and a saved private title revision appeared in authenticated preview by
ID, while the public story retained its published title. Inline images rendered;
video controls, poster, captions and no-autoplay markup were inspected. Actual
video decoding/playback was not exercised. Native Safari, physical touch and live
OS reduced-motion toggling were not tested; existing reduced-motion/navigation
logic remains covered by the applicable automated suite.

The physical portrait cartridge targets are approximately 161 × 14 CSS px with
20.3 px row spacing. They remain attached to the visible labels rather than
extending into neighboring hardware. This preserves the approved room scale but
leaves small touch targets; keyboard controls and the ordinary Reading view
remain available. No accessibility certification is claimed.

## Earth coverage and performance limits

The CPU-only coverage audit now includes the actual raked terminal anchor and
removes the retired experience paper-reader pose. Run each command from the
repository root with the source identified here:

```sh
node scripts/benchmarks/earth-visible-coverage.mjs --case-studies-only --gzip-samples --out docs/evidence/case-study-flow/earth-coverage-desktop.json
node scripts/benchmarks/earth-visible-coverage.mjs --case-studies-only --mobile-mesh --gzip-samples --out docs/evidence/case-study-flow/earth-coverage-mobile.json
```

[Desktop audit](earth-coverage-desktop.json) and [mobile audit](earth-coverage-mobile.json)
each cover 17 finite viewport sizes, 3,536 poses and 2,719 Earth-visible poses,
including bounded input, transition-envelope and orientation-resize samples.
Compressed raw poses are retained beside them. Sampled source rows are 469–1707
and 512–1728 respectively, within the current crop (384–1919). Minimum fixed UV
seam clearance is 115.31° and 116.25°, including the conservative neighborhoods.
The fixed sphere seam remains outside this audited envelope.

**The conservative filtering-margin check does not pass.** At extreme ultrawide
transition envelopes, the 0.25-unit/5.5° pose neighborhoods reach source row 1920,
leaving zero southern margin against the practical 64-row allowance. The raw
`includedWithinCrop: false` result is preserved. These probes combine near-terminal
positions with full room angle bounds, wider than the settled terminal bounds;
they are not actual spring-trajectory replays. All sampled footprints fit, but
this does not prove filtered coverage for every interrupted spring or browser
resize. No crop, Earth texture or room-camera changes were made to hide the result.
A future strict margin claim would need actual trajectory evidence or separately
approved composition changes.

The feature adds fixed-glass interface/interaction support and retires the old
experience reader. The archive now builds its graphics plane geometry in headless
mode as well as browsers, so old/new headless mesh totals alone would be a
misleading cost comparison. No CPU/GPU timing, actual process/GPU memory,
preparation/decode, frame pacing, heat or battery measurements were made. No
performance gain is claimed, and held ledger candidates remain held.

## Independent review

The independent critic scored **93/100 — approve**, with no blockers or required
revisions. They reviewed final source, matching captures, interaction
checks and the evidence limits above. Findings and the final rubric/verdict are
preserved in [review.json](review.json). Review revisions corrected empty-category
wording and stale studio guidance about always opening the full collection.
