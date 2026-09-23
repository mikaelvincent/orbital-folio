# Plain notebook marker titles

23 September 2026. Baseline: `dfafe9e`.

The selected marker's native title had an explicit underline. `aria-current`
changes immediately after a section click, so the line also appeared before the
page-turn sequence finished. The wrapped Beyond the screen title made this
particularly noticeable. Physical moving labels already used plain lettering.

Removed only the selected-title decoration rule in `about-notebook.css`, keeping
all marker titles consistent with their physical print. Selection semantics,
keyboard focus outlines, hover feedback and page motion are unchanged. The final
CSS SHA-256 is `ce0424db5813b9b44f4ca49da119f3ca5269b4646c5cfa6716722ef797283125`.

Hidden built-in **Chromium**, live existing content, **1280×720 / DPR 2**, normal
scene effects and actual viewport captures:

- [Before selection fix](before-selected.jpg): both wrapped title lines underline.
- [After selection fix](after-selected.jpg): plain title on the left marker.
- [During a multi-section turn](after-turning.jpg): the selected destination
  marker remains plain while it is still on the right.

[DOM observations](browser-states.json) record the reproduced underline during
and after selection, its removal in forward/reverse turns and settled states,
retained `aria-current`, and a keyboard-focused last marker with a solid outline.
Warning/error logs were empty. These are sampled states, not an every-frame video.
No content or database writes occurred. The temporary review tab was closed.

`npm run format -- --check features/portfolio/about-notebook.css` and
`git diff --check` pass. This removes one CSS rule; model/runtime code is
unchanged, so no full API suite or implementation-mirroring test was added.
Native Safari, touch and portrait were not retested for this desktop style fix.
The [independent review](critic.md) records its rubric and acceptance.
