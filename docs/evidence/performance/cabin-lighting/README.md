# Cabin lighting: authored sources and rendering cost

This is historical evidence for the former cabin-only area-light design. Current
[art direction](../../../PROJECT-CONTEXT.md#spacecraft-design) restores sunlight
and cast shadows inside cabins, with much lower ceiling and environment fill.
The timings below do not describe that current lighting. This authored comparison
is also separate from candidate 8's earlier exact shader specialization; their
gains must not be combined.

The former rig had eight unshadowed cabin point lights, three directional lights
and a hemisphere light. Its global key produced hard interior doorway bands that
did not follow the visible ceiling fixtures. The replacement has one exterior sun
and four downward rectangular cabin sources, each representing its paired ceiling
diffusers. Materials evaluate only their own cabin's emitter; shared hatches admit
both neighboring sources, and exterior materials reject cabin illumination.
Position membership survives renderer light reordering. Sunlight is excluded from
cabins, whose geometry leaves the sun-shadow pass. Exterior dish shadows stay live.

Reflected environment fill remains, the old neutral-paint color compensation is
removed, and illumination no longer rotates with the camera's portrait roll.
Automatic shadow resolution changes from desktop 2048² to 1024², with 2× softness
instead of 1×. GTAO radius/thickness change from 0.32/0.18 to 0.22/0.12 and composite
strength from 0.40 to 0.50. Pixel density, continuous motion and cache eligibility
remain unchanged. Area lights do not cast furniture shadows; contact shading is a
soft approximation and the phone retains its existing AO-free path. These choices
are one authored package, not an isolation of the cost of any single setting.

## Bounded comparison

Hidden built-in Chromium 154, ANGLE Metal on Apple M4, 1280×720 CSS and drawing
buffer, native/effective DPR 1, Projects, public seed content. Production React
compilation of the actual runtime in the existing standalone frozen lab, not the
deployed Vinext server. Earth/star/meteor time is frozen at zero. Each fresh mount
runs 240 setup frames and 180 warmup frames, then 600 measured steps at 1/60 s.
Every measured window covers the same simulation phase, 7–17 s, and lasts about
10 wall-clock seconds. All runs use full-frame GPU queries (40 samples/window,
every 15th frame), with no missing/pending/discarded samples, hidden frames or lost
contexts. Each workload's before/after camera poses match.

Builds/tests finished before timing. After initial nonrendering recovery, the
stationary block ran **A1 B1 B2 A2**; the moving block ran **B1 A1 A2 B2**. Each
sample remounted to reset simulation phase. Between remounts, the browser waited
15 seconds for four seconds of setup plus a nonrendering interval. Work completed
within the predeclared ten-minute limit. Operating conditions, other applications,
thermal pressure, clocks and power configuration were not controlled or measured.

| Workload | Before CPU mean | After CPU mean | Before GPU mean | After GPU mean |
| --- | --- | --- | --- | --- |
| Stationary, cache eligible | 3.675 ms | 3.875 ms | 6.700 ms | 5.106 ms |
| Synthetic camera motion, full renders | 5.528 ms | 5.834 ms | 11.383 ms | 11.168 ms |

The stationary GPU means were 6.566/6.833 ms before and 4.777/5.434 ms after:
both new samples are lower, with an observed average reduction of **23.8%**.
The new references vary by about 12.9%, so the exact percentage is uncertain.
Moving-view GPU time is similar (observed −1.9%). CPU preparation rose about
0.20 ms stationary and 0.31 ms moving (roughly 5.5%). CPU/GPU work overlaps;
do not add these durations or infer an FPS, temperature, energy or battery gain.
There is only one opposing-order block per workload on one browser/device, with
sparse GPU sampling and no full-cycle or sustained-use comparison.

The area-light lookup chunk adds **247,272 raw / 102,467 gzip bytes**. Summed
production client JavaScript grows from 1,947,091 to 2,195,829 raw bytes, or
584,996 to 687,980 gzip bytes; these are build sizes, not measured network/startup
latency. Runtime retains the existing cache attachment cost, plus the small shared
LTC lookup textures. The final implementation initializes those tables once across
scene remounts rather than replacing them repeatedly.

## Correctness and traceability

All four desktop cabins, paired door walls, transitions through the ladder and
shared hatch, and 390×844 / 900×1200 portrait views were inspected in hidden
Chromium. Automatic 1024²/2× settings and the phone's AO-disabled path were checked.
A same-state shading comparison reported **zero changed pixels**, but its driver
did not disable the color cache for the reference render. It checks the refreshed
contact shading, not independent reconstruction of cached color. Regression tests
cover actual batched material membership,
shared doors, camera roll/translation, emitter footprint scaling, preserved iris
hooks, exterior casters and area-dimension cache invalidation. Full isolated tests,
typecheck, affected lint and production build passed.

Baseline source is `783f044ea160f394711d7a218754006111117f7b`.
[Source manifests](source-manifests.json.gz) identify both measured source/bundle
snapshots. The candidate's post-measurement changes only guard lookup initialization
and remove unused paint metadata. [The identical temporary driver](comparison-driver.tsx.gz)
replaced `scripts/benchmarks/camera-invalidation-lab.tsx` in each disposable source
snapshot, served by the existing frozen lab on ports 3018/3019; it never accessed
the owner's database. Retained reports omit unrelated batch inventories and keep
per-frame CPU/interval values, individual GPU samples, counters, settings and poses.

- [Stationary A1](perf-stationary-A1.json.gz), [B1](perf-stationary-B1.json.gz), [B2](perf-stationary-B2.json.gz), [A2](perf-stationary-A2.json.gz).
- [Motion B1](perf-motion-B1.json.gz), [A1](perf-motion-A1.json.gz), [A2](perf-motion-A2.json.gz), [B2](perf-motion-B2.json.gz).
- [Computed summary](performance-summary.json.gz) and [cache reconstruction check](cache-verification.json.gz).
