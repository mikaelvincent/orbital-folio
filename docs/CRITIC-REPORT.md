# Independent critic — exterior labels, heading and lining

**89.6/100. Pass for this iteration’s temporary 75/100 target and 6/10 minimum in every area. No unresolved requirement blocker was found within the five requested fixes.** This is a fresh, scoped assessment; the previous chassis-only 95/100 score is not carried forward.

| Equally weighted area | Score | Assessment |
|---|---:|---|
| Visual coherence and identification | 9.2/10 | One complete exterior plate per room reads clearly in each overview orientation. The separate HTML identity gives the vessel more space and removes the redundant physical name band. |
| Assembly geometry | 9.3/10 | Complete hardware visibility, aperture-relative endpoints and the lining/hatch reconstruction have concrete geometry evidence. The two exposed-sheet defects are resolved in the inspected opposing views. |
| Responsive visibility and framing | 9.0/10 | The full craft fits the recorded 320/390 portrait overviews; room views remain upright. Wide–portrait–wide transitions preserve consistent framing. |
| Accessible heading and navigation integration | 8.5/10 | Native heading/link semantics, visible keyboard focus, overview activation and bounded long-name layout are verified. This is not a full assistive-technology or personalization audit. |
| Preservation, render cost and maintainability | 8.8/10 | Protected interiors match the baseline, production assets resolve and build checks pass. Variant ownership is clear; additional visible batching and variable host frame cadence limit performance conclusions. |

Overall = the sum of the five scores × 2.

## Evidence and findings

I independently inspected current source, the supplied defect crop and actual saved GPU images, including the [final desktop overview](evidence/orientation-labels/production-final-desktop.jpg), [final 320-pixel overview](evidence/orientation-labels/production-final-phone320.jpg), [ladder oblique](evidence/orientation-labels/production-oblique-ladder.jpg) and [opposing angle](evidence/orientation-labels/production-opposing-angle.jpg). The reviewed model is `a994c80065f88352b61b8551eac7437a36f42d8a632f193501ac7a844f4daef4`; [source hashes](evidence/orientation-labels/source-hashes.json) identify the final heading/CSS build as well.

The inactive plate is removed from visible geometry as a complete assembly, including its collar, backing and fittings. My separate [state probe](evidence/orientation-labels/critic-state.json) checks actual post-batching visibility across 30 layout/orientation/room states and finds no obsolete physical branding geometry. Overview has one active assembly per room; selected views hide both exterior alternatives while retaining internal headers. The implementation’s [label audit](evidence/orientation-labels/label-audit.json) additionally covers 36 states, 12 endpoint cases, 24 typography cases and 24 attachment probes. Both orientation alternatives end at their corresponding aperture edges with matching thickness and end alignment.

The lining changes are structural, rather than a camera trick or visibility mask. The old separate inner skins and raised docking backing slab are absent. Extended liners meet the front surround; fitted returns, a recessed gasket and pressure leaf close the docking opening. The [liner audit](evidence/orientation-labels/liner-sheet-audit.json) supplies bounded join, contact, seal and passage probes. These checks support the observed repair, without proving every possible geometric intersection.

The initial nine [production browser records](evidence/orientation-labels/browser-qa.json) share renderer `e4cba49c…` through native drags, resize, room selection, keyboard heading activation and return to desktop. The two final captures use a second renderer after an explicit reload of the two-line heading-cap build. I do not treat all eleven captures as one continuous instance. [Transform checks](evidence/orientation-labels/metadata-audit.json) also cover 72 states and 26 metadata fields, including rolled/transformed parents; geometry and framing metadata remain vessel-local.

The [keyboard focus image](evidence/orientation-labels/production-heading-keyboard-focus.jpg) and browser records establish native focus and return-home behavior. My exact-CSS/DOM fixture was executed separately by the implementation agent in the in-app browser: all [six cases](evidence/orientation-labels/heading-css-fixture.json) pass with a 253-character hostname at 320×740, 700×480 and 1440×1000. Both markup forms remain within two visual lines, retain full-name markup, have one H1, avoid document overflow and leave positive scene space. The fixture matches final CSS hash `b78f148d…`. This is isolated layout evidence, not a live admin or screen-reader workflow.

[Preservation evidence](evidence/orientation-labels/preservation-audit.json) compares 624 protected parts in 24 states against `ebff2d0`, with explicit exterior-only exclusions and unchanged batching implementation. Interior geometry, props, headers, lighting and controls remain protected. [Typecheck](evidence/orientation-labels/typecheck.txt), [lint](evidence/orientation-labels/lint.txt) and [build](evidence/orientation-labels/build.txt) pass. My [production HTTP check](evidence/orientation-labels/critic-http.json) confirms `/` and `/projects` return 200 with one parsed H1 each, and all eleven directly referenced JS/CSS assets return 200.

## Remaining limits

Very long names are visually truncated after two lines; their full semantic text remains available. Portrait room framing continues to show some neighboring structure to preserve usable cabin width. Neither is a blocker for these exterior changes.

Both label families remain resident for immediate switching, and separate visibility groups incur a small submission cost. Fewer inventoried triangles do not establish a speed improvement. Recorded 360-frame windows at effective DPR 1 include later desktop p95 values of 33.7 and 34.2 ms and occasional intervals above 50 ms; these remain in the evidence. No guaranteed 60 FPS, GPU timing or physical-device performance claim is justified.

Browser captures and fixture execution were operated by the implementation agent; my source, image, state-probe and HTTP review was independent. Physical-phone and OS assistive-technology checks remain unverified. Deferred readers, forms, admin workflows and unchanged Earth/background were excluded without penalty. This report establishes the current local revision’s scoped result, not public deployment or whole-portfolio completion.
