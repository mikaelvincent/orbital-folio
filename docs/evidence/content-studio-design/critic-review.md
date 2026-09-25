# Independent review — Stage 14 Content studio

**Final verdict: 94/100. No unresolved implementation blocker or failing required check.**

Reviewed 25 September 2026 against baseline `496e91b55288792adf9abe1e9b6b7884965202ea` and the six current sources identified in [source-manifest.json](source-manifest.json). The critic inspected source/diffs, actual desktop and portrait images, the independent control audit, verification logs, README, project context and ledger. The critic changed only this report; browser actions and implementation were performed by the other agents.

## Rubric

| Criterion | Weight | Score | Assessment |
| --- | ---: | ---: | --- |
| Visual hierarchy, composition and cohesion | 30 | 28 | Clear separation of selection, editing and record management. Ivory surfaces and carbon primary actions establish hierarchy without importing decorative spacecraft fittings. |
| Responsive design, readability and working usability | 25 | 23 | Native Entry selection removes the long mobile record grid. Grouping, error feedback and previews are legible; keyboard clearance is addressed. Long documents still require substantial scrolling and the fixed paper proof requires intentional panning. |
| Scope and workflow fulfillment | 15 | 15 | All studio areas are addressed while preserving existing authentication, content models, publishing rules and visitor design. |
| Correctness and accessibility evidence | 15 | 14 | Source/control comparisons, actual focus and validation evidence, and isolated checks support the change. This is not a complete assistive-technology or asynchronous browser-state audit. |
| Verification, provenance and documentation | 10 | 9 | Retained source/check snapshots and actual fixture conditions are explicit. Before/after fixture contents and capture chronology differ where documented. |
| Rendering implications and maintenance | 5 | 5 | Scoped presentation layer and one cleaned-up observer have a clear purpose. No speculative performance benefit or unrelated optimization is claimed. |
| **Total** | **100** | **94** | **55% of the rubric evaluates visual design and practical presentation.** |

## Design assessment

The strongest improvement is the working order. The [baseline identity editor](before-identity-desktop.jpg) gives less priority to ordinary name/brand editing; the [final identity editor](after-identity-desktop.jpg) makes that content the starting point. In [Projects](after-project-desktop.jpg), the collection rail, record title/state, primary actions and first field group are distinct, readable layers. Save is visually primary; Publish remains explicit without competing at the same weight. The separate management section keeps destructive and portability actions out of routine authoring.

The [portrait editor](after-project-portrait.jpg) replaces the long record grid with a labeled native selector. The [320px identity view](after-identity-320.jpg) remains usable with wrapped header controls and contained form widths. The [long-title state](after-long-title-portrait.jpg) wraps within the editor; its extra height is an understandable consequence of the deliberately extreme fixture, not page-level overflow.

Social destination, room placement and icon appearance now form meaningful groups. Crop controls retain independent About/Reading choices and explicit private-media dependencies. Inbox and access panels share the studio's hierarchy without resembling content editors. The light [confirmation surface](after-delete-dialog-portrait.jpg) is restrained and readable, with clear Cancel and destructive confirmation actions.

The notebook is an intentional exception to responsive content reflow. The [desktop proof](after-journal-preview-desktop.jpg) preserves the complete page and pagination, while the [portrait proof](after-journal-preview-portrait.jpg) explains sideways inspection and shows visible keyboard focus. This respects the physical notebook's existing layout rather than changing content pagination for the editor. The [private reading preview](after-private-reading-preview.jpg) also retains the completed visitor design and clearly identifies its private state.

## Findings and revisions

