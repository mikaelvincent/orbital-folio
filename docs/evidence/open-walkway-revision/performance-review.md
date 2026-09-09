# Final production performance note

The unchanged final production build reached approximately 60 Hz in the repeated settled desktop measurements. No speculative rendering optimization was integrated in response to the earlier slow samples.

| Measurement supplied by browser QA | Viewport / DPR | Samples | p50 | p95 | Frames >50 ms |
|---|---|---:|---:|---:|---:|
| Production overview, after 43 seconds active | 1440×1000 / 1 | 360 | 16.7 ms | 18.6 ms | 0 |
| Production Projects, after 43 seconds active | 1440×1000 / 1 | 360 | 16.7 ms | 18.5 ms | 0 |
| Development native RAF control, renderer absent | 1440×1000 / 1 | 180 | 16.7 ms | 18.6 ms | — |

Earlier production observations around 50 ms p50 / 66.7 ms p95 are retained. The later fast measurements use the unchanged build; they establish variability, not the cause of the slow observations. They do not establish a universal frame-rate guarantee or isolate GPU execution time.

Source review confirms cached static shadow generation and cached GTAO when geometry/camera state settles. The model’s hover motion flags settle normally; no persistent invalidation bug was found. It contains ten point lights and some duplicate matrix traversals, but isolated CPU measurements were small and no controlled evidence justified changing lighting, shaders, or cloud quality.

Measurement limits: the production frame window contains the latest 360 active callbacks and is not reset on navigation/resume. A 43-second settled run replaces the earlier window. `renderCpuMs` measures preparation/dispatch before diagnostics, not asynchronous GPU work or the full browser frame. The renderer-absent RAF control is a separate development control, not an identical production scene benchmark. Browser timings above were supplied by the parent’s supported browser QA; this subtask independently audited source and model behavior without UI changes.

Supporting source audit: `performance-source-review.md`; portable model-cost audit and hashed results: `audit-scene-cost.mjs` and `scene-cost-audit.json`.
