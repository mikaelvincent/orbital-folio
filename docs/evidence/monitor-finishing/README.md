# Contact monitor fit and Projects finishing

Baseline `4a1f715`; Contact implementation `f886e20`, Projects implementation
`242f1e0`. Final implementation inputs are identified in
[source-hashes.json](source-hashes.json); model inventories also archive their
complete source dependency graphs. This is authored design/correctness work, not
an implementation of a held performance candidate.

## Delivered result

- Contact's main and both social monitors now have one seated, rounded frame.
  Concentric circular inner/outer corners keep the visible gasket width constant.
  The glass overlaps the aperture by .002 scene units to cover tessellation seams.
  This replaces two stacked solid boxes with mismatched corner radii; the social
  seal previously overhung its backing. The shell and screen dimensions stay the
  same. Glass moves from Z=.132 to .111, frame spans .089–.115 and app/pick anchors
  move to .116. The main hover rim now fits inside its glass like the social rims.
  Wallpaper and idle surfaces remain exclusive and share the exact glass geometry.
- Projects collections show a category name/icon in the title bar and no bottom
  status bar. Detail retains **Back to projects**/X, shows the original-case project
  name in its status bar, and removes **END OF PROJECT**. The owner explicitly
  withdrew item 3, so Back wording is unchanged.
- All four room monitors use the same category rules and supplied public/preview
  project collection as the gallery, including zero counts and category overlaps.
- Relay, Fieldnotes and Meter now include mixed nested lists under **Design
  principles**. The guarded loopback population updated exactly three known
  untouched published demos, uploaded/published zero assets, and changed zero
  records on a second run. Six shorter stories and all media stay unchanged.
  Edited samples/divergent drafts remain protected by exact fingerprints and
  revision guards. Fresh seeds contain the same text.
- Live review exposed a second Marked task-token shape: tight nested lists placed
  checkbox metadata at block level. Both block and inline metadata are now
  suppressed after the parent renders its checkbox. Intentional bracket text in
  prose/code remains untouched.

## Visual checks

Hidden built-in **Chromium**, live local Three.js. Default 1280×720 CSS viewport
at DPR2; explicit 1470×830 and 390×844 at DPR1. Desktop retained normal lighting/AO;
the existing compact path omits AO. No native Safari, physical touch or mobile
keyboard test was performed. Captures are real viewport images, not scaled
mockups. Resizing has an ordinary settling transition; captures below are settled.

| Evidence | Viewport | Check |
| --- | --- | --- |
| [Before](contact-before.png), [after](contact-after.png) | 1280×720 | Uniform Contact corners; removed social ledges |
| [Pointer hover](contact-social-hover.png), [keyboard focus](contact-social-focus.png) | 1280×720 | Inset amber rim; outer focus outline only for keyboard focus |
| [Contact desktop](contact-desktop.png), [full form](contact-form-desktop.png) | 1470×830 | All three frames; visible keyboard clearance |
| [Contact portrait](contact-portrait.png) | 390×844 | Full glass wallpaper and readable scrolling form |
| [Gallery desktop](projects-gallery-desktop.png), [portrait](projects-gallery-portrait.png) | 1470×830 / 390×844 | Category title bar, no gallery footer |
| [Category counts](projects-counts.png), [Interfaces](projects-interfaces.png) | 1470×830 | Counts 9/5/3/1; three matching Interfaces cards |
| [Nested desktop](relay-nested-desktop.png), [phone](relay-nested-portrait.png), [tasks](relay-tasks-portrait.png) | 1470×830 / 390×844 | Numbered/bulleted three-level hierarchy, one checkbox per task |

Live actions checked Contact selection, both form/chooser framing, keyboard
focus, pointer social highlight, drag/release, portrait resize, Project detail,
Back to collection, X to room and opening Interfaces. Drag screenshots capture
release/settling, not a certificate of every held extreme; finite geometry and
camera tests cover additional poses. No external social link or submission was
sent. Browser error/warning log was empty at review end. The temporary hidden
tab and viewport override were removed; localhost:3000 remains running.

## Structural cost and coverage

[Inventory script](geometry-inventory.mjs) and [raw results](geometry-inventory.json)
compare full models after normal batching with matching public-like fixtures and
inert Canvas2D drawing calls. Source archives preserve geometry/texture allocation
branches and sizes; this is not a browser renderer/draw or allocation measurement.
Contact retained output changes **39→38 meshes**, **70,952→67,300 triangle inputs**,
and **1,738,620→1,800,292 geometry/index-array bytes**: one fewer mesh, 3,652 fewer
triangles, but **61,672 additional array bytes**. Effectively visible Contact
changes by −1 mesh, −3,692 triangles and +60,152 array bytes. Whole-model retained
delta is the same as Contact; Projects geometry/texture inventory is unchanged.
Wide/compact and idle/open Contact have the same deltas. No added texture or image
download; existing wallpaper size/material behavior stays the same. No measured
CPU/GPU, frame-pacing, process-memory, heat or battery improvement is claimed.

Moving the main application anchor slightly changes its close camera target,
though camera-control settings and glass dimensions stay the same. The full
[desktop-mesh coverage audit](earth-coverage.json) checks 66,598 finite poses
across 17 viewports, all rooms/applications, travel and resize samples; 50,893
see Earth. Exact sampled rows 469–1594 fit production rows 384–1920 and retain
the 64-row filtering allowance. Fixed seam clearance is at least 115.3125°.
The broad ±.25-position/5.5° frustum-plane neighborhood extends to row 2090.67
and **does not fit** the crop (south margin −170.67 rows). It is retained as an
inconclusive continuous-coverage certificate, not called a passing guarantee.
Finite samples do not prove every arbitrary aspect ratio or interrupted motion.
The paired [compact-mesh audit](earth-coverage-mobile.json) repeats all 66,598
poses (50,882 visible): exact rows 512–1600 also retain the 64-row allowance,
with seam clearance at least 116.250007°. Its broad neighborhoods reach row
2112 (south margin −192), so the same continuous-certificate limitation applies.
Raw pose results are preserved in both linked audits' gzip files. Earth assets,
geometry and camera controls were not changed by this task.

## Verification and review

- Full suite: **400 passed**, no skips/failures, including 648 finite Contact
  keyboard-clearance poses requiring at least 2 CSS px between app and keys.
- After live review found the tight-task-token issue, the final renderer/content,
  frame and category-count checks passed **19/19**. The full suite preceded that
  isolated renderer branch fix; typecheck and production build were rerun after it.
- Final typecheck, affected lint, production build and diff checks passed.
  Existing Node deprecation, chunk-size and Vinext classification advisories remain.
- Initial corner test used exact UV bounds and encountered Float32 roundoff;
  it now uses a 1e−7 tolerance. New tests also required explicit awaits for lint.
  All corrected checks passed. Tests inspect corner-normal rays, real Canvas2D
  count commands and actual shipped nested Markdown rather than only constants.

Independent critic: **95/100**, recommendation keep, no unresolved implementation
blockers. Rubric: fulfillment 25/25, visual/responsive design 29/30, correctness
24/25, organization 9/10, verification/performance evidence 8/10. Review inspected
final live Contact/Projects captures, all 15 implementation/test hashes, 39 model
inventory source hashes, both coverage hash sets and all 19 evidence links.
The reviewer required explicit separation of passing finite coverage from the
non-certifying broad neighborhoods, confirmed inset pointer hover separately
from the outer keyboard-focus ring, and checked the tight-task correction and
final verification order. These findings are resolved. The score does not
supersede owner feedback; Chromium-only and untimed-performance limits remain.
