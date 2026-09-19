# Seamless regional night Earth · 20 September 2026

The owner approved a continuously repeating regional texture, including believable
fictional connecting geography, while keeping the visible quality of the selected
8K night Earth. This supersedes the earlier full-world rotation decision. No other
performance-ledger candidate is authorized by this work.

## Delivered representation

- Same Europe opening: **12° longitude, 48° latitude, −10° roll**. Same physical
  sphere rotation: **0.0045 rad/s (1.5×)**. Camera, atmosphere, stars and spacecraft
  are unchanged.
- A **4096×3072 lossless WebP**, using the original **8192×4096** source pixels
  at their original angular density. This is a crop/composite at 8K-source detail,
  not a downsampled 4K globe.
- A 1536×3072 protected Europe strip begins at original pixel **(3712, 128)**.
  Every decoded RGB channel in that strip matches the original. Its SHA-256 is
  `b3768ea7969a308f4ae95b79fe95c01691b7829ccc36d360de47e9dec3ce81ae`.
- The connecting geography uses deterministic 256-pixel native satellite patches,
  minimum-error paths through overlapping regions, and some horizontal mirroring.
  It is an artistic collage, **not a factual world map**. There is no AI enhancement,
  resizing, blur or animated dissolve. City lights retain native source detail.
- The wrap retains native adjacent source columns, rather than copying the same
  border pixel to both sides. Horizontal repeat is **2**, vertical scale **4/3**;
  offsets are **−3712/4096, −896/3072**. The continuous texture repeats every
  **180° / 698.1317 seconds (11m38s)** with no reset or reversal.
- One existing texture lookup and the existing sphere remain. There is no runtime
  synthesis, second Earth layer, extra draw or periodic texture upload.

Build with `node scripts/build-regional-earth.mjs`, which fixes the random seed.
The adjacent public provenance manifest records the recipe, selected patches and
codec versions.
The original full-world JPEG is retained as an actively used authoring/test and
comparison fixture; normal application visits fetch only the regional WebP.

| Item | Full-world baseline | Regional loop |
| --- | ---: | ---: |
| Encoded file bytes | 2,329,878 | 3,625,576 |
| Dimensions | 8192×4096 | 4096×3072 |
| Nominal RGBA8 base allocation | 128 MiB | 48 MiB |
| Nominal RGBA8 mip chain | 170.67 MiB | 64 MiB |
| Source detail | Original 8K | Same native texel density |

The lossless file adds **1,295,698 bytes / 55.6%** to the Earth download. It avoids
another lossy encoding generation. Estimated mip allocation falls **62.5%**;
these are texture-storage calculations, not measured browser-process/GPU memory.
Repository/deployment payload still includes the source fixture. Rendering speed,
startup/decode costs and battery impact must not be inferred from these sizes.

## Source identity and rejected trials

Baseline commit: `c645c839fc638be005038eb3d039c4daac1f098d`.

Baseline JPEG SHA-256:
`48270283df64bcf5c892a15c2efcbaf2a468fb292c1e534b67d47b6ac2c707cd`.

Delivered WebP SHA-256:
`6c4101fb65ee6584a03d89a0adbde475c5db1b53162fc7074677e809ec3a671c`.

NASA Earth Observatory / Joshua Stevens, using Suomi NPP VIIRS data from Miguel
Román, NASA GSFC. Source provenance and required credit remain in
[`public/textures/earth-black-marble-8k.json`](../../../public/textures/earth-black-marble-8k.json)
and the [regional manifest](../../../public/textures/earth-europe-loop.json).

1. **AI bridge rejected:** built-in image generation, using the source region as
   reference, introduced oversized light flares and changed the photographic
   character. The exact prompt and reduced preview are in `rejected/`. None of
   those generated pixels is delivered.
2. **Long-strip collage rejected:** sharp original pixels and an exact core, but
   recognizable Italy/Nile shapes repeated too closely. The source recipe,
   manifest and preview remain in `rejected/`; the old light proxy is retained as
   `light-coverage-v1-rejected.json`. It is not current evidence.
