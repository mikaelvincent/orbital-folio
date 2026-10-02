# Let unchanged inputs reuse existing work

Retain these four related changes. They extend candidate **10** by letting its
existing caches survive irrelevant input and reach an exact resting camera.
Continuous visible animation, rendering settings and flight/door sequencing stay
unchanged. The camera input springs snap only when both error and velocity are
at most `1e-6`; overview landmark tests bound the difference below 0.01 CSS pixel
at 1280×720 and 900×1200.

- Waking the scene no longer invalidates spacecraft pixels unconditionally.
  Actual camera, material, geometry, texture/version and light signatures still
  invalidate; hiding and quality changes still release attachments.
- Input springs finish their imperceptible tails and skip integration at exact
  rest. Zero-delta holds and active re-grab velocity are preserved.
- Opening/portal picks reuse an exact ray, range/layers, parent matrix and the
  existing non-dish geometry revision. Layout sync invalidates. Unversioned
  callers remain fresh; room intent, DOM hit tests and door eligibility stay live.
- Earth controls poll while loading or advancing, stop while ready and held or
  hidden, and synchronize on visibility return. Unchanged snapshots retain React
  state identity. Commands still update immediately.

No new GPU resources or per-object scene caches are added. Navigation retains one
ray/matrix record and one eligible portal list. The extra playback effect adds a
visibility listener and occasional synchronization reads; it removes repeated
timer callbacks and React updates during held states.

## Bounded comparison

Baseline: `c2f83575f5c12074ff399ee8a41ee90f5cd0f21f`. The
[compressed record](comparison.json.gz) retains the source diff/hashes, lockfile
and asset hashes, exact temporary runner sources, raw frame samples, timestamps,
pixel-difference statistics, lifecycle results and excluded kernel preflight.
Image bytes and disposable server/database state are not retained.

The frozen production-React fixture used public seeds, the actual renderer, a
1280×720 CSS viewport, 2560×1440 buffer, Automatic AO on and default shadows/cache.
Model time was 14 seconds and background time zero. Each workload settled for 600
manual steps and warmed for 30 RAF frames. Holds, unchanged native `input` events
and changing pointer rays each measured 120 RAF frames; release after 40 pointer
frames measured 360. The declared budget was ABBA then BAAB, all eight captures
completed once, 24–26 seconds each with operator-paced gaps. Tests/builds finished
before capture. This isolates reuse; it does not represent a full moving dish cycle.

Hidden built-in Chromium 154 / ANGLE Metal ran on Apple M4, macOS 27.0.1, battery
power. Pressure, clocks and other application load were uncontrolled/unknown.

| Workload | Baseline → retained implementation, every capture | Timing direction in the two orders |
| --- | --- | --- |
| Unchanged UI input | 120 AO refreshes → 0; 0 → 120 cache hits; 512 → 132 spacecraft draws/frame | CPU means 42.5–47.2% lower; sampled frame GPU means 42.2–42.5% lower |
| Pointer release | 325 → 159 changing camera frames; 332 → 160 AO refreshes; 20 → 198 cache hits / 360 frames | CPU means 22.3–22.4% lower; sampled GPU means 16.9–17.7% lower |
| Changing pointer | 120 changing camera frames and AO refreshes; 512 draws/frame in both | CPU means 0.2–0.3% higher, GPU 0.4–2.2% higher; no work reduction expected |
| Already settled hold | 120 cache hits, no AO refreshes and 132 draws/frame in both | CPU changed +12.2% then −4.0%; no speedup claim |

Reference CPU spread across baseline captures was 26.2% for holds, 10.7% for
unchanged input, 3.5% for release and 3.0% for motion. GPU queries sampled eight
frames per 120-frame window and 24 per release window, so they can miss spikes.
These short local observations support the removed-work decision, not exact
general speedups, FPS, power, temperature or battery-life claims.

A separate Node 26 opening-pick kernel used two opposing orders, 2,000 warmup
calls and 20,000 calls/sample. Sixty held checks made 300 → 5 mesh raycasts;
kernel means fell about 98.6%. Changing rays retained all 300 raycasts and cost
0.03–0.05 microseconds more per check (0.8–1.7%), well below the saved held work.
An earlier invocation next to fixture compilation is retained as excluded
preflight; only the subsequent two orders inform these timings.

## Correctness and limits

All 732 isolated tests, typecheck, production build and affected lint passed;
independent review found no actionable defects. New tests cover input settling,
re-grab, zero delta, ray/geometry invalidation and live portal eligibility.
The actual React component's browser fixture verified delayed readiness while
reduced, pause/play, reduced-motion props, simulated hidden/visible transitions,
immediate resume synchronization and cleanup. Held/hidden windows made zero
periodic reads versus 4–5 baseline reads per 450 ms; loading and playback retained
polling. This is simulated visibility coverage, not a native background-tab test.

Fresh page A/B pixel differences were comparable to A/A and B/B reload variation.
Using cached pixels during unchanged UI input retains the cache's existing
accepted edge differences: same-state cached/fresh comparisons were nonzero in
both variants (maximum channel difference 164). No pixel-exact rendering claim
is made. Desktop and portrait interaction checks cover release/re-grab, cabin and
ladder travel, room reading, overview return and Earth controls in Chromium.
Other browser engines, physical mobile hardware and energy usage were not tested.
