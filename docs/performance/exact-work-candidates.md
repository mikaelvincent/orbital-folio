# When exact caches cost more than the work they replace

Consolidates the CPU-cache portions of former ledger entries **03–04**
(14 September 2026). All candidates remain disabled. Runtime vertex indexing
from the same investigation belongs to the separate
[geometry compaction story](../evidence/performance/offline-geometry-compaction/README.md).

The proposed local-transform, material-write and iris-inverse caches preserved
external edits and exact output, but their comparisons/bookkeeping had a cost.
The initial Node probes found local matrix synchronization 0.773→0.995 ms,
settled lighting 0.0671→0.0752 ms and moving iris work 0.000432→0.000719 ms.
These are named CPU kernels on that source, not frame times. Controls drifted
and no native thermal context was recorded; do not treat them as stable browser
or thermal evidence. Raw [bookkeeping](../evidence/performance/refinements/bookkeeping-benchmark.json)
and [iris](../evidence/performance/refinements/iris-inverse-benchmark.json)
reports preserve the original methods and results.

The iris cache reduced 100-frame inversion counts from 2,400 to 4 settled or
400 moving, yet was slower. This is the useful failure: operation-count savings
can be outweighed by conservative cache validation.

## Rested retest and revised decision

The [retest evidence](../evidence/performance/rested-retests/README.md) preserves
both the interrupted no-prelude pilot and a separately declared 100 ms warmed-work
protocol, exact v1 sources, all raw attempts, native telemetry and exclusions.
Both variants receive the same prelude; fresh construction excludes it. The
five-percent spread and 2.5-percent directional-drift gates were not relaxed.

The v2 result is **complete-with-inconclusive-cases**, not a successful comparison
of every candidate. The [final audit](../evidence/performance/rested-retests/final-audit.md)
checks 14 source hashes and records 16 accepted blocks, nine rejected attempts,
475 nominal native readings and a battery→AC change between moving-iris blocks.
Its two separately counterbalanced power cohorts must remain separate:

| Candidate | Qualified result | Decision |
| --- | --- | --- |
| Moving iris, battery / AC | Two balanced blocks each; 0.001086→0.002021 / 0.001087→0.002041 ms | Slower in both cohorts; reject. |
| Settled iris | 3/4 blocks; 0.000988→0.001858 ms | Direction unfavorable; formal set incomplete. |
| Local matrices | 2/4 blocks; 0.083715→0.095623 ms | All raw attempts unfavorable; formal set incomplete. |
| Settled material writes | 4/4 after two rejected attempts; 0.008436→0.007531 ms | Median paired saving only **0.000908 ms**; insufficient integration benefit. |
| Changing material writes | 3/4; ratios 0.9852–1.0077 | Mixed tiny signal, incomplete; no clear benefit. |
| Indexing construction | No A/B blocks; readiness spread 22.1% and 28.5% | No qualified net startup estimate. |

These are CPU-only Node 26/Three r185 observations on the recorded M4/macOS source.
Nominal pressure, pauses and stable controls do not prove fixed clocks or absence
of throttling. No GPU, Safari, FPS, energy or temperature benefit was measured.
The changing-state failure and excluded runs remain alongside the small settled
signal; it is not an authorization to enable material caching.

[Protocol and optional native sampler](../performance-diagnostics.md#rested-cpu-candidate-comparisons)
explain how to repeat a bounded investigation. Correctness fixtures and benchmark
helpers remain outside application imports.
