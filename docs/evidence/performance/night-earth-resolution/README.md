# 8K night Earth: delivery, rendering and visual review

14 September 2026. The approved change selects the retained 8192×4096 NASA Black Marble JPEG for production. The fixed Mediterranean opening and cinematic blue atmosphere remain unchanged. Production loads one map; the three resolutions remain available in the developer comparison tool.

## Findings

| Map | Earth image download | Estimated RGBA8 texture with mipmaps | Background GPU mean | Safari frame interval |
| --- | ---: | ---: | ---: | ---: |
| 2K | 0.179 MB | 11.2 MB | 2.24 ms | 16.668 ms |
| 4K | 0.638 MB | 44.7 MB | 2.18 ms | 16.669 ms |
| 8K | 2.330 MB | 179.0 MB | 2.21 ms | 16.667 ms |

MB is decimal. Memory is a calculated Earth-map payload, not measured physical GPU/process memory. Decoded CPU image storage and driver overhead are additional. GPU measurements are descriptive Chromium background query timings; native display state was not continuously observed. Safari supplied frame/CPU measurements but did not expose GPU timing. These are separate browser observations, not a browser speed comparison.

The six GPU block means overlap: 2K 2.091–2.548 ms, 4K 2.017–2.280 ms, and 8K 1.998–2.402 ms. The small differences do not reliably rank steady rendering cost. Safari paced the isolated background similarly across all three maps. This does not establish whole-portfolio FPS, power consumption, heat or battery life.

The clearest costs are delivery, memory and initial preparation. Compared with 4K, 8K transfers 3.65× as many image bytes and requires 4× the nominal map storage. Single local Safari preparation observations took 90/114/419 ms from first environment preparation to first submitted frame for 2K/4K/8K; image decode alone took 17/52/205 ms. These are one observation per map in fixed preparation order with shared caches, not repeated Internet loading tests or presentation timestamps.

**Recommendation: 4K for the best general balance; 8K for maximum visual detail.** The matched previews show softer and merged city lights at 2K, clearer geography at 4K, and finer lights and coastline detail at 8K. The requested 8K remains enabled. No additional performance candidate was implemented.

## Method and interruptions

- Apple M4 MacBook Air, 16 GiB RAM, macOS 26.6.2. Browser versions, graphics details, exact source/asset hashes and per-block power/thermal observations are retained in each raw report.
- Native Safari and Chromium each completed all six orders: ABC, BCA, CAB, ACB, CBA, BAC, where A/B/C mean 2K/4K/8K. Each version appears twice in every serial position.
- 1422×871 CSS viewport, DPR 2, 2844×1742 drawing buffer. Initial Mediterranean time frozen at zero. Ten warmup and 120 measured frames per block; 720 measured frames per resolution per browser.
- The exact production background was rendered without the spacecraft or app UI. All variants submitted four draws, 48,642 triangles and 3,100 points at the frozen opening.
- Twenty-second blank rests precede each block. Preparation/build work was outside measured blocks. The 84 accepted native snapshots reported nominal thermal pressure, Low Power Mode off and Battery Power. Rest durations are experimental choices, not guaranteed Mac cooldown times; nominal pressure does not prove identical clocks or no throttling.
- Safari's original final round coincided with a lock-screen interruption. Its original complete report is retained and explicitly excluded, then replaced after Safari became accessible again. No samples were trimmed for their timing values.
- Chromium's in-app document stayed visible and GPU queries were valid. Native access was unavailable before this cohort and available afterward; the precise lock-state transition was not observed. Its recorded condition is therefore `unobserved`, and the timings are qualified rather than presented as a controlled foreground benchmark.
- All three Earth environments stay resident in the lab: 234.9 MB nominal map storage in total, plus their other allocations. Production uses one. This comparison does not measure low-memory-device pressure or total application memory.
- Exactly three unique preparation records per browser are counted. Repeated rounds reuse them, so reused records are not treated as independent cold starts.

The [full audit](audit-summary.md) and [machine-readable audit](audit-summary.json) preserve block ranges, paired ratios, startup phases, file hashes and limitations. [Display conditions](conditions.json) and [interruption exclusion](exclusions.json) are explicit audit inputs. Original reports are in [raw](raw/).

## Visual and integration checks

The three stills use the same frozen initial position, viewport and DPR. They show the background without the spacecraft to expose the image detail directly:

- [2K opening](preview-2k.png)
- [4K opening](preview-4k.png)
- [8K opening](preview-8k.png)

The [live 8K application](live-8k.png) and [actual Safari capture](safari-live-8k.png) verify the restored portfolio after testing. [DOM-backed environment diagnostics](live-environment.json) confirm a ready 8192×4096 night image, 2,329,878 response bytes, Mediterranean coordinates, one atmosphere layer and no texture-load error. The [Chromium warning/error log](live-browser-log.json) is empty. Safari is restored to the interactive portfolio at `http://localhost:3000/`.

Validation: [25 focused tests passed](tests.log), [type checking passed](typecheck.log), [targeted type-aware lint passed](lint.log), and [production build passed](build.log). The final auditor accepted 12 reports, retained one excluded report, and verified matching sources/assets/counters and the declared protocol. Passing those checks does not remove the recorded environmental limitations.

## Repeating the comparison

Use the [night-mode lab instructions](../../../../scripts/benchmarks/earth-resolution-lab.md). The native sampler is optional; omit it on devices where unavailable. Run all six orders separately in each desired browser, keeping viewport, DPR, power conditions and display state stable. Use **Download JSON** to preserve every attempt, including interrupted ones.

Audit saved reports with:

```sh
node scripts/audit-night-earth-results.mjs
```

The auditor groups browsers and display conditions, checks the original source/asset hashes against the workspace, distinguishes unsupported GPU timing from zero, and retains explicit exclusions. A future source change should produce a new evidence directory and fresh frozen lab; historical source checks should not be bypassed to make an old run appear current.

The implementation decision is also recorded in [performance ledger entry 13](../../../performance-ledger.md#13--8k-night-earth-and-resolution-comparison).
