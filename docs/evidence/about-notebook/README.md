# Mounted About notebook — September 22, 2026

## Approved scope

Implement the actual retained notebook as the About reader, with camera approach,
left artwork and right-page Markdown. Physical colored markers select chapters.
Desktop takes priority. The owner explicitly requested the identical full spread
on phones for now, even when small; dedicated mobile layout is deferred. No content
records, private media, authentication or publication settings on the main server
were changed.

## Implementation

- The fixed paper/flag anchors use the shared viewport-relative projection used
  by the screen applications. Native content is transparent ink over physical paper.
- The legacy deployable reader and its unused UI styles were removed. The book,
  cradle, desk, clips, left artwork and room/overview framing stay in place.
- The full spread plus three flags fits the close camera. Every authored chapter
  is accessible via markers and previous/next controls; marker windows advance in
  groups of three. Chapter selection and each page's scroll survive closing in the
  current visit. Empty journals show the editable introduction with passive flags.
- A 0.44-second physical leaf turn hides native body ink until the turn finishes.
  Reduced motion cancels the leaf immediately. The transient leaf is 192 triangles
  and adds a 512×640 paper texture (nominal RGBA base level 1.25 MiB, not measured
  GPU memory). The opening hover rim adds 136 triangles. Existing page/flag textures repaint in place. No frame-time, battery
  or thermal performance improvement is claimed.
- Journal Write/Preview and media insertion reuse the safe shared Markdown path.
  Journal-only soft breaks preserve legacy prose. Headings get distinct chapter
  anchors in semantic Reading view. Raw HTML is escaped, unsafe URLs rejected,
  and publication protects image/video/poster/caption dependencies.

## Verification scope

Hidden built-in Chromium, actual CSS viewports (not scaled mockups). Live WebGL
includes production scene materials, shadows, desktop AO and the ordinary orbital
background. Desktop primary view: 1440×900; smaller desktop: 1280×720. Phone:
390×844, same full spread, intentionally small. No native Safari or device testing.
Main-server checks were read-only. [Visual outcome record](visual-verification.json)
identifies the final source and actual capture dimensions. Any authored test content and API mutations ran
only in a disposable source checkout with fresh D1/R2, test-only secrets and a
separate loopback server. The source before the final UI refinements passed **479/479 tests**, with no
failures or skips. The later readiness/fixed-viewport corrections and dead-style
cleanup are four explicitly recorded UI files; final typecheck, build, affected
lint, CSS formatting and targeted live browser checks passed. The initial rejected
run (472/475) is preserved: two fresh-owner setup failures and one superseded
reader-deployment assertion were corrected before the complete passing run. See
[check metadata](checks/verification.json), [passing suite](checks/full-tests-final.log),
[final source hashes](checks/final-source-hashes.json), and [UI follow-ups](checks/post-suite-source-change.json).
The fixture Vite file differs solely to keep its cache local; both hashes and that
expected exception are recorded. No fixture environment/state was committed.

Live browser outcomes:

- Back to About, Escape and exposed-wall return restored focus to Read notebook.
  Browser Back reopened the chosen chapter. Opening focused its heading.
- Chapter switching restored a 263px scroll position. Closing/reopening restored
  that same position after the projection became visible.
- A five-chapter fixture advanced to markers 04/05; the final page disabled Next.
  Native scrolling moved only the right paper (window scroll 0, ship top 0).
- Markdown nested lists, emphasis, links and soft breaks were visible; a managed
  480×280 PNG loaded on paper. Reading view rendered five Markdown articles with
  no duplicate IDs. Studio Write/Preview exposed the same rendered content/media.
- An empty-journal fixture retained the biography and invitation, with no active
  marker controls and both page buttons disabled.
- Contact, Projects and Case studies still opened on their existing physical
  screens with no scene error or document scroll.
- Pure geometry/state tests cover actual batched anchors, finite responsive camera
  corners and bounded camera angles, turn completion/reversal and reduced-motion
  cancellation. Browser reduced-motion emulation was not performed.

Final captures:

- [About room, 1440×900](room-1440x900.png)
- [Desktop spread, 1440×900](desktop-1440x900.png)
- [Small desktop Markdown and extra chapters, 1280×720](markdown-chapter-1280x720.png)
- [Native scroll and managed PNG, 1280×720](markdown-media-1280x720.png)
- [Journal Studio preview, 1280×720](studio-preview-1280x720.png)
- [Empty notebook, 1280×720](empty-notebook-1280x720.png)
- [Unchanged full-spread phone layout, 390×844](mobile-390x844.png)

[Rejected native-focus offset](rejected-focus-offset-1280x720.png) records the
smaller-desktop bug before the fixed-scene rule; it is not final design evidence.

## Independent review and revisions

Initial critic: 87/100. The critic praised the mounted-object composition and
identified two concrete issues: closing focus went to main instead of the notebook,
and shared Markdown collapsed legacy single line breaks. Both were corrected:
Back/Escape/wall/history closure restores the opening control, arrival focuses the
chapter heading, and notebook/Reading-view/Studio journal previews preserve soft
breaks without changing Project or Case study formatting. The camera margin was
also increased from 1.08 to 1.2 after corner checks found dock overlap at bounded
camera angles on wide desktop views. Final independent review: **94/100, no unresolved application blockers**;
[rubric and scope](critic.md). A later long-content check also exposed document
scroll caused by native focus at 1280×720. The notebook now uses the same fixed
scene-viewport rule as the existing screen applications. Reopening restoration
waits for arrival, when native scroll dimensions exist. Final screenshots and
source-hash records were refreshed after these changes.

## Earth coverage limits

The new About-only audit uses production camera fitting, bounded input, room/book
travel probes and viewport orientation transitions. Source-identified raw evidence
is retained as [compressed raw coverage](earth-coverage.json.gz) and a
[readable summary](earth-coverage-summary.json). The final 3,536 probes span 17
viewports; 2,723 contain visible Earth. The sampled original rows are 512–1707,
with 128px north and 213px south margins and 115.31° geometric seam clearance. Actual finite probes show no texture-edge or geometric
UV-seam exposure. The additional conservative 0.25-world-unit / 5.5° pose neighborhood
reaches the crop's south boundary in eight extreme ultrawide travel cases; therefore
its extra 64-source-row filtering-margin certificate is not established. This is
not evidence of a visible seam in tested states, nor proof for arbitrary viewports,
interrupted spring trajectories or every mip level. Earth assets are unchanged.

## Cleanup

Task-created browser tabs were closed and the temporary viewport override reset.
The isolated port 3003 server was stopped and its disposable source/state removed
after copying the evidence. The main server at localhost:3000 remains accessible
(HTTP 200), with its existing store preserved.
