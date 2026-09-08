# Independent critic — v6 first working-evidence review

9 September 2026. Scope is the current local 2×2 spacecraft revision. This is a fresh assessment; no prior score is carried over. Source, screenshots, raw browser evidence, model audits, build/test logs and GET-only built-Worker responses were inspected independently. No application or database edits were made by the critic.

**Provisional score: 89.6/100. Every area is above8/10. Final acceptance is withheld while the remaining new-interaction evidence is collected.** No additional source-level requirement blocker was found; this is an evidence-limited review, not a claim that the remaining cases fail.

| Equally weighted area | /10 | Verified basis and current deduction |
| --- | ---: | --- |
| Visual identity and integrated interaction | 8.9 | The 2×2 hull, retained docking nose, distinct contact room, nine compartments, individual Parcel hover, dark navigation and screen-upright labels are visible in current desktop/mobile captures. Corrected Atlas HTML now sits on its physical paper. The procedural blue ocean suits the revised brief. Material richness remains simpler than the original references. Mobile pagination currently wraps its count into three lines, a concrete polish regression. |
| Functionality and database/admin workflows | 9.4 | Nineteen current tests pass. A tenth project was created/published through the admin; browser evidence opens it on page2 and returns to page2 with the same renderer at320px and390px. A fresh restore preserves all16 draft/published content records. The new control label migration preserves customized and unpublished copy. No workflow regression is demonstrated. |
| Responsive accessibility | 8.8 | Upright, readable labels and complete framing are visible at390px/320px; native physical-reader bounds align after the projection-root scrolling fix. Current matching audits show zero violations for desktop overview,320px projects/dossier and390px contact/journal. Some copied axe values belong to earlier URLs/viewports and do not count as new audits. Tablet, final overview audit, Experience and loader/fallback evidence remain to be reviewed. |
| Performance and crawlability | 8.5 | The environment removes external Earth imagery and reduces generated texture allocation to approximately0.42MiB desktop/0.073MiB mobile. Complete semantic pages and DB-derived metadata are independently verified. Current frame samples vary: many views are around33–34ms, one contact sample16.7/17.7ms, and an earlier project-hover sample50ms p95. Trace instrumentation and concurrent work affect interpretation. Real low-end-device and field measurements remain unavailable; the final clean runtime evidence and actual interrupted-flight trace are still incomplete. |
| Security and maintainability | 9.2 | Current regression tests cover allowlisting, forged identity denial, CSRF, streamed request limits, private drafts/inquiries/media, optimistic updates and escaped text; audit reports zero dependency advisories. Shared capacity and model-derived anchors reduce drift. Source fixes keep bounded controller output continuous in principle. Existing beta framework and hosting/auth coupling remain documented maintenance costs. |
| **Overall** | **89.6/100** | Sum×2. Re-review after the bounded outstanding checks; do not describe this as reaching90 yet. |

## Resolved defects verified in this pass

The initial Atlas failure was a real DOM/physical mismatch, caused by native focus scrolling the CSS3D root. Current `overflow:clip!important`, corrected screenshot and bounds now agree: DOM top182.4056/bottom815.3651 versus projected top182.4071/bottom815.3636, about0.002px maximum error. Mobile contact and second-page reader errors are similarly around0.002px, with projection scroll0.

Source now preserves rendered pointer/hover/dolly state when paused, and a reader transition targets pointer state tozero rather than bypassing it. The boot escape's `#room-reader` is honored on hydration. These fixes are present; final browser cases should substantiate non-neutral pause and delayed-hydration escape rather than only centered or already-loaded states.

The nine-slot constant is shared by model, renderer and route/page calculations. Model audit verifies empty/single/nine/twelve counts, isolated slot5 hover and real room enclosure surfaces. Browser page2→tenth dossier→Return uses the same renderer and retains page1 (zero-based). Empty visible compartments do not become stale project links.

## Remaining concrete actions / evidence limits

1. Keep the mobile page count on one line and reduce transport gaps as needed. `mobile-second-page.png` currently shows “2 / 2” vertically stacked in an unnecessarily tall pill.
2. Capture the controller ring immediately after actual interrupted section changes. The current `interrupted-room-flight` trace starts and ends on already-settled About; it has aged out the section switches. The separate rapid-hover trace does retain real room-hover changes with bounded-looking steps and is valid evidence for hover.
3. Finish the already-planned non-neutral pause/resume, delayed-hydration loader escape, current320px label audit and Experience/About checks. Only count an axe result when its URL and viewport match the tested state. The current mobile390overview entry still contains the old1440px overview result, and Return-to-projects retains the old dossier result.
4. Keep new performance claims narrow. The saved production file currently measures33.53–150.69ms complete warm loopback responses, with most samples around40–60ms and HTML12.8–14.0KB gzip; this is not network latency or Core Web Vitals. Debug camera tracing should not be presented as an uninstrumented runtime benchmark. Three.js remains182.5KB gzip, model13.8KB, environment5.1KB, immersive layer14.5KB.

## Independent retained-function checks

`/tmp/grid-critic-http.json` records ten GET-only built-Worker checks: seven public pages returned200 with one H1, main landmark, current canonical metadata and sample noindex; Atlas case-study text is present without JavaScript; the current DB-backed “Interactive view” and boot reading escape appear in public HTML. Unknown project404, anonymous admin/export403, private noindex and nosniff headers are correct. `localhost:3000/` returned200 at review time.

`workflows.tap` reports19 passed/0 failed/0 skipped; `typecheck.txt`, `lint.txt`, `build.txt` record success. `restore.json` restores16 records with identical draft/published snapshots and no private data. `dependency-audit.json` reports zero advisories. Existing unchanged admin-browser evidence and current regression tests support retention; this does not manufacture a new end-to-end browser audit of every old admin interaction.

Remote Sites hosting remains blocked by the pre-existing SIWC callback-registration incident and is separate from this local revision. No public deployment, physical mobile-device, manual screen-reader or field Core Web Vitals validation is claimed.
