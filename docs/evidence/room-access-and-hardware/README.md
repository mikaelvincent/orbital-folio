# Visible-room access and sealed spacecraft equipment

15 September 2026. Baseline: `453bf12`. Approved interaction and visual work;
no held performance candidate was implemented. The 8K Mediterranean night Earth,
camera composition, room arrangement and core navigation motion are retained.

## Delivered behavior

A visible neighboring cabin can now be hovered or clicked through its rounded
front opening. It previews the first connecting hatch and keeps the selected
room as the final destination. This matters for the vertically adjacent right
cabins: Contact reaches Case studies through About and the ladder, rather than
stopping at the first door. During an existing flight the same destination queue
is used; newer choices replace the single pending choice. Door/ladder interlocks
and inside-ladder preview restrictions remain in force.

Five hidden opening masks, derived from the existing chassis contours, replace
the four room boxes and gate the existing doorway targets. They exclude the
opaque front frame, dividers and rounded corners without raycasting every piece
of furniture. A room's press/release identity includes its final destination, so
two different rooms sharing a first door cannot accidentally form one click.
The ladder opening gates doorway picking; it is not a new destination.

The equipment pass retains exactly the two label-side air returns in each of the
four cabins. Other vent-like finishes become sealed access covers, solid edge
guards, restraint sockets, wear pads or webbing, depending on their function.
New matched covers populate the visible exterior shoulder and the ladder's inner
ceiling/floor. Broader sealed roof covers fill the formerly bare front roof strip.
See the [complete replacement audit](vent-audit.md), including intentionally
retained book restraints, rack holes and controls.

## Browser evidence

All captures used the hidden built-in browser. Native Safari and the desktop
screen were not captured or controlled. The responsive preview presents a real
1280×720 or 390×844 application iframe at a reduced display scale. Its outer Room
selector selects direct-load URLs and does not track subsequent in-app routes;
the actual cabin heading and recorded route identify the final room.

| Evidence | Observed result |
| --- | --- |
| [Desktop neighbor hover](neighbor-room-hover.png) | From Projects, hovering the visible Case studies cabin previews its connecting hatch. Clicking that room arrives at Case studies. |
| [Portrait nonadjacent hover](nonadjacent-room-hover.png), [state](nonadjacent-hover.json) | From Contact, Case studies is visible above it. Room hover resolves to `contact:about`, the correct first hatch. |
| [Nonadjacent flight trace](nonadjacent-room-arrival.json) | Real canvas click reaches Contact → About → Projects → Case studies. The 110-frame / 3.883-second trace retains the final destination, includes 36 ladder frames and never opens both ladder hatches together. The spacecraft world matrix stays identity. |
| [Drag and leave](drag-hover-leave.json) | Dragging from the neighboring room back to the active floor does not activate navigation. Hover clears, the spring settles and all doors close. |
| [Inert surface clicks](negative-room-clicks.json), [sky](sky-click.json) | Solid divider, rounded front corner, current-room workbench and sky produce no navigation. |
| [Projects](projects-sealed-equipment.png), [Case studies](case-studies-solid-edge.png) | Actual app views show readable unchanged screen content, the retained header vent pairs, and the new solid lower finishes. |
| [Ordinary overview](overview-solid-equipment.png) | Roof and shoulder covers are visible in the actual normal landscape view. The development audit reports 0 accessibility violations. |
| [Browser error log](browser-errors.json) | No captured browser warning or error entries during the final live checks. |

The [ladder overview](ladder-solid-overview.png), [upper crown](ladder-upper-solid.png),
[lower crown](ladder-lower-solid.png), [roof inspection](roof-solid-inspection.png),
[About storage](about-sealed-storage.png) and [Contact equipment](contact-sealed-equipment.png)
use the finite developer model fixture. It renders on demand without the final
GTAO pass and uses placeholder screen textures. Its close inspection views judge
fit/material/form; the high roof inspection alone does not establish supported
camera visibility. The ordinary live overview and actual-triangle visibility
checks provide that separate evidence.

## Verification and corrections

The initial full run recorded 243 passing tests and 2 failures in
[initial-full-tests.log](initial-full-tests.log). Both exposed stale test fixtures:

