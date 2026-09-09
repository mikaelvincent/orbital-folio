# Natural orbit render validation

This note covers the latest spacecraft, camera, scene navigation, input, procedural Earth and space-background revision. The independent acceptance result is recorded separately in [CRITIC-REPORT.md](CRITIC-REPORT.md). It does not claim a new regression pass for the separate reading interfaces, admin, database, publishing or contact workflows.

The final geometry optimization, production build and numerical audits pass. Final source hashes and raw browser measurements are retained alongside the visual evidence.

Evidence is under [natural-orbit-revision](evidence/natural-orbit-revision/). The [browser record](evidence/natural-orbit-revision/browser-qa.json) contains exploratory states as well as later checks. Entries with `excludedReason` and the explicitly stale route trace are excluded from the conclusions below.

## Scene construction and visual evidence

The current grid is Experience upper left, Projects upper right, About lower left and Contact lower right. The left passage joins the rows. Physical side-wall plaques sit above their doorways; upper/lower hull identity bands are attached to the pressure collars. Exterior identity ink appears in overview and hides in close room views, avoiding a cropped oversized domain on phones. The bands themselves remain. [Production overview](evidence/natural-orbit-revision/production-desktop-overview.jpg), [Experience at 390 pixels](evidence/natural-orbit-revision/phone390-experience-final.jpg) and [Experience at 320 pixels](evidence/natural-orbit-revision/phone320-experience-final.jpg) show these states.

Idle cabin surfaces and emissions dim while the selected/hovered room returns to normal. Interior and exterior material batches are separated, and physical point-light intensities remain constant to avoid changing the exterior through unshadowed light leakage. The [model audit](evidence/natural-orbit-revision/model-audit-summary.json) covers 25 lighting states with all 55 exterior materials invariant. That numerical result verifies material behavior; the saved overview and room screenshots supply separate browser appearance evidence.

[All nine spare bays](evidence/natural-orbit-revision/all-nine-spare-bays.jpg) shows a zero-project model state with nine distinct secured props. Spare compartments have no fake project labels or project picks. The model audit checks 198 slot/page mappings across counts 0, 1, 8, 9, 10, 18 and 19 plus reorder/shrink/grow mutations. This is model-input evidence, not a fresh admin or persistence workflow test.

Physical signage has a deliberate limit. The [390-pixel audit](evidence/natural-orbit-revision/model-audit-summary.json) and [320-pixel audit](evidence/natural-orbit-revision/model-audit-320-summary.json) pass ordinary rest/hover ink and picking rays. Literal side-facing text can nevertheless shrink to about five pixels in the narrowest sampled phone pose. Extreme optional drag occludes a far sign in 12/48 diagnostic poses at 390 pixels and 18/48 at 320 pixels. The whole doorway remains a pick target, with readable equivalent destinations in bottom navigation; simultaneous legibility at every drag angle is not claimed. The [model notes](evidence/natural-orbit-revision/model-notes.md) describe these limits and the synthetic Canvas text measurements used by the audit.

## Actual browser navigation and input

The [valid C-route trace](evidence/natural-orbit-revision/c-route-browser-trace.json) contains 1,200 camera samples, one recorded renderer identifier and the travelled order Projects → Experience → About → Contact. Its planned waypoints pass through X = −5.6 at the left passage. The observed minimum camera X is **−5.599579102962951**, and the trace ends at Contact with `travelling: false`. This establishes actual traversal of the passage rather than relying solely on the planned itinerary. [c-route-stale-excluded.json](evidence/natural-orbit-revision/c-route-stale-excluded.json) is historical and is not supporting evidence.

The browser record also captures doorway activation from Experience to Projects and About to Contact, persistent Home return, and phone menu Tab navigation. Escape closes the phone menu and returns focus to its trigger. Captures at 320, 390, 768 and 1440 pixels record zero horizontal overflow. The final focused [320-pixel accessibility check](evidence/natural-orbit-revision/accessibility-phone320-final.json) reports zero violations; it is a check of that rendered route/state, not a broad site accessibility audit.

Native mouse records show larger bounded overview drag, reverse drag and easing into the smaller room envelope. A production drag beginning on an occupied locker reached a 340.77-pixel maximum excursion, recorded `dragged: true` and `activated: false`, and stayed on `/projects`. The [before](evidence/natural-orbit-revision/production-projects-before-drag.jpg)/[after](evidence/natural-orbit-revision/production-projects-after-drag.jpg) images and [transition trace](evidence/natural-orbit-revision/drag-room-transition.json) accompany these records. The same production renderer identifier persists across the overview and Projects checks.

