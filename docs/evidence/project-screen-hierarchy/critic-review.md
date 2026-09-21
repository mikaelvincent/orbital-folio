# Independent critic — project screen hierarchy

Reviewed 21 September 2026 by the independent `projects_critic` agent against
baseline `1e7eacc`. The critic did not implement the application changes; this
record is its only authored file for this task. Final implementation identities
are recorded in [verification.json](verification.json).

**Score: 95/100. Recommendation: keep. No unresolved blockers.**

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Request fulfillment | 25/25 | Populated monitors receive the folded wallpaper; unavailable monitors retain plain navy and STANDBY. Live precedes Source below the introduction in both detail views. |
| Visual quality and responsive hierarchy | 28/30 | Populated screens are visually richer without obscuring their labels/icons. Standby is quieter and distinct. Resource controls align as a coherent desktop row and wrap in the intended order on portrait/narrow layouts. |
| Correctness and accessibility | 19/20 | Availability guards and native safe-link behavior remain intact. DOM/tab order follows Live then Source; optional or unsafe links leave no invalid/empty controls. Focus behavior, readable labels and minimum control height are preserved. |
| Organization and scope | 10/10 | One shared resource component serves both views. Obsolete title-side markup, styles and the separate live-link export are removed. Secondary styles are scoped to avoid overriding Live. No data, camera or navigation changes are introduced. |
| Evidence and cost transparency | 13/15 | Source-matched targeted checks and six real Chromium captures support this bounded change. The record accurately identifies source-inspected allocation invariants and unmeasured preparation costs. Native Safari, physical touch and a new full-suite run are not claimed. |
| **Total** | **95/100** | |

## Review findings and resolution

No implementation blocker was found. The painting branches completely repaint
the idle canvas, so switching availability does not leave the previous wallpaper,
label or icon behind. Existing activation and display-visibility guards are
unchanged. Copying artwork into the idle canvas reuses the existing wallpaper and
does not introduce a retained texture or material.

The shared resource row preserves Live before Source in both visual and DOM order.
Specific `.is-source` selectors prevent secondary colors and interaction states
from overriding the adjacent live link. Regression cases cover both readers,
missing/unsafe destinations and configured labels. Removed title-side references
are no longer present in implementation or tests.

The critic requested a minor documentation chronology correction: the preceding
standby treatment should be called earlier rather than latest. The final context
record reflects the new hierarchy and distinguishes superseded arrangements.

## Final evidence inspected

- All six captures in the [README](README.md): room, desktop detail, desktop
  reading, portrait application, portrait reading and 320px application. The
  final narrow capture retains readable controls within the window; lower
  content remains normally scrollable.
- Final painter, shared resource component, reading-view markup, CSS and tests,
  plus current operations/context documentation and ledger entry 39.
- [Verification](verification.json): **25/25 targeted pure tests**, typecheck,
  affected lint, production build and diff checks pass. The critic reviewed the
  recorded checks rather than claiming to rerun them. All five tested source
  hashes independently match the reviewed checkout.

This targeted selection is appropriate for the canvas-painting and markup/style
scope. The shared renderer, camera/navigation and persistence are unchanged; the
prior full-suite result remains historical and is not presented as a new result.

## Limits and costs

The implementing agent performed browser interaction checks in hidden Chromium;
the critic independently inspected the final captures and source. Native Safari
and physical touch were not tested. Node model fixtures do not paint canvas
pixels, so the browser evidence supports the artwork assessment.

The source leaves geometry, canvas dimensions, retained material/texture
allocation and render-pass code unchanged; no fresh inventory is claimed.
Wallpaper copying now occurs during each monitor's initially available draw and
later populated-state repaint, while a subsequent unavailable state repaints
gradient/text. That changes bounded preparation work, not per-frame painting.
Startup/upload, CPU/GPU time, measured memory, delivery, thermal and battery
effects remain unmeasured. No performance improvement is claimed.
