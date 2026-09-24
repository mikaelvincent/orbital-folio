# Independent critique — ladder tread contrast correction

24 September 2026. **95/100. No unresolved blockers or required revisions.**

This review covers the correction from `cf7bda4`, with final source frozen at
`2026-09-24T12:54:38.222Z`. The critic did not implement the change or run the
isolated suite. It inspected the actual source, tests, all 11 new browser images,
verification logs, inventories, traces and documentation.

The owner's feedback supersedes the previous Stage 06 visibility assessment.
I overestimated the earlier thin dark centers and pale ends at overview scale.
That review and score remain historical evidence; they do not resolve this
feedback or establish approval of the corrected version.

## Rubric

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Step readability at actual viewing size | 24/25 | Complete light tread silhouettes now separate from the dark field in both orientations. Fine end details remain small in the rolled portrait overview, but the step sequence reads. |
| Composition, material hierarchy and cohesion | 18/20 | The seamless backing is quiet and belongs to the ladder. It restores a heavier dark column, an appropriate tradeoff for clarity, without the former five-panel seam rhythm. |
| Fulfillment and scope | 15/15 | Directly addresses the user's correction while preserving protected fittings, clear spaces, rooms and navigation. |
| Construction and correctness | 19/20 | Backing attachment, coverage and hand clearance are checked against actual geometry. These checks address visual construction and sampled clearance, not structural engineering or exhaustive human-factors validation. |
| Evidence and verification | 14/15 | Matching fixed poses, live views and final-source verification support the result. Browser/device limits and partial compact-view occlusion remain. |
| Rendering implications | 5/5 | The added geometry is justified and measured as counts, with no unsupported performance claim. |
| **Total** | **95/100** | **The contrast correction is visually and technically sound.** |

## Design judgment

In the [baseline front view](before-front-wide.jpg), pale rung ends merge into
the ivory liner. The remaining short dark centers can read as thin marks across
a pale strip rather than complete graspable steps. The
[corrected front view](after-front-wide.jpg) gives each rung a continuous alloy
silhouette against a matte Carbon Deep backing. The fuller center diameter
helps the step survive reduction to overview size without introducing ornamental
bands or extra hardware.

The [390×844 compact comparison](after-front-compact.jpg) is particularly useful:
although the cabin divider still masks the far rail, the visible tread sequence
stays clear. The [reverse oblique](after-reverse-wide.jpg) shows the same finish
hierarchy from the opposite side. Carbon carriers remain subordinate to the
light steps, and the bronze accents stay at the existing support intervals.

The [live landscape overview](after-overview-landscape.jpg),
[portrait overview](after-overview-portrait.jpg) and
[portrait transfer](after-transit-portrait.jpg) support the improvement at normal
viewing dimensions. The ladder now reads as a distinct dark assembly with light
steps. Its backing has no competing horizontal seams, labels, border strips or
decorative fasteners. The larger dark area is a deliberate consequence of the
requested contrast, balanced by the surrounding ivory enclosure and clear end
spaces. The paired tools, end grips and service strip retain their separate roles.

I found no visible clipping, detached backing, new interaction cue or change to
the surrounding room composition. This assessment prioritizes the user's stated
readability problem over the prior preference for exposed ivory between rails.

## Construction and scope review

The runtime diff is confined to `ladder-service-spine.ts`: one shallow continuous
backing, alloy center grasps enlarged from 0.044 to 0.058 local units in diameter,
and matching 0.060 ferrules. Rung centers, pitch, carriers, anchor positions and
rail plane remain fixed. Thicker grasps necessarily extend slightly farther
forward and rearward; the retained hand opening is explicitly tested.

The revised construction test checks the backing's actual rear faces against
the production liner, contact with both carriers, coverage behind every rung
and intervening space, and more than 0.2 units of clearance at sampled positions
across each grasp. Existing support-chain, service-fitting and route checks
remain. These are meaningful geometry checks, not material-color assertions
standing in for visual approval.

The [structural inventory](structural-costs.json) records unchanged protected
geometry/material/transform fingerprints and bounds, including the actual liner,
end equipment, spanners, isolation cassette, cabins and exterior/docking groups.
Framing, aperture, route and door metadata match. No unrelated optimization or
navigation change is included.

## Evidence audit and completed checks

I independently verified **44 final runtime hashes**, the preview and inventory
script hashes, the inventory's manifest hash, **two full-suite source hashes**,
**ten focused test-file hashes**, **ten stored verification/focused log hashes**,
and all **11 image hashes, JPEG encodings and dimensions**. All three fixed pairs
have identical poses. The final source-tree digest is
`f33a3f8b2168a06aa5d0ed35c237d62ca040dd97c9758136ef02fa50dd629fa4`.

The actual [full verification logs](verification-checks.json) show **560/560 tests
passed**, with zero failures, skips or cancellations. Typecheck, production build
including geometry checks, affected lint and formatting passed. The same final
two-file snapshot was tested in a disposable source checkout with fresh test-only
D1/R2/secrets and explicit loopback `TEST_BASE_URL`. Cleanup and preservation of
the main server are recorded. The [focused logs](focused-checks.json) separately
show **62/62** construction and related tests passed. Non-failing build warnings
are disclosed.

The two [live transfer traces](navigation-traces.json) settle in their intended
destinations with no queued room and closed hatches. At most one hatch is open
in every sampled state. The samples are coarse smoke evidence, not complete
animation-frame coverage. The critic reviewed saved actual browser images and
records rather than operating an additional browser session.

## Findings and revisions

The original legibility finding is addressed by the continuous dark backing and
full alloy tread silhouettes. No further runtime revision was requested during
this final review; source, captures and measurements remain matched.

One minor documentation finding was resolved: project context described the
rungs as keeping their “projection,” although the larger grasps change their
outer extent. It now identifies their preserved “centers, pitch and rail plane.”
This wording correction required no runtime or evidence refresh. The README,
historical Stage 06 notice and ledger entry 57 correctly distinguish the current
correction from the superseded design and record completed verification/cleanup.

## Rendering cost and limitations

Each layout adds **972 triangle inputs and 25,032 geometry-array bytes**. Visible
submission candidates remain 17 in the spine and 520 in the scene. The three
finite comparisons independently show unchanged calls and 1,944 additional
triangle inputs with requested shadows. These nested inventories are not additive
costs, and neither counts nor geometry-array bytes measure execution time or total
GPU/process memory. No speed, heat, power or battery benefit is established.

All new images use hidden built-in **Chromium 153**, actual **1440×900** or
**390×844** viewports at DPR 1, without image scaling. Fixed fixtures omit GTAO,
Earth/sky, navigation and live applications. Live portrait uses the wide model
with GTAO disabled by the existing policy; compact geometry is tested separately.
Live background phases differ. There is no newly captured live portrait baseline
in this correction set; the fixed compact pair and final live portrait support
that orientation's judgment. The compact oblique partially occludes the far rail.

Native Safari, a physical phone and a browser reduced-motion override were not
tested, so those live checks remain incomplete. The score does not supersede
subsequent user feedback.

Carry forward the seamless dark backing, clear alloy steps, retained carbon
supports and restrained bronze intervals. Stage 07 should preserve the current
tools, end grips, empty spaces and automatic transfer behavior at its docking
boundary.
