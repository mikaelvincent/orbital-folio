# Personal study — independent geometry and preservation audit

Baseline: `4af8e2d`. Result: **PASS**.

Scope: About furnishing replacement and its approved Projects/Contact-style heading. Retiring the discarded About journal proxy/hint is intentional. No camera, route, other room, ladder bay, exterior or pressure-structure change is allowed by this audit.

- Independently loaded the committed baseline and all of its imported builders. Compared 1,785 protected original parts/final batches per state across wide/compact overview, selected About, About hover and ladder hover: eight states; zero differences. Protected geometry, transforms, materials, canvas drawing commands, visibility, instances, point lights and room/door/reader/header anchors all match. About's changed heading-containing batch is excluded, while all unchanged original source parts within it are still checked.
- 223 new source parts have finite geometry attributes and valid unit normals on nondegenerate triangles.
- Both About doors remain clear in 36 actual triangle-ray passage checks across both layouts.
- Three adhesive flags meet three distinct indexed paper leaves; sampled adhesive clearance is 0.00035. Their free ends bend away only beyond the actual leaf edge.
- Journal clears the desk enamel by 0.01974 and the wood insert by 0.01474. Both front cradle shoes seat into its underside by 0.01119; rear stay ends reach the cradle. No notebook/desk penetration.
- All 52 rear support/holster checks across wide and compact seat into the actual curved/plain lining; worst gap is −0.00042 (negative means seated). Compact rear-datum compensation removes the prior 0.17 floating mount gap. Rearmost furnishing point −1.106 remains well inside outer shell −1.36.
- No new wall sheets, flooring or independent pressure liner were added.

Corrections made during the review: actual flag-to-page contact, notebook height and support contacts, compact mounting depth, and retained drink holster seating.

Limits: this is a focused geometry/triangle-ray audit, not an exhaustive solid-body collision proof. GPU lighting, cloth/print readability and aesthetic quality require the separate browser visual critic. Canvas preservation compares recorded drawing commands rather than rasterized font pixels.

## Audited source hashes
- `components/spacecraft-model.ts`: `094bcc8270e75da62ae94dcb6320afd3f3c7b0c3bcf6ead6f0c9904a143ce541`
- `components/about-personal-study.ts`: `86943232871828336d0a0645f0b9f794b81ba72d39abd20e906728b7fd0da087`
- `components/about-study-artwork.ts`: `95644bf9bcf10383418f3ad93f9ea809fa5fb922d79b46b6470fae9eb3f832ad`
