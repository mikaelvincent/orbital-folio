# Independent critic — room-label legibility

Date: 2026-09-10
Reviewer: sign_legibility_review (read-only diagnosis and comparison)
Verdict: PASS — 97/100, scoped to the requested Projects/Contact sign readability fixes.

## Evidence reviewed

Baseline: all six images in `docs/evidence/room-identification`, plus the previous Projects workshop overview.
Final: all eight images in `docs/evidence/room-label-legibility`: selected desktop Projects/Contact, portrait selected Contact/Projects with unchanged legacy room signs visible, portrait/desktop overviews, and both oblique selected views. I separately inspected a crop of the Contact sign in the final desktop overview to distinguish frame occlusion from letter occlusion.

Reviewed source: spacecraft-model.ts, projects-workshop.ts, contact-flight-console.ts, their diffs, and final geometry-audit.json. This visual review did not operate the browser or alter the checkout.

## Score

- Letter size and immediate identification: 35/35. The new titles are markedly easier to recognize. Both selected portrait images directly demonstrate that Projects/Contact are now at least as legible as the legacy About/Case Studies signs shown in the same captures.
- Contrast and lettering treatment: 25/25. Dark print on ivory solves the prior pale-text-on-gray appearance. The heavy letterforms remain distinct from the hardware and monitor content in desktop and portrait views.
- Sign placement and equipment separation: 19/20. The deliberate wall gap makes the sign a room heading rather than an equipment strip. The ceiling relationship remains close in small views, but neither equipment nor lights touch the text.
- Overview and oblique visibility: 8/10. Titles remain readable in both oblique views. Contact's upper frame is partially hidden by the aperture in the desktop overview, and the lettering has little upper breathing room there; the CONTACT letter shapes themselves remain visible. This is a small composition limitation, not the former unreadability or an incomplete-word defect. The portrait overview retains the established physical room orientation with exterior upright callouts; no new overlap is evident.
- Physical fit and preservation: 10/10. Floor feet stay planted, shortened posts connect to the lowered furniture, and equipment retains its proportions. The supplied geometry audit supports what is visible: 14 checks pass, with 629 protected meshes unchanged across 12 states and no header/light or header/equipment collisions.

## Why it resolves the complaint

The original equipment headings used a 0.14-high ink plane versus 0.18 for legacy signs, a pale-on-slate treatment, and a center at Y1.32 close to the lights and top equipment. The final headings use a 0.24-high ink plane, dark print on ivory, and Y1.16 placement with forward depth that keeps the lower Contact room title visible. Equipment moves down as rigid assemblies while their floor support chains are adjusted, giving the larger headings space without distorting the objects.

## Limits

This is a visual comparison of the eight supplied final captures and the three-file source diff, supplemented by the supplied geometry audit. Static screenshots do not prove temporal shimmer-free behavior on every GPU or every viewport. No deductions were made for deferred interactions, readers, category browsing, or unrelated room/environment design.

## Final source hashes

- components/spacecraft-model.ts: 79de089c184f9a8b23cd1236a7602b9b8baf030bd690e30b7209bc2730b178a9
- components/projects-workshop.ts: aa26a4aa3b04821f763a5350ac4002ea50ca1613790b6fff8e9e28b9daff550d
- components/contact-flight-console.ts: 21227200c95bd4505c20fd09c345b45a73ddb618fe39a1719d70b58c3b1938ab
