# Project interface polish — 21 September 2026

Baseline: `c7a5c9cf97d9f604dd653fb773019ee5471428d6`. This is requested UI/art
work, not implementation of a held performance candidate.

## Result and boundaries

- Cards keep their upper-right arrow and drop the second “Explore project” action.
- Detail pages retain title-bar Back and Close; bottom Back and category copy are
  removed. The footer keeps the project title.
- Optional source/live links share a compact icon-and-underline row beneath the
  introduction in immersive and reading views. Existing `sourceUrl` / `demoUrl`
  storage, HTTPS validation and safe new-tab behavior are reused. Empty links
  render nothing; no fictitious URLs were written to portfolio records.
- Project periods are removed from display, editing, new seeds and ZIP export.
  Legacy ZIP periods are accepted then discarded. Experience timelines remain.
  Legacy site `periodLabel` copy is accepted for preservation but hidden in Studio.
- Project room screens no longer show category counts; galleries retain them.
  Case studies' independent terminal count is preserved.
- Bottom Tools groups Earth playback, opt-in diagnostics and Content studio.
  Opening the list starts neither playback polling nor performance instrumentation.
- At least 1000×650 CSS pixels: Projects' inner padding is 4px and Contact's 6px.
  Existing physical safe insets, application projection and camera paths are
  unchanged. Smaller layouts retain their original padding.
- The Case terminal has 16:9 glass, a fitted enclosure, attached struts and cable,
  and recomposed artwork. Its location, scale and rake are retained.

## Structural comparison

[geometry-inventory.json](geometry-inventory.json) includes source hashes,
baseline/candidate compressed source snapshots, Three.js identity, fixture inputs,
inert-Canvas limitations and the wide/compact idle/Contact-open inventories.
Reproduce with [geometry-inventory.mjs](geometry-inventory.mjs).

Geometry mesh/triangle/array, material, instance and structural submission counts
are unchanged. The Case archive assembly retains 28 meshes, 76,062 triangle
inputs and 2,163,692 geometry-array bytes. The terminal canvas grows from
1536×318 to 1536×864 to retain horizontal artwork resolution at the new ratio.
Its nominal RGBA8+mip storage grows 2,603,080 → 7,077,784 bytes, **+4,474,704 bytes
(4.27 MiB)**. The retained model total grows 101,808,796 → 106,283,500 bytes.
This excludes canvas backing, actual driver/process allocations, Earth/sky,
environment maps and render targets. It is painted locally; no new image asset
is downloaded. No CPU/GPU timing, FPS, heat, battery or net delivery gain is claimed.

## Visual and interaction checks

All captures use the **hidden built-in Chromium** browser, live development
rendering unless marked fixture. Native Safari, real touch and on-screen keyboards
were not tested. The browser can resize captures independently of CSS dimensions:
the table records read-back CSS viewport and DPR, not inferred PNG dimensions.
The documented viewport override affected the selected tab; each tab was measured
separately. These are actual top-level viewports, not iframes or CSS-scaled mocks.
Live renders use normal background animation and effects; these are design checks,
not frozen-frame pixel-difference or timed performance runs.

