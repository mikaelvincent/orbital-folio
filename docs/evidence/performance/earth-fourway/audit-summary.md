# Earth four-variant performance audit

Audit status: **passed**. 8 rounds; 1,920 measured GPU queries; 72 native snapshots.

Snapshot: `a8164cba-f996-45ed-894a-05c59a9ca5e4`. All reported imported sources, compiled files and public assets are checked for an identical frozen manifest.

Power source: Battery Power. All qualified snapshots require nominal pressure, Low Power Mode off, successful native queries and no reported performance limit below 100%.

Additional raw rounds outside the accepted eight: **0**. No timing-based trimming is performed.

## desktop — 1280×720, drawing DPR 2

| Variant | GPU mean ms | GPU p95 ms | Four block means ms, Williams round order | Block mean range ms | CPU submission wall mean ms | Frame interval mean ms | Draws | Triangles |
|---|---:|---:|---|---|---:|---:|---:|---:|
| procedural | 6.921 | 11.455 | ABDC: 6.871; BCAD: 6.143; CDBA: 7.809; DACB: 6.860 | 6.143–7.809 | 0.504 | 16.665 | 7 | 97284 |
| 2k | 3.596 | 4.783 | ABDC: 3.235; BCAD: 3.923; CDBA: 3.200; DACB: 4.025 | 3.200–4.025 | 0.440 | 16.668 | 6 | 72964 |
| 4k | 3.281 | 4.646 | ABDC: 2.803; BCAD: 3.348; CDBA: 3.618; DACB: 3.356 | 2.803–3.618 | 0.430 | 16.692 | 6 | 72964 |
| 8k | 3.413 | 4.741 | ABDC: 3.508; BCAD: 3.300; CDBA: 3.321; DACB: 3.524 | 3.300–3.524 | 0.409 | 16.654 | 6 | 72964 |

Each variant has 240 raw measured frames across 4 blocks. P95 describes the pooled correlated frame distribution, not an uncertainty bound on the mean.

### Unique preparation observations

Exactly 4 preparations, ordered procedural → 2k → 4k → 8k. These came from previews before recovery and were reused across rounds. They are not four repeated cold startups.

| Variant | Import wall ms | Factory wall ms | Ready wait ms | Image fetch ms | Image decode ms | Compile wall ms | First render submission wall ms | First render GPU ms | First submitted frame wall ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| procedural | 3.100 | 49.500 | 0.000 | — | — | 14.500 | 9.200 | 29.065 | 77.100 |
| 2k | 11.300 | 14.400 | 24.800 | 3.600 | 21.700 | 13.100 | 4.000 | 8.417 | 68.100 |
| 4k | 13.800 | 6.900 | 65.100 | 2.600 | 62.700 | 0.200 | 47.700 | 11.060 | 133.800 |
| 8k | 9.800 | 21.500 | 231.400 | 5.300 | 226.200 | 0.200 | 184.200 | 26.687 | 447.400 |

Resident lab counts: 9 textures and 12 geometries. Estimated aggregate environment texture storage: 236.179 MB; this excludes decoded image backing memory, geometry, framebuffers and driver allocations. Production has one Earth, not all four.

## compact — 390×844, drawing DPR 1

| Variant | GPU mean ms | GPU p95 ms | Four block means ms, Williams round order | Block mean range ms | CPU submission wall mean ms | Frame interval mean ms | Draws | Triangles |
|---|---:|---:|---|---|---:|---:|---:|---:|
| procedural | 0.918 | 1.645 | ABDC: 0.988; BCAD: 0.991; CDBA: 0.896; DACB: 0.796 | 0.796–0.991 | 0.437 | 16.651 | 7 | 48388 |
| 2k | 0.461 | 1.052 | ABDC: 0.464; BCAD: 0.466; CDBA: 0.473; DACB: 0.441 | 0.441–0.473 | 0.418 | 16.658 | 6 | 36292 |
| 4k | 0.474 | 0.765 | ABDC: 0.514; BCAD: 0.430; CDBA: 0.464; DACB: 0.489 | 0.430–0.514 | 0.410 | 16.665 | 6 | 36292 |
| 8k | 0.514 | 1.121 | ABDC: 0.483; BCAD: 0.627; CDBA: 0.484; DACB: 0.461 | 0.461–0.627 | 0.368 | 16.669 | 6 | 36292 |

Each variant has 240 raw measured frames across 4 blocks. P95 describes the pooled correlated frame distribution, not an uncertainty bound on the mean.

### Unique preparation observations

Exactly 4 preparations, ordered procedural → 2k → 4k → 8k. These came from previews before recovery and were reused across rounds. They are not four repeated cold startups.

| Variant | Import wall ms | Factory wall ms | Ready wait ms | Image fetch ms | Image decode ms | Compile wall ms | First render submission wall ms | First render GPU ms | First submitted frame wall ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| procedural | 5.600 | 20.700 | 0.000 | — | — | 13.200 | 7.000 | 6.693 | 46.800 |
| 2k | 6.600 | 10.200 | 25.400 | 2.500 | 23.000 | 13.500 | 3.200 | 1.601 | 59.300 |
| 4k | 11.000 | 11.700 | 76.100 | 5.600 | 70.700 | 0.200 | 42.400 | 2.495 | 141.600 |
| 8k | 8.900 | 10.700 | 234.500 | 9.200 | 225.600 | 0.300 | 182.400 | 24.078 | 437.000 |

Resident lab counts: 9 textures and 12 geometries. Estimated aggregate environment texture storage: 235.131 MB; this excludes decoded image backing memory, geometry, framebuffers and driver allocations. Production has one Earth, not all four.

## Limits

- Per-frame samples within a block are correlated. The four balanced blocks per variant/viewport are the relevant repeated observations; 1,920 frames are not 1,920 independent trials. No inferential confidence interval or significance claim is made.
- GPU time covers the orbital background renderer only. It excludes spacecraft, app UI and camera motion and is not whole-site FPS, Safari, physical-phone, power, temperature or battery-life performance.
- Both viewport cohorts run on the same Apple M4 desktop browser. Compact means a 390×844 browser viewport, not mobile hardware.
- All four environments and their images remain resident. Aggregate texture/geometry/decoded-image memory exceeds single-Earth production memory. Texture storage figures are RGBA8/mipmap estimates, not measured physical VRAM or process RSS.
- Preparation is one fixed-order preview sequence per viewport, deduplicated across rounds. Shared browser/module/shader/driver caches and prior preparation affect timings. These are local startup observations, not cold-network tests or replicated startup benchmarks.
- OS nominal thermal pressure plus blank rests does not prove complete cooling or identical clocks. Native snapshots are outside measured frames. Historical pmset warnings are not current temperature or guaranteed frequency observations.
- Original procedural clouds retain their original appearance and geographic orientation. The comparison tests final design workloads, not identical rendered pixels. Satellite variants differ only in their requested image asset dimensions.
- Browser fields named CpuMs are performance.now elapsed wall durations around JavaScript/update/render submission, not native process CPU time or utilization. GPU query time measures different work. Display-paced frame intervals include browser scheduling and should not be converted to unconstrained FPS.

## Validation findings

- All declared checks passed.

Reproduce with `node scripts/audit-earth-fourway.mjs`. This script only reads saved evidence and writes this summary; it starts no renderer, native sampler or benchmark.
