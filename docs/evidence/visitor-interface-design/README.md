# Stage 13 — visitor interfaces and reading views

25 September 2026. Baseline: `3773f5a` (completed Stage 12). This is an interface
art pass, not a geometry, camera, backend or performance optimization. The initial
working tree was clean. The main server was stopped at entry; it was restarted on
localhost:3000 using its existing state. No private content or environment was
copied into either fixture, and no main-server inquiry was submitted.

## Direction and implemented result

The live review found that the physical displays already had a coherent Soft
graphite identity. The weaker parts were the very small secondary application
type, long detail lines, repeated simulated hardware around semantic readers,
and a hidden contents navigation. Adding more decoration would not solve those.

- Projects and Case studies use larger supporting labels, summaries and metadata.
  Detail content is centered within an 80ch maximum column, preserving the screen
  registration and application bars. Project cards retain their text-only format;
  archive entries retain their editorial rows. Unbroken project titles now wrap.
- Semantic Reading view uses simple carbon collection surfaces, ivory articles,
  17px body type, and a 70ch prose measure. Project role/stack sits with the intro.
  Desktop contents scroll within a bounded rail; mobile contents is a collapsed
  native disclosure. Headings remain native hash destinations. Articles without
  headings omit the rail instead of leaving an empty column.
- Contact has quieter window and email-callout borders/shadows, larger supporting
  type and clearer logical control sizes. Reading mode removes the second mock
  monitor housing. The existing form, chooser, dismiss/reopen, focus, draft,
  required fields, errors and truthful unsent-call semantics are unchanged.
- About Reading view has simpler paper gutters and a quieter profile column.
  Its physical notebook remains a deliberate exception: the fixed 14px body,
  pagination measurements and whole-spread portrait scaling are unchanged.

The physical spacecraft, Soft graphite wallpaper, content and assets are
unchanged. Projects' unavailable monitor remains plain-carbon STANDBY; archive
cartridges stay blank/disabled, and an unavailable terminal retains STANDBY.
Neither Content studio nor shared Markdown authoring styles were redesigned.
Obsolete clipboard clip, journal strap and extra Contact housing selectors were
removed after checking their runtime references.

## Before / after evidence

All linked live images are actual hidden built-in browser captures. They are not
historical screenshots or mockups. `captures.json` records URL, viewport, DPR,
canvas buffer, scene state and document width for each saved capture.
[Image integrity](image-integrity.json) supplies image hashes, write times and
per-image baseline/final/rejected status. Older final captures are explicitly
marked unaffected by the later heading-free/wrapping corrections; they are not
claimed as final whole-tree captures.

| Comparison | Before | After |
| --- | --- | --- |
| Projects application, 1280×720 | [collection](before-projects-app-desktop.jpg) | [collection](after-projects-app-desktop.jpg) |
| Project application detail, 1280×720 | [detail](before-project-detail-desktop.jpg) | [detail](after-project-detail-desktop.jpg) |
| Project reading page, 1280×720 | [clipboard page](before-project-reading-desktop.jpg) | [article and contents](after-project-reading-desktop.jpg) |
| Project reading page, 390×844 | [page](before-project-reading-portrait.jpg) | [article and disclosure](after-project-reading-portrait.jpg) |
| Project application, 390×844 | [collection](before-projects-app-portrait.jpg) | [collection](after-projects-app-portrait.jpg) |
| Archive application, 390×844 | [collection](before-archive-app-portrait.jpg) | [collection](after-archive-app-portrait.jpg) |
| Archive reading collection, 1280×720 | [collection](before-archive-reading-desktop.jpg) | [collection](after-archive-reading-desktop.jpg) |
| Archive category empty state | [empty](before-archive-empty-desktop.jpg) | [empty](after-archive-empty-desktop.jpg) |
| Contact chooser, 1280×720 | [chooser](before-contact-chooser-desktop.jpg) | [chooser](after-contact-chooser-desktop.jpg) |
| Contact chooser, 390×844 | [chooser](before-contact-chooser-portrait.jpg) | [chooser](after-contact-chooser-portrait.jpg) |
| Contact form, 390×844 | [native form](before-contact-app-portrait.jpg) | [native form](after-contact-app-portrait.jpg) |
| Contact reading form, 1280×720 | [form](before-contact-form-reading-desktop.jpg) | [form](after-contact-form-reading-desktop.jpg) |
| About reading page, 390×844 | [profile](before-about-reading-portrait.jpg) | [profile](after-about-reading-portrait.jpg) |

