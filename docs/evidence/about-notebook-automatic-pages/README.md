# Notebook — automatic pages and room interaction

The owner requested the existing room-object dim/hover feedback, markers evenly
spaced from the top, a notebook centered on its table and close camera, populated
sections with multiple pages, one Markdown body with automatic pagination, no
Back to About button, and no pagination for a one-page section.

## Result

- The actual notebook paper, cover, flags and clips now participate in shared
  object feedback: 0.65 brightness at rest, 1.15 when hovered/focused, and normal
  brightness in the open reader. The old empty-anchor registration had no materials
  to dim. Desk and surrounding furniture keep their own materials.
- Notebook, cradle feet and table share their horizontal center. The close camera
  remains horizontally centered on the spread, with its existing vertical space
  reserved for navigation controls. At 1440×900 the neutral projected paper center
  is (720, 423.85), near the usable-area center (720, 426). These are CPU projection
  measurements, distinct from screenshots affected by ordinary room hover.
- Markers start at logical y=45 with an 84px pitch: 56px marker plus 28px gap.
  A lone marker starts at the same top position. Six fit at once; further groups
  remain reachable. Earlier markers still turn left and show readable backs.
- Each section is one Markdown body. Fixed 438×428px columns paginate it
  automatically, without paper scrollbars. The editor has one Markdown input and
  an identical paper preview with automatic page navigation. The old manual page
  controls, 1,800-character page cap, 32-page cap and fit-based Save/Publish gates
  are removed; the existing 100,000-character whole-body guard remains.
- Legacy standalone page-break comments become paragraph breaks without discarding
  text or changing fenced/indented examples. Ordinary and canonical Markdown heading
  anchors select the containing page without fragment-scrolling the scene. Long
  titles wrap inside paper; long Studio list titles wrap inside their buttons.
- There is no Back to About button on the paper. Escape and exposed-wall dismissal
  remain, including focus return. A one-page section has no footer pagination in
  the public reader or editor preview.
- Five sections are populated locally with ordinary Markdown: My story, How I work,
  Learning notes, Design details and Beyond the screen. Their live measured page
  counts are 3, 4, 4, 4 and 3. The guarded refresh updated three exact untouched
  samples and added two missing examples; all 35 unrelated records, including
  identity, remained unchanged. A repeat invocation changed nothing. See the
  [content refresh record](content-refresh.json).

## Verification

Browser checks used the hidden built-in Chromium browser at actual 1280×720,
1440×900 and 390×844 CSS viewports. Native Safari and physical mobile devices were
not tested. Mobile intentionally keeps the same very small full spread.
[Visual metadata](visual-verification.json) records source/capture identity and
actual image dimensions. These are live scene renders, not standalone mockups.

Main localhost:3000 was read-only apart from the explicitly requested, guarded
sample population. Authoring stress tests used a fresh isolated source checkout
and D1/R2 store on localhost:3003. No owner database, uploads or private environment
files were copied. Full API/workflow tests use that isolated checkout and explicit
`TEST_BASE_URL`; [check results and logs](checks/verification.json) identify their
source and final verification outcomes.
The full suite passed **499/499**, with no failures or skipped tests. Typecheck,
production build, affected lint and formatting also passed on the same application
source. Only the current-context documentation changed after that source freeze.

Live browser outcomes:

- Bottom arrows stay within a section; multiple sections retain their own page
  counts. Page 2 of My story keeps its marker right. Design details leaves the
  first three markers on the left at the same fixed top spacing.
- A 130-character unbroken title, long heading/token, 70 code lines and a dense
  table flow through 16 pages. The column height remains 428px. Saving and
  publishing succeed. A normal `#final-note` link reaches page 16, disables Next,
  and leaves the URL fragment unchanged. This check found and fixed the earlier
  notebook heading-alias issue before the full-suite source was frozen.
- A loaded image followed by a long italic caption spans six pages; the last
  paragraph remains reachable and column height stays 428px. Image loading and
  font readiness are included in measurement.
- A short section has one page and no pagination in both Studio and the public
  notebook. Its screenshot was captured after global page 31 settled at target 31,
  with no active turn; an earlier in-motion capture was replaced.
- A seventh section appears alone at y=45 in its marker group. Long titles remain
  contained in both paper and the Studio record list.
- Escape returns to About and focuses Read notebook. Document scroll remains zero.
  Live keyboard focus visibly brightens the whole notebook; model regressions
  separately exercise hovered, inactive and open-reader brightness/material state.

[Independent review](critic.md) assesses source, design and matching evidence.
The room idle/focus images demonstrate the feedback qualitatively; their camera
poses differ, so they are not matched pixel or performance comparisons.

## Captures

- [First page, 1440×900](desktop-first-page-1440x900.jpg)
- [Turned markers, 1440×900](desktop-left-markers-1440x900.jpg)
- [Turned markers, 1280×720](desktop-left-markers-1280x720.jpg)
- [Automatic page 2, 1280×720](desktop-page-two-1280x720.jpg)
- [Dim notebook in the room](room-idle-1280x720.jpg)
- [Bright notebook with keyboard focus](room-focused-1280x720.jpg)
- [Studio media preview](studio-automatic-media-1280x720.jpg)
- [Final page of the Markdown stress case](studio-stress-final-page-1280x720.jpg)
- [One-page reader without pagination](reader-single-page-1280x720.jpg)
- [Deferred mobile full spread](mobile-full-spread-390x844.jpg)

## Framing and cost limits

[Framing checks](framing-check.json) cover table registration, marker spacing and
neutral camera centering. [Earth coverage](earth-coverage-summary.json) and
[raw probes](earth-coverage-summary-poses.json.gz) retain 3,536 finite poses across
17 viewports, 2,723 containing Earth. Actual source rows 512–1707 leave 128px north
and 213px south, with 115.3125° geometric seam clearance. The expanded neighborhood
reaches the south crop in two extreme ultrawide cases, so its extra 64-row filtering
certificate remains unavailable. This is finite evidence, not universal coverage.

The [model inventory](geometry-cost.json), compared with `44ade77` after real
material batching, adds no triangles or textures. Registering notebook materials
separately changes batching: +6 visible meshes, +7 net materials, +5 geometries and
2,016 geometry-array bytes in both layouts. Visible meshes are potential submissions,
not measured GPU draw calls; these are neither timing nor GPU-memory measurements.
No heat, battery or universal browser-performance improvement is claimed.