3. **Accepted V2:** smaller native patches keep the protected Europe intact while
   avoiding reconstruction of another whole Europe immediately beside it. Final
   rendered desktop/portrait and seam captures all use the delivered V2 hash.

## Coverage and appearance checks

`node scripts/benchmarks/earth-visible-coverage.mjs` produces `coverage.json`.
It samples **2,079** production-fit camera scenarios across **11 viewports**,
including room positions, travel/roll checkpoints and conservative hover/drag
corners. The largest observed simultaneous longitude span is **152.06°**, below
the 180° period by **27.94°**. Observed latitudes **−31.78° to 80.25°** fit inside
the crop's **−50.625° to 84.375°**, with at least **4.12°** margin.

This is a finite conservative camera audit, not an all-possible-pose proof.
Spacecraft occlusion is ignored; spring/input extremes are approximated. Reader
and computer close-ups are supplemented by actual-app checks rather than included
in that numerical sweep. Future camera/FOV/layout changes must rerun coverage.
The 180° period avoids simultaneous duplicate atlas coordinates in those sampled
views; it does not prove that collaged geographic features can never look similar.

`node scripts/benchmarks/regional-earth-light-audit.mjs` produces
`light-coverage.json`. It uses a warm-bright-pixel proxy over projected planet
pixels at 49 phases plus shared elapsed times. It is not a physical land/water
classifier, a substitute for visual judgment or a performance benchmark. The
accepted neutral desktop minimum proxy rises from **0% to 0.57%** and the median
from **0.13% to 1.26%** over each representation's sampled cycle. Dark water remains
intentional; the loop does not promise uniform brightness at every time/pose.

`captures/metadata.json` records frozen preview diagnostics. Captures include:

- Original and regional openings at **1280×720** and **390×844**, DPR **2**.
- Original versus regional at **160 seconds**, plus phases near 175, 350 and 525s.
- The regional wrap at **698.1317s ±0.1s** and the original sphere UV seam near
  **744.6738s**. Continuous mapping is also tested numerically.
- Live actual-app overview, drag release, landscape Contact close-up, portrait
  roll/navigation and portrait Contact. These live captures are not synchronized
  before/after comparisons. Their DPR is **1**.

The hidden built-in **Chromium** browser was used; native Safari was not controlled
or tested. Preview drawing buffers are 2560×1440 and 780×1688, but saved screenshots
are CSS-sized 1280×720 and 390×844, respectively. Native decoded-pixel comparisons
provide the independent detail-preservation check. The background-only preview
omits spacecraft/AO/HTML; live app captures include them. No app console warning or
error was captured (`captures/app-console.json`). No continuous 11-minute visual
watch was performed; sampled phases, boundary captures and mapping tests cover
the loop instead.

## Repeatable timing method

Run `node scripts/regional-earth-lab.mjs`, then open the printed loopback URL in
the hidden browser. The lab freezes the baseline Git modules, working-tree
candidate, assets and bundle hashes at launch. Restart after edits. It does not
change the main port-3000 server or persist visitor input.

The comparison uses **1280×720**, DPR **2**, drawing buffer **2560×1440**, fixed
opening time **0**, FOV **38°** and neutral camera. Each block has **60 seconds
without rendering**, **30 warmup frames**, then **600 measured frames**. Run ABBA
and then BAAB. Direct GPU samples, when available, are separate from CPU update,
CPU command submission and requestAnimationFrame cadence. A 5% repeated-control
spread gate limits interpretation. Missing/disjoint GPU values remain unavailable.

This isolates the background, not whole-app performance. Both versions remain
resident during measurement, so aggregate process memory is not representative
of a normal visit. Preparation measurements are sequential, local and cache-warm;
they do not estimate public-network download or cold startup. Agent-owned live
app tabs were closed and builds/tests finished before timing. Other user activity
and OS clocks are uncontrolled. Recovery intervals do not prove equal clocks or
absence of thermal throttling. No heat, battery or universal FPS claim follows.

## Measured results

