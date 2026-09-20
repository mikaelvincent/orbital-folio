# Projects demo content and monitor fit

Baseline: `9efe05c6b59b25a3808b2dd0feca34d4314ec1ca`. This follow-up responds to
empty demo categories, redundant in-application category navigation and apparent
monitor overlap. It is feature/design work, not a performance optimization.
Final sources/assets are identified in [source-hashes.json](source-hashes.json).

## Delivered changes

- Nine known untouched local sample projects now have rich Markdown and managed
  media: Systems **5**, Interfaces **3**, Experiments **1**. The local-only updater
  checks exact known content, publication/draft equality and current revisions;
  owner edits are preserved. Reapplying is a no-op. Fresh seeds have categories
  and text without dangling media; actual media population is explicit.
- Physical monitors select categories. The immersive window has no category
  switcher; detail Back restores its collection and scroll. Reading view keeps
  filters because it has no physical monitors.
- The application plane now matches the actual glass at local Z `.111`. Its
  landscape rectangle is `.95 × .51`, inside the `.97 × .53` hover-rim opening,
  with `.01` additional clearance per edge. Portrait text retains its logical
  pixel sizing as the camera fits the smaller physical surface.
- Covers show complete images in a contained 8:5 area capped at 180 logical
  pixels, keeping real card titles visible. Narrow tables keep words intact and
  scroll horizontally in a named, keyboard-focusable region.

The old rectangle entered the feedback-rim footprint and left too little visual
clearance from the upper shadow/reveal. Baseline CPU rays did not demonstrate
opaque-bezel occlusion; this is not presented as a proven opaque-geometry defect.
The HTML layer remains composited over WebGL, not depth-tested DOM.

## Visual and interaction evidence

Hidden built-in **Chromium**, DPR 1, existing localhost development server. Live
Three.js scene, Earth and normal lighting; desktop/tablet use AO, the existing
phone path omits it. These are not native Safari or real-touch tests.

| Capture | CSS viewport | Notes |
| --- | --- | --- |
| [Before tall view](before-tall.jpg) | 990×1298 | Baseline, old controls/content; image is the top 990×1187 pixels |
| [After tall view](after-tall.jpg) | 990×1298 | Final source; same capture limitation, no rescaling |
| [Desktop collection](gallery-desktop.jpg) | 1280×800 | All nine projects; complete covers and real card titles |
| [Phone collection](gallery-phone.jpg) | 390×844 | Experiments, one project, native vertical scrolling |
| [Tablet collection](gallery-tablet.jpg) | 768×1024 | Complete shorter collection, no unnecessary scrollbar |
| [Desktop Markdown](markdown-desktop.jpg) | 1280×800 | Fenced code in the project story |
| [Phone table](table-phone.jpg) | 390×844 | Final word-preserving, horizontally scrollable table |
| [Video](video-desktop.jpg) | 1280×800 | Native player after actual playback to four seconds |
| [GIF](gif-desktop.jpg) | 1280×800 | Final served image decoded at 320×180 |
| [Reading collection](reading-desktop.jpg) | 1280×800 | Interfaces filter contains three projects |

The 990×1298 live canvas and browser viewport were verified at those actual
dimensions. Its application bounds were approximately x 223.251, y 76.208,
width 543.499, height 1129.585 CSS pixels, inside the viewport. The ordinary browser
capture returns only its top 1187 rows. Full-page and clip captures incorrectly
produced a half-scale scene with blank space and duplicated UI; they are retained
as [rejected full-page](rejected-full-page-capture.jpg) and
[rejected clip](rejected-clip-capture.jpg), not treated as application evidence.
Before/after content and pointer positions differ; these are design checks, not
pixel-diff or performance comparisons.

Live checks covered all three physical category monitors and their 5/3/1 counts,
All projects on reload, detail/Back within Systems, X closing, resize while open,
persistent vertical scrolling, reading-mode filtering and return to the scene.
Phone gallery/detail panes had equal client/scroll widths (332px), avoiding
whole-window horizontal overflow. The final table alone has 405px content inside
291px; ArrowRight moved its scrollLeft to 33.5px after focus. Video was explicitly
started, displayed captions, reached duration 4s and ended with readyState 4,
640×360 dimensions and no media error. All three Relay images decoded successfully.

## Assets, coverage and cost

The twelve checked-in demo assets total **206,539 bytes**: nine WebP covers
143,808 B, MP4 48,567 B, GIF 13,917 B and WebVTT 247 B. Their hashes/provenance are in
the [media manifest](../../../scripts/assets/project-demos/manifest.json).
These are managed-media inventory bytes, **not** measured initial-page download,
decode time, GPU/process memory or frame cost. Images are lazy loaded and video
requires play; native decoding, image uploads and animated media still have costs.
The GIF has 24 frames at 80ms and two total iterations (3.84s), then stops.

No mesh, material, shadow or postprocess pass was added by the fit adjustment.
Different framing and new DOM/media may change rendering cost; no CPU/GPU, FPS,
heat or battery improvement is claimed. Held ledger candidates remain held.

[Clearance audit](clearance.json): 1,440 finite rays against real batched monitor
geometry across four monitors, five viewports and nine hover/drag angle pairs;
zero blocked rays, with portrait readability/near-plane checks retained.
[Earth coverage](coverage.json): 17,680 finite poses, 17 viewports, four monitor
anchors and both sphere meshes. All retain the 64-row crop allowance (minimum
84.594 rows) and at least 115.3125° seam clearance. Aggregate extrema match the
recorded Entry 34 audit; that prior baseline was not freshly rerun. Raw compressed
pose data is retained beside the summary. These are finite CPU checks, not proof
of every interrupted transition, browser zoom, safe area or GPU rendering result.

## Verification and critic

- Full suite: **390 passed**, no failures/skips.
- Final camera/renderer regression run: **13 passed**. After the table refinement,
  renderer tests were rerun: **8 passed**. Backend/package/editor/demo checks:
  **22 passed**.
- Typecheck, affected lint, production build and diff checks passed. Existing
  Node deprecation, large-chunk and Vinext static-classification advisories remain.
- Local population dry run reports nine unchanged projects, no skipped records
  and no missing assets. An applied rerun performs no updates/publications/uploads.
- Generator success/failure cleanup was checked in an isolated output directory.
  MP4 is encoded temporarily and only the finished file is copied; encoder
  sidecars do not enter the asset folder.

Review fixes included incorrect initial GIF timing, a skipped helper assertion,
cropped cover titles, over-tall desktop covers, cramped table words, and rejection
of malformed browser captures. Affected test files now explicitly await their
test calls for lint. The table's explained lint exemption preserves native
keyboard scrolling, matching existing scrollable readers.

Independent critic: **95/100**, no unresolved findings. Rubric: fulfillment 25/25,
visual/responsive design 28/30, correctness/content safety 24/25, organization 9/10,
evidence/performance honesty 9/10. Recommendation: keep. Limits include the actual
Chromium engine, cropped tall capture, finite coverage and absence of steady
CPU/GPU timing or cross-device video codec testing. No score substitutes for the
owner's visual judgment.
