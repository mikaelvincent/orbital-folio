# Physical labels, centered docking and orbital refinement

The pre-change source was clean at commit `0587eee`. This revision increases cloud detail and rotation, adds more frequent occasional paired meteors, centers the docking sleeve, moves the dish to a braced service mount, restores fitted physical room plaques, provides upright portrait plaques, standardizes clear interior headers and brings the room camera closer. Exterior display ink switches off in room views so no duplicate label is cut across the bottom edge. The dark navigation retains its modern type and now handles long labels without growing into multiple rows.

## Evidence

`docs/evidence/physical-labels-revision/` contains current checks and explicitly named earlier exploratory observations:

- `workflows.tap`: all 19 existing HTTP/DB/security/controller tests pass, including another-owner personalization. Tests restore their temporary data.
- `admin-label-roundtrip.json` and private-preview screenshots: four longer labels were saved through the actual browser admin. The physical overview and About header used those values. The original private draft was restored with optimistic revision checking; the published snapshot was unchanged throughout.
- `mounting-audit.json`: 513 checks pass against the recorded current model hash. The docking saddle, cap and clamps remain outside cabin interiors; the mast foot meets the service hull; the dish clears panel and hinge envelopes. All 264 header visibility rays pass. Actual label-state transitions preserve readers, geometry and picking targets. The companion model audit covers 0/1/8/9/10/18/19 projects and seven shrink/reorder cases.
- `environment-audit.json`: continuous periodic field, exact allocations, rotation rates, one-hour meteor schedule per tier, occasional pairs capped at two, pause and disposal. The actual desktop overview record also observed two simultaneous meteors. Numeric checks do not replace visual/GPU testing.
- `browser-qa.json`, `accessibility.json`, and clean desktop/mobile images: actual renderer state, URLs, buffer dimensions, fitted label data, reader attachment, scroll and frame intervals. Matching axe results cover mobile projects, Atlas, Contact and real WebGL context loss with zero violations. Clean production reader screenshots supersede earlier captures with an expanded development audit overlay.
- The final four desktop room images are 1440×1000. The tablet overview and Contact images are 768×1024, with records named `production-tablet-*-corrected`; earlier tablet-named records accidentally retained a desktop viewport and are not tablet evidence. The corrected 844×390 landscape capture verifies the intentional readable fallback below 480 pixels of height. The fallback remains selected until the visitor restores Interactive view.
- `interrupted-flight.json`: real rapid navigation trace. The separately named non-neutral paused samples preserve camera pose and active time.
- `typecheck.txt`, `lint.txt`, `build.txt`, `dependency-audit.json`: successful validation; no reported dependency advisories. The optional Three.js chunk still produces a size warning.
- `restore.json`: 16 records restore with identical draft and published snapshots, excluding private access and inquiries.
- `production-measurements.json` and critic HTTP evidence: complete built-Worker routes and matching referenced assets. The temporary Worker was restarted after the final build.

## Interpretation and limits

The old and new cloud versions both measured around 33 ms median / 50 ms p95 in the same 793×836, DPR-2 development session. That comparison did not show a new-cloud regression. An exploratory resize left the renderer at its old DPR while browser emulation changed to DPR 1, so those larger-buffer observations are not comparable with later freshly loaded DPR-1 views. Current diagnostics record both effective DPR and actual drawing-buffer size. Resizing now refreshes DPR, with caps of 2 desktop, 1.75 mobile and four million color pixels; there is no feedback loop that changes quality during a camera flight.

Fresh browser measurements are local observations, not physical-device or field Core Web Vitals claims. Frame-time outliers remain, and high-DPR rendering costs more. Cloud image transfer is zero and generated texture payload is about 0.4524 MiB desktop / 0.0774 MiB mobile; these are not total GPU-memory figures. Full HTML, reading mode, reduced motion and graphics-loss fallback remain available.

Timing varied materially even at the same 1440×1000, DPR-1 drawing buffer. One settled production Projects run recorded 66.6 ms median / 84.9 ms p95, with 271 of 360 intervals over 50 ms. The final repeat recorded 16.7 / 18.6 ms, with zero of 360 over 50 ms and shadows still enabled. A development-only paused-renderer control recorded 17.4 / 50 ms; a shadow-off/on comparison returned 17.1 / 35.2 and 17.2 / 33.5 ms respectively. These observations do not isolate a shadow bottleneck or prove a cause for the slower run. Both outcomes are retained in `browser-qa.json` and `accessibility.json`. No experimental shader rewrite was integrated, and no universal frame-rate guarantee is made. The paused frame control is an explicit development audit button and is excluded from the production UI.

The additional code is procedural geometry, shading and a small label-display state. It adds initial visual engineering but no image hosting, 3D authoring tool, content migration or external service to ongoing editing. See [ASSETS.md](ASSETS.md) for editable model structure and the ESA mounting references, and [EARTH-ASSETS.md](EARTH-ASSETS.md) for field/schedule details.

The independent verdict is in [CRITIC-REPORT.md](CRITIC-REPORT.md). The local seeded portfolio and studio remain running on port 3000. Remote hosting remains the separate, previously documented SIWC callback-registration incident; this revision does not claim a public deployment.
