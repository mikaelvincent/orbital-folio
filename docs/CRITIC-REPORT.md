# Independent critic — horizontal corner connectors

**89.6/100. Pass for this narrow iteration:** above the temporary 75/100 target, with every equally weighted area above 6/10. No scoped blocker remains. This is a fresh assessment of the landscape connector change, not approval of the entire portfolio.

| Equally weighted area | Score /10 | Finding |
|---|---:|---|
| Landscape visual design | 9.1 | The longer leaders now frame the spacecraft at its outer sides. Room attachments remain clear, and the labels have visibly more separation. |
| Routing geometry and clearance | 9.2 | Shared diagonal offsets, horizontal outer runs and paired side endpoints are consistent. Captured routes clear the solar panels with an additional 8px margin. |
| Responsive placement | 8.6 | Both 1440×900 and 700×480 keep all four labels visible. The compact layout has orderly spacing, although the unchanged ship framing remains small. |
| Portrait and interaction preservation | 9.1 | The approved portrait rails remain intact. The landscape drag record stays on the overview with no activation. Source inspection confines the change to landscape routing. |
| Maintainability and validation | 8.8 | A small adjustment reuses the projected vessel support envelope. Current source hashes match the evidence; typecheck, lint and build passed. |

I independently inspected the source and four saved GPU captures: [desktop](evidence/horizontal-corners/desktop.jpg), [desktop drag](evidence/horizontal-corners/desktop-drag.jpg), [compact landscape](evidence/horizontal-corners/compact-landscape.jpg), and [portrait preservation](evidence/horizontal-corners/portrait-unchanged.jpg). Browser operation and capture were performed by the implementation agent.

My independent calculation from the [actual SVG paths and DOM measurements](evidence/horizontal-corners/browser-qa.json) passed **64 segment-versus-panel checks**, inflating each panel rectangle by 8px. All captured labels stay inside their viewport. All three landscape records have matching first-segment X/Y offsets, horizontal second segments and matching left/right endpoints. In the compact view the shared diagonal deliberately steepens; different horizontal lengths accommodate the asymmetric vessel. These are appropriate consequences of the new corner-placement request. See the [independent check result](evidence/horizontal-corners/critic-check.json).

The renderer, model and environment hashes remain identical to the preceding iteration; the approved portrait routing and anchors are unchanged on inspection. The [validation record](HORIZONTAL-CORNERS-VALIDATION.md) correctly distinguishes a successful production build from development-server GPU captures. I did not test production runtime or infer a performance improvement.

Remaining limits are minor: the long left-side runs are visually heavier than the right-side runs, and short landscape screens retain a small spacecraft because framing was deliberately outside scope. Four representative states and one drag limit do not establish every possible camera pose or owner-defined label. Deferred readers, forms, admin, SEO and unrelated rendering features were not scored or penalized.
