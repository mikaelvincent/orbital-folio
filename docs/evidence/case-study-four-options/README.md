# Case studies: four recorders and taller screen

21 September 2026. Baseline `32d75770fa8938fc141c0486a3831e1080bfe8ef`.

The owner asked to remove the bottom Field notes shelf/recorder, retain four
options, and increase the screen height while decreasing its width to fill the
space at a conventional aspect ratio. This supersedes the earlier wide-screen
restoration documented in ledger entry 36.

## Delivered design

- Four upper rows remain: Product engineering, Systems & reliability,
  Research & experiments, Design & interfaces. Field notes and its cartridge,
  runners, artwork and fittings are removed. Rack feet and crossmembers remain
  as the structural frame, not another option.
- Glass changes from 2.37 × 0.49 to **1.76 × 0.99 (16:9)** local units, before
  the retained 0.85 rig scale. Width decreases 25.7%; height increases 102.0%.
  Its center lifts from 0.435 to 0.625, filling the newly available lower space.
- Bezel, rubber seal, rounded enclosure, paired handles, edge guard and floor
  supports follow the glass dimensions. Support attachment points derive from
  the display rotation/position; the service cable stays connected.
- Centered folder/title artwork uses the taller display. The live case count
  remains. Camera fits, navigation, readers, persisted content and other rooms
  are unchanged. These category cartridges remain the existing static display;
  this change does not add category-filter behavior.

## Visual verification

Actual live application at `http://localhost:3000`, hidden built-in Chromium.
No native browser or user-screen capture. Main development server/store reused
for read-only visual inspection; mutating automated tests use a separate fixture.

| Capture | CSS viewport / DPR | State |
| --- | --- | --- |
| [Before desktop](before-desktop.png) | 1280 × 720 / 2 | Original five rows and wide terminal |
| [After desktop](after-desktop.png) | 1280 × 720 / 2 | Final four rows, taller screen |
| [Portrait](after-portrait.png) | 390 × 844 / 1 | Shared compact camera; full room and adjacent cabin |
| [Compact](after-compact.png) | 800 × 600 / 1 | Screen, handles and fourth row clear |
| [Drag release](after-drag-release.png) | 1280 × 720 / 1 | Angled return after drag, not a held maximum-angle fixture |
| [Overview](after-overview.png) | 800 × 600 / 1 | Return navigation and whole-vessel context |

Screenshots are the browser’s returned CSS-resolution PNGs, with no additional
resizing. The desktop drawing buffer is 2560 × 1440 at DPR 2; the compact
landscape buffer is 800 × 600 at DPR 1. Runtime quality stays at normal settings;
phone width disables GTAO under the existing quality rules. Desktop/compact
landscape retain it. No finite fixture or omitted background is used. Room-view
text is small on the portrait phone due to the existing shared architectural
framing; no room-specific camera change was made. Native Safari, physical touch,
maximum drag envelope and performance timing were not tested.

## Cost and source identity

[Geometry inventory](geometry-inventory.json) preserves baseline/current model
module hashes. Command:

```sh
node scripts/benchmarks/spacecraft-geometry-inventory.mjs 32d75770fa8938fc141c0486a3831e1080bfe8ef
```

This is a static Node wide-layout model, with effective visibility and instances,
without frustum culling. It excludes document-dependent canvas graphics, textures,
instance buffers, JavaScript overhead and other scene layers. Visible mesh
objects: **452 → 450**; triangle inputs **1,009,734 → 1,000,234**; retained unique
geometry/index arrays **36,143,548 → 35,892,276 bytes** (−251,272 bytes).
These are not rendered draw calls or measured process/GPU memory.

The [nominal texture estimate](texture-estimate.json) records the countervailing
art cost: display canvas **1536 × 318 → 1536 × 864**, preserving horizontal artwork
resolution. RGBA8 storage with the complete mip chain rises 2,603,080 → 7,077,784
bytes; removing the 1536 × 115 Field notes print removes 938,872 bytes. Net
estimated texture delta: **+3,535,832 bytes (3.37 MiB)**, excluding canvas backing,
driver allocation and unrelated resources. No additional image download, renderer
pass or per-frame paint is introduced. Preparation/upload work was not timed.
No frame-rate, heat, battery or total-memory improvement is claimed. Held
optimization candidates remain held; this is requested art work.

## Automated checks and independent review

[Verification](verification.txt): isolated full suite **415/416 passed**, with the
single legacy assertion below; after its test-only correction the complete
coalescing file passes **5/5**. Typecheck, production build (including geometry
reproducibility), and affected code/test lint pass. No required check remains
failing. The final implementation did not change after the full run; the whole
suite was not repeated for the test-only correction. Browser console: no captured
errors or warnings. Main case-studies route responds HTTP 200.
The initial full suite exposed a legacy test requiring at least 20 coalesced
batches; removing the fifth cartridge leaves 18. The test now requires actual
coalescing and retains its exact rendered-instance comparisons across six
layout/room/reading states plus automatic/manual equivalence. The arbitrary
furnishing-dependent threshold and stale comment are removed.

Independent [critic review](review.json): **94/100**, approve, no blockers or
required revisions. Rubric: fulfillment 20/20, design 36/40, correctness 19/20,
scope/docs 10/10, evidence/cost 9/10. Final source and matching images reviewed.
