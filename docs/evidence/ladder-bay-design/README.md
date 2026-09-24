# Stage 06 — Ladder transfer and maintenance bay

The owner's later [tread-contrast correction](../ladder-rung-contrast/README.md)
supersedes this pass's exposed ivory lane and thin dark rung centers. This record
preserves the original Stage 06 source, evidence and review; its attachment,
clearance and retained-equipment decisions otherwise carry forward.

24 September 2026. Baseline `cecd316658e9315cd101ac98105a1f1fb852e8bc`
contains approved Stages 01–05. This pass owns the connector interior and end
equipment; docking and exterior access hardware remain separate stages.

## Design and result

The continuous ivory liner, paired stowed spanners, curved end handholds and
recessed maintenance strip already explained the bay's purpose. The main weakness
was the broad five-panel backing behind the ladder: its seams competed with the
rung rhythm and made an open transfer route resemble a striped cabinet. More
equipment would have crowded a deliberately spare connector.

- Two narrow carbon carriers now seat directly on the real pressure liner and
  support the existing rail anchors. The exposed ivory between the rails gives
  the transfer path a clear, continuous silhouette.
- All 13 rungs retain their pitch, rail positions and projection. Carbon grip
  inserts with satin alloy ends distinguish handling surfaces; bronze collars
  mark the four support stations instead of every rung. Fine decorative tread
  rings are removed.
- Recessed coupling barrels and dust-cap pegs now reach the pocket backs while
  keeping their front faces fixed. The isolation cassette's sockets and guards
  meet its cover rather than floating slightly above it.

The paired spanners, two grab bars at each end, empty intervening spaces, end
anchors, existing lights and service recess arrangement remain. No platform,
equipment or interactive decoration was added. This is a zero-gravity transfer
connector: navigation “landings” are waypoints, and the existing architectural
profile intentionally has no physical landing slabs. The continuous curved liner,
Projects/About apertures, automatic door sequence and shared framing are unchanged.

## Before and after

| View | Before | Final |
| --- | --- | --- |
| Fixed front, 1440×900 | [Before](before-ladder-front-wide.jpg) | [After](after-ladder-front-wide.jpg) |
| Fixed reverse oblique, 1440×900 | [Before](before-ladder-reverse-wide.jpg) | [After](after-ladder-reverse-wide.jpg) |
| Upper return, 1440×900 | [Before](before-upper-return-wide.jpg) | [After](after-upper-return-wide.jpg) |
| Lower return, 1440×900 | [Before](before-lower-return-wide.jpg) | [After](after-lower-return-wide.jpg) |
| Fixed compact front, 390×844 | [Before](before-ladder-front-compact.jpg) | [After](after-ladder-front-compact.jpg) |
| Live landscape transfer | [Before](before-live-transit-landscape.jpg) | [After](after-live-transit-landscape.jpg) |
| Live portrait transfer | [Before](before-live-transit-portrait.jpg) | [After](after-live-transit-portrait.jpg) |
| Live landscape overview | [Before](before-overview-landscape.jpg) | [After](after-overview-landscape.jpg) |
| Live portrait overview | [Before](before-overview-portrait.jpg) | [After](after-overview-portrait.jpg) |
| Projects entrance | [Before](before-projects-entrance.jpg) | [After](after-projects-entrance.jpg) |
| About entrance | [Before](before-about-entrance.jpg) | [After](after-about-entrance.jpg) |

The final [settled overview after drag](after-overview-drag-release.jpg) also
checks integration with the full spacecraft. All captures use **hidden built-in
Chromium 153**, not native Safari. CSS viewports, original JPEG dimensions and
drawing buffers are 1440×900 or 390×844, unscaled at browser/render DPR 1.

Live views use the preserved localhost:3000 server and current public content.
Both orientations select the wide model. Shadows remain enabled; the existing
quality policy enables GTAO in landscape and disables it in portrait. Live
transfer snapshots are taken during ordinary travel, so before/after camera
positions and Earth/sky phases are not identical. Fixed fixtures provide the
matched geometry comparison.

The finite `scripts/benchmarks/spacecraft-polish-preview.mjs` fixture uses identical
camera poses per pair, time 0, FOV 38, RoomEnvironment intensity 0.24, fixed lights
and requested PCF shadows. It omits GTAO, orbital background, navigation and live
screen applications; neighboring displays use fixture fallback content. The
oblique end views crop portions of the rail behind the foreground divider, and
the compact front occludes part of the ladder. Full front/reverse and live
portrait views provide complementary coverage.

