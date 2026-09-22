# Independent review — printed notebook turns

Reviewer: `/root/notebook_flow_review`, 22 September 2026. The reviewer inspected
the final source, supplied visual/DOM evidence, documentation and verification
records independently. Only this review file was edited by the reviewer.

## Result

**94/100, accepted with no unresolved application, visual or verification
blockers identified.** Final source, desktop/portrait captures, long-section
motion and cleanup evidence, and passing isolated checks were reviewed. The
provisional score remains unchanged after those final checks. The score does not
override subsequent owner feedback or certify unperformed checks.

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Physical design and visual cohesion | 38/40 | The amber rim follows the cloth cover beneath its retaining clips. Printed fronts and illustrated backs remain attached to the moving paper; the retained spread, compact flags and room materials remain coherent. |
| Requested behavior | 29/30 | Room and reader flags share position, count and numbered labels. Only the exposed portion receives native input/fill. Adjacent content follows every crossed leaf in either direction, including section jumps. |
| Correctness and accessibility | 14/15 | Absolute pages resolve to the correct section/column. Inert copies strip duplicate IDs and live announcements; opacity masking preserves the semantic page and observed keyboard focus. Copies and masks are removed after settling. |
| Evidence and limits | 8/10 | Final live desktop/portrait captures, DOM observations, source-identified costs and isolated checks support the implementation. Pointer-hover capture, native Safari, touch and continuous animation recordings are absent. |
| Organization and cost disclosure | 5/5 | Shared layout and column-stride values keep model/native registration consistent. Copy reuse/release is explicit; geometry and browser costs are distinguished without unmeasured performance claims. |

## Independent inspections

- [Room focus](room-focus.jpg): the final cover-shaped rim is visible, with no
  larger rectangular HTML focus outline. The room retains its established
  lighting, furniture and mounted-object composition.
- [Printed front](forward-2.jpg): the tilted sheet carries the actual heading,
  subtitle, Markdown body and pagination. Its projected ink follows the paper.
- [Illustrated back](forward-0.jpg): the artwork and links turn with the reverse
  face while the next right page is visible underneath. The sampled occlusion
  does not allow stationary text to show through the sheet.
- [First section](desktop-first.jpg) and [settled last section](desktop-last.jpg):
  the spread stays registered with the binding; prior numbered flags are readable
  on the left and the current flag remains on the right. The refreshed last image
  shows complete artwork text and links. Its [state record](desktop-last-state.json)
  has settled/target page 15, no active turn, no copied nodes and an empty mask.
- [Reverse samples](reverse-states.json) and `reverse-0.jpg`/`reverse-1.jpg`:
  reverse traversal resolves the correct adjacent page pair and column offsets.
  The photographs are near-rest samples, not a continuous recording of the turn.
- [Portrait](mobile.jpg): the same full spread and markers remain framed in the
  actual 390×844 viewport. The deliberately small text follows the deferred
  mobile scope; this is not a finished mobile reading design.
- [Long-section motion](stress-1.jpg) and [completion](stress-settled.jpg): the
  disposable 24,301-character section forms 29 automatic pages. Its heading link
  traverses 28 leaves to the final passage. Six flags fit with the same spacing.
  The final image has reached page 29 of 29 without a scrollbar or cropped text.
- The native turn renderer, runtime integration, paper/marker layout and painting,
  shared pagination stride, physical front/back anchors, focused regressions,
  Project Context and performance ledger.

The [forward DOM records](forward-states.json) show successive absolute leaves
and changes to the correct column offsets while the native ink region retains
focus. Copies are accessibility-hidden and carry no duplicate IDs. The final
[browser state](browser-checks.json) confirms all three copy surfaces are empty
and hidden after completion. These records support lifecycle and focus behavior;
they are not a full assistive-technology audit. DOM samples and screenshots occur
one browser operation apart and must not be treated as the same animation instant.

The [stress samples](stress-states.json) retain 133 nodes in the front copy while
successive observed leaves use the expected column offsets. The [settled stress
state](stress-final.json) confirms native ink focus, matching target/settled
absolute page 46, no active turn, zero copied nodes and an empty mask. These
observations support section reuse and cleanup, without proving a particular
allocation rate or frame time. The stress fixture has no configured social
profiles, explaining its shorter links row without a main-content change.

## Findings and resolution

1. Physical marker labels initially used a different font stack. Their final
   canvas font now matches the native Arial/Helvetica stack and the numbered,
   two-line layout; repeated titles also include their index in the paint key.
2. Full Markdown sections were initially cloned on every leaf. Each of the two
   paper copies now reuses its section DOM across adjacent pages and updates the
   column offset. All copies are released on completion, including the links.
3. Visibility masking risked losing the semantic page's focus. The final CSS uses
   opacity-only visual masking and disables pointer input, while the real reader
   stays available to accessibility and keyboard focus. Display copies are inert.
4. Live focus inspection exposed a more specific global outline rule. The final
   notebook selector overrides it; the refreshed room screenshot shows only the
   fitted physical feedback.
5. The last-section capture initially appeared clipped. The implementing agent
   recaptured it after explicit settled-state verification. The reviewer inspected
   the replacement and matching state; no persistent clipping remains visible.

## Verification and cost

The reviewer inspected the raw full-suite log and final command records:
**503/503 tests pass**, with zero failures, cancellations or skips, in
391,428.910792 ms. Typecheck, affected lint, final formatting and final build pass.
The [verification manifest](checks/verification.json) records the disposable
source checkout, fresh isolated D1/R2 state and explicit loopback test URL.
The main `/about` response remained HTTP 200. The post-freeze change is disclosed:
only focus-selector CSS specificity and the two documentation files changed;
final formatting/build used that CSS. No application logic or tests changed.
The later documentation-only closeout is separately recorded: Project Context
wording and the ledger's completed checks/score were updated. The final README
and ledger agree with this review; their local evidence links resolve. Cleanup
records confirm the temporary server/state were removed and main `/about`
continued to return HTTP 200.

All **440 final source hashes** matched the current checkout when independently
checked. The five [cost inventory](cost.json) candidate hashes and its reusable
harness hash also matched. The structural delta is one reverse-face mesh,
192 triangles, 5,152 geometry-array bytes and one material, with no additional
unique artwork texture. Resting visible geometry is unchanged. This does not
measure the browser cost of cloning, projection or clipping, nor GPU time,
process memory, heat, battery use or frame pacing.

## Limits

Browser runs were performed by the implementing agent in hidden built-in
Chromium; this reviewer inspected their artifacts and source without rerunning
the browser or full suite. Desktop captures are actual 1440×1000 viewports;
portrait is actual 390×844. Stress captures use an actual 1280×720 viewport at
DPR2, with a 2560×1440 drawing buffer. Native Safari and physical touch were not tested.
The tool did not expose pointer movement, so pointer-hover appearance is supported
by matching focus feedback, native exposed-control bounds, CSS and model tests,
not a claimed hover screenshot. Reduced motion and 1/7-marker banks are model
test evidence; the live captures cover five and six sections. The photographs
show selected real frames, not a claim of verified frame pacing throughout motion.
