# Night Earth resolution audit

Status: **passed**. 12 complete reports, 1 excluded raw reports, 84 native snapshots.

| Map | Image download MB | Nominal texture + mips MB | Illustrative decoded RGBA MB |
|---|---:|---:|---:|
| 2K | 0.179 | 11.185 | 8.389 |
| 4K | 0.638 | 44.739 | 33.554 |
| 8K | 2.330 | 178.957 | 134.218 |

## Chromium 1422x871 DPR2 (unobserved display)

Orders: ABC, ACB, BAC, BCA, CAB, CBA. Complete six-order design. 3 unique preparations.

| Map | GPU mean ms | GPU block mean min–max ms | CPU submission mean ms | CPU block mean min–max ms | Frame interval mean ms | Frames |
|---|---:|---|---:|---|---:|---:|
| 2k | 2.243 | 2.091–2.548 | 0.330 | 0.237–0.539 | 33.332 | 720 |
| 4k | 2.182 | 2.017–2.280 | 0.316 | 0.245–0.388 | 33.331 | 720 |
| 8k | 2.207 | 1.998–2.402 | 0.289 | 0.231–0.342 | 33.338 | 720 |

### Unique local preparation observations

One first preparation per version is retained by its timestamp, even when later rounds reuse the same values. Preparations share caches and run in the fixed 2K → 4K → 8K order. These are local submission milestones, not Internet page-load measurements or replicated startup comparisons.

| Map | Image decode ms | First render submission ms | First render GPU ms | First submitted frame wall ms |
|---|---:|---:|---:|---:|
| 2k | 16.000 | 24.800 | 16.296 | 73.900 |
| 4k | 55.300 | 59.300 | 21.044 | 133.800 |
| 8k | 221.400 | 211.100 | 46.373 | 466.900 |

## Safari 1422x871 DPR2 (unlocked display)

Orders: ABC, ACB, BAC, BCA, CAB, CBA. Complete six-order design. 3 unique preparations.

| Map | GPU mean ms | GPU block mean min–max ms | CPU submission mean ms | CPU block mean min–max ms | Frame interval mean ms | Frames |
|---|---:|---|---:|---|---:|---:|
| 2k | Unavailable | Unavailable–Unavailable | 0.353 | 0.217–0.600 | 16.668 | 720 |
| 4k | Unavailable | Unavailable–Unavailable | 0.394 | 0.317–0.625 | 16.669 | 720 |
| 8k | Unavailable | Unavailable–Unavailable | 0.342 | 0.208–0.600 | 16.667 | 720 |

### Unique local preparation observations

One first preparation per version is retained by its timestamp, even when later rounds reuse the same values. Preparations share caches and run in the fixed 2K → 4K → 8K order. These are local submission milestones, not Internet page-load measurements or replicated startup comparisons.

| Map | Image decode ms | First render submission ms | First render GPU ms | First submitted frame wall ms |
|---|---:|---:|---:|---:|
| 2k | 17.000 | 31.000 | Unavailable | 90.000 |
| 4k | 52.000 | 44.000 | Unavailable | 114.000 |
| 8k | 205.000 | 176.000 | Unavailable | 419.000 |

## Qualifications

- Per-frame observations within a block are correlated; six order-balanced blocks per resolution are the relevant repeated observations. Pooled frame p95 is descriptive, not a confidence interval.
- Measurements cover the orbital background only, including the same stars, frozen initial Mediterranean view and cinematic atmosphere. They exclude the spacecraft, app UI, camera travel and whole-site FPS.
- GPU timer queries measure elapsed rendering work. CPU fields are elapsed JavaScript/update/render-submission wall durations, not native CPU utilization, power or temperature. Display-paced intervals are not maximum attainable FPS.
- Safari without GPU timer support supplies CPU/frame measurements only. Unsupported GPU values remain null and are never replaced by CPU measurements or zero.
- Recorded native-display lock states are separate experimental conditions. A visible in-app browser can submit real GPU work while the native display is locked; such timings are not established ordinary foreground website or display performance. Never pool locked and unlocked observations.
- An explicitly unobserved display-state cohort retains valid timing records without pretending that its native display state stayed fixed. Possible changes remain an uncontrolled environmental factor; balanced order alone cannot remove that uncertainty.
- All three Earth environments and their images remain resident during this lab. The nominal combined Earth texture mip payload is 234,881,028 bytes. Production retains one Earth; driver overhead, decoded images, framebuffers and geometry are additional.
- Nominal RGBA8 mip storage and illustrative decoded-RGBA storage are calculations, not measured physical GPU allocation/process memory. File bytes represent the Earth image payload, not total website download.
- Preparations are deduplicated by version/start timestamp. Shared module/shader/driver caches and fixed preparation order limit comparison; these local submission milestones are neither cold-network page load times nor replicated startup benchmarks.
- Twenty-second blank rests and observed nominal thermal pressure do not prove complete cooling, identical clocks or absence of throttling. Native snapshots outside timed frames can miss transient changes.
- Compact viewports, if present, use the same desktop machine and do not establish performance on physical mobile hardware. Small inconsistent timing differences should remain inconclusive.

## Validation

- Declared checks passed.
- NOTE: Chromium 1422x871 DPR2 (unobserved display): native display state was not continuously observed and may have changed. Order balance does not establish a controlled display condition; timings are descriptive and cannot establish ordinary foreground website performance.
- NOTE: Safari 1422x871 DPR2 (unlocked display): all recorded CPU wall durations are whole milliseconds; coarse timing limits interpretation of small submission differences.
- NOTE: 1 raw reports retained but excluded by status or an explicit interruption record; no timing-based trimming performed.
