# Night Earth and opening-view evidence

Historical asset/comparison evidence. The public controls described here were
removed after the fixed Mediterranean pose was approved; see
[current project context](../../PROJECT-CONTEXT.md#earth-and-atmospheric-art).

14 September 2026. The requested night globe uses NASA Black Marble 2016 at 8192×4096. Four opening views—Mediterranean, East Asia, India and North America—put recognizable city-light patterns in the visible foreground. The Earth controls also offer longitude, latitude, roll, apparent size and horizon adjustments, Earth-only pause/resume, replay and reset. Preferences remain in this browser's local storage.

The opening timer begins after the Earth asset is ready, so image loading does not consume its first seconds. The initial scene placeholder remains until loading settles; an asset failure can still reveal the inexpensive fallback and diagnostic error. Selecting a view changes the existing globe's transforms without another image download, texture upload or geometry replacement. Earth pause/replay leaves the spacecraft camera, star clock and meteor clock independent.

## Source and delivery

The [NASA Black Marble map page](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/) documents a historical color composite selected from cloud-free nights throughout 2016. It is not current weather or a single simultaneous full-globe photograph. Credit: **NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS data from Miguel Román, NASA GSFC**. No cloud overlay, glow, sharpening or artistic color correction was added to the prepared texture. [NASA's processing explanation](https://science.nasa.gov/earth/earth-observatory/night-light-maps-open-up-new-applications-90008/).

The 13500×6750 original GeoTIFF is downsampled offline with Lanczos3, then encoded as sRGB JPEG quality 90, MozJPEG, 4:4:4 chroma. Only the local JPEG is requested at runtime; the browser never downloads the source TIFF or performs source conversion. The [manifest](../../../public/textures/earth-black-marble-8k.json) and [rebuild instructions](../../../scripts/assets/README.md#night-earth-color-map) preserve source/output hashes, credit, dimensions and the encoding recipe.

| Property | Previous 8K day map | New 8K night map |
| --- | ---: | ---: |
| Encoded JPEG bytes | 6,615,276 | 2,329,878 |
| Dimensions | 8192×4096 | 8192×4096 |
| Estimated RGBA8 full mip chain | 178,956,972 bytes | 178,956,972 bytes |
| Globe surface maps | 1 | 1 |
| Separate cloud layers | 0 | 0 |

This is **4,285,398 bytes / 64.8% less image transfer**, with unchanged nominal texture storage. Estimates exclude decoded CPU bitmap memory, driver padding, geometry and framebuffers. Night uses one `MeshBasicMaterial` with `toneMapped: false`, preserving the photographed city lights rather than applying the daytime sun to them. Globe geometry and the two atmosphere shells remain. The settings panel adds no background rendering pass.

**No new timed GPU comparison was performed for this change.** These are delivery and structural observations, not measured improvements in frame time, temperature or battery life. Entry 09's 2K/4K/8K timings belong to the daytime textures and must not be reused as night-map results. Browser screenshot review is not a performance benchmark.

## Browser review

Twenty-four captures cover four presets at desktop and compact viewport sizes, near the opening, five seconds later and ten seconds later. Filename times are nominal checkpoints in a running scene, not precisely frozen render times. [opening-checks.json](opening-checks.json) records the corresponding actual elapsed Earth times, selected settings, readiness, appearance and rotation.

| Opening | Desktop | Compact |
| --- | --- | --- |
| Mediterranean | [Opening](desktop-mediterranean-0s.png) · [5 seconds](desktop-mediterranean-5s.png) · [10 seconds](desktop-mediterranean-10s.png) | [Opening](compact-mediterranean-0s.png) · [5 seconds](compact-mediterranean-5s.png) · [10 seconds](compact-mediterranean-10s.png) |
| East Asia | [Opening](desktop-east-asia-0s.png) · [5 seconds](desktop-east-asia-5s.png) · [10 seconds](desktop-east-asia-10s.png) | [Opening](compact-east-asia-0s.png) · [5 seconds](compact-east-asia-5s.png) · [10 seconds](compact-east-asia-10s.png) |
| India | [Opening](desktop-india-0s.png) · [5 seconds](desktop-india-5s.png) · [10 seconds](desktop-india-10s.png) | [Opening](compact-india-0s.png) · [5 seconds](compact-india-5s.png) · [10 seconds](compact-india-10s.png) |
| North America | [Opening](desktop-north-america-0s.png) · [5 seconds](desktop-north-america-5s.png) · [10 seconds](desktop-north-america-10s.png) | [Opening](compact-north-america-0s.png) · [5 seconds](compact-north-america-5s.png) · [10 seconds](compact-north-america-10s.png) |

The [custom-control capture](compact-custom-controls.png), [pause observation](custom-pause-check.json) and [reloaded preferences](reloaded-custom-view.json) check a manual view at longitude 126°, latitude 14°, roll −20°, size 1.12 and horizon 0.70. Earth rotation stays fixed while the global active clock advances, and the paused custom framing survives reload. These are browser observations on the Mac, not physical-phone or Safari measurements.

## Correctness checks

[tests.log](tests.log) records **22 passing focused tests** across the existing Earth loader/environment tests and the new opening-view tests (available at `8f99ba7:tests/earth-views.test.mjs` in Git history). [Type checking](typecheck.log), [targeted lint](lint.log) and the [production build](build.log) also passed; a successful lint log can be empty.

Final UI captures: [desktop selector](desktop-selector.png), [compact selector](compact-selector.png), and [night portfolio](portfolio-night.png). Browser checks also verified keyboard adjustment, reset, and Escape closing the panel with focus restored while the Contact route remained selected. The temporary test tab was closed and the viewport override reset; the development server remains available on port 3000.

The new checks cover corrupt preference values and numeric limits; preset identification; real scene-matrix projection of selected geography; night-material behavior; one local image request; resource reuse; independent pause/resume/replay clocks; disposal; and the actual JPEG's dimensions, hash, bytes and source metadata. Geographic visibility is checked at 1280×720, 2560×600, 390×844 and 768×4096 for every preset and combinations of all manual bounds, at 0, 5 and 10 seconds: 432 projected states. The chosen point must face the camera, remain inside the foreground crop and clipping planes, and use finite transforms with the camera outside the atmosphere.

The first validation found that the Mediterranean and India targets could drift below an ultrawide viewport during their first seconds. The renderer now gives those short foregrounds additional bottom-edge margin. Portrait composition received its own anchor, with a lower foreground fallback when a tall custom framing would otherwise aim above the globe's limb. The visibility assertions remain intact and pass with these corrections.

Historical validation command, for the recorded revision only. The public controls and their opening-view tests were subsequently removed after the fixed Mediterranean pose was approved:

```sh
node --test tests/earth-satellite.test.mjs tests/earth-environment.test.mjs tests/earth-views.test.mjs
```

The next performance-optimization candidates remain on hold. This entry does not authorize additional detail reduction, adaptive resolution or a new idle-rendering policy.
