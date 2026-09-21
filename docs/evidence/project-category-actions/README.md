# Project availability and live action — 21 September 2026

Baseline `0f4e03d`. This is requested interaction/design work, not a held
optimization. [Final source hashes](source-hashes.json) identify the changes.

## Result

- An empty category keeps its installed monitor, with a dark, unlabelled face.
  It has no hover highlight, activation, focus target or accessible category
  control. Populated monitors retain their current behavior. Reading view omits
  empty category choices. This supersedes entry 36's selectable empty screen.
- Availability uses the same explicit category assignments in the model,
  runtime and reading view. Project-prop changes update the existing scene before
  framing a changed selection; they do not remount it. A now-empty selection
  falls back to All. With no projects, no monitor opens the application.
- The optional live destination is a restrained amber action beside the title,
  stacking below it when narrow. It remains a native external link with clear
  iconography and keyboard focus. The source link's appearance/location remain
  unchanged. The same layout is used in the reading dossier.
- The dossier's column-flex item is bounded to its container. This fixes
  min-content overflow from Relay's rich content without shrinking the text.
  No database, media, sample assignment or external destination was changed.

## Visual and interaction evidence

Hidden built-in **Chromium**, real live rendering. Actual CSS viewport sizes
are recorded below; images are browser captures, not offline scene fixtures.
Native Safari and physical touch were not tested. These are visual checks,
not frozen-time pixel comparisons or performance measurements.

| Capture | CSS viewport / DPR | Observation |
| --- | --- | --- |
| [Desktop detail](live-action-desktop.png) | 1280×720 / 2 | Live action aligned beside title, source link unchanged |
| [Portrait detail](live-action-portrait.png) | 390×844 / 1 | Action stacks without clipping; app chrome remains visible |
| [Reading portrait](live-action-reading-portrait.png) | 390×844 / 1 | Paper bounds x28–362; document width390 |
| [Reading narrow](live-action-reading-narrow.png) | 320×740 / 1 | Paper width264; document width320; readable wrapping |
| [Room](empty-category-room.png) | 1280×720 / 1 | Three labelled active monitors and one dark installed monitor |
| [Reading categories](reading-populated-categories.png) | 320×740 / 1 | Only All9 / Systems6 / Interfaces3; no Experiments choice |

The room accessibility snapshot contained only Open All projects, Open Systems
and Open Interfaces. Clicking the dark lower-right screen left `/projects`
unchanged with no application or hover object. A populated screen still opened
the library and Relay detail. External destinations were inspected, not opened.
The inspected tab reported no warning/error logs. No Contact submission ran.

Excluded captures: the browser capture tool intermittently composited the scene
at half size or a stale resize scale inside the requested bitmap. These were
replaced, never counted as layout passes. A fresh hidden tab recovered the final
desktop image. The initial reading portrait really did overflow (document512
at viewport390); its replacement above follows the scoped CSS correction.

## Verification

[Verification record](verification.json): the full suite used a disposable
source checkout, fresh D1/R2 state and secrets, a separate Vite cache and explicit
`TEST_BASE_URL=http://localhost:3003`. **414/414 passed**, no failures/skips.
The only subsequent source change is the two-rule reading-paper CSS correction;
its before/after hashes are recorded. Final renderer tests **15/15**, typecheck,
affected lint, production build (including geometry source check) and diff checks
pass. The temporary server/store were removed; main localhost3000 remains intact.

The earlier partial full run was stopped after 262 passing tests when review
found the missing React-to-model content-refresh path. It is superseded by the
414-test run. Regressions cover category assignment, dormant hover/material
behavior, repopulation and all-empty states, update ordering without remount,
optional/safe resource links and reading-view category omission. The hook fixture
checks lifecycle integration; it is not a claim of live Safari verification.

Existing build warnings concern Node module registration, a >500kB bundle and
Vinext's `/case-studies` static-route classification. There are no failing checks.

## Structural cost record

[Inventory](geometry-inventory.json) was generated with the reusable
[inventory tool](../project-interface-polish/geometry-inventory.mjs), baseline
`0f4e03d`. Both versions use identical populated-category fixtures, normal
batching and inert Canvas2D. The fixture includes Experiments, so this compares
structural allocation rather than dormant-screen pixels. The raw tool's inherited
method sentence about count removal/Case resolution describes its original use,
not this change. Source/model archives and tool hashes are retained in the JSON.

Wide/compact, idle/Contact-open deltas are zero for mesh/triangle inputs, potential
material submissions, geometry arrays and nominal texture storage. The retained
model estimate remains **101,808,796 bytes** of RGBA8+mips. Dormant screens repaint
their existing canvas; this retains the hardware and canvas allocation. No new
image/video/texture download or render pass is introduced. The added HTML action
and collection-change work are not included in that geometry inventory.

No CPU/GPU timing, frame pacing, first-frame upload, process/GPU memory, total
download, thermal or battery comparison was performed; no speedup is claimed.
This is a design/behavior change and does not implement any held ledger candidate.

## Independent review

See [critic record](critic-review.md) for the final rubric, corrections and limits.
