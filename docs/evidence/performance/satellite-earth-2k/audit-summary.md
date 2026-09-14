# 2K satellite Earth: measured before/after audit

The new Earth background used less measured GPU time in all four complete runs and all eight adjacent before/after block pairs. This supports a reduction for the tested configurations. Reference-block variability prevents assigning one stable or universal percentage. No raw samples were excluded or trimmed.

This audit recomputes the four saved reports and their summaries, verifies source/asset hashes, and reads native context. It performs no rendering or benchmarks. Reproduce with `node scripts/audit-earth-comparison.mjs`; [machine-readable summary](audit-summary.json), [declared protocol](protocol.md), and raw reports remain alongside it.

## Scope and validity

The comparison used Chrome 152 / Three r185 / ANGLE Metal on Apple M4. Desktop was **1280×720 at drawing DPR 2**, a **2560×1440 buffer**; compact was **390×844 at drawing DPR 1**, a **390×844 buffer**. Both report native DPR 1, so distinguish configured drawing DPR from native DPR. Compact uses the mobile geometry setting on this same Mac, not a physical phone. These are not Safari measurements. Actual context attributes report antialiasing enabled, alpha enabled and high-performance preference.

All runs froze time at 180 seconds with zero pointer displacement. Both assets loaded successfully without recovery; each run had four blocks, ten warmup frames and sixty measured frames per block, with twenty seconds of blank rest before every block. **All 960 measured GPU queries were valid**, with **zero disjoint events or missing results**. There are 240 measured frames per design per viewport, grouped into four blocks. GPU queries cover the entire background render; they exclude the spacecraft, app UI and camera travel.

The new design includes the combined satellite image, a Lambert surface and an initial geographic tilt of `(-1.2, -1.05, 0.18)`, versus `(-0.6, 1.3, 0.18)` before. Position, radius, camera framing and surface rotation rate are unchanged. Clouds now rotate with the land. This measures the final visible redesign, not a pixel-identical shader substitution.

## GPU results

| Run | Before mean ms | After mean ms | Lower mean in this run | Before block means ms | After block means ms | Before drift |
| --- | ---: | ---: | ---: | --- | --- | ---: |
| [desktop-abba](desktop-abba.json) | 5.958 | 3.297 | 44.7% | 5.574, 6.342 | 3.164, 3.430 | +13.8% |
| [desktop-baab](desktop-baab.json) | 4.689 | 3.512 | 25.1% | 4.130, 5.248 | 3.616, 3.407 | +27.1% |
| [compact-abba](compact-abba.json) | 0.868 | 0.460 | 47.0% | 0.953, 0.783 | 0.476, 0.445 | -17.8% |
| [compact-baab](compact-baab.json) | 0.769 | 0.491 | 36.2% | 0.820, 0.719 | 0.500, 0.482 | -12.3% |

Before drift means the second chronological before block divided by the first, minus one. Its 12–27% magnitude shows meaningful variability even under nominal recorded pressure. No drift-based exclusion threshold was declared, so these results remain descriptive and no blocks were discarded after seeing their values. All eight adjacent pairs (blocks 0/1 and 2/3 in each export) favor the new design; all four new desktop block means are below all four old desktop block means, and the same holds for compact. This repeated direction supports the reduction, while the amount remains uncertain. The JSON includes every pair and distribution. Frames within a block are correlated, so 960 queries are not 960 independent experiments; no confidence interval or significance claim is made.

## Submitted work, transfer and storage

At this frozen time, one meteor is visible in both designs. Background draws fell **7 → 6**. Desktop triangles fell **97,284 → 72,964** (24,320 fewer); compact fell **48,388 → 36,292** (12,096 fewer). Point counts stayed 3,100 desktop / 2,300 compact. These are repeated submitted counts, not unique geometry allocations. Removing the cloud draw does not imply the shared sphere geometry buffer shrank by the same triangle count.

The satellite cloud atlas was **2,781,463 bytes**; the replacement JPEG is **526,263 bytes**. That saves **2,255,200 bytes / 81.08%** of asset payload. Both are one request, and the satellite JPEG replaces the cloud asset. The decoded RGBA8-sized base payload remains **8,388,608 bytes**; its complete mip chain remains **11,184,812 bytes**, so this change does **not** claim a texture-memory reduction. Including the unchanged nebula, estimated background texture storage remains 11,359,576 bytes desktop / 11,228,504 bytes compact. These are format/dimension estimates, not measured driver memory or browser heap usage.

