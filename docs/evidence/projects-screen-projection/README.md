# Projects desktop and native surface projection

Baseline: `071841a` (full revision and final SHA-256 values in
[source-hashes.json](source-hashes.json)). The owner reported a Safari desktop
window displaced downward inside its otherwise correctly framed monitor. They
also requested a Contact-like desktop wallpaper and a clearer collection return.

## Implementation and diagnosis limits

The existing physical glass and reader anchors agree. Baseline Chromium at
1470×900 had a surface origin around (56.7, 61.86), size 1356.6×728.3 CSS pixels,
zero local offsets and zero ancestor scroll. It did **not** reproduce the large
Safari displacement. No confirmed Safari-specific root cause is claimed.

Previously the native reader was a CSS3DObject inside nested camera/view wrappers
with percentage centering. It now uses one explicit viewport-relative CSS
matrix, calculated as viewport × projection × camera inverse × surface world ×
pixel-to-centered-plane. Its top-left origin is fixed at zero. The full depth row
keeps the matrix invertible for browser pointer mapping. Camera, monitor geometry,
near plane, fit and anchor coordinates are unchanged. This removes the native
surface's dependence on nested perspective/static-position/percentage-centering
behavior while preserving the physical projection. Scene hotspots still use
CSS3DRenderer. Native scrolling remains within the application pane.

The shared implementation also serves Contact, About and Case studies; it is not
a Projects-only pixel offset. Viewport dimensions are cached on resize, scratch
matrices are reused, hidden readers skip projection, unchanged transforms avoid
style writes, and the extra layer is removed during disposal.

Projects now has a static satin-blue folded wallpaper with a calm opaque window.
Detail Back moved into the persistent title bar as an amber-outlined control,
named for its originating collection. Compact layouts hide the brand text rather
than the Back label or X. The footer retains a matching return action. Existing
collection/detail scroll retention and physical category selection are preserved.

## Browser evidence

Hidden built-in **Chromium**, existing development server, live Three.js scene
with normal Earth/lighting. Desktop/tablet retain AO; the existing compact path
omits it. No native Safari, real touch, browser page zoom or virtual keyboard
test was performed. These are finite layout checks, not a guarantee for every
possible browser/device combination.

| Capture | Actual CSS viewport / DPR | State |
| --- | --- | --- |
| [Retina desktop](desktop-retina.jpg) | 1280×720 / 2 | Default browser dimensions, direct Meter detail |
| [Laptop detail](desktop-detail.jpg) | 1470×900 / 1 | Pinned Back and X |
| [Scrolled laptop](desktop-scrolled.jpg) | 1470×900 / 1 | End of story; title-bar Back remains available |
| [Experiments monitor](desktop-experiments.jpg) | 1470×830 / 1 | Lower-row monitor corresponding to reported failure |
| [Phone](phone.jpg) | 390×844 / 1 | Resize from landscape while detail is open |
| [Small phone](small-phone.jpg) | 320×568 / 1 | Full Back label and X fit; pane has no horizontal overflow |
| [Tablet](tablet.jpg) | 768×1024 / 1 | Category-aware Back to experiments |
| [Large desktop](large-desktop.jpg) | 1920×1080 / 1 | Return from short-screen reading fallback |
| [Short landscape](short-landscape-reading.jpg) | 844×390 / 1 | Existing semantic reading fallback |
| [Contact input](contact-input.jpg) | 1470×830 / 1 | Native typing and substring selection; no submission |
| [About](about-reader.jpg) | 1470×830 / 1 | Reader registered to its paper surface |
| [Case studies](case-study-reader.jpg) | 1470×830 / 1 | Reader registered to its screen |

These are ordinary viewport captures, not full-page/clip captures or rescaled
representations of different viewport dimensions. The Retina file follows the
browser tool's capture representation; actual CSS size/DPR is recorded separately.
Pointer/focus states and content differ, so they are not pixel-diff comparisons.

[Raw browser checks](browser-checks.json) retain all samples. DOM surface bounds
were compared with independently published physical reader-corner projections.
The settled initial desktop/portrait checks agree within 0.003 CSS pixels; About
and Case studies agree within 0.0001. All local origins and parent scroll offsets
are zero. The first laptop Back sample differs by 3.338px and its later hover
settling sample by 0.189px. The diagnostic corner snapshot updates at roughly
200ms, while DOM bounds are read live; these moving/settling samples are retained
but excluded as evidence of exact alignment. The after-drag and Contact hover
samples have the same limitation (0.0335px and 0.0105px differences). Screenshots
and native interaction supplement the finite numerical checks.

Live actions verified: direct detail load; physical Experiments entry; detail and
Back preserving its category; End/Home scrolling with pinned header; portrait,
tablet and landscape resize; drag release followed by Back and X; short-screen
reading fallback and manual return to interactive mode; Contact native typing,
text selection and inner-pane focus scrolling; About/Case studies Next page;
About Return and Contact X. No Contact submission or persisted content mutation
was performed. No browser warnings/errors were logged during the final checks.

## Cost and verification

This is a correctness/design change, not an optimization. Wallpaper is static
CSS with no image asset, animation, mesh, texture, shadow or postprocess pass.
The projection adds matrix composition in the existing CSS phase and a dedicated
DOM layer while removing native-reader CSS3DObject projection. It does not add a
per-frame DOM measurement. No matched CPU/GPU, delivery, memory, first-frame,
frame-pacing, heat or battery comparison was made, and no saving is claimed.
Held performance candidates remain held. Earth coverage was not rerun: physical
camera/geometry and their existing coverage envelope are unchanged.

The new regression suite checks 1,125 surface points over five viewports, three
plane transforms and three camera rolls, including asymmetric frusta, nonuniform
scale, inverse mapping, hidden/resume/resize and unchanged-transform writes.
These CPU checks cannot certify a browser engine's CSS compositor.

- Full suite: **392 passed**, no failures, cancellations or skips (140.8s).
- Typecheck, affected lint, production build and `git diff --check` passed.
- Build retains existing Node `module.register()` deprecation, large-chunk and
  Vinext static route-classification advisories.
- Source hashes and relative documentation links verified; localhost
  `/projects/meter` responds HTTP 200. The existing development server remains
  running. Temporary browser viewport overrides and the review tab were removed.

Independent critic: **93/100**, no unresolved implementation blockers,
recommendation keep. Rubric: fulfillment 23/25, visual/responsive design 29/30,
correctness/input compatibility 24/25, organization 9/10, evidence/performance
honesty 8/10. The review covered final source, matching desktop/portrait/shared
reader captures, source hashes and evidence links. It requested the 320px
title-bar, DPR2 and native-input checks, all completed, and precise exclusions
for moving diagnostic samples. No source changed after visual capture. The
remaining principal limitation is native Safari confirmation; unmeasured browser
compositor cost is also unknown. The score does not replace owner feedback.
