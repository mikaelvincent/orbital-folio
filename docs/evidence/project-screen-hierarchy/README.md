# Project screen hierarchy — 21 September 2026

Baseline `1e7eacc`. This follows the owner's explicit background swap and
resource-button placement request. [Verification and final source hashes](verification.json)
identify the five implementation/test files.

## Result

- Populated room-view monitors now paint the folded desktop wallpaper behind
  their category title and icon. Unavailable monitors use the plain navy gradient
  with the existing STANDBY label. Availability, hardware, hover/activation guards
  and application-open wallpaper are unchanged.
- Open live project precedes View source code in one resource row below the
  introduction, in both immersive and reading detail views. Narrow layouts wrap
  in that order. Both links remain optional, safe native external anchors with
  their approved colors, 44px minimum height and hover/focus/press treatment.
- The title-side wrapper, its CSS and the unused separate live-link export were
  removed. Source-specific CSS is scoped so it cannot override the adjacent
  amber action. No content, data, camera or navigation behavior was changed.

## Visual checks

Hidden built-in Chromium, normal live scene/effects, actual CSS viewports below.
These are design checks, not timed or frozen-frame performance comparisons.

| Capture | Viewport / DPR | Observation |
| --- | --- | --- |
| [Room](room-backgrounds.png) | 1280×720 / 2 | Three wallpaper category faces; plain passive standby |
| [Desktop actions](resource-row-desktop.png) | 1280×720 / 2 | Live immediately before Source below the introduction |
| [Reading actions](resource-row-reading.png) | 1280×720 / 2 | Same row and hierarchy on cream paper |
| [Reading portrait](resource-row-reading-portrait.png) | 390×844 / 1 | Wraps Live then Source; no horizontal overflow |
| [App portrait](resource-row-portrait.png) | 390×844 / 1 | Actions wrap within the window |
| [App narrow](resource-row-narrow.png) | 320×740 / 1 | Retains readable controls and normal content scrolling |

The room accessibility snapshot exposed only All projects, Systems and Interfaces.
All projects opened the library and Relay. Tab from the detail heading focused
Live, then Source. Live's settled focus fill was `rgb(212,170,100)`, preserving
its stronger focus feedback after relocation. The final desktop capture has
neither resource hovered. Document widths matched the portrait/narrow viewport.
No external link or Contact submission was activated. Native Safari and physical
touch were not tested. Temporary tabs/viewport overrides were cleaned up; the
normal localhost3000 server and store were preserved.

## Validation and costs

**25/25 targeted tests**, typecheck, affected lint, production build and diff
checks pass. The four pure targets cover rich-content/resource rendering, safe
optional links and their order in both views, category availability, exclusive
idle/application displays and responsive application layout. They ran from a
disposable source checkout/cache without API or database access. The build's
existing diagnostics are in the verification record. The previous full suite is
historical; it was not repeated for this painter/markup-only change. Canvas
pixels are verified in the browser, not by the document-free Node model tests.

By source inspection, geometry, material/texture allocation, canvas dimensions
and render-pass code are unchanged. No inventory or runtime timing was repeated.
Wallpaper copying now occurs in each monitor's initially available draw and on
later populated-state repaints; a monitor subsequently marked unavailable is
repainted with gradient/text only. This changes bounded preparation/repaint work
without adding per-frame painting or a media request. No speed, memory-residency,
download, battery or thermal improvement is claimed. Held optimizations remain
held; the performance ledger records this as a design change.

See [independent critic review](critic-review.md) for the final rubric and limits.
