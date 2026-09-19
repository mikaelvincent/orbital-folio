# Texture sources

## Regional night Earth — current runtime asset

The application loads **`earth-europe-loop.webp`**, a **4096×3072 lossless regional
atlas** built from the retained 8K night source below. Its original European
core stays unchanged; an authored bridge of native-scale satellite patches
connects the region to its next repetition. The connecting geography is
fictional. No AI-generated pixels, resizing, blur, relighting or browser-side
image synthesis is used. The smaller atlas keeps the original source's texel
density rather than stretching a downsampled 4K world map across the globe.

The Europe opening remains **12° longitude / 48° latitude / −10° roll**, rotating
at **0.0045 rad/s**. The texture repeats every **180° / 698.13 seconds** while the
sphere continues rotating forward. Production mapping crops original rows
128–3199 and repeats twice horizontally; its source-pixel scale is preserved.

The WebP contains **3,625,576 bytes**, SHA-256
`6c4101fb65ee6584a03d89a0adbde475c5db1b53162fc7074677e809ec3a671c`.
Nominal RGBA8 storage including all mip levels is **67,108,860 bytes (64 MiB)**,
excluding driver overhead and decoded CPU memory. This reduces calculated texture
storage from the full map's 170.67 MiB, but lossless delivery is **larger** than
the former 2,329,878-byte JPEG. These facts do not establish a frame-time or power
improvement. The [manifest](earth-europe-loop.json) records its recipe, individual
patches, source hashes and zero decoded-pixel differences in the protected core.
See [regional-loop evidence](../../docs/evidence/europe-regional-loop/README.md)
and [rebuild instructions](../../scripts/assets/README.md).

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
