# About notebook — page and section refinements

## Approved changes

The owner requested aligned reading sheets that overlap their paper flags, one
physical turn per crossed page, variable marker count, earlier markers attached
on the left with readable backs, and smaller body text. They subsequently clarified
that markers represent **sections**, bottom arrows turn **pages within a section**,
paper must never scroll, and the editor must preview and reject overfilled pages.
Desktop remains primary; mobile retains the same scaled full spread.

## Result

- Both top leaves are 486×566 logical pixels. Indexed sheets sit immediately below,
  with 30px of each flag tucked under the leaf. A shared center hinge keeps both
  native controls and the physical flags aligned. Resting turned sheets sit beneath
  the left artwork rather than obscuring it.
- One to six markers are distributed down the edge; zero sections has no active
  markers. Separate Earlier/More sections controls reach additional groups. Earlier
  section flags turn left with their boundary leaf and have independently printed
  reverse faces. The current section stays right through all of its own pages.
- Each crossed leaf turns. Short jumps retain 0.36 seconds per leaf; long routes
  share a 2.4-second budget. Retargeting completes the moving leaf continuously,
  then follows the latest destination. Closing/reduced motion settles immediately.
  Idle updates do not repaint notebook textures.
- Native ink uses a fixed 438×428px area, 14px body, 16px subtitle and 17–32px
  headings. CSS columns paginate existing long content without changing its stored
  body. The clip is not scrollable; tables/code/media use the available page width.
  Markdown heading links select their destination page without scrolling the scene.
- The editor adds page selection, Add/Remove page and the identical ink renderer.
  All authored pages are measured after fonts and images settle, including in Write
  mode. Save/Publish reject horizontal pagination overflow or oversized vertical
  blocks. A further server-enforced cap is 1,800 characters per authored page and
  32 pages per section. Page separators in the existing Markdown body survive
  backups; fenced/indented code examples are not interpreted as separators.
- Fit checks use the prospective published section order and published biography
  and media, excluding unrelated drafts. Later biography edits can cause automatic
  reader pagination. Reading view retains the whole section without separator text.

## Verification

The hidden built-in Chromium browser was used at actual 1280×720, 1440×900 and
390×844 CSS viewports. No native Safari or physical-device test was performed.
Main localhost:3000 content was read-only. Authoring/API mutations used a disposable
source checkout on localhost:3003, fresh D1/R2 and fresh test-only secrets; the main
store and private environment files were never copied.

Browser outcomes:

- The original narrow-sheet gap is absent; first and third sections register with
  the paper stack. Third-section markers 01/02 are readable on the left.
- The isolated fixture has seven sections. Six flags fit simultaneously; More
  sections reaches section 07 with one centered flag, and disables at the last group.
- My story has three authored pages. Next changes page 1→2 without changing section
  or moving its flag left. The final page disables Next. A Markdown link jumps from
  page 1→3, with no URL fragment change or document scroll.
- A 1,600-character table fixture flows across three legacy pages; measured column
  width 438, height 428, scrollWidth 1378 and scrollHeight 428. No inner scrollbar.
- Twelve short Markdown headings (577 characters) overflow the available page.
  The editor reports this and disables Save and Publish. Replacing it with two
  shorter authored pages enables saving and publication; the isolated UI workflow
  saved and published successfully. Its second-page preview uses the same typography.
- Page/section navigation, actual marker sides and body/subtitle computed sizes
  were inspected through live DOM state; window scroll remained 0. Leaf-by-leaf
  counts, rapid retargeting, long routes, reduced motion, dynamic marker spacing,
  empty/one/six/seven sections and batched geometry use focused model regressions.

Initial full-suite result: 487/488 passed. The one rejected assertion required the
old paper-edge width; it was updated to the approved wider leaf and now checks
closed shared cuboids plus containment under the paper. Final suite/check details
are recorded under [checks](checks/verification.json). The small final memoization
and delegated-native-link lint corrections are recorded separately from the full
suite source and receive directed checks. No passing result is claimed for an
unperformed test.

## Captures

[Capture dimensions and source identity](visual-verification.json) record the live
browser viewports and unchanged screenshot bytes.

- [First section, 1440×900](desktop-first-section-1440x900.jpg)
- [Turned markers, 1440×900](desktop-left-markers-1440x900.jpg)
- [Turned markers, 1280×720](desktop-left-markers-1280x720.jpg)
- [Page 2 of one section with six flags, 1280×720](section-page-two-1280x720.jpg)
- [Editor overflow and paper preview](studio-overflow-preview.jpg)
- [Editor second-page preview](studio-page-two-preview.jpg)
- [Deferred mobile full spread, 390×844](mobile-full-spread-390x844.jpg)

## Review and limits

[Independent critique](critic.md) records source/design review and corrections.
Earlier findings addressed prospective-published fit, heading-link navigation,
vertical overflow, measurement readiness, symmetric marker overlap and resting
sheet occlusion. The Studio warning contrast was corrected after live inspection.

The [source-identified geometry inventory](geometry-cost.json) compares baseline
`bd09ce3` with this revision using the [retained audit](geometry-cost.mjs). Added
allocations before material batching: 3,204 authored triangles, 86,808 geometry-array
bytes, and nine 768×256 flag canvas textures (6.75 MiB nominal RGBA base level). These
are allocation counts, not measured GPU memory, frame time, heat or battery cost.

[Earth coverage](earth-coverage-summary.json) and its [raw probes](earth-coverage-summary-poses.json.gz)
cover 3,536 finite poses across 17 viewports; 2,723 contain Earth. Actual source rows
512–1707 leave 128px north / 213px south, with 115.3125° geometric seam clearance.
The expanded 0.25-world-unit/5.5° neighborhood reaches the south crop in two extreme
ultrawide cases, so its extra 64-row filtering certificate remains unavailable.
This is finite evidence, not a guarantee for arbitrary camera paths or mip levels.
Earth assets and shared room/overview camera rules were not changed.
