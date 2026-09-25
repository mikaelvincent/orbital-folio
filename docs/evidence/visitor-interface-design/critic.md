# Independent review — Stage 13 visitor interfaces

**Final verdict: 95/100. No unresolved implementation blocker or required-check failure.**

Baseline: `3773f5ad8c76d05300604cd3cf75f1e65e949183`. The final implementation is identified by [source-manifest.json](source-manifest.json); controlled component rendering uses the final [fixture manifest](fixture-manifest.json), frozen at `2026-09-25T10:32:16.733Z`. This critic reviewed the production, test and fixture diffs, actual rendered evidence, verification records and final documentation. Only this review file was edited by the critic; browser interaction remained with the implementing agent.

## Rubric

Visual design receives 55% of the score; passing code checks cannot substitute for it.

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Typography and information hierarchy | 24/25 | Supporting copy is substantially more readable; titles, summaries, metadata and actions have clearer roles. The physical projection still limits small desktop Contact text, with Reading view providing the larger alternative. |
| Composition and responsive layout | 19/20 | Bounded detail columns, accessible contents placement and simpler paper gutters resolve primary layout weaknesses. Larger cards deliberately show fewer entries at once; long titles and heading-free articles now remain contained. |
| Cohesion and restraint | 10/10 | Carbon applications and ivory articles relate to the spacecraft without duplicating its fittings. Soft graphite, passive standby displays and the notebook exception remain intact. |
| Fulfillment and scope preservation | 15/15 | Changes stay within visitor presentation and semantic markup. No camera, physical geometry, content, backend, availability or studio redesign is introduced. |
| Correctness and usability | 14/15 | Native disclosure/hash behavior, visible focus, retained form semantics and meaningful regression coverage support the implementation. Device keyboards and assistive technology were not manually exercised. |
| Evidence and verification | 8/10 | Extensive live and synthetic evidence is source-identified, with failures and revisions retained honestly. Some baselines are target-specific rather than whole-tree freezes; the final source received focused regression checks rather than a second full-suite run. |
| Rendering implications and claim accuracy | 5/5 | The change adds CSS/semantic DOM, not scene geometry or render passes. No unmeasured speed, memory, thermal or battery gain is claimed. |
| **Total** | **95/100** | **Accepted within the documented scope and limitations.** |

## Design judgment

The implementation addresses the actual weakness: reading hierarchy inside already coherent physical displays. In the [Projects collection before](before-projects-app-desktop.jpg) and [final collection](after-projects-app-desktop.jpg), supporting text no longer feels subordinate to large empty card areas. Titles lead more confidently, while the cards retain their text-only character. The price is fewer visible entries, a reasonable trade for useful reading size. The archive keeps its distinct row structure rather than copying Projects cards.

The [project detail](after-project-detail-desktop.jpg) now uses the wide screen as a frame for a readable column instead of stretching prose across the glass. Back/close controls and the scroll region remain separate from that column. The portrait [Projects](after-projects-app-portrait.jpg) and [archive](after-archive-app-portrait.jpg) applications preserve clear headings and contained content. Final synthetic [desktop](fixture-long-projects-native-desktop.jpg) and [portrait](fixture-long-projects-native-portrait.jpg) cards visibly wrap the unbroken title without hiding its end.

Semantic readers show the largest compositional improvement. Compare the [old clipboard](before-project-reading-desktop.jpg) with the [final article and contents](after-project-reading-desktop.jpg): the hierarchy now belongs to the authored material, not the simulated clamp. The contents precede the article in DOM order, remain available on desktop, and become a compact native disclosure in [portrait](after-project-reading-portrait.jpg). The [archive heading target](after-archive-reading-anchor-portrait.jpg) clears the fixed header in the recorded navigation check. Wide tables remain horizontally scrollable within their content region; the screenshot is not evidence that every table column fits simultaneously.

Contact's [reading form](after-contact-form-reading-desktop.jpg) removes the redundant monitor housing and presents a direct form beside the invitation. The native [chooser](after-contact-chooser-portrait.jpg), [form](after-contact-app-portrait.jpg), and [scrolled keyboard-focus view](after-contact-scroll-focus-desktop.jpg) retain coherent bars, clear selection and accessible lower controls. The synthetic [error](fixture-contact-error-portrait.jpg) keeps the draft visible with a specific failure message; the [call acknowledgement](fixture-call-unsent-portrait.jpg) explicitly states that nothing was sent, saved or booked. These states are not evidence of an actual submission.

About's [desktop](after-about-reading-desktop.jpg) and [portrait](after-about-reading-portrait.jpg) readers preserve the personal profile and warm paper while removing nested framing. The [physical notebook desktop](retained-notebook-desktop.jpg), [portrait](retained-notebook-portrait.jpg) and [section change](retained-notebook-section-portrait.jpg) retain the approved complete-spread behavior. Its portrait text is intentionally small; this review does not reinterpret that approved constraint as a newly solved mobile reader. The semantic reader remains the practical narrow-screen alternative.

## Findings and revisions

