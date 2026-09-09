# Portrait overview and ladder-bay revision

This pass changes only spacecraft geometry, scene lighting, doorway signs, camera framing and related render input. The temporary review target remains **75/100, with 6/10 per equally weighted area**. Separate readers, forms, admin workflows and unchanged Earth/background features are excluded. The prior [Case studies review](CRITIC-REPORT-CASE-STUDY-CABINS.md) is historical; [the archived independent report](CRITIC-REPORT-PORTRAIT-LADDER.md) covers this pass.

## Delivered behavior

- Ladder interiors use 0.10 at idle, 0.50 when hovered from within a cabin, and 1.00 during actual traversal. These are material multipliers, not measured display luminance. The exposed hull stays lit, and shared threshold liners follow the brighter adjacent room. No new doorway lights were added.
- Door backing and enamel no longer have coincident front surfaces: the faces are separated by 0.01 units, with a further 0.003 gap to matte ink. Trilinear filtering, anisotropy 8 and a small depth bias stabilize the lettering. Ordinary overhead arrows point to the door opening immediately below; ladder symbols carry up/down deck direction. Both ladder entrances have additional signs.
- The ladder shell, inner liner and front pressure rim share rounded top-left and bottom-left shoulders. Its existing open side passages and docking interior remain intact.
- Portrait overviews rotate the whole spacecraft +90° with the satellite/service end upward. Exterior room lettering switches to fixed, enlarged perpendicular collars and counter-rotates −90°, remaining attached and readable. Selected cabins return upright. The full craft fits, including docking hardware and arrays.
- Portrait flights first pull back, rotate within a fitted envelope, then approach the room. The fit covers intermediate hull angles at both endpoint target centers, allowing the target and rotation springs to move independently. Camera depth range expands for very tall screens.

All assets remain editable procedural TypeScript; owner copy, room labels and vessel branding still come from the existing database. This pass does not require a content migration. The seed database remains available on the running development server.

## Evidence

The [browser record](evidence/portrait-ladder-revision/browser-qa.json) includes desktop, 320×844 and 390×844 phones, a 768×1024 portrait tablet, and a 320×1024 tall viewport. Every captured overview reports full-craft fitting and zero horizontal page overflow. The [production desktop overview](evidence/portrait-ladder-revision/production-desktop-overview.jpg) shows the rounded bay and low interior lighting; the [portrait tablet](evidence/portrait-ladder-revision/tablet768-overview.jpg) shows the alternate attached collars and service end upward.

The [149-frame real ladder crossing](evidence/portrait-ladder-revision/ladder-transit-trace.json) contains 73 actual walkway-transit frames and reaches level 1.0. The [doorway hover](evidence/portrait-ladder-revision/desktop-ladder-hover.jpg) and corresponding data show 0.5; idle overviews show 0.1. Transit follows the current camera focus inside the walkway bounds, not merely a planned route.

The [320-pixel entry](evidence/portrait-ladder-revision/phone320-entry-trace.json) and [return](evidence/portrait-ladder-revision/phone320-return-trace.json) preserve the same renderer and finish at zero / +90° roll. The independent reviewer reprojects the recorded camera transforms against all eight conservative hull corners during the actual rotation. The [tall-phone trace](evidence/portrait-ladder-revision/tall320-entry-trace.json) also records the expanded camera far plane (100.37), avoiding the previous fixed-80 depth limit. Selected approaches intentionally crop the overall spacecraft to show the cabin.

The [focused model audit](evidence/portrait-ladder-revision/model-audit.json), runnable with `node scripts/portrait-ladder-audit.mjs`, passes 40 walkway states, 18 physical sign checks, 12 portrait plaque checks, 162 open-passage rays and 162 ordinary-hover sign poses, including 320-pixel framing. All 46 exterior materials remain invariant, all nine walkway interior materials dim independently, geometry is finite and normals are unit length. CPU checks support visual evidence; they do not establish GPU image quality by themselves.

The production [before](evidence/portrait-ladder-revision/production-about-signs.jpg), [during](evidence/portrait-ladder-revision/production-about-signs-motion.jpg) and [settled](evidence/portrait-ladder-revision/production-about-signs-drag-settled.jpg) sign captures show the stabilized surfaces during a native bounded drag. The [gesture record](evidence/portrait-ladder-revision/production-sign-drag.json) retains the unchanged room URL and non-activation. This addresses the proven overlapping-surface defect; ordinary subpixel aliasing and desktop contact shading can still affect very small text.

[Typecheck](evidence/portrait-ladder-revision/typecheck.txt), [lint](evidence/portrait-ladder-revision/lint.txt), and the [production build](evidence/portrait-ladder-revision/build.txt) pass. The [HTTP record](evidence/portrait-ladder-revision/production-http.json) verifies the scene route and all 11 referenced CSS/JavaScript assets. The final captured [browser error/warning window](evidence/portrait-ladder-revision/browser-logs.json) is empty. [Source hashes](evidence/portrait-ladder-revision/source-hashes.json) identify the tested renderer, model and focused audit.

The five retained [production frame samples](evidence/portrait-ladder-revision/production-frame-samples.json) each contain 360 intervals, with 16.7 ms medians and 17.7–18.1 ms p95 on this host at effective DPR 1. These are browser callback intervals, not GPU timing or evidence of an improvement over the prior version.

## Practical limits and operation

The clearance sequence takes about 7.9 seconds each way at 320×844 and 8.9 seconds for the captured 320×1024 entry. This is a deliberate full-craft framing tradeoff; transition pacing can be tightened in a later polish pass. On narrow phones, physical side-door text is still small, so the existing native navigation remains helpful. The tests use desktop browser viewport emulation, not physical-phone GPU or touch hardware certification. Separate interfaces were intentionally not retested.

Run `npm run dev -- --host 127.0.0.1` and open `http://localhost:3000/`. The existing local server is left running after this task. For a production preview, run `npm run build`, then `npm run start -- --port 4173`; restart the preview after rebuilding so server markup and asset filenames match. See [OPERATIONS.md](OPERATIONS.md) for database/admin and deployment instructions, and [ASSETS.md](ASSETS.md) for the scene contract.
