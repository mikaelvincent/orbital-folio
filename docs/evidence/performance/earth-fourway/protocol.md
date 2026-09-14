# 8K implementation and four-design comparison — declared protocol

The user approved trying8K and requested a performance comparison of2K,4K,8K and the previous generative implementation if retained. This experiment uses the exact retained `scripts/benchmarks/cloud-reference.ts` (original image-free3D procedural clouds) plus the same current production Earth renderer and loader at each of the three shipped satellite image sizes. The later satellite-cloud volume is not substituted for the generative baseline.

## Design

- A=procedural, B=2K, C=4K, D=8K. Run all four Williams rows **ABDC / BCAD / CDBA / DACB** per viewport. These balance serial position and directed predecessors within rows.
- Desktop1280×720 drawingDPR2; compact390×844 drawingDPR1 on the same M4. Both are browser viewport configurations, not Safari or physical-phone benchmarks.
- Freeze active time180s and pointer0,0. Matched camera, globe position/radius and geometry; the generative design retains its original cloud appearance and geographic rotation. The three image variants differ only by texture dimensions/asset. Retain native8K in production.
- Per block:20s blank idle, native context,10warmup frames,60measured frames, asynchronous query drain, blank and native context.32blocks total /1,920measured GPU queries /4blocks per variant per viewport. Queries enclose one full background render; spacecraft/UI are excluded.
- Build source/assets into immutable chunks before measurements, recording SHA-256. Prepare/preview all four versions before initial recovery, so compilation and image upload are separate. Record preparation measurements with their actual trigger and do not present them as cold-network trials. All four environments remain resident during a cohort; aggregate memory is greater than production's single Earth.

## Thermal and workload controls

Complete builds, tests and preview setup first. No concurrent agent builds, generators or rendering previews during measured rounds. Keep the normal development server available, but close the full-site rendering tab. Other user workloads, ambient temperature and physical cooling are uncontrolled.

After preparation, idle at least60s and obtain two nominal native snapshots before starting. If pressure is elevated, extend idle in60s intervals (bounded5attempts) and record every observation. The configured native sampler reads Apple's ProcessInfo thermal state, Low Power Mode and pmset power context via the local comparison server. Missing data is unknown. This experiment requires successful nominal observations; generic lab use without native tooling remains supported but cannot make that claim.

Elevated native pressure, power-source/mode changes, restricted CPU/GPU readings, browser visibility/viewport/context changes, disjoint/missing GPU queries or failed image decoding invalidate a round. Preserve its raw partial report and reason. Allow at most two fresh attempts for a failed row after a new60s recovery/two nominal readings; do not silently discard or trim slow frames. Unknown context under this run's configured provider is not a qualified round. No post-hoc timing-based exclusions; report per-block drift/spread. Large or mixed variations yield an inconclusive ordering rather than a universal speedup.

Twenty-second breaks and nominal OS pressure are readiness heuristics, not proof of complete cooling or identical clocks. [Thermal API interpretation and prior external research](../rested-retests/research.md). This experiment measures elapsed GPU work and CPU submission, not power, temperature or battery life.

## Report

Keep each original JSON export, source/assetmanifest, complete rawframe times, allnativecontext, preparation phases, drawntriangles/calls, texturedata estimates and actualdownloads. Report per-variantGPU mean and four block means/spread for eachviewport; frame samples inside a block are correlated, not1,920independent trials. Compare imagequality separately with frozen screenshots. Check code/types/build before timing; keep previous2K/4Kresults historical.
