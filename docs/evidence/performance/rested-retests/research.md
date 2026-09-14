# Thermal-aware repeat protocol

Research date: 2026-09-14. This document establishes the repeat method, not a new optimization result. Existing candidates remain unactivated until comparable measurements demonstrate a benefit.

## What the evidence supports

The fanless M4 MacBook Air can reduce sustained performance under extended load. In its own ten-run Cinebench 2024 test of a 15-inch M4 Air, Tom's Hardware recorded 844 initially, then results in the mid-600s with occasional returns to the 700s. These are that review's workload and configuration, not measurements of this website. [Tom's Hardware review](https://www.tomshardware.com/laptops/macbooks/macbook-air-m4-2025-review).

Notebookcheck's 13-inch, eight-GPU-core M4 Air scored 815 in Cinebench 2024 multicore and 710 after half an hour. Its CPU power measurements fell from a brief approximately 20 W to approximately 8 W after a few minutes. [Notebookcheck's firsthand measurements](https://www.notebookcheck.net/The-passively-cooled-M4-SoC-makes-the-competition-look-old-Apple-MacBook-Air-13-M4-base-model-review.1002534.0.html).

ComputerBase measured its M4 Air's multicore clock starting at 4.46 GHz, falling to 3.34 GHz after one minute, and later approximately 3.0 GHz. The different reviews illustrate workload-dependent behavior; their figures do not define one universal throttling curve. [ComputerBase's measurements](https://www.computerbase.de/artikel/notebooks/apple-macbook-air-m4-test.91907/seite-2).

Consequently, heat is a plausible confounder in repeated tests. These external results cannot establish that heat caused any particular previous local result, or turn a rejected candidate into a demonstrated improvement.

## What the telemetry means

Apple's `ProcessInfo.thermalState` reports system thermal state. Its states are nominal, fair, serious, and critical. Apple describes elevated thermal state and processor-speed reductions, and recommends reducing resource use as thermal pressure rises. This is neither a temperature measurement nor a guarantee that all processors are running at their peak frequency. [Apple ProcessInfo documentation](https://developer.apple.com/documentation/foundation/processinfo).

Apple's archived Mac thermal-awareness guide also says unknown or unsupported thermal state can return nominal. A successful nominal reading should therefore be reported as an OS observation, not proof of cold silicon or complete sensor coverage. [Apple's thermal-state guide](https://developer.apple.com/library/archive/documentation/Performance/Conceptual/power_efficiency_guidelines_osx/RespondToThermalStateChanges.html).

Apple's `pmset` manual describes `-g therm` and `-g thermlog` as CPU-speed-related thermal information, and explicitly says they are not available on all platforms. Preserve their raw output, status, and errors. Missing limits or no recorded warning do not establish a temperature, GPU condition, or absence of throttling. `-g batt` records power-source status; `-g custom` records settings for the power sources. [Apple's pmset manual source](https://github.com/apple-oss-distributions/PowerManagement/blob/main/pmset/pmset.1).

Low Power Mode can change CPU/GPU performance, so record and hold it constant. Power modes can be configured separately for battery and adapter operation. [Apple API documentation](https://developer.apple.com/documentation/foundation/processinfo/islowpowermodeenabled), [Apple power-mode support](https://support.apple.com/en-us/101613).

## Repeat method

The durations and thresholds below are engineering choices for this experiment. Apple does not prescribe them as sufficient cooldown times. The correct claim after passing the checks is **nominal OS thermal pressure with stable measured controls**, not **cooled** or **unthrottled**.

1. Compile helpers, prepare models, and finish builds before the recovery period. Serialize runners. Keep rendering tabs blank and avoid simultaneous builds, tests, or geometry probes. Record the machine, OS/runtime version, power source, battery/charging state, Low Power Mode, displays, and relevant workload settings. Keep ambient conditions and placement consistent; Apple recommends a stable, ventilated surface and an operating environment of 10–35 °C. [Apple operating-temperature guidance](https://support.apple.com/en-us/102336).
2. Warm the tested implementations consistently, then begin an initial 60-second idle interval. Require repeated nominal observations and three brief reference controls with 10-second idle gaps. Use a declared control spread, initially `(max − min) / median <= 5%`, and inspect the sequence for drift. This is a readiness heuristic; a 5% gate cannot establish a sub-1% benefit.
3. Calibrate equal-work timing batches to approximately 100–250 ms using the reference, then hold the workload constant within a comparison. The previous inverse-cache batches were only a few milliseconds in total, making fixed iteration counts a poor default. Separate fixture/setup cost from kernel cost; include startup costs when they are the actual optimization tradeoff.
4. Counterbalance short blocks using ABBA and BAAB, where A is the reference and B the candidate. Include at least both orders and multiple blocks, predeclaring the requested block count. Compare repeated A controls as well as paired A/B results. Record all raw samples, operation counts, observed thermal/power state, and any interruption or rejection reason.
5. Start with at least 20 seconds of actual idle between blocks. If thermal pressure is elevated or controls drift, extend the break in 60-second increments and repeat readiness checks. Bound retries and total recovery time. If readiness cannot be established, stop with an inconclusive result rather than accepting a convenient sample. These minimum breaks are scheduling choices, not proof of recovery.
6. Flag or reject blocks with an observed thermal-state or power-mode change, excessive control drift, or known competing work, using rules fixed before comparing results. Preserve rejected data. Unknown telemetry remains unknown. Do not select only the fastest controls or remove slow candidate samples after seeing the outcome.
7. Report paired ratios and their spread, sample counts, control drift, and all exclusions. Small or inconsistent differences remain inconclusive. A repeatable microbenchmark improvement still needs an end-to-end check before activation, and CPU timings cannot establish lower GPU cost or lower device temperature.

A separate sustained browser comparison should use identical production geometry, camera/activity, resolution, browser, and power settings. Record frame CPU/GPU measurements over time and compare early and late windows; use a declared duration and report any trend rather than assuming that a fixed minute reaches thermal equilibrium. Short rested bursts and sustained rendering answer different questions.

## Native sampler

Source: `scripts/benchmarks/mac-thermal-snapshot.swift`. Compile once before recovery, for example:

```sh
xcrun swiftc scripts/benchmarks/mac-thermal-snapshot.swift -o /tmp/orbital-folio-mac-thermal-snapshot
```

The executable prints one JSON object. Invoke it outside timed kernels; do not compile or interpret Swift for each sample. The default reads `thermalState`, its raw value, Low Power Mode, OS version, timestamp, and uptime. `--pmset` adds bounded read-only thermal and battery queries. `--settings` also includes power settings. Each external query retains its exit status, raw output, elapsed time, and timeout status. `sampleDurationMs` measures sampler work after process startup; it is not total invocation overhead.

Sampling before and after a short kernel can miss a transient state between samples. These snapshots therefore provide contextual evidence, not exhaustive proof of thermal stability. The sampler does not alter power settings or assert a temperature.

Validation: the sampler compiled successfully on this Mac. Default and full snapshots returned valid JSON; an unsupported argument returned exit code 2. The saved `sampler-validation.json` observation at 2026-09-14 03:51:57 UTC reports **fair** thermal state and Low Power Mode disabled, while `pmset -g therm` reports no recorded thermal/performance/CPU-power status. This local observation reinforces that the latter messages cannot establish nominal thermal pressure. It is a sampler check, not a benchmark or proof of the cause of earlier timing results.

## Version 1 pilot and read-only audit

The pilot was deliberately stopped after the initial reference controls failed for moving iris inverses, settled iris inverses, and local matrix updates. The raw report remains `run-20260914.json` with status `interrupted`, alongside its event log. Its exact harness sources are retained in `protocol-v1/`. No comparison block was reached or accepted; calibration timings are not accepted optimization results. The lighting and indexing cases had not reached their controls.

| Case | Reference-control elapsed times, ms | Control spread |
| --- | --- | --- |
| Iris, moving: attempt 1 | 66.055, 73.436, 73.450 | 10.07% |
| Iris, moving: attempt 2 | 65.900, 73.130, 71.367 | 10.13% |
| Iris, settled: attempt 1 | 58.328, 62.372, 63.908 | 8.95% |
| Iris, settled: attempt 2 | 56.494, 64.519, 64.192 | 12.50% |
| Local matrices: first attempt | 97.443, 102.375, 105.773 | 8.14% |

These failed the unchanged 5% spread limit despite nominal thermal observations. The implementation also rejects monotonic control drift above half that limit. The result establishes unstable controls under this protocol; it does not identify heat as the cause. JIT compilation, scheduling, cache state, and garbage collection remain possible contributors. Heap snapshots changed during some controls, but no GC or JIT trace was collected, so those snapshots cannot assign the timing variation to a specific mechanism.

The read-only audit found that A/B measured work counts match, orders are seeded and balanced between ABBA and BAAB, and reset, telemetry, and explicitly requested garbage collection are outside the timer. Calibration actually sizes the shared count to the slower variant. Consequently, the configured 120 ms is a target for that variant, not a guaranteed minimum for both; iris reference batches were approximately 58–73 ms. A single full warmup follows calibration, then A receives additional readiness and bracketing controls. The protocol does not independently establish that B's execution state has stabilized.

These are CPU algorithm probes with bounded scope. The matrix case repeats unchanged forced world-matrix traversal. The iris case invokes all 24 modeled leaf callbacks and its moving case varies translation only. Lighting uses real material values copied into simple fixtures; the changing case keeps linked-room dimmers at 0.5. Construction excludes browser textures, GPU uploads, and rendering. Four accepted blocks, if eventually obtained, support descriptive paired comparisons rather than a statistical guarantee; incomplete accepted subsets can also lose the planned order balance.

Automatic acceptance checks Low Power Mode changes within a block, but full power-source context is recorded separately. Final analysis must also inspect the saved boundary power-source and settings observations, including changes between blocks or cases. No automatic gate establishes complete environmental equivalence.

## Separately declared version 2: warmed repeated work

Version 2 asks about **repeated CPU work immediately after a brief active prelude**. Version 1 sampled work after idle gaps. This is a different experimental condition, relevant to continuously running frame code, and its results must remain separate from the pilot. The prelude is a measurement technique, not a proposed addition to the website.

Untimed warmup is an established way to prepare caches before measuring repeated work. Google Benchmark explicitly supports a warmup interval whose results are excluded. [Google Benchmark user guide](https://google.github.io/benchmark/user_guide.html#runtime-and-reporting-considerations). Apple describes a performance controller that can select CPUs and change their frequency using observed application workload. [Apple's explanation of performance controllers](https://developer.apple.com/videos/play/wwdc2020/10224/). Those sources motivate a controlled prelude; neither establishes 100 ms as enough to stabilize this Mac's frequency, cache state, or JIT compilation.

The separately declared change is `--prelude-ms=100`, with zero preserving the original behavior. Before every steady-work sample, including readiness and bracketing controls, run the selected implementation for the same declared untimed duration. Record its actual duration and operation count. Reset logical inputs, then immediately measure the unchanged shared operation count. Do not insert telemetry, asynchronous waiting, or forced garbage collection between the prelude and measured work. Construction/startup samples exclude this prelude to preserve their measurement question.

Retain the existing spread/drift limits, nominal-state requirements, bounded retries, balanced schedule, and complete raw history. A prelude does not make a failed gate acceptable. Preserve the pilot and use separate versioned output and source hashes; do not combine the two protocols or select the more favorable answer after seeing results. If the new controls remain unstable, the outcome remains inconclusive.

Version 2 also records process and, when supported, current-thread CPU-time deltas alongside wall time. Node reports user and system CPU time in microseconds. Process totals can exceed wall time when multiple threads execute; current-thread totals provide a narrower view of the timed JavaScript thread. [Node process CPU accounting](https://nodejs.org/api/process.html#processcpuusagepreviousvalue), [Node current-thread CPU accounting](https://nodejs.org/api/process.html#processthreadcpuusagepreviousvalue). These are secondary diagnostics: a lower CPU-to-wall ratio can be consistent with waiting or descheduling, while a ratio near one does not establish a particular frequency or absence of throttling. They neither correct wall timings nor introduce a new post-hoc acceptance rule.