Both runs completed with **1,200 measured frames and 240 valid GPU queries per
version per order**: 4,800 frames / 960 GPU samples overall. Raw reports are
[`timing-abba.json`](timing-abba.json) and [`timing-baab.json`](timing-baab.json);
[`timing-summary.json`](timing-summary.json) extracts their metrics without
discarding either order. Engine: Chromium **153**, Three **185**, ANGLE Metal
**Apple M4**. The host was on battery power; `pmset` recorded no available thermal,
performance-warning or CPU-power history. That does **not** establish a rested
chip or constant GPU clocks. Context is retained in `verification/`.

| Metric · mean / p95, ms | ABBA full world | ABBA regional | BAAB full world | BAAB regional |
| --- | ---: | ---: | ---: | ---: |
| Background GPU | 3.140 / 3.981 | 3.063 / 3.996 | 3.814 / 7.783 | 3.917 / 7.217 |
| CPU update | 0.029 / 0.100 | 0.027 / 0.100 | 0.018 / 0.100 | 0.019 / 0.100 |
| CPU render submission | 0.335 / 0.500 | 0.262 / 0.400 | 0.162 / 0.300 | 0.199 / 0.300 |
| Total measured CPU callback | 0.374 / 0.600 | 0.299 / 0.500 | 0.184 / 0.300 | 0.222 / 0.400 |
| Frame interval | 16.665 / 17.600 | 16.666 / 17.600 | 16.667 / 17.600 | 16.667 / 17.600 |

**No repeatable rendering-speed improvement established.** ABBA's apparent GPU
difference is **2.45%**, against **31.29% / 35.35%** repeated-control spread.
BAAB reverses the ranking (**−2.69%**), with **25.23% / 0.02%** spread. Both fail
the baseline stability requirement. No disjoint GPU samples occurred; the data
are valid observations but rejected as evidence of a speed ranking. CPU rankings
also reverse, and sub-millisecond values are quantized. Do not add CPU and GPU
times. There were **4 background draws, 48,642 triangles and 12,000 points** in
every measured frame of both versions; this establishes equal submitted geometry,
not equal work or full-app FPS.

Preparation is separate and only has two observations per version:

| Local preparation observation | Full world | Regional |
| --- | ---: | ---: |
| Image decode | 179.5–206.9 ms | 87.1–87.4 ms |
| First render CPU submission, including initial upload | 616.2–631.5 ms | 232.1–237.3 ms |
| First submitted ready frame, total wall time | 842.2–872.3 ms | 332.7–394.6 ms |
| First render GPU query | 18.24–36.22 ms | 5.63–8.93 ms |

The smaller texture prepared faster in these observations. This is not a
controlled cold-start benchmark: preview/driver/browser caches existed, shader
programs were shared, preparation order changed, local fetches took only 5–7ms,
and no display-presentation timestamp was measured. The larger network payload
may offset preparation savings on slower connections. More startup repetitions
would be needed to quantify a general startup benefit.

## Verification and independent review

**332 tests passed**, plus TypeScript checking, affected lint and the production
build. The build also verified generated geometry. Tests cover exact original
texel centers/density, loop continuity at fixed world rays over repeated cycles,
unchanged resource identities/no repeated uploads, readiness clocks and loader
failure/disposal behavior. The retained sky audit also ran after its current
fixture dimensions were updated. Logs and final renderer/builder/lab/asset hashes
are in `verification/`. Terminal escapes and trailing whitespace are removed
from the build/lint logs; raw timing data are unchanged. Build output retains its Node deprecation, large-chunk
and Vinext route-classification warnings; they did not fail the build.

The independent critic reviewed the protected core, periodic adjacency and real
desktop/portrait art. Review revisions replaced the visibly repetitive strip
collage, corrected the comparison FOV from 42° to production 38° **before final
captures and measurements**, and clarified crop bounds and seed provenance.
Final score: **94/100**, no unresolved blockers. The rubric and retained
limitations are recorded in [`verification/critic.json`](verification/critic.json).
No runtime or asset changes followed final capture.