The [manifest](source-manifest.json) identifies 44 baseline and 44 final transitive
runtime files, fixture and bundle hashes. Final manifest capture is
`2026-09-24T11:08:37.318Z`; all final images and automated checks match these runtime
bytes. [Capture metadata](browser-captures.json) records camera poses, dimensions,
effects, source identities and image hashes for all 23 original JPEGs.

## Verification and refinement

Eight new wide/compact tests use actual source solids and liner vertices to check
carrier/anchor/rail/rung attachment, the exposed center lane, clearance behind
grips, sampled transfer-route clearance, coupling/cap/cassette support chains and
retained tool/end-grip mounts. The audit found the recessed support gaps and
cassette offsets described above; those were corrected before final capture.
The new tests and related ladder, cabin, iris-navigation and integration checks
passed **62/62**; [focused results](focused-checks.json) preserve their commands
and cases, also corroborated by the retained full-suite log.

The complete **560/560 tests**, typecheck, production build including geometry
checks, affected lint and formatting passed from a disposable source-only
checkout with fresh test-only D1/R2 and secrets, a separate Vite cache and explicit
`TEST_BASE_URL=http://127.0.0.1:3003`. No private environment or main store was
copied. [Verification records](verification-checks.json) preserve exact commands,
source hashes, logs, cleanup and non-failing Node DEP0205, chunk-size and Vinext
static-analysis warnings. No required automated check failed.

Live smoke checks exercised both directions in landscape and portrait, physical
selection of the exposed bay from Projects, keyboard room entry/return, overview
return, an inert bay click from overview and drag/release. All four final transfer
traces reached their destinations; no sampled state had both ladder hatches open.
The [traces](navigation-traces.json) sample DOM state roughly every 80 ms plus tool
latency, so they supplement automated navigation/interlock regression coverage.
Final browser error sampling returned no entries. No messages were sent
or persisted content changed during inspection.

The independent critic scored final source and matching evidence **95/100**, with
no unresolved blockers or required revisions. The [review](critic-review.md)
preserves its design-weighted rubric, resolved coverage-wording finding and
limitations. No runtime changes followed the final captures or required checks.

## Rendering implications and limits

[Structural inventory](structural-costs.json) measures production batching and
instancing in Node, excluding canvas artwork and frustum culling. In both layouts,
the service spine changes **76,792→69,208 triangle inputs**, **18→17 visible
mesh/material submission candidates**, and **3,024,200→2,821,736 geometry-array
bytes**. Whole-scene deltas are −7,584 triangles, −1 candidate and −202,464 array
bytes. These are authored geometry counts, not measured total process/GPU memory.

The remaining ladder geometry, liner, end fittings, four cabin furniture groups,
shared architecture/utilities, docking/service/exterior fingerprints and bounds
match exactly. Camera framing, route/aperture and door metadata also match, with
each layout deep-copied before switching layouts. The isolation cassette's
geometry counts are unchanged; only socket/guard poses change.

The finite renderer separately records **774→772 calls / 1,726,568→1,711,400
triangle inputs** in the wide front view and **600→598 / 1,512,334→1,497,166** in
compact. Those totals include requested shadow rendering. No startup, CPU/GPU
timing, heat, power or battery comparison was performed. This is a new art
baseline; no held performance-ledger candidate was implemented.

Native Safari, a physical phone and a reduced-motion browser override were not
checked. Their live visual checks remain unavailable in this review; existing
automated behavior coverage passes. The finite preview was stopped, review tab
closed and viewport reset. The isolated test server and fixture/state were
removed; main localhost:3000 remains available.

## Stage 07 handoff

Carry forward the open ivory transfer lane, narrow seated carbon supports,
carbon handling surfaces, satin exposed ends and restrained bronze at serviceable
joints. Preserve both spanners, two end grips per end, clear intervening spaces
and the current automatic door sequence. The docking shoulder/hatch is unchanged;
Stage 07 should resolve that assembly using the front/reverse and live transfer
evidence above while preserving the bay's liner and clear approach. Exterior
access ladders remain Stage 09 work.