The old cloud shader had twelve logical atlas lookups plus volume calculations, separately from its ocean surface. The new globe has one diffuse map lookup. Texture filtering can perform several internal memory accesses, so these logical counts are not literal hardware fetch counts or a predicted 12× frame-rate multiplier.

## CPU and frame cadence

| Run | Before total CPU submission ms | After total CPU submission ms | Before frame interval ms | After frame interval ms |
| --- | ---: | ---: | ---: | ---: |
| desktop-abba | 0.650 | 0.581 | 16.667 | 16.683 |
| desktop-baab | 0.497 | 0.463 | 16.683 | 16.696 |
| compact-abba | 0.529 | 0.567 | 16.665 | 16.667 |
| compact-baab | 0.488 | 0.448 | 16.667 | 16.683 |

The compact ABBA run has a higher current mean CPU submission time; the other three are lower. These small timings use a coarse browser clock, so no consistent CPU gain is claimed. The JSON separates update and render submission. Frame intervals remain approximately 16.67 ms for both designs; these measurements do not demonstrate higher displayed FPS, lower temperature, longer battery life or a full-site speedup.

## Initial preparation is separate

There are **four unique preparation records**, one per design/viewport. Each later BAAB export reuses its earlier records verbatim; they are not additional startup trials. The fixed load order is before then after. These are local first constructions in the page with unknown browser/driver cache state, not proven cold-cache or real-network measurements.

| Configuration | Factory wall ms | Ready wait wall ms | Compile wall ms | First render CPU ms | First submitted frame wall ms | First render GPU ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop before | 15.0 | 67.0 | 16.5 | 25.1 | 130.7 | 7.544 |
| Desktop after | 36.5 | 60.5 | 15.8 | 9.8 | 125.8 | 8.272 |
| Compact before | 11.0 | 38.5 | 13.2 | 8.9 | 94.2 | 3.413 |
| Compact after | 5.9 | 19.3 | 11.6 | 3.1 | 58.5 | 1.902 |

The field called `factoryCpuMs` measures synchronous wall duration, not native process CPU time. First submitted frame is the CPU-side submission milestone, not presentation. Desktop after preparation has a longer factory duration and slightly greater first-render GPU time, despite lower steady render cost. Consequently, these single observations should not be promoted to a general startup improvement claim.

The before atlas fetch/decode observations were 13.8/65.3 ms desktop and 21.5/27.1 ms compact. JPEG fetch/decode observations were 2.4/58.2 ms desktop and 3.5/16.2 ms compact. Ready-from-factory-start was 79.6 → 96.7 ms desktop and 49.0 → 24.9 ms compact. Do not add these subphases to the top-level preparation times: loading overlaps factory work, and the field-ready metric starts earlier than the post-factory readiness wait. All exact records are retained in the JSON.

## Native pressure and power context

The [native log](thermal-context.jsonl) has **ten snapshots**: one **fair** at setup completion (07:38:24 UTC), then **nine nominal** from 07:40:17 through 07:52:38. All ten record **Low Power Mode off**, **AC power**, and a charging battery. No recorded sample reports a power-source or mode change. The first run began after two nominal observations; the other runs have observations during their initial blank rest and after completion. Several after observations occur roughly a minute or more after the last measured frame, so these are intermittent contextual brackets, not frame-adjacent or continuous telemetry.

Twenty-second rests and nominal OS pressure do not prove complete cooling, constant clocks or absence of a transient event. The initial fair state was observed during setup, before the measured runs. The log cannot attribute the observed reference drift to heat or rule out other shared load, scheduling and power-management effects. See the [earlier thermal research](../rested-retests/research.md) for the external-source rationale and API limitations. No sustained thermal or energy test was performed here.

## Provenance

All four exports share snapshot **9825b278-de13-4527-b864-1f12abce48b1**, built **2026-09-14T07:34:32.771Z**. **9/9 imported source hashes match the current files** at audit time, including the cloud shader/reference and the new Earth modules. **4/4 used cloud/Earth asset and metadata hashes match current files**. No measured runtime source or asset differs from the audited current files. Exported bundle inventories are identical; this audit did not independently reopen the frozen server's emitted bundles.

Before atlas SHA-256: `221a07423e3fe04f2b32f5cd18764db33b4a7dc6c205b7e8a0df1ef39c80738b`. After JPEG SHA-256: `d2c003cc2e865c474245884cb16c9aeeb30349c8acc06e4dfb92594b2c12bbc5`. The machine-readable summary records hashes of all four input reports and the thermal log, every file verification, all block summaries and the preserved preparation records. Future source edits may make a rerun's current-source verification fail without changing this historical measurement.
