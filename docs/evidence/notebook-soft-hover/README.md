# Softer notebook marker feedback

Baseline: `67c89e751e433a109cf30c7328b80dfe2d57cf19`.

The owner approved the social posters and requested a calmer notebook hover:
the previous 62% white highlight felt too bright. This revision replaces that
highlight with a 24% warm ivory wash and eases it over 220ms. Slightly darker,
muted resting colors leave enough room for the response without washing out
the paper. The physical material, printed faces and marker metadata now use
one shared six-color palette.

Ink stays steady. No underline, hover border, shadow, layout movement or selected
decoration is added. The existing keyboard outline and immediate reduced-motion
behavior remain. Social posters, marker geometry and page-turn occlusion are
unchanged.

## Visual evidence

Live hidden built-in Chromium, main local development server, existing published
five-section content. Normal WebGL rendering and pointer-driven camera motion
were active; the screenshots have small perspective differences and are not
pixel-aligned comparisons. No screenshot scaling or postprocessing was applied.

| Capture | Actual CSS viewport / DPR | State |
| --- | --- | --- |
| [Desktop idle](desktop-idle.png) | 1440×900 / 2 | All markers resting |
| [Desktop hover](desktop-hover.png) | 1440×900 / 2 | Blue Learning notes marker hovered |
| [Keyboard focus](desktop-keyboard-focus.png) | 1440×900 / 2 | Yellow My story marker focused |
| [Portrait idle](portrait-idle.png) | 390×844 / 1 | Existing responsive spread, all markers resting |

DOM inspection confirmed the hovered marker's background was
`color(srgb 0.933333 0.913725 0.870588 / 0.24)` with a `0.22s` transition.
The focused marker retained its `rgb(65, 76, 86) solid 2px` outline. Resting
markers had transparent native backgrounds. Browser warning/error logs were empty.

The cooler blue and warmer yellow retain their identities under the restrained
highlight. Portrait retains the existing small, scaled physical spread; this
revision does not change its framing or typography. The published fixture shows
five of the six palette colors. Safari and the sixth color were not visually
tested. Reduced motion was checked in source, not emulated in this review.

## Verification

- [Notebook, occlusion and turn-ink tests](tests.log): 21 passed.
- [Typecheck](typecheck.log): passed.
- [Affected TypeScript lint](lint.log): passed.
- [Production build](build.log): passed; existing Vinext route-classification
  advisory remains.
- [Independent review](review.md): final source and matching visual evidence.
- [Source and image hashes](verification.json).

This bounded color/CSS revision does not rerun the full API/workflow suite.
No API writes or main-store setup/reset were performed. The existing local server
was preserved and the temporary browser tab was closed. No geometry, draw calls
or texture requests were added; no performance improvement is claimed.

Earlier [stronger highlight evidence](../about-hover-brightness/README.md) remains
historical. Its favorable review does not override the owner's later feedback.
