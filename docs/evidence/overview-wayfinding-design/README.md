# Overview identity and wayfinding — Stage 10

The overview now uses equal carbon destination tabs, readable ivory labels and
small entry arrows. These distinguish room choices from the rounded utility
controls while leaving the completed spacecraft dominant. A visible published
professional title gives the identity context. The completed model, physical
headers, camera fitting/roll/drag rules and navigation semantics are unchanged.

## Before and after

| Actual CSS viewport | Baseline `3388035` | Final |
| --- | --- | --- |
| 1440 × 900 desktop | [Before](before-desktop.jpg) | [After](after-desktop.jpg) |
| 390 × 844 portrait | [Before](before-portrait.jpg) | [After](after-portrait.jpg) |
| 320 × 568 small portrait | [Before](before-small-portrait.jpg) | [After](after-small-portrait.jpg) |
| 768 × 1024 tablet | [Before](before-tablet.jpg) | [After](after-tablet.jpg) |
| 844 × 390 optional interactive view | [Before](before-short-interactive.jpg) | [After](after-short-interactive.jpg) |
| 844 × 390 automatic reading fallback | [Before](before-short-landscape.jpg) | [After](after-short-landscape.jpg) |

The small-phone baseline shortened ordinary room names and scaled their targets.
The first design draft still shortened “Case studies” because the tab's internal
spacing consumed too much width. Final padding, arrow size and rail placement
resolve that primary readability problem: all four default names fit inside
136 × 48 px tabs at 320 px viewport width, with 15 px type and a 16 px gap.
The independent layout audit also found inward-moving rails could reduce that
gap during drag. A width-aware rail limit preserves it without scaling text.

Leaders retain the real opening-edge midpoints, outlined attachment dots and
restrained ivory strokes. Their other ends now meet the straight border of the
8 px-radius tab. Portrait routes stay outside the equipment, with enough space
for paired targets even when the vessel's projected width narrows. The visible
identity uses a quieter domain line plus the existing published role. Its hidden,
aria-hidden sizing copy reproduces the old reservation rather than changing fit.

## Rendering and interaction checks

Hidden built-in **Chromium 153**, actual viewports listed above, browser DPR 1,
1:1 CSS presentation and matching drawing-buffer dimensions. JPEG captures come
from the browser; no scaled iframe or native Safari capture. The existing main
server at `http://localhost:3000` was reused read-only. Live Earth and sky remain
animated, so background phases differ between captures. This is a layout/design
comparison, not a pixel-difference or timing experiment. Production shadows are
on. GTAO reports on for desktop, tablet and short interactive landscape, and off
for phone/small-phone portrait. Reading fallback has no canvas; its retained
scene dataset is stale and is excluded from rendering-effect claims.

[Browser measurements](browser-captures.json) retain viewport, drawing buffer,
pose, fit, identity and label rectangles, font sizes, text widths, leaders and
attachment points. [Frame comparison](frame-preservation.json) shows exact
before/after identity wrapper, framing JSON, camera position and quaternion for
all five interactive viewports. Source and image hashes are in
[source-manifest.json](source-manifest.json).

Additional live evidence:

- [Keyboard focus](after-desktop-focus.jpg): native Tab order reaches the
  identity, then Projects; Enter enters that room. Existing bronze focus
  feedback remains clearly visible.
- [Projects arrival](after-projects-entry.jpg): overview annotations are hidden.
  All four callout destinations and ordinary returns were checked. Contact was
  entered without submitting a message. See [interaction results](interaction-checks.json).
- [Portrait return in transit](after-portrait-return-transit.jpg) and
  [arrival](after-portrait-return.jpg): callouts remain hidden/inert while rolling
  and become available after arrival.
- [Landscape](after-desktop-drag-release.jpg) and
  [portrait](after-portrait-drag-release.jpg) drag release: leaders remain attached,
  tabs stay readable, and ordinary hover feedback resumes. These are released
  drag states, not held maximum endpoints. Source-level camera-grid tests cover
  the permitted envelope separately. No browser console errors were observed.

A separate read-only loopback fixture uses current production CSS/annotations,
real model anchor metadata and the unchanged camera functions. It renders valid
32–40-character fictional labels and a longer identity without touching stored
content. [Small portrait](long-label-small-portrait.jpg) and
[desktop](long-label-desktop.jpg) show intentional visual ellipsis with complete
accessible button names. JSON exports preserve all measured camera-grid states,
source hashes and identical current/baseline long-name identity reservations:
[phone](long-label-small-portrait.json), [desktop](long-label-desktop.json).
The fixture omits WebGL spacecraft rendering, Earth, the bottom dock, applications
and live navigation; it is evidence for actual text/layout, not a full scene.

The focused tests exercise actual model opening anchors with the stationary-vessel
camera adapter, tab-border attachment, paired-target gaps, native navigation,
full accessible labels, hover state, travel interaction boundaries, portrait
arrival, reduced motion and disposal. Reduced motion is tested in code; an OS
preference change and assistive-technology session were not performed. Native
Safari, physical touch hardware and held-drag browser endpoints remain untested.

## Verification and review

Final isolated verification passes **584/584 tests**, typecheck, production
build/geometry check and affected lint. The independent critic scores **96/100**,
with 50% visual-design weight and no unresolved blockers. The disposable fixture uses source-only files, separate loopback service,
fresh test-only D1/R2 and secrets, and explicit `TEST_BASE_URL`; it never copies
private environment files or the main store. See
[verification results](verification-checks.json), [layout audit](layout-audit.json)
and [critic review](critic-review.md).

No spacecraft geometry, renderer, texture or camera source changed. The source
audit counts 15 additional native elements: 12 in annotations and 3 in the home
identity, excluding text nodes. These have a small expected layout/paint cost, but no
CPU/GPU timing, memory, heat or battery effect was measured. This is an authored
presentation baseline, not a performance optimization. Held candidates stay held.

## Handoff to Stage 11

Keep the carbon destination tabs distinct from utility pills, full-size default
labels and touch targets, opening-midpoint leaders, portrait pair spacing and
published identity/role hierarchy. Preserve the hidden identity reservation and
arrival gating. Stage 11 can judge whole-ship material/light cohesion against
these captures; physical signs, camera behavior and room UI remain established
boundaries. No out-of-scope redesign is required to complete this stage.
