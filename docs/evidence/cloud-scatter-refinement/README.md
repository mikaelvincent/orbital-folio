# Scattered cloud refinement — 14 September 2026

The user wanted scattered, varied clouds with visible ocean, and rejected the preceding continuous blanket. This revision uses the existing 3D globe with a separate satellite-derived cloud mask and restrained artistic height. See the [representation tradeoffs](alternatives.md) and [performance ledger](../../performance-ledger.md#06--scattered-satellite-cloud-coverage).

## Visual checks

| Framing | Initial view | After 60 active seconds | After 180 active seconds |
| --- | --- | --- | --- |
| Desktop, 1280×720 / DPR 2 | [0](desktop-0.png) | [60](desktop-60.png) | [180](desktop-180.png) |
| Portrait, 390×844 / DPR 1 | [0](phone-0.png) | [60](phone-60.png) | [180](phone-180.png) |

The desktop and portrait checks show clear blue intervals, scattered groups, softer fringes and distinct thin versus denser regions. The atlas is wrapped once around the sphere. No procedural surface-noise pattern is added. The lab renders these fixed-time previews once, without a continuing animation loop.

The completed production portfolio was also inspected at [desktop size](overview-production.png) and [portrait size](overview-phone-production.png), with no browser errors or warnings reported. Existing framing, rooms, navigation and globe rotation remain intact. These are viewport checks on the M4 browser, not physical-phone tests. The [early depth prototype](prototype-desktop-180.png) is retained as development history; final shading gives stronger cores more opacity and depth while keeping wisps light.

## Validation and reproducibility

- **19 cloud tests passed**, including synthetic conversion, actual production asset/source hashes, density/height distribution, loading, transforms and cleanup. [Structured correctness audit](correctness-audit.json) and [test output](tests.txt).
- Type checking and type-aware lint passed for the changed environment, cloud shader, satellite converter and new developer scripts.
- Production build passed. [Build output](build.txt).
- [Source-mask provenance and rebuild instructions](../../../scripts/assets/README.md). The full NASA source TIFF stays outside the repository and browser bundle; the filtered developer mask and public manifest retain hashes and attribution.

Normal delivery is `cloud-satellite-v2.cfd.gz`: **2,781,463 compressed bytes**, restoring exactly 8,388,608 RGBA bytes. Its SHA-256 is recorded in the public manifest and verified in the test suite. The 2048×1024 texture and estimated 11,184,812-byte mip chain remain the same size as iteration 05. This revision retains one cloud draw and twelve volume samples, removes procedural fine-slope shading, and uses fixed sampling intervals concentrated toward thin lower layers.

No new paired GPU, network, thermal or startup benchmark was run for this visual revision. The 12.1% smaller transfer is a file-size comparison. Earlier GPU percentages and generation timings belong to the previous procedural field and do not establish a speedup for this satellite field. Live diagnostics were opened only as a production smoke check, without a controlled comparison. All other optimization candidates remain on hold.