Additional final views: [archive detail desktop](after-archive-detail-desktop.jpg),
[archive article desktop](after-archive-story-reading-desktop.jpg),
[archive article portrait](after-archive-reading-portrait.jpg),
[scrolled heading target](after-archive-reading-anchor-portrait.jpg),
[Contact focus and lower controls](after-contact-scroll-focus-desktop.jpg),
[About reading desktop](after-about-reading-desktop.jpg),
[retained notebook desktop](retained-notebook-desktop.jpg),
[retained notebook portrait](retained-notebook-portrait.jpg),
[notebook section turn](retained-notebook-section-portrait.jpg),
[retained Projects room](retained-projects-room-desktop.jpg),
[retained overview desktop](retained-overview-desktop.jpg),
[retained overview portrait](retained-overview-portrait.jpg).

Live comparisons match viewport and content/state where named, but animation,
hover, geographic phase and camera micro-motion are not frozen. Reading-page
scroll positions can differ where layout changed. They support layout judgments,
not pixel equality or rendering-performance comparisons. The later portrait
library baselines were captured before those library CSS edits, while unrelated
Contact work was already in progress; they are not whole-tree baseline renders.

## Method and checks

Hidden Codex in-app browser, Chromium engine through its CDP-backed interface;
no native Safari or other native app was controlled. Browser version was not
available from this interface. Actual viewports: 1280×720 and 390×844 CSS pixels,
DPR 2. Saved JPEG dimensions equal those CSS viewport dimensions (one image pixel
per CSS pixel). Live WebGL buffers recorded at 2560×1440 desktop and 682×1477
portrait. Existing adaptive renderer settings, shadows, AO, Earth and motion were
left enabled; this was not a fixed-time rendering fixture or a timing run.

Live checks included application collection/detail/back/close, both reading-mode
transitions, Contact chooser toggles, email dismissal, keyboard focus scrolling
to Privacy and lower controls, category-empty status, page/section notebook
turning and all four rooms' presentation. Mobile Contents opened and closed with
Return and followed a native hash link. After settling, the selected heading was
158 CSS pixels below the viewport top, clear of the header; document overflow
was zero. Desktop project prose measured about 662 CSS pixels at 17px. The full
notebook spread remains small in portrait, as approved; Reading view remains its
comfortable narrow-screen alternative. New 44px minimum controls are **logical
CSS dimensions**, not guaranteed physical screen-pixel sizes after projection.

The reusable [SSR fixture](../../../scripts/benchmarks/visitor-interface-preview.mjs)
serves production components and compiled production CSS from a frozen source
snapshot with synthetic public props. Run `node scripts/benchmarks/visitor-interface-preview.mjs 3773f5a`
from the repo (default loopback3002); restart it after source changes. `/before`
and `/after` support reading/native surfaces, long titles, heading-free prose,
empty collections, retained-draft error and truthful unsent-call acknowledgment.
The [manifest](fixture-manifest.json) binds transitive source and compiled JavaScript/CSS.
[Response checks](fixture-response-checks.json) bind markup hashes and cover 40
state responses (10 scenarios × two versions × two surfaces),
two CSS/hash checks and rejected local POST/API routes.

The SSR fixture is inert: no hydration, camera projection, WebGL, media, API,
transport, authentication or store. Its Contact controls intentionally preserve
the pre-hydration disabled state; the custom scroll thumb is unmeasured. Native
fixture containers are min(960px, viewport width) ×760 CSS pixels without scaling.
Its developer banner is outside the reviewed component. The fixture cannot prove
interaction behavior; those checks use the live application or isolated tests.

