# Independent implementation review

22 September 2026. Reviewer: independent `proposal_critic` agent. The reviewer
did not implement the feature, change owner content, operate the native browser,
or run the mutating test suite. This record is the reviewer's only file change.

**Score: 92/100. Approved; no unresolved implementation blockers or failing
required checks.** The score does not override later owner feedback.

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Design and visual cohesion | 27/30 | The square portrait and three equal clipped prints belong in the existing study. Retainers, matte surfaces, spacing and amber feedback remain consistent. The portrait is visibly separate from the selectable social cards. |
| Visitor UX and accessibility | 18/20 | Native links retain keyboard activation, external-link semantics and drag suppression. Full-size focus labels and larger Reading view controls compensate for compact physical prints. Neutral targets meet the intended 24-pixel minimum at the verified 360-pixel viewport. |
| Correctness and content safety | 24/25 | Independent crops and room placements round-trip correctly. Uploads remain private until explicit image publication. Published references, including managed URL aliases, are guarded, and simultaneous About slot claims use a single-statement database guard. |
| Resource and input lifecycle | 9/10 | Photo loading is deduplicated, bounded and cancelled on disposal. Fallbacks do not delay scene readiness. Loaded photos request a guarded repaint; interaction uses the existing feedback and drag controller. No measured performance improvement is claimed. |
| Verification, documentation and evidence | 14/15 | All 453 tests pass, along with typecheck, build/geometry checks and affected lint. Source manifests match. Documentation distinguishes current decisions, rejected attempts, live application captures, finite studio fixtures and untested platforms. |

## Scope and evidence reviewed

Reviewed the complete implementation diff, publication and alias guards, social
resolution, crop math, photo loader, model registration, native target handling,
reader styles, authoring components and focused regressions. Independently
computed all 24 hashes in `source-hashes.json`; every current source hash matched
both that manifest and `validation-source.json`. Read the passing logs and
`validation.json`; the root agent ran those checks in the documented disposable
checkout against fresh isolated D1/R2 at localhost:3003.

Visually inspected the refreshed square-portrait desktop room, keyboard focus,
phone focus, narrow-room focus, Reading view and studio crop captures. The
0.44-square portrait face keeps clearance above the right social card and remains
balanced beside the library. Studio shows independent square crops of one
original. The three 0.38-square cards retain the existing row centers and room
camera fit. Reviewed browser measurements of 24.19-square native targets with
3.44-pixel gaps at 360 × 800, and 26.31-square targets at 390 × 844.

## Findings addressed during review

- Social cropping originally showed an unobstructed photo even though the room
  placed its platform badge over the center. Studio now previews that badge and
  the correct photo/caption proportions, and explains the phone presentation.
- General journal navigation styles originally overrode the new reader controls.
  Scoped resets restore the intended spacing, 14-pixel labels and icon alignment.
- Waiting for every optional photo originally delayed global scene readiness.
  Fallbacks now render immediately and photo completion requests a guarded repaint.
- The first social rectangles were only 23.54 pixels high on the tested phone.
  Square physical prints resolve that failure without changing camera framing.
- Initial full-page screenshots contained scaling/tiling artifacts. They were
  replaced by viewport captures; raw earlier measurements are marked superseded.
- The owner's subsequent square-main-photo request is implemented in the physical
  print/backing arrangement, texture, crop controls and final populated captures.
- Documentation now distinguishes image references in JSON exports from uploaded
  R2 bytes, and names the explicit Preview About action in both editors.

## Limits

Visual evidence is hidden built-in Chromium, not native Safari. A physical touch
device, native pointer-hover motion and live OS reduced-motion changes were not
exercised. Shared-controller source/model tests and browser keyboard focus cover
related behavior but do not substitute for those device checks. Targets are small
at the narrowest verified viewport; minimum dimensions were measured at neutral
room orientation, not every possible viewport or drag angle.

Studio screenshots use synthetic component fixtures; they establish layout and
local controls, while isolated API tests separately establish upload, privacy,
publication, conflict and persistence behavior. The studio social crop preview
shows the desktop badge; private About preview shows the larger phone badge.
CPU/GPU timings, measured process memory, heat and battery effects were not tested.
