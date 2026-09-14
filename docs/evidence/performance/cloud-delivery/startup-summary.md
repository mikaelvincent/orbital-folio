# Cloud field delivery: measured startup work

The prebuilt field avoided roughly half a second of local field-generation work in all four paired samples on this Apple M4. It also adds a 3.17 MB download, so this experiment does not establish faster first display over every network. The recommended delivery is the prebuilt asset for its lower recurring client preparation work, with the existing generator retained as a load-failure fallback. The separate [browser audit](gpu-audit.md) covers rendering and first local-browser preparation.

## Scope and exactness

[Raw report](startup.json), run 2026-09-14 05:49:45.382–05:52:35.618 UTC, Node v26.0.0, arm64 Apple M4, 16 GiB memory. Status: `complete-descriptive-startup-samples`. All ten scheduled samples completed; none were skipped, retried, flagged, trimmed, or removed.

The actual production 2048 × 1024 RGBA8 atlas was used. Two preparation generations matched each other; decoding the served CFD1 gzip asset matched them exactly. Every measured generation and asset decode was also checked against the expected hash outside timing. Gzip and Brotli roundtrips passed. The decoded field is 8,388,608 bytes, SHA-256 `a3b45edb88bb9e44beb8bb979eabbbd474365d84cbc1f117f364f83b0657b966`. All four recorded benchmark/source hashes still matched at audit time.

B and C feed the same field bytes into the same production texture and volume shader. Delivery alone is therefore not expected to change settled rendering cost or the estimated 11,184,812-byte cloud texture mip chain. This experiment did not run separate B/C GPU captures; the browser comparison is original A versus the new volume delivered through C. The old and new cloud representations have different appearance and animation behavior, so A is not an image-equivalent benchmark.

## B versus C: all four pairs

B measures synchronous generation of the new field. C sums a warm local-file read, Node gzip inflate, CFD1 unpack, and a raw typed-array view. C excludes the supplemental Brotli measurement, validation hashes, and telemetry. The sum is a preparation-stage estimate, not an end-to-end browser navigation time.

| Pair / order | B: field generation ms | C: local read and decode ms | Local preparation saved ms |
| --- | ---: | ---: | ---: |
| 1 / BC | 567.37 | 36.73 | 530.63 |
| 2 / CB | 562.17 | 150.98 | 411.20 |
| 3 / BC | 560.30 | 39.23 | 521.07 |
| 4 / CB | 560.96 | 41.46 | 519.49 |
| Mean of all four | 562.70 | 67.10 | 495.60 |
| Median of all four | 561.57 | 40.35 | — |

The slower second C sample is fully retained. Its CFD1 unpack took 127.11 ms, versus 13.39, 15.88, and 16.51 ms in the other samples. The report does not retain unpack-stage process CPU time or JIT/GC traces, so it cannot identify why that sample was slower. Its native boundary readings were nominal and its power context was unchanged; those facts do not explain or invalidate the result.

Across C samples, local-file reads took 1.42–2.32 ms, gzip inflate 21.56–22.61 ms, and typed-array view creation 0.006–0.051 ms. The prebuilt path was 3.7–15.4 times faster for this measured local preparation scope, or 411–531 ms less work on the wall clock. Four samples in one process support that large observed difference; they do not establish a precise cross-device ratio or a confidence interval.

## Original A, kept separate

The two bracketing original-environment factory calls took 78.28 and 62.62 ms. They construct the original background, including its small 3D noise basis, nebula, geometry, and stars. B measures only the much larger new field. A and B neither produce equivalent clouds nor cover the same factory work, so do not turn these numbers into a percentage startup regression or improvement. They show that generating the new, richer field on every visit adds substantial client work that the original smaller basis did not require.

The browser audit records first local submitted-frame preparation separately: desktop reference/current 74.0/123.9 ms, phone-sized reference/current 47.9/48.8 ms. Those are single observations with cache and loading-order limitations; they are not additional independent samples of this Node benchmark.

## Rest, pressure, and power

Developer-side verification and compression happened before a sixty-second initial idle. Each scheduled sample then had a ten-second idle gap. The order was `A, B, C, C, B, B, C, C, B, A`, balancing B/C order in four pairs. Explicit garbage collection ran before each measurement's native snapshot, outside timed work. Functions, data, and modules had already been used or loaded during preparation; these are repeated preparation kernels in a warm process, not fresh-process, cold-JIT startup trials.

Each sample qualified at its first native check. There were thirty native observations total: ten gate, ten before, and ten after. All thirty reported nominal thermal pressure, Low Power Mode off, and Battery Power. All sixty recorded `pmset` commands completed successfully without timeout or stderr. No recovery delay or three-attempt bound was needed, and no source change was recorded across samples. The sampler ran outside measured kernels.

The gate checks thermal pressure, not timing stability. There are no baseline-drift gates in this descriptive delivery protocol. Fixed rests and nominal OS readings do not guarantee a cold device, constant frequency, or absence of brief unsampled activity. Process CPU time, where recorded for A/B, can include multiple threads and is not a temperature or energy measurement.

## Delivery footprint and practical tradeoff

The served CFD1 gzip is 3,165,073 bytes; raw-RGBA gzip of the exact same field was 4,259,591 bytes. The lossless layout saves 1,094,518 bytes, or 25.7%. CFD1 Brotli quality 5 was 3,091,163 bytes, only 73,910 bytes smaller than gzip, with a supplemental Node inflate range of 23.39–28.35 ms. This is not evidence to switch the current browser delivery away from gzip.

A 3,165,073-byte payload alone takes about 2.53 seconds at 10 Mbit/s, 0.51 seconds at 50 Mbit/s, or 0.25 seconds at 100 Mbit/s, before latency and protocol overhead. These are arithmetic illustrations, not network measurements. On a slow uncached connection, that transfer can exceed the approximately 0.56-second generation time observed on this M4; other devices can have very different generation times. Browser/CDN cache reuse can avoid repeat transfers, but cache effectiveness was not measured here.

Node warm file reads and gzip inflate are not HTTP fetch or native browser decompression. This benchmark excludes JavaScript download/parse, network latency, page scheduling, texture upload, mip generation, shader compilation, and presentation. The generator's exact repeated output was tested in this Node engine; deterministic equality across every JavaScript engine was not separately established. The browser path's actual current field-ready observation was approximately 33–34 ms from the local server, including approximately 25 ms of gzip plus CFD1 decode. Keep that limited observation separate from a production cold-network claim.
