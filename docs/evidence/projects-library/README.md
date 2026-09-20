# Projects application and authoring

Baseline: `e940a53c1882519094398a040793bf2b200c74fb`. This is a new feature and
visual baseline, not an optimization experiment. Current implementation sources
are identified by `source-hashes.json`; model/coverage sources are also embedded
in their respective results. Deferred performance candidates remain held.

## Delivered behavior

The four existing monitors open one shared Projects application at the selected
physical screen. Its category/detail changes retain that camera; selecting a
visible different monitor travels to that monitor. Insets on the glass provide
hover feedback. X and exposed current-room pressure walls return to the room.
Other room navigation, bounded hover/drag and spring return remain available.
The previous deployable project clipboard is removed; About/Experience readers
are retained. Portrait frames a readable single-column application on the same
monitor. The Projects-only camera fit permits a closer distance and a 0.08 near
plane through application travel; ordinary views restore their original 0.5.

Studio combines explicit metadata/categories with a flexible Markdown story,
an optional section starter, inline managed media, and landscape/portrait
content previews. Image/video/caption upload, draft privacy, explicit publication,
video byte ranges and ZIP import/export use the existing authenticated content
store. No database migration or owner-content rewrite occurs. See
[operating instructions](../../OPERATIONS.md#authoring-projects) for format and
limits. Existing projects without categories remain in All projects.

## Visual and interaction evidence

Actual browser viewport sizes are recorded below; captures are not downscaled.
Hidden built-in **Chromium**, DPR 1, localhost development server; live Three.js,
Earth and lighting, with AO on desktop/tablet and the existing mobile path without
AO on phone. JPEG encoding is only for evidence size. Native Safari,
real touch hardware and every OS/browser native video control were not tested.

| Capture | Actual viewport | State |
| --- | --- | --- |
| [Desktop gallery](gallery-desktop.jpg) | 1280×800 | All projects, monitor-contained application, persistent scrollbar |
| [Desktop detail](detail-desktop.jpg) | 1280×800 | Relay story, same monitor pose |
| [Phone gallery](gallery-phone.jpg) | 390×844 | Single column; real close-camera fit |
| [Phone detail](detail-phone.jpg) | 390×844 | Readable story and wrapped category controls |
| [Tablet gallery](gallery-tablet.jpg) | 768×1024 | Portrait application framing |
| [Studio preview](studio-preview.jpg) | 1280×800 | Existing story in portrait content-width preview |
| [Reading detail](reading-desktop.jpg) | 1280×800 | Legacy sections/anchors preserved |

Live interaction checks covered all four physical monitors; category changes;
gallery → detail → Back and browser Back; per-view scroll restoration; X and
clicking an exposed pressure wall to close; native
focus at arrival; portrait drag/release; and changing to another exposed monitor
at 2560×720. The same-URL monitor change enters travelling state, disables the
application during flight, then focuses its heading. Internal story navigation
retains `data-travelling=false`. Reading category filters and detail links retain
the reading mode. Contact still opens, selects/deselects its call form, exposes
its scrollbar and closes normally after the shared scrolling extension.

Studio was checked with a temporary **unsaved** form: metadata/category, section
starter, both preview orientations, file selection, alternative text and enabled
upload action. File selection stages the file without uploading it. Discard
resets the editor's staged file state. No browser test published or edited an
owner record. The live local API regression creates and cleans up only its own
records/assets; it covers import/export, privacy, explicit media publication,
range requests and referenced-media protection. Playback itself is covered by
native semantic video/track markup checks, not a real-device codec matrix.

Early desktop captures taken while integration fixtures were briefly present
were discarded. An initial portrait check exposed a too-distant fit and batched
idle content behind the app; both were corrected before these captures. Phone
and tablet captures match the final camera/display code. Subsequent changes to
Markdown definition handling and ZIP bounds do not affect the shown legacy
stories. Initial coverage is explicitly retained as superseded, not relabeled
as current evidence.

## Resource inventory and coverage

[geometry.json](geometry.json) compares source-identified baseline/current models
in an isolated Node/Three fixture with identical installed dependencies, for both
wide and compact layouts. It is a scene-graph inventory: **not actual draw calls,
CPU/GPU timing, process memory or a browser rendering benchmark**. No DOM label
textures are painted in that fixture. Shared geometry storage is deduplicated;
Projects and whole-scene storage totals must not be added.

| Whole model delta (both layouts) | All objects, including hidden | Effectively visible neutral overview |
| --- | ---: | ---: |
| Mesh objects | +30 | +35 |
| Triangle inventory | −4,864 | +544 |
| Unique geometry arrays | −127,232 bytes | +20,672 bytes |

Removing the hidden clipboard reduces retained triangle/array inventory. Four
inset monitor rims, independent display visibility and room/material isolation
increase the visible mesh inventory. These opposing changes do not establish a
render-time saving. No new Earth texture, postprocess or shadow pass is added.
The application adds DOM/CSS, Markdown parsing and author-supplied media costs;
ZIP/YAML work occurs on the authenticated server flow. Videos use native controls
and do not autoplay. Production build output is verified, but total delivery,
decode/upload, steady CPU/GPU timings, frame pacing and process/GPU memory were
**not measured**. No FPS, thermal or battery claim is made.

[coverage.json](coverage.json) and the paired raw gzip files audit **17,680** finite
poses: 17 viewports, all four monitor anchors, both sphere meshes, hover/drag,
room↔monitor and monitor↔monitor envelopes, and orientation/resize samples. All
retain the texture's 64-row filtering allowance: smallest margin **84.594 rows**;
seam clearance at least **115.3125°**. These are exact geometric footprints at
finite sampled poses under documented UI inset assumptions, not a universal proof
for arbitrary dimensions, headers, interruption velocities or resize sequences.
The `coverage-before-monitor-fit*` files preserve the superseded 0.5-fit run.

## Verification and review

- Full suite: **381 passed**, no skipped tests, before final package boundary
  refinements. Initial run had two obsolete expectations (Projects open URL and
  new visible rim triangles); expectations were corrected and focused checks
  passed before the final full run.
- Final targeted package, live API and safe-renderer regressions: **23 passed**, recorded in
  `verification.json`, including source-preserving reference rewrites, hidden
  reference definitions and import/export size boundaries.
- Typecheck, affected-file lint, production build and diff checks pass. Build
  advisories: Node 26 `module.register()` deprecation, Vite chunks above 500 kB,
  and Vinext incomplete static route classification. The build completes; no
  dependency upgrade or unapproved chunking optimization was made.
- Independent critic findings were corrected: media-title portability; literal
  and nested Markdown source preservation; reference definition display; physical
  monitor travel/focus; export/import bounds. Browser review also corrected the
  portrait fit, stale idle display and staged-file discard behavior.

Independent critic: **94/100**, no unresolved blockers; recommendation **keep**.
The rubric, revisions and limitations are recorded in `verification.json`.
