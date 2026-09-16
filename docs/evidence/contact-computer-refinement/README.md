# Contact computer interaction refinements — 16 September 2026

Follow-up to the [initial Contact application](../contact-computer/README.md),
with Git **`917e7e0`** as the delivered baseline. This is authorized design and
interaction work; no held lighting, shadow or geometry candidate is adopted.

## Delivered changes

- Both social monitors use amber rims inset on their actual glass and remain
  independently hoverable/selectable while the Contact application is open.
- The existing hover camera remains active in the application. The main monitor
  itself does not advertise another selection while already open.
- The main monitor and its supporting rails, shoes, standoffs and heels move up
  by 0.10 console-local units. Glass size, keyboard geometry and desk stay intact;
  no function-row keys are hidden or covered to simulate clearance.
- An accessible X replaces the text return control. Exposed Contact pressure
  walls give restrained paint feedback and close the application when clicked.
  Actual screen, keyboard and desk silhouettes block this action. Sky is inert.
- The portrait X required a related pointer-event correction: the invisible
  global identity wrapper must not consume clicks intended for the application.
  Real identity controls retain their own interaction.

Native form controls, temporary drafts, the working message submission, demo
call request, physical-key animation, room navigation and production rendering
remain in place. No backend, persistence, booking or delivery feature is added.

## Geometry and design cost

[`model-costs.json`](model-costs.json) was produced with the existing
[`compare-model-costs.mjs`](../contact-computer/compare-model-costs.mjs), comparing
`917e7e0` with the working source. Canvas drawing is inert while preserving its
real dimensions and geometry branches. Both wide and compact layouts are built;
visible inventories use `traverseVisible`, without a camera or renderer.

| Inventory | Baseline → candidate potential submissions | Triangle inputs | Geometry/index arrays |
| --- | --- | --- | --- |
| Wide visible | 438 → 438 | 1,013,532 → 1,013,532 | 36,083,204 → 36,083,204 bytes |
| Compact visible | 438 → 438 | 991,868 → 991,868 | 35,462,340 → 35,462,340 bytes |
| Contact console, either layout | 37 → 37 | 70,710 → 70,710 | 1,716,560 → 1,716,560 bytes |

Every retained/visible structural delta is zero, including instance arrays,
materials and nominal texture storage. This does **not** establish equal browser
CPU/GPU cost, actual draw calls, JavaScript transfer size, process/GPU memory,
frame pacing, startup, heat or battery use. In particular, the new wall action
adds CPU picking work even though its geometry already exists.

The source archives preserve 36 model-owned files per tree:

- Baseline: [`model-source-baseline-8025423223e0af3f.json.gz`](model-source-baseline-8025423223e0af3f.json.gz).
- Candidate: [`model-source-candidate-1d3a94e137fee1ba.json.gz`](model-source-candidate-1d3a94e137fee1ba.json.gz).

Full per-file, archive and dependency hashes are in the inventory. These archives
cover the model inputs, not the runtime/React/CSS changes; their final source
identity must be recorded with final verification.

The clearance regression in
[`contact-console-clearance.test.mjs`](../../../tests/spacecraft/contact-console-clearance.test.mjs)
checks **648 offline projections**: two furnishing layouts, four landscape
sizes, three distances, three approach/view slopes and nine hover samples. It
requires at least 2 CSS pixels between the application's lower edge and the
projected bounding box of all keys. This is a conservative geometric check,
not proof of aesthetics or a recording of 648 live transitions. The live
captures below supplement the two-pixel minimum fixture with visual checks.

## New picking workload and bounded reuse

[`picker-workload.json`](picker-workload.json) retains six alternating-order
Node batches of 300 calls per case, after 200 warmup calls. The
[`reproduction script`](measure-picker-workload.mjs) defaults to a new file in
`/tmp`; it refuses to overwrite existing evidence. Four wall meshes contain
6,546 triangle inputs; 38 console blocker meshes contain 70,910 including hidden
variants. Bounding-volume rejection and early exits avoid testing every triangle
on every ray.

| Detailed picker case | Median CPU function time per call |
| --- | --- |
| Exposed rear wall | 1.189ms |
| Desk blocks the wall | 1.476ms |
| Keyboard blocks the wall | 0.235ms |
| Sky | 0.000242ms |

