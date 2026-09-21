# Independent critic — standby wallpaper and resource controls

Reviewed 21 September 2026 by the independent `projects_critic` agent. The critic
did not implement the application changes; this review record is its only authored
file for this task. [Source hashes](source-hashes.json) identify the reviewed
implementation against baseline `c2886e5`.

**Score: 95/100. Recommendation: keep. No unresolved blockers.**

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Request fulfillment | 25/25 | Empty monitors show subdued shared wallpaper and STANDBY while remaining unavailable. Live uses a restrained tinted/outlined rest state with a stronger interaction state. Source is a secondary blue-gray code-icon control below the introduction. |
| Visual quality and responsive design | 28/30 | Standby looks intentional and distinct from selectable screens. Resource hierarchy is clear on both dark application and cream dossier surfaces. Desktop, portrait and narrow layouts retain readable text, spacing and application chrome. |
| Correctness and accessibility | 19/20 | Availability guards remain unchanged. Links retain native semantics, safe destinations and focus treatment. Both controls have a 44px minimum height; labels wrap, reduced motion disables transitions, and authored alternative source labels are preserved. |
| Organization and scope | 10/10 | Existing wallpaper, idle canvas and shared link components are reused. The label change affects presentation and fresh defaults without rewriting stored identity or adding backend behavior. |
| Verification and cost transparency | 13/15 | Source-matched isolated checks and actual Chromium captures support the result. Structural estimates are qualified, including unmeasured canvas preparation/upload. Safari, physical touch, pointer-hover and pressed-state visual checks remain outside the evidence. |
| **Total** | **95/100** | |

## Source and design review

- Standby copies the existing desktop canvas into the existing idle canvas, then
  paints the muted overlay and label. It introduces no new retained material,
  texture or geometry. Availability changes trigger repaint; there is no per-frame
  canvas painting. Re-enabling a category repaints its full face and retains the
  existing activation/visibility behavior.
- The critic initially raised whether the dark live fill would look too heavy
  on the cream paper. Actual desktop and portrait captures show a balanced primary
  action beside the lighter secondary source control. No palette revision was
  warranted after visual inspection.
- Live focus is visibly stronger than rest without moving the control. Source
  gains an obvious interactive outline and code icon while remaining secondary.
  The 320px capture shows ordinary content scrolling, not horizontal clipping;
  the partially visible source control is within that scrollable content.
- `View source` is expanded only as the exact legacy default. Other configured
  wording is retained. The component tests verify that rendering does not mutate
  the supplied configuration.

Authored CSS color calculations support text legibility: live rest **8.02:1**,
hover/focus **7.06:1**, pressed **5.56:1**; source dark **10.33:1** and paper
**7.81:1**. These are nominal color-value calculations, not sampled rendered-pixel
measurements or a complete accessibility audit.

## Evidence checked

The critic independently inspected all **eight** final captures listed in the
[README](README.md): standby room, desktop rest/focus, reading rest/focus,
portrait application/reading and narrow application. The associated source,
current operations/context documentation and ledger entry 38 agree with them.

[Verification](verification.json) records **415/415 isolated tests passing**,
plus typecheck, affected lint, production build and diff checks. The critic
reviewed the supplied check record rather than claiming to have rerun the full
suite. Independent hash comparisons found no application-source difference from
that tested snapshot; the isolated Vite cache override is explicitly identified.
All five final implementation hashes and every candidate model dependency hash
match the checkout.

[Inventory](geometry-inventory.json) has zero structural deltas against the
baseline. Its identical populated-category fixtures do not paint or measure
standby pixels. The README accurately separates these counts and nominal texture
bytes from runtime timings and measured memory; it also qualifies the reusable
tool's inherited method wording. Documentation links and diff checks pass.

## Limits

Browser interactions were performed by the implementing agent in hidden Chromium;
the critic independently inspected captures and reviewed supporting source and
records. Native Safari and physical touch were not tested. Keyboard focus was
captured in both views; pointer-hover uses the same CSS rule but was not visually
tested, and no pressed-state screenshot is claimed. Canvas appearance relies on
the live captures because the headless Node model tests do not paint it.

No CPU/GPU, frame-pacing, startup/repaint/upload, measured memory, download,
thermal or battery improvement is established. Retaining the existing idle
texture means the intentional standby art retains its allocation. These limits
do not block the requested design change.
