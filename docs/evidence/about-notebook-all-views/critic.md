# Independent review — notebook content across camera views

Reviewer: `/root/notebook_flow_review`, 23 September 2026. The reviewer inspected
the final source, matching screenshots, browser-state/continuity observations,
geometry tests, structural inventory and isolated verification records. Only this
review file was edited by the reviewer.

## Result

**94/100, accepted with no unresolved application, visual or verification
blockers identified.** Notebook content remains mounted in overview and during
room travel, with visible portions following the physical book. The result
preserves the existing reading and page-turn behavior. This assessment does not
override subsequent owner feedback or certify unperformed checks.

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Physical design and visual cohesion | 38/40 | Overview, entry and neighboring-room captures retain actual ink on the paper. Partial coverage respects the room structure. The existing spread, artwork, flags and printed turns remain coherent. |
| Requested continuity and interaction | 29/30 | A dedicated notebook portal survives room/application changes. Sampled DOM identity/text remain unchanged through travel, zooms and portrait resizing. Page selection persists after visiting Contact. |
| Correctness and accessibility | 14/15 | Mask coverage unions overlapping blockers and handles near/far clipping, instancing, sidedness and the iris aperture proxy. Passive views remain inert; only the active reader owns its focus ID. |
| Verification and evidence | 9/10 | Live desktop/portrait captures, 144 continuity observations, independent ray comparisons, source hashes and passing isolated checks support the change. Engine and finite-sampling limits are explicit. |
| Organization and cost disclosure | 4/5 | Geometry, SVG masking and lifecycle integration are separated. Cache assumptions and structural work are documented; dynamic CPU/mask costs remain unmeasured. |

## Source review and resolved risks

The earlier implementation's room/travel visibility gate is removed. A dedicated
native host now belongs to the immersive scene, while other room applications
retain their shared host. The notebook receives `world-reader` only when its
About reader is interactive. Its focus effect requires the same room/arrival
conditions, and the former `:has(.about-notebook)` fixed-layout rule is scoped to
About explicitly. These changes address the duplicate-ID, focus and unrelated-room
layout risks identified during the early review.

The mask uses actual scene geometry and consistently wound black polygons on a
white SVG luminance mask, so overlapping triangles do not reopen holes. It
includes physical geometry marked `excludePick`, excludes interaction proxies and
invisible ancestors, respects material sides and instance transforms, and clips
before perspective division. The existing iris aperture silhouette avoids treating
shader-hidden blade stock as an opaque blocker. A separate mask preserves the
page-turn cutout; front, back and underlying turn surfaces receive coverage for
their own physical anchors.

Opacity and masking preserve native layout instead of using whole-surface
`display: none` for occlusion. Cached geometry records are shared by the different
ink surfaces. Reuse depends on camera/projection/layer/anchor/root equality and the
model's geometry revision; future geometry/visibility changes must maintain that
revision contract. The helper collects the model's mesh set when constructed, so
future code that replaces scene meshes must also recreate these helpers.

One evidence wording issue was corrected during review: the material filter does
not exclude every material with `transparent: true`. It excludes opacity below
0.98, alpha-tested/alpha-map and transmissive materials; qualifying near-opaque
materials still mask ink. This was a documentation correction, not an application
change. No corrective application edits were required by the final review.

## Independently inspected evidence

- [Desktop overview](desktop-overview.jpg) and [room entry](enter-about.jpg):
  actual notebook paragraphs remain visible on the small physical spread, rather
  than reverting to blank paper at the room boundary.
- [Contact partial coverage](contact-room-partial.jpg): the neighboring About
  notebook remains printed in the visible sliver while the room structure covers
  its hidden portion. This supports partial masking rather than binary hiding.
- [Turning front](section-turn-2.jpg) and [reverse leaf](section-turn-0.jpg):
  Markdown and the illustrated reverse stay attached to the moving paper; the
  added scene mask does not replace the established turn projection/cutout.
- [Portrait overview](portrait-overview.jpg) and [reader](portrait-reader.jpg):
  content stays with the approved full spread at the actual 390×844 viewport.
  Small text is the explicitly deferred mobile design, not a new reflow claim.
- [Continuity data](continuity.json): all eight checks contain 18 samples, and
  all **144** retain the same connected node and text with `display: block`.
  Coverage counts change through entry, exit and neighboring-room travel. The
  rejected initial timeout is disclosed, rather than silently counted as a pass.
- [Browser states](browser-states.json): section measurements persist; Learning
  notes remains on page index 1 after the Contact visit. Settled repeated states
  report mask-cache hits. Passive views are inert/accessibility-hidden, whereas
  the settled About reader is interactive and owns one reader ID.
- [Contact coexistence](contact-reader.json): its own reader retains focus,
  normal input and `filter: none`; the persistent notebook is inert and does not
  duplicate `world-reader`. Fresh direct-entry metadata reaches page index 0.

The six geometry tests use thousands of comparisons against Three.js ray hits,
covering partial/overlapping blockers, behind-paper geometry, eye-plane crossings,
reflected/instanced geometry, cache invalidation, four iris openings and near-plane
clipping. These meaningful geometric checks complement the rendered captures;
they do not independently validate browser SVG rasterization in every engine.

## Verification and cost

The reviewer inspected the [verification manifest](checks/verification.json) and
raw full-suite summary: **509/509 tests pass**, with zero failures, cancellations
or skips, in 368,392.896958 ms. Typecheck, affected lint, formatting and production
build pass. All **443 final source hashes** and all **seven structural-inventory
source hashes** matched the current checkout when independently checked. Only the
documented Project Context/performance-ledger updates differ from the checked
snapshot; application/test sources remained unchanged after captures and checks.

Verification used a disposable source checkout, fresh isolated D1/R2 state,
test-only secrets and loopback port 3003. Cleanup records confirm temporary
server/state removal and continued main `/about` HTTP 200. These are
implementing-agent runs inspected by the critic, not a claimed independent rerun.

The [structural inventory](structural-work.json) distinguishes synthetic viewpoint
probes from the production reading-fit camera. Its four finite probes visit
8,364–35,652 triangles out of 1,003,510 visible fixture triangles and emit 0–312
polygons. These counts are helper work, not GPU submissions or measured latency.
Source inspection shows no added scene mesh/material/texture asset or render pass.
CPU bounds/hierarchy storage, clipping/path creation and browser SVG masking are
additional work; earlier Markdown/media mounting also remains a cost. No timing,
memory, thermal, battery or performance improvement is inferred.

## Limits

The implementing agent used hidden built-in Chromium with ordinary live scene
effects, at actual 1280×720/DPR 2 desktop and 390×844/DPR 1 portrait viewports.
The reviewer inspected source and artifacts without independently driving the
browser or repeating the full suite. Screenshots and 95 ms continuity samples are
finite observations, not continuous video or an every-frame guarantee.

Native Safari, physical touch and live OS reduced-motion were not tested. Model
tests cover reduced-motion settling. The drag/release capture is not a complete
camera-envelope sweep. The 192-segment iris proxy approximates the aperture; the
material filter is not general alpha-texture or transmission compositing. Future
transparent scenery or geometry outside the maintained revision/mesh lifecycle
requires corresponding coverage review. Dynamic CPU/CSS-mask time, frame pacing
and cache memory remain unmeasured. None of these limits is presented as a passing
test or an observed application blocker.
