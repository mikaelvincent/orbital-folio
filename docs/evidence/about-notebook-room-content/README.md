# Real notebook content in the About room

22 September 2026. Baseline: `adca7f6`.

The room now shows the real first Markdown page, with the same measured pagination
and native DOM retained through the camera zoom. The hardcoded right-page artwork
and its activation repaint are removed. Existing page selection remains visible
after closing and reopening. This preserves the earlier keep-your-place behavior.

## Implementation

- Mount the About notebook portal in room view as well as reading view, retaining
  the same component/container across the transition.
- Keep room preview controls inert, hidden from accessibility navigation and
  click-through. The physical notebook remains the entry target. Focus enters the
  page only when the reader has arrived and returns to Read notebook on closing.
- Apply the physical notebook's shared brightness to native ink. Suppress duplicate
  physical marker labels while native labels are visible; preserve the moving
  leaf's printed marker and restore physical labels when native ink is hidden.
- Keep native ink visible during same-room zooms. Hide it during overview/cross-room
  entry until arrival because HTML cannot be depth-occluded by the WebGL walls.

No camera framing, geometry, material or texture asset was added. This is a source
inspection statement, not a timing or memory measurement. Markdown, measurement
DOM and authored media can now load earlier, when entering About. The added CSS
brightness filter and earlier browser work have not been timed.

## Live browser evidence

Hidden built-in **Chromium**, main development server, live rendering and current
published sample content. No content or authentication writes were performed.
Desktop viewport was **1440×1000 at DPR 2**; portrait was **390×844 at DPR 1**.
AX screenshots are captured at viewport resolution, not drawing-buffer resolution.
The app's ordinary lighting/postprocessing ran; no finite scene fixture or disabled
effect was used for these captures. Physical touch and native Safari were not tested.

| State | Evidence |
| --- | --- |
| Initial room: real My story page and measured 3/4/4/4/3 section counts | [Room](room-first-page.jpg), [metadata](room-state.json) |
| Camera zoom keeps the same page visible | [Opening](opening.jpg), [reader](reader-first-page.jpg), [closing](closing.jpg) |
| Later section/page remains on the object after closing | [Learning notes, page 2 of 4](room-later-page.jpg) |
| Direct `/about?open=1` settles on the first real page | [Reader](direct-entry.jpg), [metadata](direct-entry.json) |
| Portrait retains the approved scaled desktop implementation | [Room](portrait-room.jpg), [reader](portrait-reader.jpg), [continuity](portrait.json) |

[Continuity observations](continuity.json) retain actual DOM references across
real UI actions and compare object identity and text. The original
`.notebook-columns` node remains connected and identical through opening, closing
and later-page reopening; its display remains visible throughout the sampled
same-room zoom frames. Room controls have `inert` and `aria-hidden="true"`;
the actual accessibility tree excludes notebook contents. Tab from Read notebook
moves to Overview, skipping the passive page and markers. Escape returns focus
to Read notebook. These are read-only DOM observations, not injected app state.

[Departure samples](leave-about.json) show the notebook removed from the native
surface when leaving for Contact. [Contact surface metadata](contact-surface.json)
confirms its normal filter and interactivity after opening the computer. The
semantic About Reading view was also checked and still exposes the full Markdown
sections and links. Browser warning/error logs were empty after desktop, direct
entry, portrait and semantic-view checks.

Reduced-motion settling is covered by model tests; no live OS reduced-motion
override was available in this browser session. Screenshots sample motion states;
they are not frame-by-frame capture or evidence of a performance improvement.

## Verification and source identity

**503/503 tests passed**, plus typecheck, affected lint/format and production build.
API/workflow tests ran in a disposable source checkout against isolated loopback
port 3003, with fresh D1/R2 state and test-only secrets. No main database, uploads
or private environment file was copied. The main server remained healthy on 3000.

[Verification summary](checks/verification.json) links the full test/build logs,
commands and source hashes. Application/test files did not change after the checked
snapshot or visual captures; documentation-only differences are recorded separately.
New model assertions cover blank paper, stable right-paper texture version across
activation/chapter changes, idempotent ink mounting and physical label restoration.
Build notices are recorded in the summary; none failed the build. Terminal padding
and empty final lines were trimmed from logs; their messages and results are unchanged.

The [independent review](critic.md) records the final rubric, findings and limitations.