This was an **unconditioned Node workload survey**, with browser rendering still
allowed, not a rested device/browser benchmark. The existing ordinary-room picker
is also recorded, but it has different semantics. The open application formerly
skipped this feedback completely, so these comparisons are not an application
speedup. No GPU/frame-time/thermal/battery conclusion follows.

The delivered runtime checks the current topmost DOM element first, preserving
form, social-link and overlay behavior. It then memoizes detailed wall picking
only for an exactly unchanged ray and model geometry revision. Scene-target
synchronization recreates the picker; actual key/door motion changes revision.
Wall paint feedback is material-only and must not refresh geometry or GTAO.
The new camera hover does still require view-dependent AO while the view moves.
The [live counter trace](wall-pick-trace.json) stays at 309 detailed evaluations
for 23 seconds at the same settled viewpoint, then reaches 610 after mouse and
camera movement. This verifies reuse, not CPU/GPU frame-time savings.

## Verification and limitations

Focused geometry and interaction tests pass. They inspect the physical batched
social-rim coordinates, independent social feedback during reading, disabled
main-monitor feedback while open, paint-only wall feedback, unrelated material
stability, and wall reset when closing. The wall picker tests cover actual
occlusion, hidden parents/materials, layers and moving keyboard instances.

The initial full suite had **320 passing / 2 failing cases**: one workflow child
and its parent. The failure occurred on a valid authenticated GET following two
intentionally CSRF-rejected POSTs; the local development transport returned an
empty HTTP400. [`transport-verification.json`](transport-verification.json)
retains raw status sequences, source hashes, focused reproductions and limits.
The relevant backend/security/manifests were unchanged. A historical runtime was
not separately executed, so this is not a claim that a previous environment
failed identically. Only those two adversarial test requests now use
`Connection: close`; the strict 403 assertions and ordinary request helper remain
unchanged. No application security or backend logic was modified.

Current screenshots supplied by root review:

- [`app-social-left-hover.jpg`](app-social-left-hover.jpg) and
  [`app-social-right-hover.jpg`](app-social-right-hover.jpg): open application
  with neighboring social feedback.
- [`app-wall-hover.jpg`](app-wall-hover.jpg): wall-return feedback.
- [`room-return.jpg`](room-return.jpg): ordinary room after closing.
- [`portrait-app.jpg`](portrait-app.jpg) and
  [`portrait-scrolled.jpg`](portrait-scrolled.jpg): portrait application and
  internal form scroll.

Final verification: **322 tests pass**, typecheck and affected lint pass, and
the production build passes. [Initial failed run](tests-initial.log),
[final suite](tests-final.log), [build](build-final.log), and
[source hashes / interaction record](verification.json) preserve the chronology.
The final Contact-focused suite passes all **13 tests** after the last interaction guard.

Final captures use live built-in Chromium at **1280×720** and **390×844**, with
matching drawing buffers and DPR 1 for the final application checks. The earlier
room-return composition capture did not separately record its drawing buffer.
All ordinary effects remain enabled; these
are not scaled viewport simulations or performance benchmarks. Both social
links actually opened separate tabs while retaining the draft. Keyboard, desk
and main bezel clicks stayed inside the app; exposed wall clicks returned to
the room. The portrait X was verified with an ordinary pointer click and
topmost-element inspection after fixing the invisible identity wrapper;
accessibility-action clicks alone had missed that obstruction. The visible
overview identity link was also checked. Native textarea dragging selected
“Selecting these words”; held form-pointer gestures retain native editing while
ordinary camera hover stays enabled. Fully offscreen portrait social anchors
are inert; visible landscape links recover after resize.

Native Safari, hardware keyboards and device on-screen keyboards were not tested.
Existing submission/demo boundaries remain covered by shared tests; this
refinement does not claim a new live send audit.

Independent final review: **95/100, no unresolved blockers**. The
[rubric and revisions](critic-review.json) cover fulfillment 30/30, visual quality
24/25, interaction/accessibility 19/20, organization 9/10 and evidence/performance
discipline 13/15. The critic checked final source hashes, real pointer evidence,
image metadata and completed verification. Implementation commits: `d65f1ed`
(Contact refinements) and `2c7a61f` (isolated test transport fix).
