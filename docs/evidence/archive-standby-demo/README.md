# Content-aware standby and demo case studies — 22 September 2026

Baseline `53dd907fa74316ae6816ef28654f658dedf5633b`. The owner requested
wallpaper on enabled Contact screens, passive standby on disabled screens,
dark/inert empty archive categories, a rack ending below its fourth cartridge,
and varied demo studies including a complete Markdown/media example.

## Result

Contact's main screen and configured social channels reuse the existing folded
wallpaper. Missing social destinations show plain dark **STANDBY**, with no link,
hover rim or keyboard target. Both social slots use the same rule.

Case studies now derives availability from published collection counts at
construction and content updates. Empty categories retain dark graphite hardware
and pale labels; All is also inert when the entire archive is empty. Populated
cartridges keep their cream faces. Existing dim-idle, hover brightness and travel
continuity remain. Reading view still offers its five filters and honest empty
states. The bottom rack crossmember/backplane, perforations, splice plates and
cable attachments move up one row; the terminal, camera fit and floor supports
stay in place.

The local population tool updated three exact untouched legacy samples, created
three stories and reused eight byte-verified public media assets. No uploads were
needed. All **28 unrelated records** had identical before/after hashes; private
record data and those individual hashes are not included here. A second apply
performed **zero writes**. Fresh seeds use the same story text; the explicit
population tool supplies managed media without resetting the database.

| Collection | Published stories |
| --- | ---: |
| All | 6 |
| Product engineering | 3 |
| Systems & reliability | 2 |
| Design & interfaces | 1 |
| Research & experiments | 0 — disabled cartridge |

**Building the whole product** exercises the shared renderer: headings through
level six, emphasis, strike-through, inline/fenced code, tables, quotations,
nested ordered/unordered/task lists, continued numbering, rules, hard breaks,
reference/inline links, still images, native video with poster/captions, and a
finite GIF. The remaining fictional stories vary in length. Relay is unchanged.
The guarded tool preserves owner edits, divergent drafts, unpublished records
and ID/slug collisions; a completed rerun is a no-op.

## Verification

The isolated full suite passed **443/443**, with no failures or skips. Typecheck
and affected lint pass. The final Contact test mock received a lint-only adjustment
during the run and was explicitly rerun afterward (**6/6**); code/test source hashes
match the fixture. Availability/material transitions, invalid categories,
physical standby, shelf attachment, sample preservation and actual renderer
output have targeted regression coverage. The existing travel-brightness tests
also pass. A final whitespace cleanup spells the Markdown hard-break spaces as
JavaScript hexadecimal escapes; [before/after sample hashes](hard-break-equivalence.json)
prove identical emitted content. All [six demo-content tests](content-final-tests.log)
and [affected lint](content-final-lint.log) pass afterward. The full suite/build
precede only that equivalent literal spelling; both source hashes are retained.

Checks used a disposable source-only checkout at `localhost:3003`, fresh D1/R2
state and test-only secrets, separate Vite cache, and explicit `TEST_BASE_URL`.
The full suite never targeted the main development store. After it finished,
the fixture's GitHub link and six stories were unpublished for disabled-state
browser checks. The main store's links were preserved.

- [Full suite](full-tests.log), [Contact final rerun](contact-focused-tests.log),
  [archive regressions](archive-focused-tests.log), [brightness regressions](feedback-focused-tests.log)
- [Typecheck](typecheck.log), [affected lint](lint.log), [production build](build.log)
- [Source and isolated-check record](verification.json)
- [Population plan](population-plan.json), [apply](population-apply.log),
  [second apply](population-rerun.log), [published-content checks](population-verification.json)

Production build passes with non-blocking Node registration deprecation,
bundle-size and Vinext `/experience` route-classification notices. The temporary
browser tab, verification server and fresh state were removed; the main server
remains available at `localhost:3000` (HTTP 200). Independent critic: **96/100**,
approved with no unresolved blockers; [rubric and limitations](review.json).

## Live visual checks

Hidden built-in **Chromium**, live WebGL scenes and actual CSS viewports: desktop
1280 × 720 and portrait 390 × 844. Original JPEG captures are unscaled. Initial
desktop captures use runtime DPR 2; portrait uses DPR 1 / 390 × 844 drawing buffer
with contact shading disabled by the existing compact policy. After returning
to desktop, fixture captures use DPR 1 / 1280 × 720 with contact shading enabled.
These are visual checks, not comparable performance measurements.

| State | Capture |
| --- | --- |
| Available Contact wallpaper | [Desktop](contact-wallpaper.jpg) |
| Missing GitHub; LinkedIn available | [Desktop fixture](contact-missing-github-desktop.jpg) |
| Populated rack; Research disabled | [Desktop](archive-populated-desktop.jpg), [portrait](archive-populated-portrait.jpg) |
| Entire archive empty | [Desktop fixture](archive-empty-desktop.jpg) |
| Product collection — three entries | [Monitor library](product-library-desktop.jpg) |
| Rich story | [Opening](case-story-top-desktop.jpg), [nested lists/tasks/code](case-story-lists-desktop.jpg), [table](case-story-table-desktop.jpg) |
| Native media | [Media introduction/poster](case-story-media-desktop.jpg), [video controls](case-story-video-desktop.jpg) |
| Responsive story | [Portrait monitor](case-story-monitor-portrait.jpg), [desktop Reading view](case-story-reading-desktop.jpg), [portrait Reading view](case-story-reading-portrait.jpg) |

Native pointer clicks on the disabled Research cartridge, missing social screen
and empty All terminal left the room/URL unchanged and opened no application.
Unavailable native controls are absent. Back from the rich story restored Product
with its three links. Portrait Reading/monitor views have no document overflow.
The native video played to its four-second end with readyState 4 and no error.
Poster/caption/source markup is retained in the browser/renderer checks. The
initial story DOM snapshot precedes lazy loading of below-fold still/GIF images;
it is not a final image-download assertion. Native caption selection and the
GIF's complete two-cycle playback were not separately exercised.

[Browser checks](browser-checks.json) preserve observed state. The captured
[warning/error console](browser-console.json) is empty. The initially mislabeled
table screenshot was replaced after confirming scroll position; the retained
image shows the actual table. After capture, only the equivalent hard-break
literal spelling described above changed in production source.
Native Safari, physical touch, live OS reduced-motion and native pointer-hover
movement were not tested; material/hover regressions cover the shared feedback.
No CPU/GPU timing, memory, heat or battery improvement is claimed. Held performance
candidates remain held.
