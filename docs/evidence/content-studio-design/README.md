# Content studio interface — Stage 14

25 September 2026. Baseline: `496e91b55288792adf9abe1e9b6b7884965202ea`.

## Result and design direction

The studio now uses a clearer ivory authoring surface inside a carbon frame,
with bronze selection accents. The baseline's nearly invisible dividers,
competing action row and long mobile record grid made editing harder to scan.
This pass improves those relationships without changing the content model.

- Identity starts with name and brand fields, with portrait tooling later.
- A compact native Entry selector replaces the complete record list below
  700px; desktop retains a bounded scrollable collection rail. Both call the
  existing unsaved/busy selection guard. ZIP import is a native disclosure.
- Save, private Preview and Publish precede the form. Export, Unpublish and
  Delete occupy a separate record-management section. Duplicate header export
  is removed; whole-content export remains in Access & portability.
- Draft labels distinguish private, matching published, saved unpublished and
  unsaved states. Feedback appears beside the relevant draft actions. The
  desktop sticky bar reports its actual height through one ResizeObserver so
  keyboard/native-validation targets retain clearance. Mobile uses ordinary
  document flow and a focusable return-to-actions anchor.
- Social fields group identity/destination, room placement and icon appearance.
  Smaller preset tiles retain their marks, names and pressed states. Draft/live
  slot distinctions and dependency warnings remain explicit.
- Stronger section borders, readable helper type, 44px principal controls and
  restrained confirmation styling serve inbox, forms and access panels.
- Sample labels describe retained metadata/indexing rather than promising
  visitor notices. Empty setting searches explain what happened.
- Notebook pagination and the 438×428 ink area are unchanged. Its deliberately
  full-size paper preview remains horizontally scrollable on narrow screens;
  a visible hint and focusable region make that constraint understandable and
  keyboard-operable. This is a page-layout proof, not a responsive reflow.

Scope is six studio source files. The new `studio-presentation.css` uses
`.studio` and the explicit `.studio-dialog` portal class; shared visitor styles,
physical screens, model, world, camera, authentication, schema, API handlers,
publication rules and content are untouched. Existing form/crop/icon styles
remain their component foundations. No held optimization is implemented.

## Before / after

Actual hidden-browser captures, not mockups. Open images at their recorded CSS
pixel size. Stock Atlas and identity content are matched; the after collection
also contains one deliberately synthetic draft and private sample image. Inbox
before is empty and after is synthetic, so it is state coverage, not a pixel A/B.

| View | Before | After |
| --- | --- | --- |
| Identity · 1280×800 | [Baseline](before-identity-desktop.jpg) | [Refined](after-identity-desktop.jpg) |
| Project · 1280×800 | [Baseline](before-project-desktop.jpg) | [Refined](after-project-desktop.jpg) |
| Project · 390×844 | [Baseline](before-project-portrait.jpg) | [Refined](after-project-portrait.jpg) |
| Access · 1280×800 | [Baseline](before-access-desktop.jpg) | [Refined](after-access-desktop.jpg) |
| Inbox | [Empty baseline](before-inbox-empty-desktop.jpg) | [Synthetic desktop](after-inbox-desktop.jpg) / [portrait](after-inbox-portrait.jpg) |

Further evidence:

- [Social placement](after-social-placement-desktop.jpg), [icons](after-social-icons-desktop.jpg),
  [portrait placement](after-social-placement-portrait.jpg), [portrait icons](after-social-icons-portrait.jpg).
- [Corrected placement warning](after-social-conflict-desktop.jpg) / [portrait](after-social-conflict-portrait.jpg),
  [unsaved guard](after-dirty-guard-desktop.jpg), [validation focus](after-validation-focus-desktop.jpg),
  [private-save feedback](after-save-feedback-portrait.jpg).
- [Independent photo crops](after-photo-crops-desktop.jpg), [controls and private-media status](after-photo-controls-desktop.jpg),
  [media upload form](after-media-desktop.jpg), [empty search](after-no-settings-match.jpg).
- [Project preview](after-project-preview-desktop.jpg), [portrait preview](after-project-preview-portrait.jpg),
  [notebook desktop](after-journal-preview-desktop.jpg), [full-size notebook on portrait](after-journal-preview-portrait.jpg),
  [authenticated saved-draft reading view](after-private-reading-preview.jpg).
- [Desktop confirmation](after-delete-dialog-desktop.jpg), [portrait confirmation](after-delete-dialog-portrait.jpg),
  [long title](after-long-title-portrait.jpg), [320px identity](after-identity-320.jpg),
  [portrait access](after-access-portrait.jpg), [return focus](after-return-focus-portrait.jpg).
- [Main-server spacecraft](visitor-overview-desktop.jpg) and [public reading view](visitor-reading-desktop.jpg)
  confirm the studio styling did not spread into the completed visitor design.

## Method, fixtures and boundaries

The actual engine was hidden built-in **Chromium** through the Codex in-app
browser/CDP provider, not Safari. This tool did not expose a browser version;
no version is inferred. Actual CSS viewports: **1280×800**, **390×844**, and an
additional **320×740** width check. Browser DPR was **2**. Screenshot files use
CSS-pixel dimensions and are therefore scaled relative to the DPR2 screen;
there is no authoring-preview zoom or browser zoom adjustment. Notebook paper
uses its unchanged fixed layout and native horizontal overflow. Individual
scroll positions, URL, time and dimensions are in [captures.json](captures.json).

