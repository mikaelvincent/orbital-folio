# Full monitor desktops, project cards and lists

Baseline `4370874`; final source hashes are in [source-hashes.json](source-hashes.json).
This addresses the owner's correction that wallpaper must cover the whole monitor,
plus text-only project cards, visible Markdown list markers and simpler window chrome.

## Delivered behavior

- One scene-owned, static 1024×768 canvas wallpaper texture fills each active
  monitor's exact rounded glass. Projects and Contact share the art. A separate
  desktop group replaces the idle graphic exclusively; the native window's
  surrounding element is transparent. This covers regions outside the narrower
  portrait app and Contact chooser. Closing restores the original idle graphics.
- Project collections no longer render covers, video posters or placeholders.
  Stored media, detail covers/story media and Studio authoring remain. The unused
  compact media component branch/styles were removed after checking callers.
- Project detail chrome has just **Back to projects** on the left and X on the
  right. Both are borderless and use matching hover/focus colors. The title/brand
  is removed. Back still restores the original category and its scroll position;
  the footer keeps the same return action.
- The existing parser already supported lists. Shared CSS now restores decimal,
  disc/circle/square markers, hanging indentation and nested spacing after
  Tailwind's reset. Ordered start values are preserved. Task checkboxes are
  aligned once; the duplicate literal checkbox token is suppressed.

The critic caught missing semantic room/pick metadata on raw wallpaper meshes;
the final code copies the original glass metadata before batching. Regression
checks verify complete glass bounds, room ownership, self-lit material and
exclusive visibility through both scene layouts and every application target.
An initial test incorrectly assumed batching preserved `receiveShadow=false` and
a single material identity. The batcher sets the former (ignored by MeshBasic's
unlit shader) and clones materials for object feedback. These assumptions were
removed; final delivered counts below reflect actual batched output.

## Visual verification

Hidden built-in **Chromium**, live Three.js on the existing local server for room
captures. Default 1280×720 CSS viewport used DPR2; explicit 1470×830 and 390×844
overrides used DPR1. Desktop uses normal AO/lighting; the existing compact path
omits AO. No native Safari, real touch or virtual keyboard test was performed.

| Capture | Actual CSS viewport | Result |
| --- | --- | --- |
| [Collection](gallery.jpg) | 1280×720 | Full rounded-glass wallpaper, balanced text-only cards |
| [Detail](detail.jpg) | 1280×720 | Left Back/right X; original detail cover retained |
| [Ordered list](ordered-list.jpg) | 1280×720 | Live Meter story, native numbered markers, pinned header |
| [Portrait detail](phone.jpg) | 390×844 | Wallpaper extends beyond the app; readable Back/X |
| [Contact desktop](contact-desktop.jpg) | 1470×830 | Full glass behind the compact chooser |
| [Contact portrait](contact-phone.jpg) | 390×844 | No bare backing outside the smaller chooser |
| [List contexts](nested-lists.jpg) | 1470×830 | Finite SSR fixture, dark reader/light reader/Studio wrappers |
| [Narrow lists](nested-phone.jpg) | 390×844 | Mixed nested lists and wrapping indentation |
| [Narrow task lists](tasks-phone.jpg) | 390×844 | One checkbox per task, nested support text |

List fixture captures use the real React renderer, actual Tailwind Preflight and
current app/Markdown/Studio styles with synthetic data. They are **not** live
WebGL views or a test of the entire authenticated Studio. The wide capture clips
the lower ends of the light panels at the viewport; the narrow task capture
shows the complete final task hierarchy. The live Meter capture independently
checks production ordered-list styling. Read-only DOM checks confirmed nine
gallery links and zero image/video elements inside `.project-app-grid`; nested
markers were decimal/disc/circle/square with expected start values 7/0 and no
horizontal overflow (390px viewport and scroll width).

Live actions checked detail/Back with collection scroll restoration, End/Home
scrolling, portrait resize, Contact chooser selection/deselection and X dismissal.
The keyboard focus outline on the scrollbar in two captures is intentional.
A temporary browser timeout was recovered through the same hidden browser; no
native screen recording was used. No portfolio records were edited or submitted.

For reproduction, copy [list-generate.mjs](list-generate.mjs) into a temporary
directory and run it with the repository root as its first argument. It creates
`index.html`, `fixture.md` and `manifest.json` beside itself. Serve that directory
on loopback; optional `?context=immersive`, `reading` or `studio` selects a wrapper.
[Fixture text](list-fixture.md) and [source manifest](list-manifest.json) identify
the captured input. The temporary server/tab and viewport override were removed.

## Cost and verification

[Post-batching inventory](wallpaper-inventory.json) records five additional
retained wallpaper meshes/material instances: 132 vertices/130 triangles/5,004
array bytes for each Projects monitor and 44 vertices/42 triangles/1,660 bytes
for Contact, totaling **21,676 additional geometry-array bytes**. Only the active
application's wallpaper is visible. This is a mesh inventory, not measured
renderer draws across color/AO/other passes. Geometry matches the original glass
but batching creates separate arrays; it is not retained-array sharing.

The five materials reference one texture. At RGBA8, 1024×768 plus full mipmaps is
nominally **4 MiB texture storage**, with a nominal **3 MiB canvas backing**. These
are source-derived storage estimates, not measured process/GPU memory. There is
no new downloaded image file; the static canvas is prepared once per scene. This
adds preparation/upload/sampling work that was not timed. Removing gallery media
removes those gallery image elements, but no transfer or frame-time saving is
claimed. No camera, Earth, shadow policy or held optimization candidate changes.

- Full suite: **396 passed**, no failures/skips/cancellations (135.7s).
- Typecheck, affected lint, production build and diff checks passed.
- Existing Node deprecation, large-chunk and Vinext route-classification build
  advisories remain. No new build failure.

Independent critic: **95/100**, no unresolved implementation blockers,
recommendation keep. Rubric: fulfillment 25/25, visual/responsive design 29/30,
correctness 24/25, organization 9/10, evidence/performance accounting 8/10. Review
covered final source, matching live/fixture captures, all 12 source hashes,
eight fixture hashes, 14 evidence links and the delivered batching inventory.
The metadata finding and cost-accounting corrections are resolved; final source
did not change after capture. Chromium/finite-fixture scope, untested native
Safari and untimed performance remain limitations. The score does not replace
owner feedback.
