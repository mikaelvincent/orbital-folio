# Audit of the warmed-work retest

This is a read-only review of [the version 2 raw report](warmed-run-20260914.json), its recorded conditions, and the source hashes. No runner changes, timing probes, or browser work were performed for this audit. The experiment's methodology and separate version 1 pilot are described in [research.md](research.md).

**Final status:** the report completed at **2026-09-14 04:47:58.467 UTC** with `complete-with-inconclusive-cases`. This audit first inspected the running report and then verified the completed report once. There are 16 accepted comparison blocks and nine rejected attempts; indexing never reached comparison blocks.

## Recorded conditions and continuity

The completed report contains **475 thermal-state observations, all `nominal`**, and **475 Low Power Mode observations, all `false`**. There are **51 full power contexts: five battery observations and 46 AC observations**. The battery-state records comprise five discharging observations, six AC-attached/not-charging observations, and 40 charging observations. Every recorded `pmset` thermal, battery, and settings query exited successfully without timeout: 51 successful queries of each kind. No sampler errors were recorded. The complete settings text is identical across all contexts and specifies `lowpowermode 0` for both battery and AC. Every thermal query reports no recorded warning/power status; that output is not proof of temperature or absence of throttling.

The power source changed during the run. The last recorded battery context was moving-iris block 2's ending observation at **04:22:34.194 UTC**; the next block's starting observation at **04:22:54.485 UTC** recorded AC. The actual connection time lies between those observations. No block's recorded starting and ending power sources differ, but boundary observations cannot rule out a transient between them. Moving-iris blocks 3 and 4 specifically report AC attached and **not charging**. Later observations report charging. This was not one constant-power session.

The moving-iris comparisons must therefore be separated by recorded source:

| Recorded source | Blocks and order | Candidate/reference ratios |
| --- | --- | --- |
| Battery, discharging | 1: ABBA; 2: BAAB | 1.863952; 1.855594 |
| AC attached, not charging | 3: BAAB; 4: ABBA | 1.898014; 1.855995 |

Each source group retains one of each order, and every pair shows a slower candidate. This consistency supports the direction without treating the combined four-block median as a constant-power result. All other recorded comparison blocks used AC at both boundaries. Low Power Mode was unchanged, but that alone would not have detected the power-source change.

Nominal readings and stable reference controls describe the observed conditions. They do not establish cold hardware, a fixed frequency, identical CPU placement, absence of throttling, or an unchanged user/background workload. Before/after snapshots are not continuous monitoring.

## Source verification

All **14** source hashes recorded by version 2 matched the files on disk both during the run and in the final verification: six application/model files, the runner, the controlled fixtures, the kernel, the protocol, three candidate helpers, and the indexing probe. The exact filenames and SHA-256 values are retained under `metadata.sourceHashes` in the raw report.

Every application, fixture, protocol, and candidate hash shared with version 1 is identical. The version 2 runner changed and adds the separately recorded kernel helper, as expected for the prelude/CPU-diagnostic protocol. This confirms the recorded candidate and model sources were unchanged between the two protocols. It does not hash every transitive dependency or prove that every system component was unchanged.

## Selection and outlier interpretation

The unchanged rules retain rejected attempts; this audit does not add them back into accepted summaries or delete individual outliers. Ratios below one favor the candidate. Incomplete cases retain their formal inconclusive status even when their observed direction is consistent.

| Case | Accepted blocks / requested | Accepted order balance | Sensitivity to recorded rejected attempts |
| --- | --- | --- | --- |
| Moving iris | 4 / 4 | Two ABBA, two BAAB; split equally within each power source | No rejected attempts. All ratios 1.856–1.898 favor the reference. |
| Settled iris | 3 / 4 | Two ABBA, one BAAB | Accepted ratios 1.877–1.891. The rejected pair remains 1.765; its slower reference outlier narrows the gap without reversing direction. Formal result remains partial. |
| Local matrices | 2 / 4 | One ABBA, one BAAB | Accepted ratios 1.135 and 1.150. All six attempted pairs fall between 1.112 and 1.160; rejection does not explain the unfavorable direction. Formal result remains partial. |
| Settled lighting | 4 / 4 | Two ABBA, two BAAB | All six attempted pairs favor the candidate, including both rejected attempts. Accepted ratios range 0.873–0.945; the magnitude varies. Median accepted savings is approximately 0.000908 ms per fixture update. |
| Changing lighting | 3 / 4 | Two ABBA, one BAAB | Accepted ratios 1.007722, 0.989536, and 0.985183 cross one. Both attempts at the fourth BAAB block failed the unchanged drift/spread rules; their ratios of 0.969464 and 0.957838 cannot be promoted into accepted evidence. Formal result remains partial. |
| Indexing startup | 0 / 4 | No comparison blocks | Initial reference controls vary approximately 22–28%. Calibration data cannot establish a clean paired startup result. |

The settled-lighting result is a small absolute saving in a CPU fixture covering all modeled lighting materials. It is not a measured browser-frame, GPU, energy, or temperature improvement. Do not emphasize the approximately 10.75% fixture percentage without its approximately 0.0009 ms absolute size and variation across blocks. Changing lighting remains inconclusive: its accepted median difference is approximately −0.000091 ms, the direction differs between accepted pairs, and its accepted order set is incomplete. A settled-case gain does not establish a gain during transitions.

Thread CPU time was close to wall time in the accepted steady-work samples examined. This argues against large amounts of off-CPU waiting within those samples, but does not establish frequency or identify the cause of individual slow observations. CPU diagnostics remain descriptive and were not used to correct timings or alter acceptance.
