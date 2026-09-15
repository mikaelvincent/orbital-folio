# Symmetric access hardware refinement

15 September 2026. Baseline `2d52c7e`.

The user accepted the access-equipment direction and requested three focused
revisions: mirror the entire upper exterior ladder underneath, replace both
angled rescue lights with matching useful objects, and remove everything between
both interior grab-bar pairs.

## Design and scope

The underside uses the same complete route as the roof, reflected about the
ladder-room center. Rungs, mounting pairs, rail ends and amber tether markers
match. The former short lower transfer section is replaced rather than retained.
Mounting feet follow the actual keel and curved shoulder. The rails use ordinary
geometry with corrected outward directions, not a negative-scale object.

Two stowed maintenance spanners replace the angled lights. Open alloy jaws,
graphite grips and small amber clip releases give them an immediately readable
purpose. Both are secured to the curved wall in the same mirrored arrangement.

The grab bars keep their approved shape and placement. Both intervening reels,
leads, hooks, axles, retaining pegs and mounting pieces are removed. No replacement
object is inserted between the bars. Dead bow-only mounting code and the obsolete
reel-to-grip clearance script are removed; its historical implementation and
source-matched measurements remain in commit `ef91e1a` and the preceding evidence.

No camera/navigation code, Earth texture, room labels or other room furnishings
change. Existing header vents remain. Held optimization candidates remain held.

## Evidence

All captures use the hidden built-in browser, without native screen capture.

| Capture | Scope |
| --- | --- |
| [Full lower route](underside-route.png) | Final integrated design, open lower ladder spanning the hull and continuing around the shoulder. |
| [Underside detail](underside-detail.png) | Inspection of the lower rungs, tether eyes and mounting stand-offs; captured before the unrelated torch replacement. |
| [Ladder front](ladder-front.png) | Both matching spanners, both clear grab-bar pairs and their relationship to the hatch and main ladder. |
| [Lower end detail](lower-grips-and-tool.png) | Thick open wrench jaw, retention clips and empty space between the bars. |
| [Live overview](live-overview.png) | Final running application at a 1280×720 browser viewport. |
| [Live portrait](live-portrait.png) | Final application at a real 390×844 iframe layout, scaled to 77% for the review browser. |

Finite inspection views omit GTAO and use placeholder room-screen labels. Their
close-up angles inspect physical attachments; they are not claimed to reproduce
the user camera. The live screenshots use the actual application and its approved
8K Earth. The developer accessibility overlay in those captures is enabled by the
review URL; it is not part of the normal page.

The normal elevated overview hides much of the underside behind the hull, as
expected. Ray tests verify every lower rung is exposed within the existing
near-level drag range, using the allowed 0.18-radian pitch. This is geometric
visibility evidence, not a recorded full-range drag gesture. Small tool details
remain small in the portrait overview.

## Verification

All **253 tests passed**, with no failures or skipped tests. Type checking,
production build, changed-component lint and diff checks passed.

Focused geometry checks cover:

- Wide and compact route reflection, rung spacing, matching anchor and tether
  positions, roof/keel surface contact and finite normals with outward winding.
- Both complete tool assemblies mirrored vertex-for-vertex within 0.000001 scene
  units, allowing normal Float32 rounding. The forged heads are more than 0.05
  units thick, with visible alloy cheeks and an empty jaw throat.
- Tool stand-off and hatch/ladder clearance, with only bonded feet and post ends
  permitted to seat slightly into the liner.
- All four grab bars retaining their grasp clearance, curved mounting contact,
  rear-lamp and door clearance. Their entire intervening depth band contains no
  residual reel hardware.
- Passive scene behavior and the existing ladder brightness state. Manual
  disposal checks show that geometry and materials participate in disposal;
  they do not establish repeated-mount leak behavior.

[Tool tests](tool-tests.log), [full suite](full-tests.log), [typecheck](typecheck.log),
[build](build.log), [lint](lint.log), [browser errors](browser-errors.json) and
[final source identities](source-hashes.json) retain the verification evidence.
The production build completed with the framework's existing chunk-size and
route-classification warnings.

## Structural accounting

The wide model changes from 415 to 414 visible meshes, 993,310 to 1,012,382
triangles (+19,072 / +1.92%), and 35,847,012 to 37,370,212 bytes of unique geometry
arrays (+1,523,200 bytes / +1.4526 MiB). The [source-hashed inventory](geometry-inventory.json)
counts all active visible geometry before frustum culling and excludes textures,
instance buffers, targets, other scene layers and object overhead. It is not a
GPU/process memory or frame-time measurement. No thermal, battery or performance
improvement is claimed. No new texture, scene light or ongoing animation is added.

Reproduce from the repository root using installed dependencies:

```sh
npm test
npm run typecheck
npm run build
npm run lint -- components/docking-shoulder-equipment.ts components/exterior-service-equipment.ts components/ladder-endcap-equipment.ts
node scripts/benchmarks/spacecraft-geometry-inventory.mjs 2d52c7e
node scripts/benchmarks/spacecraft-polish-preview.mjs 2d52c7e
```

The independent [critic review](critic-review.md) records the final rubric and
limitations. [Ledger entry 18](../../performance-ledger.md) preserves the earlier
design record and held optimization candidates. Changes are committed locally in
logical groups; the existing development server remains available on port 3000.

Implementation commits: `e0b4723` (full mirrored exterior route) and `40f6e08`
(stowed spanners and cleared grab-bar pairs). Evidence and ledger updates form a
separate documentation commit. The final finite tool captures and build were
refreshed after the forged jaw received its final thickness and bevel; the full
test suite and recorded inventory already used that final source.
