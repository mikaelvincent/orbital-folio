# Ladder tread contrast correction

24 September 2026. Baseline `cf7bda42d95e9fbcda2f87d353af506f4bed91d2`.
This owner-requested correction supersedes Stage 06's exposed ivory lane and
thin dark rung centers. The earlier review overestimated their readability at
overview scale; its source-matched record remains historical evidence.

## Result

The pale rung ends blended into the ivory liner, leaving short thin dark marks
instead of a clear sequence of complete steps. The revised ladder has one
continuous matte **Carbon Deep (`#151C23`) backing**, using the ladder's existing
dark material. It seats on the actual liner behind the two retained structural
carriers. There are no horizontal panel seams or decorative fasteners.

The central grasps now use the existing brushed alloy tread finish and increase
from 0.044 to 0.058 local units in diameter. Matching ferrules increase to 0.060.
The alloy across each rung is visible against the dark field, while the carbon
side rails and bronze support intervals retain the assembly's construction
hierarchy. All 13 rung positions, pitch, stand-off, mounts, end anchors, lights,
spanners and paired end grips remain unchanged. The fitted backing adds only
0.019 local units in front of the lining, preserving the hand opening behind
every rung. Navigation, camera fitting and neighboring rooms are unchanged.

## Rendered comparison

| View | Before | Final |
| --- | --- | --- |
| Fixed front, 1440×900 | [Before](before-front-wide.jpg) | [After](after-front-wide.jpg) |
| Fixed reverse oblique, 1440×900 | [Before](before-reverse-wide.jpg) | [After](after-reverse-wide.jpg) |
| Fixed compact front, 390×844 | [Before](before-front-compact.jpg) | [After](after-front-compact.jpg) |
| Live landscape overview, 1440×900 | [Before](before-overview-landscape.jpg) | [After](after-overview-landscape.jpg) |

Additional final views: [portrait overview](after-overview-portrait.jpg),
[portrait transfer](after-transit-portrait.jpg) and
[landscape transfer](after-transit-landscape.jpg).

All 11 original JPEGs were inspected in hidden built-in **Chromium 153** at
browser/render DPR 1. CSS viewport, drawing buffer and image dimensions match;
no image scaling was applied. Live views use the existing localhost:3000 server
and public content. Both live orientations use the wide model, with shadows
enabled, GTAO enabled in landscape and disabled in portrait by the existing
quality policy. Live background phases differ; the landscape overview camera
pose matches before/after.

The finite preview uses the same camera per pair, time 0, FOV 38, RoomEnvironment
intensity 0.24, fixed lights and requested PCF shadows. It omits GTAO, Earth/sky,
navigation and live screen applications, using neighboring fixture content.
The compact view partly hides the far rail behind the cabin divider; the reverse
and live portrait views provide complementary coverage. These are visual
comparisons, not timing benchmarks.

[Source manifest](source-manifest.json) freezes the final model at
`2026-09-24T12:54:38.222Z`, with 44 transitive hashes per version. Only
`ladder-service-spine.ts` changes at runtime. [Capture metadata](browser-captures.json)
records source identities, poses, effects, original dimensions and image hashes.

## Checks and limits

The eight existing construction tests now inspect the real backing's full rear
face against the liner, contact with both carriers, continuous coverage behind
every rung and between rungs, and clearance across each grasp. Existing mount,
service-fitting and transfer-path checks remain. The focused construction and
related geometry/navigation checks passed **62/62**, with commands, file hashes
and raw logs in [focused checks](focused-checks.json).

The complete **560/560 tests**, typecheck, production build/geometry checks and
affected lint/formatting passed from a disposable source-only checkout with fresh
test-only D1/R2 and secrets, a separate Vite cache and explicit
`TEST_BASE_URL=http://127.0.0.1:3003`. No private environment or main store was
copied. [Verification checks](verification-checks.json) preserve exact source
hashes, commands, logs and cleanup. Non-failing build warnings concern Node
DEP0205, chunk size and Vinext static route analysis. The independent critic
scored the correction **95/100**, with no unresolved blockers or required
revisions. The [review](critic-review.md) gives substantial weight to rung
readability and records the earlier overgenerous assessment, the resolved
projection-wording finding and remaining limits. No runtime edit followed the
final evidence or verification.

Keyboard navigation entered Projects from overview and traversed Projects→About
in portrait, then About→Projects in landscape. Both transfers reached their
destinations and no sampled state had both ladder hatches open. The
[DOM traces](navigation-traces.json) sample about every 80 ms plus tool latency;
they are smoke evidence, not exhaustive animation-frame coverage. Final browser
error sampling returned no entries. No content or private inquiries were changed.

Native Safari, a physical phone and a browser reduced-motion override were not
checked. The hidden review tab was closed, viewport reset and finite preview
stopped. The isolated test server and fixture/state were removed; port 3003 is
closed and the main localhost:3000 server remains HTTP 200.

## Rendering cost and carry-forward

[Measured structural inventory](structural-costs.json) uses production batching
and instancing in Node. Each layout adds **972 triangle inputs** and **25,032
geometry-array bytes**, with visible mesh submission candidates unchanged:
17 in the service spine and 520 in the scene. The spine changes from 69,208 to
70,180 triangle inputs. Counts exclude frustum culling, canvas artwork, texture
and driver storage; they do not measure actual process/GPU memory.

All protected group fingerprints and bounds, including the actual liner,
retained end equipment, cabins, shared architecture and docking/exterior
assemblies, match. Framing, route, aperture and door metadata also match. The
finite front records unchanged 772 wide / 598 compact calls and 1,944 additional
triangle inputs including requested shadow work. No speed, power, heat or
battery benefit is claimed; no held performance candidate was implemented.

Carry this corrected contrast hierarchy into Stage 07: a seamless dark backing,
clear satin-alloy treads, narrow carbon supports and restrained bronze joints.
Preserve the paired tools, two grips per end and intentional empty spaces.
The docking shoulder remains the next scope; the ladder's automatic connector
role and shared framing stay protected.
