# Cloud rendering and preparation audit

Read-only audit of the four saved browser comparisons on 2026-09-14. No samples were trimmed or rejected during this audit. The startup delivery benchmark is separate and was not run as part of this analysis.

## What was measured

All exports used the same frozen build (`d251de73-722a-4f3d-9142-3bb36ee199f0`, built 05:37:17.725 UTC), Three r185, Chrome 152, and ANGLE Metal on Apple M4. The desktop drawing buffer was 2560 × 1440; the phone-sized drawing buffer was 390 × 844 with the mobile quality option. The latter is a viewport/quality simulation on this Mac, not a physical-phone result.

Each comparison used four alternating blocks, ten warmup frames per block, sixty measured frames per block, and ten seconds of blank rest before each block. Time and view were frozen. The timer query covers the entire background render, excluding the spacecraft, app UI, and camera motion. Both designs submitted six draws per frame, with 97,282 desktop triangles / 3,100 points or 48,386 phone-sized triangles / 2,300 points.

All sixteen blocks completed, and all 960 measured GPU queries were valid. There were no disjoint events, hidden-tab invalidations, or missing query results in these exports. A valid query means the elapsed measurement was available without a detected clock discontinuity; it does not mean device clocks or shared workload were constant.

## GPU results

| Export | Reference mean GPU ms | Current mean GPU ms | Difference | Reference block means | Current block means |
| --- | ---: | ---: | ---: | --- | --- |
| [Desktop ABBA](gpu-desktop-abba-0.json) | 4.716 | 4.371 | 7.3% lower | 5.469, 3.963 | 3.711, 5.031 |
| [Desktop BAAB](gpu-desktop-baab-0.json) | 6.742 | 4.423 | 34.4% lower | 6.836, 6.648 | 4.721, 4.124 |
| [Phone-sized ABBA](gpu-phone-abba-0.json) | 1.647 | 1.438 | 12.7% lower | 1.435, 1.860 | 1.483, 1.393 |
| [Phone-sized BAAB](gpu-phone-baab-0.json) | 1.383 | 1.353 | 2.1% lower | 1.253, 1.512 | 1.257, 1.449 |

Means include every measured frame. Each design has 120 frames per export. The substantial variation between blocks and runs limits precision: some adjacent reference/current block comparisons reverse, and a phone-sized difference of 0.029 ms in the BAAB run is small relative to the observed spread. The four mean comparisons favor the new background, but they do not establish a stable percentage improvement. There are only two order runs per viewport, and frames within a block are correlated; 960 queries are not 960 independent trials. No confidence interval or significance claim is made.

Individual valid frame ranges were 2.115–13.777 ms for desktop and 0.536–5.580 ms for the phone-sized configuration. These are retained, not treated as exclusions. Mean frame intervals stayed approximately 16.66–16.67 ms for both designs, so these captures do not demonstrate a user-visible frame-rate increase. GPU elapsed time does not measure energy, temperature, or sustained thermal behavior.

The original first desktop ABBA export was lost during clipboard collection. The operator repeated ABBA to recover a complete export, not because its measurements were unfavorable. No raw frame results from that lost export were retained or included. Its initial preparation records remained attached to the reused environments and are accounted for below.

## First preparation: four unique records, not eight

Preparation records are reused verbatim in later exports. Deduplicating by version and preparation start time leaves one desktop and one phone-sized preparation per design. These are descriptive observations with fixed reference-then-current loading order, not repeated startup trials.

| Configuration / design | Factory wall ms | Ready wait wall ms | Compile wall ms | First render CPU submission ms | First submitted frame wall ms | First render GPU ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop reference | 45.4 | 0.0 | 13.9 | 8.9 | 74.0 | 31.064 |
| Desktop current | 8.3 | 26.5 | 84.2 | 2.8 | 123.9 | 6.382 |
| Phone-sized reference | 22.6 | 0.0 | 11.3 | 1.2 | 47.9 | 1.759 |
| Phone-sized current | 5.9 | 27.1 | 12.1 | 1.7 | 48.8 | 1.697 |

The field named `factoryCpuMs` is a synchronous `performance.now()` wall duration, not native process CPU time. The first submitted frame includes module import, factory construction, readiness, shader preparation, and scheduling up to CPU submission; it is not a presentation timestamp. GPU elapsed time is separately queried. “First” means first environment construction in this page. Browser, HTTP, shader, and driver caches were not proven cold. The phone-sized environments were rebuilt after the desktop tests in the same page/session, so those preparations are not independent cold-page loads.

The current design's asset fetch took 9.0 ms desktop / 7.9 ms phone-sized, and its combined gzip plus CFD1 decode took 25.2 / 25.1 ms. The current field-ready durations were 34.3 / 33.0 ms, with no fallback generation and no load errors. These local-server observations do not estimate real network delivery. Do not add the fetch/decode diagnostics to the factory and ready durations: parts overlap because loading starts during factory construction. The old `proceduralGenerationMs` also includes nebula preparation, so it is not an isolated old-cloud generator measurement.

The current decoded cloud field is 8,388,608 bytes; with mipmaps its estimated cloud GPU storage is 11,184,812 bytes. Including the nebula, the recorded estimate increases from 773,950 to 11,359,576 bytes desktop, and from 118,590 to 11,228,504 bytes phone-sized. These are calculated texture payload estimates, not measured driver allocation. The new clouds trade higher texture storage and an asset request for a different volumetric appearance and reduced recurring shader work.

## Native pressure and power context

The bounded [native log](browser-thermal.jsonl) portion from 05:38:22 through 05:43:55 UTC brackets all unique preparations and all four saved comparisons. It contains 34 native samples: all 34 report `ProcessInfo.thermalState = nominal`, and all 34 report `lowPowerMode = false`. Six full `pmset` contexts in this interval all report Battery Power; both Battery Power and AC Power settings have `lowpowermode 0`. Every recorded `pmset` command succeeded without timeout. All six `pmset therm` contexts say no thermal or performance warning level, or CPU power status, has been recorded.

There is no recorded power-source change in this interval, but power source is sampled roughly once per minute, not continuously. Native pressure is sampled roughly every ten seconds. These observations cannot rule out a brief unobserved transition. The telemetry process can also overlap browser activity; its presence is part of this experiment rather than a mathematically removed cost.

Apple's nominal thermal state is a pressure classification, not a temperature or fixed-frequency guarantee. Dynamic clock selection, other system activity, or scheduling may contribute to the observed spread, but this audit cannot identify its cause. The ten-second rests and nominal readings do not prove complete cooling. See the earlier [thermal-method research](../rested-retests/research.md) for the primary-source interpretation.

## Provenance checks

All four exports contain identical build manifests. At audit time, all eight recorded source-file hashes matched the current source, including the untouched reference, shader, generator, codec, environment, browser harness, and both Three modules. The current CFD1 asset and JSON metadata also matched their recorded hashes. The manifest additionally lists the older unused `.rgba.gz` file; it has since been removed from `public` after the frozen server snapshot and is not the asset used by these current-design renders. Bundle hashes are recorded in the immutable manifest; this audit did not independently re-read the server's bundle files.

The served CFD1 gzip asset is 3,165,073 bytes, SHA-256 `3893a218a0349cca5e6e2489e1d7ead30dab2d20f875e6050c6edc021b61d84c`. The separate [codec proof](codec-comparison.json) establishes exact decoded atlas bytes and a 1,094,518-byte reduction versus the captured raw-RGBA gzip asset. It does not establish startup speed; that is the separate delivery comparison.