| Evidence | CSS viewport / DPR | Coverage |
| --- | --- | --- |
| [Case before](case-room-before.png), [after](case-room-desktop.png) | 1280×720 / 2 | Real room, terminal shape, attachments and rack clearance |
| [Projects room](projects-room-desktop.png) | 1280×720 / 2 | All four monitors without counts |
| [Gallery](projects-gallery-desktop.png), [detail](projects-detail-desktop.png) | 1280×720 / 2 | Cleaned chrome, wallpaper margin, persistent scrolling |
| [Contact chooser](contact-desktop.png), [form](contact-form-desktop.png) | 1280×720 / 2 | Physical screen containment and keyboard clearance |
| [Wide Projects](projects-gallery-wide.png), [Contact](contact-form-wide.png) | 1470×830 / 1 | Larger app with a visible wallpaper margin |
| [Portrait gallery](projects-gallery-portrait.png), [detail](projects-detail-portrait.png) | 390×844 / 1 | Single-column layout and retained title-bar controls |
| [Portrait Case room](case-room-portrait.png) | 390×844 / 1 | Compact terminal in the actual room camera |
| [Tools desktop](tools-desktop.png), [portrait](tools-portrait.png) | 1280×720 / 2; 390×844 / 1 | Upward popover and bottom HUD alignment |
| [Narrow Tools](tools-narrow.png), [Contact](contact-narrow.png) | 320×640 / 1 | Non-overlapping bottom controls; constrained app scrolling |
| [Resource row desktop](resources-desktop.png) | 1280×720 / 2 | Finite SSR application fixture; no WebGL |
| [Resource row portrait](resources-portrait.png), [reading view](resources-reading-portrait.png) | 390×844 / 1 | Same real components/styles, synthetic optional links |

The [resource fixture generator](links-fixture.mjs) renders actual components and
styles without reading or writing persisted records. [Changed source hashes](source-hashes.json)
identify final application/test code. Its [manifest](links-fixture-manifest.json)
identifies those sources. Example links are deliberately synthetic and were not
followed. The reading fixture's surrounding header is review scaffolding.

Verified: Projects list→detail→close; Contact selection/expanded form; Tools
open, Escape and focus return; Earth open/close/reopen restores 1×; diagnostics
open/close restores Tools focus; Studio retains `/admin`. Runtime error logs in
the inspected tabs were empty. No contact form was submitted. Responsive changes
preserved the open Contact selection. A stalled browser session produced one
invalid partial capture; it was discarded and matching full renders recaptured.

## Verification and data-preservation incident

The first full suite reported 403 passes and two related failures (a workflow
parent and identity round-trip child). Removing legacy site `periodLabel` from
the whitelist caused the failure. The existing workflow test defaults to the
main localhost:3000 server and restores through that whitelist, so that run also
removed this deprecated field from the local draft/published site. Other site
fields were restored; the changed whitelist affected no other identity field.
Project periods may also have been dropped during test restoration, consistent
with their requested removal.

An exact-match recovery of available committed SQLite WAL snapshots found no
verifiable original label. No replacement value was guessed and no private
record or emulator state is included here. The compatibility fix now retains the
optional legacy label while keeping it absent from fresh seeds and Studio. A
direct regression and an explicit legacy-field workflow round trip cover it.
Subsequent persistence tests use a separate temporary source/server/D1/R2 with
fresh test secrets through `TEST_BASE_URL`, not the owner's development store.
The project instructions and operations guide now require that isolation.

Final isolated full suite: **405/405 passed**, no skips or failures (281.071s).
The temporary copied application/test source hashes matched this checkout at
completion; its server, secrets and D1/R2 were then removed. Final typecheck,
production build, affected tracked/new-file lint and diff checks pass. The main
development server remained available with HTTP 200. Native Safari and runtime
performance measurements remain untested.

[Verification record](verification.json) preserves the isolated run's counts,
source identity and cleanup outcome.

## Independent critic

Final score: **91/100 — keep**, with no unresolved implementation blockers.

| Criterion | Score |
| --- | ---: |
| Request fulfillment | 25/25 |
| Visual design and responsive usability | 28/30 |
| Correctness and compatibility | 18/20 |
| Organization and maintainability | 9/10 |
| Verification, evidence and data handling | 11/15 |

The critic reviewed final source, matching desktop/portrait/narrow captures,
changed-source and model inventory hashes, and verification results. Revisions
included deriving support endpoints from the resized enclosure, seating the
cable inside its rear case, preserving optional legacy identity copy, documenting
isolated mutation tests and correcting the link-validation description to HTTPS.
The reviewer explicitly deducted for the main-store test incident: the prevention
and compatibility fixes do not undo the unrecovered deprecated label. No source
or visual changes followed final review; only these results were recorded.