- The pressure-hull contour ray first struck an intentionally added roof gasket
  at Y=3.1235000105. The next hit was the unchanged pressure skin at 3.0975000858,
  against expected 3.0975. The test now excludes only explicitly marked exterior
  access equipment, retaining all structural/interior meshes, the original
  contour tolerance, ceramic/FrontSide checks and single-owner assertions.
  [Diagnosis](hull-probe-diagnosis.json); [19 focused checks](hull-probe-targeted-tests.log).
- The old batching expectation of 30 removed submissions became 25 after removing
  four Projects slot batches and one Contact slit batch. Exact attribute bytes,
  transforms, colors and render flags still matched before the assertion failed.
  Automatic construction is now compared with the manually verified coalescing
  result, retaining the minimum savings guard. The batching implementation itself
  is unchanged. [Diagnosis](coalescing-diagnosis.json); [five checks](coalescing-targeted-tests.log).

The broad crown covers initially bridged their curved support between vertices.
Subdividing only the curved axis corrected this before integration. The saved
[crown fit](crown-fit.json) and committed regression test probe 320 backing-face
centers; all seat within approximately 0.00149–0.00200 model units of embedding.
The [exterior exposure audit](exterior-visibility.json) tests actual scene triangles
across existing default/drag camera samples. Its legacy `visibleVanes` field
counts cover assemblies, not surviving vanes. Both roof covers are exposed in the
tested default views; shoulder covers are visible from landscape views of the
ladder side, without claiming visibility from the opposite portrait side. These
isolated fixture records precede the helper rename and metadata-only test tag;
the committed fit/visibility tests cover the integrated implementation.

The final run passes **245/245 tests**. Type checking, lint on changed production
files and the production build also pass. Outcomes are recorded in
[full-tests.log](full-tests.log), [typecheck.log](typecheck.log), [lint.log](lint.log),
[build.log](build.log) and [critic review](critic-review.md). The final changed
sources are recorded in [final-source-hashes.json](final-source-hashes.json).
Build output includes the existing framework
notice that some route classifications cannot be determined statically.

The local build helper is used only to run the project's build; no publishing or
deployment occurred. The preview and inventory scripts now resolve historical
imports from Git before filesystem resolution, so baselines remain reproducible
when an equipment helper has been renamed.

## Cost and limits

The integrated [source-hashed inventory](geometry-inventory.json) records 419 → 416
visible meshes, 895,624 → 896,518 triangles (+0.0998%) and +63,164 geometry-array bytes
(+0.06024 MiB). This is a structural count, not GPU time, process memory or a battery
comparison. The new fixtures add no texture, light or continuous animation. See
[ledger entry 16](../../performance-ledger.md#16--sealed-equipment-and-visible-room-navigation).

The rounded targets approximate visibility at the front cutaway; they are not
per-pixel occlusion against arbitrary foreground furniture. Tests cover both
layout contours, representative oblique rays, inside-cabin door access, hidden
geometry budgets and lifecycle. Live checks cover adjacent/nonadjacent room
activation, frame/corner rejection, drag suppression and hover clearing. Queue
override/Home behavior is covered by the shared queue regressions; a new live
queue-override timing claim is deliberately not made. This task does not add a
native Safari, exhaustive device or thermal benchmark.

## Reproduction

- `npm test` — complete regression suite, including visible-room navigation,
  cabin vent policy, exterior/ladder fit, coalescing and existing application tests.
- `npm run typecheck`; `npm run build` — static and production build checks.
- `node scripts/benchmarks/spacecraft-geometry-inventory.mjs 453bf12` — structural
  comparison, including exact source hashes and measurement exclusions.
- With localhost:3000 running, `node scripts/benchmarks/responsive-portfolio-preview.mjs`
  provides the responsive wrapper on 3018. Use `/__viewport?audit=1` for recorded
  DOM navigation diagnostics; default wrapper visits keep diagnostics off.
- `node scripts/benchmarks/spacecraft-polish-preview.mjs 453bf12` — finite before/after
  model fixture on 3017. Stop the temporary preview processes after inspection.

The user's original localhost:3000 development server remains the access point.

## Implementation commits

- `c224764` — visible-room navigation and focused regression coverage.
- `d9e1d70` — sealed equipment, fit checks and historical benchmark compatibility.

This evidence and ledger entry are committed separately from implementation.