The studio screenshots use the actual authenticated application, hydrated
controls and real isolated APIs at loopback `127.0.0.1:3003`. The normal local
sign-in adapter authenticated its test owner. This is not an SSR-only fixture;
no UI effects, fonts, network handlers or authoring features were deliberately
omitted. Main `localhost:3000` was reused read-only for public cohesion checks.
It was neither replaced nor used as a mutating test target.

[Isolation preparation](isolation-preparation.json) records source-only checkout,
fresh D1/R2, test-only secrets and independent Vite cache. No private environment
file, main database, upload, or inquiry was copied. [Synthetic fixtures](synthetic-fixtures.json)
identify the stock sample records, two clearly synthetic inquiries, private
long-title project and exact committed fictional portrait used for media.
The browser changed only the synthetic project's private draft title to verify
Save. Unsaved social/crop probes were discarded. No browser publication,
message transmission, owner grant, confirmed deletion or main-store mutation
was performed. A test ZIP download was incidentally triggered during an
unsettled smooth-scroll interaction; it contained disposable stock fixture
content and did not alter a record. The later interaction was repeated after
settling and the final dialog evidence was refreshed.

Both disposable servers and their source/state/secrets were removed after
verification. The five Stage 14 browser tabs were closed and the temporary
viewport override reset; the final hidden-browser tab inventory was empty.
Main `http://localhost:3000` remained HTTP 200 after cleanup.

## Checks actually performed

- All six collections inspected; identity profile/SEO and empty setting search;
  story Write/Preview and landscape/portrait modes; media upload form and private
  photo dependency state; social placement conflict, icon marks and draft/live
  slots; empty/populated inbox; Access & portability; confirmation opened/canceled.
- Dirty selection remains blocked in desktop buttons and the mobile Entry select.
  Save on the synthetic private project produced “Draft saved. The published
  version is unchanged.” Preview became available with the saved title.
- Required-field native validation stayed inside the form and made no submission.
  With a **213px** expanded toolbar, the invalid field began at **391.75px** and
  the toolbar ended at **258.49px**; the focused control was clear.
  [Measured DOM evidence](focus-validation.json).
- Return anchor focused `draft-actions`; subsequent native Tab focused Save.
  After settling on portrait, Save was visible at **53.93px** from the top.
  [Focus evidence](focus-return-portrait.json).
- About crop zoom changed to **1.05×** while Reading crop remained **1.00×**.
  The modification stayed unsaved and was discarded. Portrait notebook region
  took keyboard focus and ArrowRight changed scrollLeft from 0 to **40px**;
  Next advanced the same story from page **1/3** to **2/3**.
- No page-level horizontal overflow at 390px and the 320px identity check.
  Notebook's intentional nested overflow is separate. No errors/warnings were
  returned for the five inspected studio/public tabs: [browser logs](browser-logs.json).
- An independent source/control audit passed 12 field SSR inventories,
  35 action inventories, 128 handler comparisons, 25 selection guards, five
  status cases and feedback SSR for all three tabs. The final observer supplement
  checks setup/resize/cleanup/remount; see [method and limits](control-inventory-verification.md).
- The full isolated suite passed **588/588** against fresh `127.0.0.1:3004`.
  Its exact source snapshot and subsequent presentation refinements are preserved
  in [verification.json](verification.json). Final-source typecheck, production build/geometry precheck, affected lint and
  CSS parsing passed, as did **15/15** focused pure journal/editor tests after
  critic refinements. The initial lint finding for the deliberately focusable
  scroll region and its documented exception are retained. Do not relabel the
  earlier full run as a later source snapshot.

Initial browser captures that caught hydration, retained scroll position or
unsettled smooth scrolling were not accepted as final evidence. Affected named
captures were replaced after confirming the intended state. The screenshot
manifest identifies retained files only. The warning, validation-focus, notebook
and affected dialog captures were refreshed after their changes; unaffected
views retain their earlier captures. [Final source hashes](source-manifest.json)
bind the review to the completed implementation. Earlier low-contrast warning findings
remain described in the critic record rather than being presented as final art.

## Independent review and limitations

[Independent critic review](critic-review.md) scored the final work **94/100**
with no unresolved blockers and preserves the rubric, initial findings and
corrections. The critic identified the social
warning contrast regression; it was corrected and recaptured. The toolbar's
fixed scroll margin was also replaced with measured clearance and verified in
actual native validation. The notebook's fixed paper is an intentional exception.

Safari, physical touch devices, hardware keyboard/screen-reader combinations,
OS-level reduced-motion switching and controlled rendering timings were not
performed. Asynchronous transport failure/busy/revision states have isolated
API and synthetic handler coverage, not an exhaustive browser capture matrix.
No main private inbox was inspected. Typecheck/build warnings and the exact
verification chronology remain in their logs.

Source inspection finds no new Three.js geometry, shader, render pass or image
asset. The private studio adds scoped CSS/markup and one ResizeObserver while
its Content tab is mounted. Those are implementation facts, not measured CPU,
GPU, process-memory, thermal or battery results. No performance gain is claimed.

## Handoff

Stage 14 carries forward ivory forms, carbon primary actions, restrained bronze
selection/focus and readable tonal boundaries. Preserve explicit private-save,
saved-preview, media-publication and parent-publication distinctions. Keep
identity/media originals and published snapshots independent, and retain the
notebook's exact layout proof. Stages 01–13 remain unchanged. There is no next
unimplemented numbered design stage; cross-engine/device verification remains
the concrete release follow-up.
