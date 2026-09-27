# Roof-biased portrait coverage — historical 20 September 2026

Source baseline `73e576a`, implementation `7fb9022`. This retained audit used
portrait yaw −0.40…+0.03 and pitch ±0.32. The positive bound was subsequently
changed to +0.10; see the [right-drag follow-up](../portrait-right-drag/README.md).
Current camera decisions belong to [project context](../../PROJECT-CONTEXT.md).

The [categorized report](coverage-check-summary.json) retains **118,508 exact
poses** across 17 viewports/both sphere meshes, all passing the 64-source-row
filtering allowance. Ordinary/direct-flight guarded bounds pass. There are
**16 resize-only sufficient-bound exceptions per mesh**, from deliberately
combining the largest angles with stale roll/composition; exact footprints fit,
but those larger neighborhoods remain inconclusive.
[Desktop](coverage-desktop.json) and [compact](coverage-compact.json) reports
identify sources and compressed raw poses. The
[method](../earth-stable-navigation/coverage-method.md) explains the distinction
between exact frusta and conservative independent half-space expansion.

[Recorded-frame coverage](coverage-live-traces.json) retains 1,770 exact/guarded
checks from 885 actual 390×844 entry/return and 768×1024 drag frames. Original
entry/return/left/right traces and source hashes remain here, with compressed
raw results. They supplement finite fixtures, not arbitrary interrupted resize,
custom content or Safari guarantees. [Motion review](motion-review.json) records
camera continuity separately; capture cadence is not frame-time measurement.
