# Standalone Earth comparison lab

This developer fixture compares the **frozen satellite cloud volume immediately
before the 2K satellite Earth change** with the current production 8K night environment.
It adds no portfolio routes, UI, or runtime work. The older procedural-cloud
reference remains in `cloud-reference.ts` for historical comparisons; it is not
loaded by this comparison.

- **A / reference / before:** `satellite-volume-reference.ts`, captured from
  production on 2026-09-14, with only relative imports and a provenance comment
  changed. It loads `cloud-satellite-v2.cfd.gz` and the unchanged
  `scripts/benchmarks/clouds/cloud-volume.ts` shader.
- **B / current / after:** `features/orbit/orbital-environment.ts`, using the
  fixed 8192×4096 Black Marble night image, the approved Europe opening
  (12° / 48° / −10°) and 0.0045 rad/s rotation.

The current 8K JPEG is derived directly from NASA's original 13500×6750 night
GeoTIFF, not upscaled from an earlier map. The old day and lower-resolution night
JPEGs no longer ship in `public/textures`; reproduce those historical experiments
in the separate checkout described in the
[archived resolution guide](earth-resolution-lab.md). This paired lab compares
historical cloud rendering with today's night scene, **not equivalent imagery or
an isolated optimization**. It does not select old image resolutions.

The JSON stores these source identities in `configuration.comparison`; its
build manifest records hashes of every actual imported source and public asset.
Keep the referenced cloud shader and atlas unchanged, or freeze their own copies
before changing them. This preserves the exact before design in future tests.

Start it only after source and public asset changes are settled:

```sh
node scripts/cloud-browser-lab.mjs --port 3004
```

Open `http://127.0.0.1:3004/`. Starting the server builds immutable ES module chunks,
copies `public`, and records SHA-256 hashes in a build manifest. Subsequent source
edits cannot change that running comparison. Stop and restart the script to make a
new snapshot. The texture `.gz` is served as raw gzip bytes, without automatic HTTP
decompression; the production loader handles it.

The browser starts idle. Use **Preview selected version** for a single frozen
frame at 0, 60, or 180 seconds. **Hide controls** leaves the complete background
visible; **Show controls** restores them. **Fullscreen canvas** uses browser
fullscreen. Neither action starts an animation loop.

For measurement, choose an explicit drawing DPR and viewport size, then select
**Start paired GPU comparison**. Default DPR is 2. Example configurations are a
1280×720 viewport at DPR 2 and a 390×844 viewport at DPR 1. The actual viewport,
drawing buffer, native DPR, mobile option, GPU/browser identification when
available, build hashes, and all raw samples are stored with the result.

- `A` is before, `B` is after. Choose ABBA or BAAB (four blocks).
- Both environments load, await their readiness, and submit a first complete
  frame before the initial blank rest. The reference loader's recovery generator
  stays in a lazy chunk and loads only if its asset path fails. A fallback or
  missing asset invalidates the measurement; it cannot be accepted as a faster
  correctly loaded scene. Readiness is checked before compilation and each block.
- Preparation records environment-module import time, factory CPU time, readiness
  wait, environment fetch/decode diagnostics, `compileAsync` wall time, and the
  first complete render's CPU/GPU timing. The first-frame wall milestone is CPU
  submission, not an OS presentation timestamp. These are separate from the
  steady-state samples. Reload without previewing to capture first-load phases;
  a reload does not guarantee a cold browser or driver cache. Reused environments
  and earlier preview-triggered preparations are identified explicitly.
- Before each block the canvas is cleared once, then remains blank for twenty
  seconds. No animation frames or polling timers run during that rest.
- Each block renders ten warmup frames, then 60 measured frames by default: 120
  measured frames per version. The alternative is 120/block, 240/version.
- Each measured WebGL2 `EXT_disjoint_timer_query_webgl2` encloses only
  `renderer.render(environment.scene, environment.camera)`. Update CPU, render
  submission CPU, total CPU submission, frame intervals, render counts, raw GPU
  nanoseconds, and individual validity statuses are also recorded.
- Query results are read only when available. The query drain uses short timers,
  never `gl.finish()` or a busy loop, and stops after three seconds. Timer
  discontinuities invalidate the entire affected block. Any missing or invalid
  GPU sample invalidates the paired GPU comparison; unsupported GPU timers are
  instead explicitly reported as a CPU/frame-only run.
- **Stop**, tab hiding, viewport changes, and context loss cancel the finite run.
  Partial raw results remain available. There is no continuing render loop after
  completion or cancellation.

Copy the JSON after each run. For visual comparisons, use identical viewport,
DPR, and frozen time, then switch preview version. For measurements repeat both
ABBA and BAAB orders under similar device load. A background-only elapsed GPU
comparison is not a full-site power, battery, or temperature measurement; it does
not diagnose thermal throttling by itself.


For a passively cooled machine, collect native thermal-pressure and power context
outside the render timer, start with nominal pressure, and stop competing build
or benchmark work before comparing. Use at least both orders at each viewport,
retain raw block-level results and all exclusions, and examine the two repeated
before blocks for drift. The 20-second idle interval is a declared scheduling
choice, not proof of complete cooling; extend recovery if pressure is elevated or
controls drift. See the [rested testing research](../../docs/evidence/performance/rested-retests/research.md).
Compare actual GPU elapsed milliseconds, submitted draws and triangles, asset
bytes, estimated texture storage, and readiness/preparation timings separately.
Do not convert fewer texture samples into a predicted FPS or battery multiplier.

The current image dimensions and readiness checks come from the production Earth configuration. Saved iteration 07 reports remain 2K observations; new 8K night results must not be conflated with those historical daytime measurements. Rebuilding the active image defaults to width 8192; see the [source preparation instructions](../assets/README.md).
