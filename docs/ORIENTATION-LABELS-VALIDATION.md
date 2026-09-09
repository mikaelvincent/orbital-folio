# Exterior labels, identity and ladder lining

This revision addresses the five requested exterior fixes against commit `ebff2d0`. The preceding 95/100 target applied only to that chassis iteration; this review uses the standing temporary 75/100 target with a 6/10 floor per area. The independent result is in [CRITIC-REPORT.md](CRITIC-REPORT.md). The [previous chassis report](CRITIC-REPORT-UNIFIED-CHASSIS.md) is retained as historical evidence.

## Changes

Each room now has one visible complete exterior nameplate. Switching orientation hides the inactive collar, backing, enamel, clasps and ink together. Both alternatives end at the corresponding front-aperture edges and use the same .57-unit thickness and end insets. Horizontal spans follow room width; the text redraws to fit without stretching glyphs. Selected rooms retain their existing internal headers and hide the exterior assemblies.

The physical portfolio-name band and its fittings are removed. A lightweight HTML heading sits above the ship, using the published domain hostname with owner-name fallback. It links to overview, retains one main heading and reserves its measured height in camera framing. The visual name is capped at two lines so long hostnames leave space for the craft; the full accessible name remains intact. All identity remains database driven.

The separate inner curved shell skins and raised docking backing slab are removed. The rear liner now extends to the front aperture along the shoulders, with fitted returns into the central docking wall. A recessed gasket ring and pressure leaf seal the hatch opening. The exterior cap geometry is preserved. Selectable-room props, floors, interior headers, controls and lighting remain unchanged.

Responsive verification uncovered a world-coordinate framing defect: measuring a rolled root could apply the rotation twice on resize. Scene metadata now composes descendant local matrices in vessel coordinates, preserving the live root/parent transforms. This covers exterior bounds, doorway positions and axes, hotspots and required framing points.

## Evidence

- [Production browser records](evidence/orientation-labels/browser-qa.json) pair actual GPU screenshots with viewport, heading, label-assembly, camera and renderer diagnostics. Desktop and 390/320 portrait overviews show the inactive plates removed and the name above the ship. Native drags expose opposing lining/hatch angles. Resizing and room/overview navigation retain the renderer instance.
- [Cabin preservation](evidence/orientation-labels/preservation-audit.json): 624 protected source parts match across 24 states in wide/compact layouts, including geometry, placement, material/shader/texture commands, lights, visibility and control metadata. Only [the explicitly redesigned exterior labels and side-label anchors](evidence/orientation-labels/label-exclusions.json) are exempted; interior headers are protected. The batching implementation remains unchanged.
- [Label audit](evidence/orientation-labels/label-audit.json): 36 visibility/layout states, 12 complete-bound endpoint cases, 24 text-fitting cases and 24 physical attachment probes pass. Canvas command checks supplement actual GPU views; they do not establish pixel-identical font rendering.
- [Liner/hatch geometry](evidence/orientation-labels/liner-sheet-audit.json): removed layers are absent from actual batches. In each layout all 66 rear joins match, 72 front contact points lie within the fascia, 845 sampled rays seal the hatch opening and 18 passage rays remain unobstructed. These are bounded geometric probes, not a certification of every possible intersection.
- [Transform invariance](evidence/orientation-labels/metadata-audit.json): 72 states cover portrait roll, tilted/translated roots, and nonuniform scale under a transformed parent. All 26 metadata fields and descendant geometry match identity-space results; live transforms remain unchanged.
- [Build](evidence/orientation-labels/build.txt), [typecheck](evidence/orientation-labels/typecheck.txt) and [lint](evidence/orientation-labels/lint.txt) pass. [Source hashes](evidence/orientation-labels/source-hashes.json) identify the reviewed source; the Earth/background source is unchanged.

The critic independently inspects source, actual saved GPU images and validation evidence. It also runs its own complete-assembly visibility probe and local production HTTP checks. Capture operation uses the implementation agent's browser; viewport emulation is not physical-phone testing. A [six-case CSS/DOM fixture](evidence/orientation-labels/heading-css-fixture.json), executed in the in-app browser, checks the actual final identity styles with a 253-character hostname at 320×740, 700×480 and 1440×1000. Both home and room variants retain the full accessible-name markup, stay within two visual lines, avoid document overflow and leave positive scene space. This is isolated layout evidence; a live admin personalization workflow and assistive-technology operation were not tested. Distinct project readers, forms, admin and Earth/background were neither modified nor broadly retested.

## Maintenance and operation

The procedural asset adds no dependency, texture download, light or database migration. Both orientation families remain resident so switching is immediate; only the active family contributes visible geometry. Horizontal layout variants are created once. Label textures redraw only when their physical width changes, and existing disposal owns all variants. The heading uses native HTML; its resize observer shares renderer cleanup. Geometry inventory and host frame diagnostics must not be interpreted as proof of faster GPU performance.

Reproduce from the repository root, retaining Git history for baseline comparisons:

```sh
npm run typecheck
npm run lint
npm run build
node scripts/chassis-preservation-audit.mjs . /tmp/preservation.json docs/evidence/orientation-labels/label-exclusions.json ebff2d0
node scripts/liner-sheet-audit.mjs . components/spacecraft-model.ts /tmp/liner.json
node scripts/spacecraft-label-audit.mjs . ebff2d0 components/spacecraft-model.ts /tmp/labels.json
node scripts/spacecraft-metadata-audit.mjs . components/spacecraft-model.ts /tmp/metadata.json
node scripts/orientation-labels-critic-state.mjs . components/spacecraft-model.ts /tmp/critic-state.json
npm run dev -- --port 3000
```

The local site is left running at `http://localhost:3000/` with the existing editable sample database. The temporary production verification server is stopped after review. Setup/admin/deployment instructions remain in [OPERATIONS.md](OPERATIONS.md); no public deployment is claimed.
