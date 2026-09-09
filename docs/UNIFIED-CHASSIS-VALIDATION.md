# Unified spacecraft chassis

This iteration applies the user's **95/100 independent critic target to the chassis only**. It does not reinstate the original portfolio-wide requirements for future iterations. The final judgment is in [CRITIC-REPORT.md](CRITIC-REPORT.md); the previous [rounded-nose review](CRITIC-REPORT-ROUNDED-NOSE.md) is historical.

## Result and scope

One beveled pressure face now surrounds all four cabins and the ladder bay. Shared structural webs close the former inter-room gaps. A continuous roof/side/keel envelope and rear cover carry the same profile through the craft's depth. Two shallow blind inspection recesses give the central beam a deliberate finish. The service module sits in a gasketed flange and tapered fairing. Cabin anchors, furniture, racks, floors, interior walls, fixtures, labels, lights and controls retain their baseline geometry and placement.

The ladder's rear lining is a closed contoured panel with a curved return fitted to the shell. Rail stand-offs meet both the ladder and lining; supported landings clear the docking leaf. A compact circular docking mount replaces the offset rectangular saddle, with sleeve, pressure diaphragm and inner hatch sharing one axis derived from the actual ladder wall. Both inside and outside longitudinal shoulder normals are smoothed while their geometry and crisp bevel normals are preserved.

The [baseline](evidence/unified-chassis/baseline-overview.jpg) and [final production overview](evidence/unified-chassis/production-desktop-overview.jpg) show the structural change. Final opposing views expose the [nose and docking joint](evidence/unified-chassis/production-oblique-nose.jpg) and [service side](evidence/unified-chassis/production-oblique-service.jpg).

The spacecraft renderer, camera/input implementation, Earth/background, database and distinct reading/form interfaces are unchanged. No selectable-room contents were rearranged. The new shell is excluded from picking and included in overview bounds and existing disposal traversal.

## Evidence

- [Preservation audit](evidence/unified-chassis/preservation-audit.json): **672 protected source parts match across 24 layout/state combinations** against commit `bb326e6`. It compares current-state geometry, instance matrices, room-local and room-assembly transforms, material and shader parameters, texture drawing commands, flags, lights, visibility and control metadata. It also compares navigation anchors and verifies the batching implementation is unchanged. Only [explicitly named outer surfaces](evidence/unified-chassis/chassis-exclusions.json), scoped to specified rooms and expected counts, are exempted.
- [Independent geometry audit](evidence/unified-chassis/chassis-geometry.json): **790 bounded samples** cover cabin aperture clearance, shared webs, side passages, roof/keel depth joins and closed recess floors in both layouts. Changed structure coordinates, normals and overview bounds are checked directly from model geometry.
- [Ladder/docking audit](evidence/unified-chassis/ladder-dock-geometry.json): 38 checks cover the closed, consistently wound lining; coaxial mounting; sleeve/wall contact; sealed diaphragm samples; rail stand-offs and landing/leaf clearance. The upper landing clears the leaf by .350 wide / .166 compact model units. Exact triangle-edge ray misses are recorded and retried with a stated numerical tolerance.
- [Shoulder audit](evidence/unified-chassis/shoulder-normals.json): all four inner/outer caps retain exact positions, UVs and indices; **3,000 bevel/end normals are unchanged**. Across 256 eligible curved-seam comparisons, the maximum normal jump drops from roughly 9° to 0°.
- [Portal/framing audit](evidence/unified-chassis/portal-framing-audit.json): 162 passage rays and 162 modeled doorway visibility poses pass, alongside physical sign, portrait-label and lighting checks. An initial historical fixture name failed after the liner was replaced; the audit now recognizes the new liner without relaxing its four-surface lighting assertion.
- [Build](evidence/unified-chassis/build.txt), [typecheck](evidence/unified-chassis/typecheck.txt) and [lint](evidence/unified-chassis/lint.txt) pass. [Source hashes](evidence/unified-chassis/source-hashes.json) tie the evidence to the final model and show that the renderer and environment files remain unchanged.

The [browser record](evidence/unified-chassis/browser-qa.json) stores final viewport, camera, lighting, route and cadence diagnostics alongside each production screenshot. CPU ray samples do not certify that every possible intersection is absent; canvas command equality does not replace GPU text rendering. Browser viewport emulation does not establish physical phone performance or a full accessibility certification. Distinct readers, admin, contact submission and unchanged Earth rendering were deliberately excluded from this iteration's feature testing.

The native doorway tour reached Projects, Case studies, About and Contact with the same production renderer instance. The [320-pixel overview](evidence/unified-chassis/production-phone320-overview.jpg), [320-pixel selected room](evidence/unified-chassis/production-phone320-projects.jpg) and [390-pixel overview](evidence/unified-chassis/production-phone390-overview.jpg) retain the complete outer silhouette or the intended cabin contents. Overview roll remains +90° on portrait screens, with upright attached room labels; selected rooms return to zero roll. The [106-frame ladder crossing](evidence/unified-chassis/ladder-crossing-trace.json) was recorded separately on the development server because detailed camera tracing is intentionally disabled in production. Its final frame reaches About with no flight remaining. Production [error/warning logs](evidence/unified-chassis/browser-logs.json) are empty in the captured window.

## Cost and maintenance

The procedural asset remains editable TypeScript in `components/spacecraft-model.ts`. Wide and compact shell variants are generated once, then visibility switches with layout. No per-frame geometry rebuilding, additional light, downloaded asset, runtime dependency or database migration was introduced. Shared construction and stable content anchors add initial geometry work while keeping ongoing owner edits independent of the 3D model.

The documented nine-project/three-case-study CPU fixture increases eligible scene submissions before frustum filtering from **273 to 276** and eligible triangles from **494,974 to 502,370** (about **1.5%**). Total resident scene triangles, including hidden layout/reader objects, increase from 581,358 to 614,414. These are model inventory counts, not GPU draw-call timings; the production browser record reports its actual frame submissions separately.

All twelve final [production cadence windows](evidence/unified-chassis/frame-samples.json) contain 360 frame intervals at effective DPR 1 and have 16.7 ms medians. Desktop p95 values range from 32.4–33.7 ms; phone viewport p95 values range from 18.5–18.6 ms. Desktop overview/nose windows each contain one interval over 50 ms and Contact contains four. Windows may overlap, so these are not summed as unique stutters. These shared-host observations do not establish a causal regression or guarantee 60 FPS; slower windows remain in the evidence.

## Reproduce and run

```sh
npm run typecheck
npm run lint
npm run build
node scripts/chassis-preservation-audit.mjs
node scripts/chassis-geometry-audit.mjs
node scripts/ladder-docking-geometry-audit.mjs
node scripts/shoulder-normals-audit.mjs
node scripts/portrait-ladder-audit.mjs
npm run dev -- --port 3000
```

The comparison audits read the committed baseline `bb326e6`; retain Git history when reproducing them. Each script accepts an output path as documented in its header. The old standalone `walkway-shape-audit.mjs` targets the superseded separate collar and is historical; the new geometry and ladder/docking audits replace it for this chassis.

The local site is left running at `http://localhost:3000/` with the existing editable sample database. See [OPERATIONS.md](OPERATIONS.md) for setup/admin/deployment and [ASSETS.md](ASSETS.md) for the asset contract. The temporary production test server is stopped after review. No public deployment is claimed.