The [pure input audit](evidence/natural-orbit-revision/input-audit.json) separately checks finite bounded angles, sticky maximum excursion for out-and-back drags, pointer identity, rapid reversals and continuous live angle-limit transitions. [Touch branch evidence](evidence/natural-orbit-revision/render-touch-branches.json) dispatches synthetic touch PointerEvents through mounted handlers; it verifies drag/cancel branches without claiming physical touch scrolling or pinch testing. Render-level reduced-motion records show unchanged active time and cloud rotation while paused. No physical-device or OS-preference-switching pass is inferred from these checks.

## Procedural Earth v12

The actual browser [desktop early](evidence/natural-orbit-revision/cloud-v12-desktop-early.jpg), [desktop later](evidence/natural-orbit-revision/cloud-v12-desktop-later.jpg), [phone early](evidence/natural-orbit-revision/cloud-v12-phone-early.jpg) and [phone later](evidence/natural-orbit-revision/cloud-v12-phone-later.jpg) captures record v12. Phone captures include different widths and poses; they are not a controlled identical-camera comparison. Earlier cloud candidate images, including `overview-cloud-final-first.jpg`, remain historical evidence and should not be mistaken for the latest v12 result.

V12 retains a water-only planet and curved weather front, separates local billows from the cyclone stretch, strengthens irregular foreground erosion and uses bounded directional relief. Desktop detail sampling splits the major screen footprint into two taps. The [v12 notes](evidence/natural-orbit-revision/cloud-v12-notes.md) explain the original procedural algorithm and its thin-layer limitations. There are no external Earth/cloud image requests.

The [environment CPU audit](evidence/natural-orbit-revision/environment-audit.json) verifies 17 desktop / 11 mobile cloud texture reads and **773,950 / 118,590 logical GPU texture bytes**, including sky/cloud mip chains. These are format-based allocations, excluding geometry, render targets and driver overhead. CPU field/footprint and patch metrics are diagnostic evidence, not browser screenshots or GPU timings. The audit also verifies active-time pause behavior, no per-frame texture uploads, bounded meteor concurrency and idempotent resource disposal. More frequent meteor groups remain bounded to three simultaneous streaks, driven by the same active clock.

## Geometry, production performance and build

These actual single-tab built-production records use a 360-interval window and effective renderer DPR 1. These first three samples precede the final geometry optimization; later rows measure the accepted model after CPU audits completed.

| Browser record | Viewport | p50 | p95 | Intervals > 50 ms |
|---|---:|---:|---:|---:|
| `production-single-tab-overview-current` | 1440×1000 | 32.7 ms | 34.2 ms | 4 |
| `production-projects-settled-after-drag` | 1440×1000 | 33.2 ms | 34.2 ms | 1 |
| `production-mobile390-settled` | 390×844 | 16.7 ms | 33.3 ms | 0 |
| `final-idle-audits-complete-desktop-overview` | 1440×1000 | 16.70 ms | 17.60 ms | 0 |
| `final-idle-audits-complete-desktop-projects` | 1440×1000 | 16.70 ms | 17.60 ms | 0 |
| `final-idle-audits-complete-phone390-experience` | 390×844 | 16.70 ms | 17.60 ms | 0 |

The accepted tessellation reduction removes **74,128 model triangles (14.5%)** and **2.43 MiB of geometry buffers**. All curved rounded-box samples are retained; only straight-span midpoint samples and small-fitting subdivisions were removed. Draw calls and cloud sampling are unchanged. The [portable cost audit](evidence/natural-orbit-revision/geometry-cost-audit.json), [reproduction notes](evidence/natural-orbit-revision/geometry-cost-notes.md), [overview](evidence/natural-orbit-revision/geometry-optimized-overview.jpg) and [close cabin](evidence/natural-orbit-revision/geometry-optimized-projects.jpg) document cost and appearance separately. No causal FPS gain is claimed.

These are observed frame intervals on this host, not a 60 fps guarantee, GPU timer measurement or physical-phone benchmark. The window can retain intervals from navigation until enough new frames arrive. Earlier slower records are retained. The [paused-render control](evidence/natural-orbit-revision/paused-render-frame-control.json) measured display callbacks with the canvas still mounted and rendering paused; it describes host scheduling and does not isolate cloud cost or establish causation for slower scene frames.

[Typecheck](evidence/natural-orbit-revision/typecheck.txt), [lint](evidence/natural-orbit-revision/lint.txt), [build output](evidence/natural-orbit-revision/build.txt), [source hashes](evidence/natural-orbit-revision/source-hashes.json) and [production asset checks](evidence/natural-orbit-revision/root-assets-final.json) are packaged. The production build completed with exit status 0, as did typecheck, lint and the scoped render audits. All 11 final SSR-referenced CSS/JavaScript files returned HTTP 200 after restarting the production preview. No broad reader/admin test result is claimed here.
