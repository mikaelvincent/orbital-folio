# Standby wallpaper and resource controls — 21 September 2026

Baseline `c2886e5`. The owner accepted the proposed visual replacements for the
black inactive monitor and resource controls. [Source hashes](source-hashes.json)
identify the final implementation; this does not implement a held optimization.

## Delivered design

- Dormant category monitors reuse the same blue folded desktop artwork, subdued
  with an overlay and small STANDBY label. No category name/icon is shown. Their
  existing inactive behavior is preserved: no hover, click, focus or accessible
  category target. They stay installed and continue to block through-wall clicks.
- The live-project anchor retains its title-side placement but rests in dark
  amber tint, with warm text and a restrained outline. Hover and keyboard focus
  use a stronger amber fill; press darkens the fill without movement.
- The source anchor becomes a secondary outlined blue-gray control with a code
  icon and **View source code** wording. It remains below the introduction. Both
  controls have 44px minimum height, 6px corners and external-link cues. The source
  control uses a light palette on the cream reading paper.
- The exact previous default `View source` expands to `View source code` at
  presentation time, as authorized; absent labels use the same wording. Other
  custom labels remain unchanged. Fresh seeds use the new default. No stored
  identity, submissions, projects or media were changed.

## Live verification

Hidden built-in Chromium, normal live scene/effects, actual CSS viewports below.
No native Safari or physical touch testing. No external resource was opened.

| Evidence | Viewport / DPR | Check |
| --- | --- | --- |
| [Standby room](standby-room.png) | 1280×720 / 2 | Wallpaper is intentional; label subordinate to active screens |
| [Rest](resources-desktop-rest.png), [focus](resources-desktop-focus.png) | 1280×720 / 2 | Clear action hierarchy and strong focus-state change |
| [Reading rest](resources-reading-desktop.png), [focus](resources-reading-focus.png) | 1280×720 / 2 | Balanced dark live action and light source control on paper |
| [Portrait app](resources-portrait.png) | 390×844 / 1 | Readable stacked actions and retained app chrome |
| [Portrait reading](resources-reading-portrait.png) | 390×844 / 1 | Source keyboard focus, no document overflow |
| [Narrow app](resources-narrow.png) | 320×740 / 1 | Actions fit width; content scrolls normally within the window |

Clicking the standby monitor retained `/projects`, with no application and an
empty hover-object value. The accessibility tree exposed only the three populated
screens. All projects still opened the collection and Relay. Tab reached Live
then Source normally. Settled live background changed from `rgb(48,45,39)` at
rest to `rgb(212,170,100)` under keyboard focus; hover shares that CSS rule.
Physical pointer-hover and pressed-state screenshots were not captured. The tab's
warning/error log was empty. Document width matched 390 and 320 in narrow checks.

An immediate focus capture caught the 150ms transition before its fill changed;
the retained focus images show the settled state. Images are design checks, not
frozen-time pixel comparisons. Temporary review tabs and viewport overrides were
cleaned up; main localhost3000 was preserved.

## Tests and structural cost

[Verification](verification.json): **415/415 tests pass**, no failures or skips,
using a disposable source checkout, fresh D1/R2/secrets and isolated Vite cache,
with explicit `TEST_BASE_URL=http://localhost:3003`. Its final source manifest
matches the application. Typecheck, affected lint, production build and diff
checks pass. Existing build diagnostics are recorded. Disposable state/server
were removed. Focused renderer checks cover missing/legacy/custom source labels,
safe optional external links and native anchor semantics. Availability/desktop
regressions pass; the Node model path does not validate painted Canvas pixels.

[Inventory](geometry-inventory.json), produced by the existing
[tool](../project-interface-polish/geometry-inventory.mjs), retains baseline and
candidate source archives. Populated wide/compact, idle/Contact-open fixtures have
zero deltas in mesh/triangle inputs, potential material submissions, geometry
arrays and nominal RGBA8+mip texture bytes (101,808,796 retained bytes). Those
fixtures do not paint or measure standby pixels. The tool's inherited method
sentence about count removal/Case resolution describes its original use.

Standby copies an existing wallpaper canvas into the existing idle canvas when
availability changes, then uploads that same texture. It adds a Canvas2D copy,
overlay and label at that change, not per-frame work or new retained image assets.
There is no new texture/material allocation, geometry, render pass or image
request. HTML controls add CSS visual states and substitute an existing SVG icon.
Startup/repaint/upload cost, actual GPU/process memory, CPU/GPU time, frame pacing,
session download, battery and heat are unmeasured; no speedup is claimed.

See [independent critic review](critic-review.md) for the final score and limits.
