# Notebook page-turn and feedback refinements

22 September 2026. Baseline: `8374801`. This implements the owner's four follow-up
requests while preserving the physical notebook, automatic Markdown pagination
and the deferred mobile layout.

## Result

- The shared dim/bright feedback now draws its rim along the actual 1.056×0.617
  cloth cover at cover depth. Retaining clips naturally occlude it. The redundant,
  larger HTML keyboard outline is removed.
- Room and reader use the same section count and marker positions. Physical front
  and reverse printing now matches the numbered, two-line native labels. A
  repeated title in a later marker bank still refreshes its number.
- Marker controls cover only the exposed 125×56 logical pixels. The 30px adhesive
  overlap remains under the paper and receives neither hover fill nor input.
- Every turning leaf carries the actual adjacent Markdown page, including during
  section jumps and reverse turns. The next right page is visible beneath it;
  the back carries the same left artwork and links as the resting spread.
  Camera-projected paper masks prevent underlying HTML ink from showing through.
- Inert, accessibility-hidden copies have no duplicate IDs. They reuse each
  section's DOM through its adjacent pages and release it on completion. The
  semantic reader retains keyboard focus and its live page label throughout.

## Visual evidence

Hidden built-in Chromium, live main application and its existing five published
sample sections. No main studio records were changed. Desktop captures are actual
1440×1000 viewport screenshots; portrait is an actual 390×844 viewport. These are
not desktop screenshots scaled to imitate a phone. The browser initially reported
DPR 2 on desktop, then DPR 1 after the portrait/desktop viewport overrides; final
DOM/drawing-buffer dimensions are in [browser-checks.json](browser-checks.json).
The ordinary production scene includes its existing lighting, shadows, AO and
orbital background; no effects were disabled for these captures.

- [Room focus](room-focus.jpg) shows the fitted physical rim; focus uses the same
  material feedback as pointer hover. [Room idle](room-idle.jpg) records leaving
  focus, so brightness may still be easing toward idle.
- [First section](desktop-first.jpg) and [last section](desktop-last.jpg) show
  the retained layout and markers on the correct sides. The refreshed last
  capture has [matching settled state](desktop-last-state.json): target and
  settled page 15, no copied nodes and an empty occlusion mask.
- [Moving printed front](forward-2.jpg) and [illustrated reverse](forward-0.jpg)
  show live intermediate leaves on a 15-page jump. Further captures are
  [forward-1](forward-1.jpg) and [forward-3](forward-3.jpg).
- [Reverse-0](reverse-0.jpg), [reverse-1](reverse-1.jpg) and
  [reverse-2](reverse-2.jpg) cover the return journey. Captures sample real motion,
  so some frames are close to the resting plane.
- [Portrait](mobile.jpg) retains exactly the desktop paper and marker layout,
  intentionally small as requested. It is not a new mobile design.

[Forward DOM samples](forward-states.json) and
[reverse DOM samples](reverse-states.json) confirm intermediate absolute pages,
correct column offsets, facing-side visibility and preserved native page focus.
DOM observations precede their screenshots by one browser tool operation; they
are nearby samples, not assertions of identical animation instants. A separate
single-page keyboard check observed opacity 0 with visibility still visible and
focus retained in the semantic ink region. Completion removed all copied nodes
and cleared the occlusion mask; Escape returned to the notebook entry control.
Browser error/warning logs were empty at the final desktop check.

The browser interface does not expose pointer movement, so a dedicated hover
screenshot was not captured. Native control bounds and CSS constrain hover fill;
the production model tests exercise actual hover brightness/rim behavior.
Native Safari and physical touch were not tested. Reduced motion, marker banks
and 1/6/7-section fixtures are covered by the model tests rather than these live
five-section screenshots.

The disposable fixture's 24,301-character Markdown stress section automatically
formed 29 pages. Its opening heading link jumped from page 1 to page 29, crossing
all 28 leaves. [Motion samples](stress-states.json) show adjacent absolute pages
20/21, 23/24, 26/27 and 30/31 with the expected column offsets and 133 nodes in the
front copy at each sample. These are finite DOM observations, not frame timings.
[Stress motion](stress-1.jpg) and [completion](stress-settled.jpg) use an actual
1280×720 viewport at DPR 2 with a 2560×1440 drawing buffer. The fixture has six
markers and no configured social profiles; its links row therefore differs from
the main samples. [Final state](stress-final.json) confirms page 29 of 29, retained
focus, zero copied nodes and a cleared mask. Browser error/warning logs were empty.
The exact disposable content is retained in `checks/stress-section-content.json`.

## Verification and cost

The verification agent runs API/workflow tests from a disposable source checkout
against isolated D1/R2 on loopback port 3003 with fresh test secrets and an explicit
`TEST_BASE_URL`. The owner's main server/store on port 3000 remains untouched.
Detailed command results and source manifests are retained in `checks/`.
The full suite passed **503/503** with no failures or skips. Typecheck, affected
lint, final formatting and production build also passed. The full-suite manifest
predates only the final focus-selector CSS correction and documentation changes;
the final CSS was rebuilt and checked. Both source manifests and the explicit
delta are preserved in [verification.json](checks/verification.json).

The focused regressions cover cover registration, exposed targets, variable
marker banks, both printed faces, fixed/turning texture sharing, front/back ink
anchors after batching, every crossed page, interrupted routes and reduced motion.

[cost.json](cost.json) compares raw and production-batched fixtures against the
baseline. One reverse-face mesh adds 192 triangles, 5,152 geometry-array bytes and
one material. Its artwork texture is shared; no additional unique texture or
nominal texture bytes are introduced. Resting visible geometry is unchanged.
Native projection/clipping and temporary DOM copies are outside that inventory.
No GPU timing, process-memory, frame-rate, thermal or battery claim is made.

## Independent review

The [independent review](critic.md) accepted the final source and matching
evidence at **94/100**, with no unresolved blockers. Initial
review identified font-family mismatch, repeated section cloning and semantic
focus loss from visibility masking. These were corrected before the final motion
captures: matching Arial fonts, per-section reuse and opacity-only visual masking.
The live room check additionally caught CSS specificity preserving the old large
keyboard outline; the final room image reflects its correction.
