# Independent critic: portfolio hierarchy and Projects workbench

**Result: 98/100 — pass against the requested 95+ threshold.**

Scope is limited to the current request: the portfolio identity should have a larger visible type scale than the indoor room signs; the Projects and Contact signs should remain readable and fit physically; the Projects workbench should match the accepted Contact worktop height with properly fitted supports. Deferred interactions and unrelated rooms are not scored.

The reviewer did not edit application code, operate the browser, or generate the submitted screenshots. Review compared baseline `8c24695` images in `docs/evidence/room-label-legibility/` against the final nine images in `docs/evidence/portfolio-hierarchy/`, and read the relevant source diff, typography measurements, and geometry audit.

## Assessment

| Criterion | Score | Evidence |
| --- | ---: | --- |
| Portfolio-name hierarchy across tested sizes | 40/40 | The identity is visibly larger than the selected-room title in the 1440×900 and 2560×1440 overview/Projects pairs. The 430×932 identity also exceeds the selected Projects and Contact titles. The name remains on one line without viewport overflow. The uncapped `min(4.4vw, 7svh)` rule avoids the previous fixed upper font-size limit on large desktop screens. |
| Sign readability and physical fit | 28/30 | Projects and Contact retain crisp dark text on ivory, balanced side margins, visible mounts, and complete frames. Text is legible in desktop, oblique, portrait, and large-screen captures. The only minor visual reservation is the very narrow apparent clearance between the Projects sign and the upper payload-module fittings in portrait and frontal views; it does not obscure either category title or cause visible intersection. |
| Workbench height, proportions, and grounding | 30/30 | The Projects table now reads as a work surface rather than a low platform. Its two supports extend continuously from the same grounded feet to the apron, and the module bank remains seated on its mounting structure. Audit values put both accepted worktops at 0.731 above the cabin floor, within floating-point precision. |

## Evidence inspected

- `01-overview-desktop.png` and `02-projects-desktop.png`: corrected identity/sign hierarchy and restored workbench height.
- `03-projects-oblique.png`: readable sign, intact frame, fitted supports and module mounts from an angled camera.
- `04-contact-desktop.png`: smaller Contact sign retains readability and clearance above its monitor.
- `05-overview-portrait.png`, `06-projects-portrait.png`, and `07-contact-portrait.png`: identity stays larger; the signs remain readable at the smaller render scale.
- `08-overview-large.png` and `09-projects-large.png`: hierarchy persists at 2560×1440 rather than failing at a capped identity font size.

Source/audit checks support the visual result: unchanged feet, a positive leg-to-apron overlap, preserved module shapes translated vertically as a unit, and no differences in the audit's 825 protected meshes across eight sampled states. The recorded 0.7135 header-to-payload depth separation and 0.252 payload-to-ceiling clearance support the absence of physical collision in the reviewed views.

No blocking visual issue remains within this request. This assessment covers the submitted still views and source evidence; it does not claim a fresh live-browser motion or performance audit by this reviewer.

## Reviewed application hashes

- `app/globals.css`: `62d097c68878befd0c10a2989fbb3e050d783698b2af19885e9f2e052df03834`
- `components/projects-workshop.ts`: `d76ccf803615f6bd20d87b78d15904f369d448f98373fd796cfb77315ba9d128`
- `components/spacecraft-model.ts`: `881561e509fec05383802aa858f01ea328673a5347370108e1f145b441e23eff`

The final refreshed geometry audit records these exact application hashes and passes. The typography measurements reflect the final responsive sizing.