1. **Resolved — empty project contents column.** Initial source rendered a project aside even when Markdown had no headings. This reserved a largely empty desktop column and a mobile grid row. The final conditional matches the case-study behavior. Both [desktop](fixture-no-headings-desktop.jpg) and [portrait](fixture-no-headings-portrait.jpg) fixtures show the corrected article layout; response checks verify the aside is absent.
2. **Resolved — native unbroken-title clipping.** Root's actual synthetic review found and retained the [rejected candidate](revision-unbroken-title-clipped.jpg). Final card content has `min-width: 0` and `overflow-wrap: anywhere`. Refreshed ordinary live collections and controlled long-title views match the correction. Recorded client/scroll heading widths are equal at 395px and 296px.
3. **Resolved — stale resource-order assertion.** The initial test found the new contents href before the section body. The corrected assertion locates `id="project-overview"`, retaining the original requirement that resource actions follow the introduction and precede the body. It does not weaken the destination-safety checks.
4. **Resolved — evidence precision.** README now distinguishes the fixture's source/compiled hashes from response-markup hashes, calls the 40 requests state responses, and supplies per-image integrity/status records. It also states logical CSS control dimensions rather than promising projected 44-pixel targets. These were documentation corrections, not new visual approval assumptions.

No additional source revision is required by this review. The earlier mobile contents list and temporary import-error captures are explicitly documented as superseded/rejected; the two invalid archive desktop baselines are excluded.

## Source and verification assessment

The CSS changes preserve the existing layout/scroll containers, physical registration and interaction components. Reader styling is scoped to the semantic reader. The source removes only obsolete decorative clip/strap/housing classes, whose runtime references are gone. The project metadata now uses a definition list. Desktop/mobile contents copies have no duplicate target IDs; CSS exposes the appropriate copy, and links retain the existing section IDs. Contact submission/draft logic and the notebook's native layout are untouched.

I independently verified:

- All nine current file hashes in the source manifest, all 37 final and 35 baseline transitive fixture-source hashes, and the fixture script hash.
- All nine retained normalized verification-log hashes and final tested source hashes. The post-check assertion formatting was reconstructed exactly by reversing its one line wrap; it matches the tested hash and changes no expression.
- All 68 saved image hashes, byte sizes, actual JPEG formats and dimensions. Every image has one capture record and an explicit integrity status: 16 baseline, four partial-baseline, 42 final-relevant-output-unaffected, five final-refreshed and one rejected candidate. This is integrity verification, not a claim that all 68 are strict before/after pairs.
- The actual initial full-suite result: **587 passed, one failed out of 588**. The final complete Projects, Case studies and journal rendering files then report **33/33 passing**, including the corrected resource-order check. Final typecheck, affected lint, all six CSS parses, production build and geometry precheck pass.

The full suite was not rerun on the final presentation snapshot. The preserved initial result plus final affected tests/static checks/build are proportionate to the bounded CSS and semantic corrections here; they must not be reported as a final 588/588 run. The initial/final source identities and subsequent formatter-only test wrap remain distinct in [verification.json](verification.json). No shared scene model, renderer or navigation implementation changed.

Verification used the recorded disposable loopback checkout, fresh test-only D1/R2/secrets and explicit `TEST_BASE_URL`; the main store was not the mutation target. Build warnings and the original failure remain in the durable logs. The fixture's 40 read-only responses, CSS/hash checks and POST/API rejections cover ten synthetic scenarios across two versions and two surfaces. Its inert server-rendered states cannot establish hydration, focus or submission behavior.

## Limits and handoff

Actual live viewports are 1280×720 and 390×844 CSS pixels at browser DPR 2. JPEGs are CSS-sized; live WebGL buffers are 2560×1440 and 682×1477. The recorded engine is hidden built-in Chromium; its exact version was unavailable in this interface. No native Safari, physical touch/virtual keyboard, native screen-reader or new OS-level reduced-motion session was performed. Live focus/disclosure and travel observations are the implementing agent's recorded checks, reviewed here rather than independently replayed.

Live camera micro-motion, hover, Earth phase and some reading scroll positions are not frozen. Four target-specific library baselines were captured while unrelated Contact work was in progress. The final image status record correctly distinguishes refreshed outputs from earlier outputs unaffected by the two final corrections. The longstanding offscreen CSS3D document width in the room view is disclosed separately from contained application/reading content; no universal zero-overflow claim is made.

The SSR fixture omits WebGL, projection, hydration, media, the main header/tools and transport. It intentionally shows disabled pre-hydration Contact controls. No speed, frame-pacing, process/GPU memory or power comparison was performed. Unchanged scene source is not a performance measurement.

Temporary fixture/test servers and state are removed and main localhost:3000 remains available according to the cleanup records. Valid review tabs were closed and the viewport reset. One inert browser-generated `data:` error tab could not be closed because of URL policy; that cleanup limitation remains explicit.

Stage 14 should carry forward the restrained surface hierarchy, comfortable prose measure, visible focus, native semantic structure and truthful state language. Preserve the screen artwork, physical registration, content/availability rules and the notebook's approved exception. No out-of-scope change blocks this stage.
