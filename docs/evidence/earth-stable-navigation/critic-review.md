# Independent critic review — 20 September 2026

**Score: 93/100. Recommendation: keep. No unresolved implementation blockers.**

Reviewer: `/root/earth_navigation_critic`. The reviewer did not implement the
runtime, tests, coverage tooling or ledger changes. This review covers the final
source and corresponding evidence in this directory; it supersedes the earlier
positive assessment of live-roll compensation in the portrait-placement task.

## Rubric

| Area | Score | Assessment |
| --- | --- | --- |
| Request fulfillment | 25/25 | Portrait overview retains the approved bottom-left Earth composition. During navigation Earth no longer cancels camera roll; geometry-cost discussion remains a recommendation, not an unauthorized optimization. |
| Visual and motion quality | 27/30 | Sequential live captures show the horizon sweeping with the viewpoint during entry and returning coherently on exit. Phone, tablet and landscape compositions remain balanced. Samples are not a continuous video, and the complete ultrawide capture could not be validated. |
| Correctness and regression protection | 19/20 | Viewport composition is independent of navigation. Tests assert fixed Earth/atmosphere matrices, moving projections, round-trip restoration, unchanged texture phase/resources and reduced-motion behavior. Crop evidence is appropriately bounded rather than universal. |
| Responsibility boundaries and maintenance | 10/10 | `setViewportComposition` owns responsive art direction; `followCamera` owns the shared physical viewpoint. Current project instructions and the ledger explicitly retire the mistaken live-roll rule. |
| Verification and cost evidence | 12/15 | Full tests, typecheck, build and affected lint pass. Source-identified geometry audits and rejected evidence are preserved. There is no new GPU timing, native Safari check or successful whole-frame ultrawide visual recording; none is claimed. |

## Source and behavior review

The runtime now passes only the real camera and canonical reference into
`followCamera`. That function does not mutate Earth's placement. The separate
viewport setter selects one composition target; initial setup and reduced motion
apply it immediately, while an actual orientation change eases toward it. Normal
room entry, return, hover and drag cannot retarget the Earth anchor. The remaining
per-frame composition branch is inactive after orientation settling.

The replaced regression had explicitly required Earth's screen projection to
remain stationary during camera roll. Its replacement checks the user's intended
invariant instead: Earth's world transform stays fixed while its projection
moves. Earth and its atmosphere share the transform. The scene, texture and
render-resource configuration are otherwise unchanged.

I independently checked current source hashes against the desktop, mobile and
portrait coverage reports and both exact-frustum perturbation reports. They
match. Principal reviewed source hashes:

- `features/orbit/orbital-environment.ts`:
  `ff7e4a6c2a1417bd66942c8375c0c0778c401ca58eb60f250ff1f1ddb48d4db8`
- `features/spacecraft/spacecraft-runtime.ts`:
  `870d24a8e618285f722d14859a7203f32b717188e23432d00c6150a82045ce42`
- `tests/orbit/earth-views.test.mjs`:
  `eefd54fa3fc5bb41db5d0ab2ab7cad9b62edbcdc41aa8978d61cc58b8025fcb2`

## Visual review and revisions

I inspected outbound frames 00, 02–10, 14 and 22, and the corresponding return
frames, in order with their timestamps. These include the entire relevant rolling
phase in both directions, rather than only arrival snapshots. The limb moves
toward the left during room entry, leaves the frame as the camera approaches the
cabin, then re-enters from the left and settles below-left on return. Stars respond
to the same changing viewpoint. I found no pinned-Earth counter-rotation or
visible texture boundary in that progression.

I also inspected the phone/tablet/landscape overview captures and direct About
arrival. Earth being outside the room frame is the expected tradeoff of keeping
its physical anchor fixed, not a new failure to preserve its overview placement.

Review caught that the initial extreme-width screenshots represented only a
clipped/scaled part of the requested viewport. The attempted full-page replacement
also duplicated fixed-canvas strips. The final evidence correctly rejects that
attempt, preserves a representative artifact and hashes, and does not treat image
dimensions as proof of a correct whole-frame render.

## Coverage and performance judgment

The ordinary navigation audit passes its guarded crop allowance. All exact
resize samples and the 5,832 supplementary exact-frustum perturbations retain the
crop. Four deliberately enlarged ultrawide resize neighborhoods per mesh do not
certify the allowance. Their conservative half-space failure does not establish
an actual visible defect, but neither the finite follow-up nor partial captures
prove the complete neighborhood safe. The final documentation states this
limitation clearly. Retaining the current atlas is reasonable for this focused
fix; a universal resize certificate is not awarded.

I independently reproduced the installed Three.js sphere counts and array sizes:
desktop 12,513 vertices / 24,320 triangles / 546,336 bytes, compact 6,305 /
12,096 / 274,336. The report correctly separates these arrays from nominal texture
storage and measured memory. It also separates vertex work from visible fragment
shading and makes no unmeasured frame-rate, heat or battery claim. Keeping a future
partial-mesh experiment low priority and held is appropriate.

The final test log reports **345 passing tests, zero failures**. Typecheck,
affected lint and build logs were reviewed; the final diff check is clean.
Native Safari, every animation frame and a valid complete ultrawide visual
recording remain outside the performed verification. These are disclosed limits,
not reasons to restore the known incorrect live-roll behavior.
