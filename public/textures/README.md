# Texture sources

## Regional night Earth — current runtime asset

The application loads **`earth-europe-loop.webp`**, a **2560×1536 lossless atlas**.
It retains the original 8K night map's pixel density: the protected **1536×1536**
Europe strip is unchanged, with native satellite boundary strips and an
**AI-generated fictional coastal continuation**. The delivered atlas is **28.346%
generated pixels** and **71.654% original satellite pixels**. This is artistic
geography, not a factual map or a NASA-produced image. No source or generated
pixels are upscaled or extrapolated.

Earth's physical placement and geographic orientation no longer change with
viewport dimensions. The approved opening remains **12° longitude / 48° latitude /
−10° roll**. A stationary sphere samples scrolling texture coordinates at the
same apparent **0.0045 rad/s**, repeating every **112.5° / 436.332 seconds (7m16s)**.
The fixed geometric longitude seam stays outside the audited camera domain.
The loader keeps source coordinates, cropping rows **384–1919**, repeating U by
**3.2**, and clamping V. See the bounded [coverage method](../../docs/evidence/earth-consistent-loop/coverage-method.md);
this is not a claim of universal minimal height or identical mip filtering.

The WebP contains **2,862,376 bytes**, SHA-256
`19ac5ed0c9796d81a36c2619a67396e1630f36b9915e1bd716c0057b65bf3cf1`.
Nominal RGBA8 storage including all mip levels is **20,971,512 bytes (20 MiB)**,
excluding driver overhead and decoded CPU memory. Compared with the previous
4096×3072 collage, download bytes fall **21.05%** and calculated mip storage
**68.75%**. These facts alone do not establish faster frames or lower power use.

The [manifest](earth-europe-loop.json) identifies the NASA source, checked-in AI
input, generation prompt, minimum-error cuts, hashes and exact decoded-core check.
Rebuild with `node scripts/build-regional-earth.mjs`; generation is not rerun.
The AI input in `scripts/assets/earth-europe-ai-bridge.png` is a developer asset,
not another runtime request. [Current comparison evidence](../../docs/evidence/earth-consistent-loop/README.md)
separates measured results and aesthetic tradeoffs. The previous satellite-only
collage remains reproducible from Git `4e215f2` and its
[historical evidence](../../docs/evidence/europe-regional-loop/README.md).

## Retained full night source — rebuild and comparison fixture

`earth-black-marble-8k.jpg` is the **8192×4096 NASA Black Marble 2016 color map**,
downsampled from the verified 13500×6750 GeoTIFF. It is retained for deterministic
rebuilding, tests and historical comparisons, and is **not fetched by the normal
application**. Credit: **NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS
data from Miguel Román, NASA GSFC**. [NASA's source map page](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/)
documents a historical composite selected from cloud-free nights. It is not live
weather or one simultaneous full-globe photograph. The prepared source JPEG has
no added clouds, glow or artistic color adjustments; the regional derivative
changes geography as described above.

The JPEG contains **2,329,878 bytes**, SHA-256
`48270283df64bcf5c892a15c2efcbaf2a468fb292c1e534b67d47b6ac2c707cd`.
It uses JPEG quality 90, MozJPEG and 4:4:4 chroma. Its nominal RGBA8 mip chain is
178,956,972 bytes (170.67 MiB). The [source manifest](earth-black-marble-8k.json)
records credit, processing, dimensions and hashes. The browser does not request
the original GeoTIFF or contact NASA.

## Historical Earth comparisons

Europe at Night is now the sole production Earth: the regional night atlas above. The
Blue Marble daytime renderer, its three JPEGs, and the lower-resolution night
JPEGs were removed after the owner selected this view. Nothing in the application
requests or switches to those variants.

Their small source/processing manifests remain with the corresponding
[day comparison evidence](../../docs/evidence/performance/earth-fourway/assets/)
and [night comparison evidence](../../docs/evidence/performance/night-earth-resolution/assets/).
Historical source, images and lab implementations can be recovered from Git
commit `56c67bb123b4afab0c34d39560100db3e2366ea2`; see the
[historical resolution guide](../../scripts/benchmarks/earth-resolution-lab.md).
Recorded measurements remain historical evidence, not measurements of the current
Europe opening or its 1.5× rotation.

## Retained cloud experiments

`cloud-satellite-v2.cfd.gz` contains cloud coverage adapted from **NASA Goddard Space Flight Center / Reto Stöckli, Blue Marble**, with enhancements by Robert Simmon and support from the MODIS science teams. Source: [NASA Blue Marble (2002)](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/).

The cloud mask is based on a historical satellite composite. Orbital Folio adds artistic shallow height and responsive lighting; this is not measured altitude, current weather or an endorsed NASA product. The adjacent JSON manifest records source and derived hashes and the processing recipe. Developer rebuild instructions are in `scripts/assets/README.md`.

The older `cloud-banks-v1` files preserve the previous procedural-cloud experiment for the performance record. The retained before/after benchmark requests `cloud-satellite-v2.cfd.gz` for its reference; the production scene does not request either cloud-only asset.