1. **Initial blocking contrast defect — resolved.** The first social conflict and dirty-guard captures showed dark text on a dark maroon field-group error. The generic group paragraph color overrode the inherited error ink. A specifically scoped light error treatment now produces readable dark red text. The refreshed [desktop conflict](after-social-conflict-desktop.jpg), [portrait conflict](after-social-conflict-portrait.jpg) and [unsaved guard](after-dirty-guard-desktop.jpg) resolve the finding.
2. **Sticky toolbar clearance concern — resolved.** The original fixed scroll margin did not account for a taller dirty/error toolbar. This was a potential failure mode, not a demonstrated initial obstruction. The final observer measures the actual bar and the CSS adds 24px clearance. [Native-validation evidence](focus-validation.json) records a 213px toolbar, matching measured property, 237px scroll margin, and the invalid field at 391.75px below the bar's 258.49px lower edge. The [matching image](after-validation-focus-desktop.jpg) confirms visibility.
3. **Return and paper-preview keyboard access — resolved.** The control audit's return-target finding resulted in a focusable fragment target. [Actual return-focus evidence](focus-return-portrait.json) records subsequent Tab reaching Save at 53.93px. The notebook's named focusable overflow region and narrow-screen hint make its fixed-size constraint operable; the browser record reports ArrowRight moving scrollLeft 0→40px and Next advancing page 1/3→2/3. The lint exception is documented and comment-only; it does not change the tested runtime.
4. **Evidence wording — clarified by the verification chronology.** The audit supplement's journal byte-equivalence inspection used `fef6e506…`; the final `6e57f7c8…` differs only by its documented lint comment. [Verification](verification.json) preserves both. This reviewer independently removed that exact comment and reproduced the tested hash. The earlier full-suite snapshot is not represented as a later full-suite rerun.

No further implementation revision is required by this review. Minor density tradeoffs remain: long authoring forms require scrolling, small supporting status labels are subordinate, and full-size notebook inspection on narrow screens takes an extra horizontal action. These are disclosed constraints rather than hidden clipping or lost controls.

## Verification and evidence limits

The critic independently matched all **six current source hashes**, **eleven normalized log hashes**, and **43 retained JPEG hashes, encodings and pixel dimensions** to their records. Representative image inspection covers the primary before/after identity, project and access views; inbox; social placement/icons/conflicts; crops; confirmation; project/notebook/private previews; narrow long-title/320px states; and the corrected focus states. Hash checking is not a claim that every image received equal visual scrutiny.

The earlier isolated full suite passed **588/588** against fresh test-only D1/R2 on port 3004. After the critic refinements, **15/15** pure journal/editor tests, typecheck, production build including geometry precheck, CSS parsing and affected lint passed. Final lint followed the comment-only exception; the failed initial lint output is retained. The source/control audit's 35 action inventories, 128 handler comparisons, 25 selection guards, five status cases and 12 field inventories are bounded synthetic/SSR evidence, supplemented by six observer lifecycle checks. They do not establish exhaustive real-network, asynchronous React or assistive-technology behavior.

Actual screenshots use hidden built-in **Chromium, version unavailable**, at 1280×800, 390×844 and the additional 320×740 CSS viewport, browser DPR 2 and CSS-pixel screenshot dimensions. They come from the hydrated authenticated application with fresh isolated synthetic state, not a static rendering surrogate. Some after views contain added synthetic records/media/inquiries; these are state coverage, not identical-content pixel comparisons. Affected captures were refreshed after refinement, while unaffected captures retain their recorded times. The source manifest and README explain that chronology.

Safari, physical touch devices, hardware-keyboard/screen-reader combinations, OS-level reduced-motion switching and controlled rendering timings remain unperformed. Browser focus measurements cover the exercised states, not every possible field/error combination. No CPU/GPU, memory, thermal or battery gain is inferred. Source inspection supports the narrower fact that this change adds studio CSS/markup and one ResizeObserver, without new spacecraft geometry, shaders, passes or runtime image assets.

The final cleanup record reports both disposable fixtures on ports 3003 and 3004 removed, including their test secrets/state, and main port 3000 still returning HTTP 200. Root also reports the five review tabs closed and viewport override reset. The critic reviewed those completion records rather than independently controlling the browser or repeating cleanup.