Controlled evidence: [Contact error desktop](fixture-contact-error-detail-desktop.jpg),
[error portrait](fixture-contact-error-portrait.jpg),
[unsent call](fixture-call-unsent-portrait.jpg),
[empty Projects](fixture-empty-projects-desktop.jpg),
[empty native archive](fixture-empty-archive-native.jpg),
[long reading title](fixture-long-project-title-portrait.jpg),
[wrapped native titles desktop](fixture-long-projects-native-desktop.jpg),
[wrapped native titles portrait](fixture-long-projects-native-portrait.jpg),
[heading-free desktop](fixture-no-headings-desktop.jpg),
[heading-free portrait](fixture-no-headings-portrait.jpg).

The isolated verification uses a disposable source checkout at loopback3003,
fresh D1/R2, test-only secrets, an explicit TEST_BASE_URL and a separate Vite
cache. It does not point at the main store. The initial full run completed **588 tests: 587 passed, one failed** at the stale
resource-order assertion described below. After correcting that assertion and
the two final presentation edge cases, **all 33 tests** in the complete Projects,
Case studies and journal rendering files passed. Final typecheck, production
build including geometry precheck, affected lint and all six CSS syntax parses
also passed. The full suite was not needlessly repeated; the raw initial failure
and final targeted run are retained in `checks/` and `verification.json`.
The assertion file received a final formatter-only line wrap afterward, recorded
in verification.json; its expression and production source are unchanged.
No required failure remains unresolved. Independent review scored **95/100**, with 55% visual-design weight and no
unresolved blockers; see [the rubric and findings](critic.md).

## Revisions and limitations

1. The first contents layout made all links visible above the article on mobile.
   Actual portrait inspection showed the title pushed below the fold; the native
   disclosure now keeps the introduction prominent.
2. The independent critic found a heading-free project reserved a blank rail.
   The aside is now conditional; the dedicated fixture verifies both widths.
3. A synthetic unbroken project title clipped in a native card. The
   [rejected candidate](revision-unbroken-title-clipped.jpg) is preserved; card
   content now wraps within its available width. Final affected evidence is
   refreshed after that CSS correction. The final unbroken heading has equal
   client/scroll widths: 395px desktop and 296px portrait; document overflow is
   zero at 390px. The physical room CSS3D layer retains its pre-existing offscreen
   document bounds (5459px baseline / 5457px final in the desktop Projects room);
   this is distinct from application/reading overflow. Ordinary live project collections were also recaptured.
4. An existing resource-order test searched the first occurrence of
   `project-overview`, which is now a contents href. Its assertion now identifies
   `id="project-overview"`, preserving the original contract that resource actions
   follow the introduction and precede the article body.
5. A temporary cross-directory CSS import failed during editing. It was replaced
   by the ordinary component CSS import. Two desktop archive captures made during
   that error/transition were rejected and removed, not used as baseline evidence.
   Browser action timeouts during WebGL remounts were resolved by observing the
   resulting state; intermediate captures were replaced after settling.

Temporary review servers and state were removed; main localhost:3000 remains
available. The viewport override was reset and review tabs closed. One inert
built-in error tab from the initial stopped-server visit could not be closed
because its data URL is blocked by the browser tool policy; no native browser
workaround was attempted. See the cleanup records.

No live message was sent, no call booked, and no persisted content changed.
Safari, touch hardware/virtual keyboards, native screen readers and OS-level
reduced-motion emulation were not tested in this pass. Existing reduced-motion,
history and contact semantics receive automated regression coverage. Error/call
acknowledgment visuals use synthetic props, not a deliberately failed real inquiry.
No new browser errors were recorded after the temporary import correction in the
checked live tab; see `browser-error-check.json`. No CPU/GPU timing, process memory,
heat or battery measurement was made. Changes
add CSS/semantic DOM only; no geometry, shader, pass or runtime image asset is
added by this implementation. That source observation is not a speed claim.

## Stage 14 handoff

Visitor interfaces are the completed area. Carry forward comfortable title/body
hierarchy, restrained carbon/ivory surfaces, clear focus and borders, and truthful
empty/error/unsent states. Preserve Soft graphite idle art, availability rules,
physical registration and the notebook's paper-specific exceptions. Content
studio is the next scope; its publication and authentication semantics remain
established constraints. See the comparisons and source manifests above.
