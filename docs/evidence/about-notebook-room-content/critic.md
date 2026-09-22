# Independent review — real notebook content in the room

Reviewer: `/root/notebook_flow_review`, 22 September 2026. The reviewer inspected
the final application diff, supplied screenshots and browser observations, current
documentation and isolated verification records. Only this review file was edited.

## Result

**95/100, accepted with no unresolved application, visual or verification
blockers identified.** The real notebook content remains on the object as the
camera opens and closes the reading view. This score does not override subsequent
owner feedback or certify checks that were not performed.

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Physical design and visual cohesion | 38/40 | The real first page is visibly registered to the existing paper in the room and during both zoom directions. The retained artwork, flags, cradle and lighting remain coherent, without a replacement panel or placeholder. |
| Requested continuity and interaction | 29/30 | The same Markdown DOM survives opening, closing and reopening. Later-page selection persists. Room content is passive while the physical notebook remains the entry target. |
| Correctness and accessibility | 14/15 | Focus waits for interactive arrival; the preview is inert, accessibility-hidden and click-through. Native ink is hidden on cross-room departure, and Contact restores ordinary surface styling and input. |
| Verification and evidence | 9/10 | Live desktop/portrait samples, actual DOM identity observations, direct entry and shared-surface checks support the change. Full isolated checks pass. Safari, physical touch and live reduced-motion overrides remain untested. |
| Maintainability and cost disclosure | 5/5 | The obsolete standby drawing/repaint path is removed. Visibility is separate from reader activation; marker repainting is idempotent. Earlier Markdown/media loading and CSS filtering are disclosed without invented timing gains. |

## Reviewed behavior and visuals

- [Room first page](room-first-page.jpg), [opening](opening.jpg),
  [reader](reader-first-page.jpg) and [closing](closing.jpg) show My story on the
  same right paper through the camera movement. The sampled page does not switch
  to the former How I work drawing. Its heading, paragraph layout and pagination
  remain consistent with the final close view.
- [Continuity observations](continuity.json) retain the actual `.notebook-columns`
  node and report unchanged identity/text during opening and closing. Twelve
  closing samples keep the surface displayed while inert and accessibility-hidden.
  Closing returns focus to Read notebook; Tab then reaches Overview, skipping the
  passive paper and flags.
- [The later-page room image](room-later-page.jpg) retains Learning notes, page 2
  of 4. The observations retain absolute page 8 on closing and section-local page
  index 1 across reopening, with the same connected DOM node. This preserves the
  established keep-your-place behavior instead of resetting an already-read book.
- [Room state](room-state.json) records all five measured section counts before
  reader entry, `brightness(0.65)`, inert/hidden preview content and no pointer
  handling on the article or page. Source inspection confirms descendant pointer
  input is also suppressed and the focus effect waits for interactive arrival.
- [Departure observations](leave-about.json) transition from the old room state
  to no native notebook node and a hidden surface. The [Contact check](contact-surface.json)
  then records visible, interactive content, `filter: none` and no notebook node.
  The notebook filter is scoped to its data attribute rather than inherited by
  another room's application.
- [Direct-entry metadata](direct-entry.json) confirms `/about?open=1` reaches the
  real first Markdown content. The runtime intentionally keeps native ink hidden
  during overview/cross-room entry until arrival, because HTML cannot be occluded
  by the WebGL walls.
- [Portrait reader](portrait-reader.jpg) and [portrait observations](portrait.json)
  retain the same node/text and the 438×428 logical ink area. The full spread is
  deliberately small under the approved deferred mobile scope; no mobile redesign
  is claimed.

The source preserves one AboutNotebook component/container across same-room zooms.
`setInkMounted` controls duplicate physical labels independently of reader
activation, while moving markers retain physical printing. The right paper stays
blank beneath the native ink; changing activation or chapter no longer repaints a
standby drawing. The focused model assertions cover these handoffs and repeated
mount-state calls. No corrective application changes were required by this review.

## Verification and cost

The reviewer inspected the retained [verification manifest](checks/verification.json)
and raw full-suite summary: **503/503 tests pass**, with zero failures,
cancellations or skips, in 353,542.243042 ms. Typecheck, affected lint, formatting
and production build also pass. These are inspected implementing-agent runs, not
a claim that the critic reran them.

The checks ran from a disposable source checkout with fresh isolated D1/R2,
test-only secrets and an explicit loopback port 3003. No main database/uploads or
private environment was copied. Cleanup records confirm the temporary server and
state were removed, while the main `/about` continued returning HTTP 200.
The 440-file source manifest preserves application/test identity; the only
post-check changes are the documented Project Context and performance-ledger
updates. The critic independently matched all 440 refreshed final hashes to the
current source, with no mismatch.

By source inspection, this change adds no geometry, material or texture asset.
It moves Markdown mounting, pagination measurement and potential media loading
earlier, into room entry, and adds a scoped brightness filter. Those browser costs
have not been timed. Neither removal of the standby repaint nor DOM continuity
establishes a frame-rate, GPU-time, process-memory, heat or battery improvement.
The ledger states these limits and leaves held optimization candidates unchanged.

## Limits

The implementing agent used hidden built-in Chromium with ordinary live lighting
and postprocessing. Desktop evidence uses an actual 1440×1000 viewport at DPR 2;
portrait uses an actual 390×844 viewport at DPR 1. Screenshots have viewport pixel
dimensions, not drawing-buffer dimensions. The reviewer inspected source and
artifacts without independently controlling a browser.

Native Safari, physical touch and live reduced-motion behavior were not tested.
Model tests cover reduced-motion settling. The semantic About Reading view and
empty browser warning/error logs are reported by the implementing agent. Focus
and inert-state observations support the interaction review, but are not a full
assistive-technology audit. Motion screenshots and sampled continuity records do
not establish every-frame visibility or performance across all camera states.
