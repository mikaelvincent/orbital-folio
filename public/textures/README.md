# Texture sources

## Night Earth

The default night scene uses `earth-black-marble-8k.jpg`: an 8192×4096 NASA Black Marble 2016 color map, downsampled from the verified 13500×6750 GeoTIFF. Credit: **NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS data from Miguel Román, NASA GSFC**. [NASA's source map page](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/) documents a historical composite selected from cloud-free nights. It is not live weather or one simultaneous full-globe photograph. No clouds, glow or artistic color adjustments were added to the prepared map.

The locally served JPEG contains 2,329,878 bytes, SHA-256 `48270283df64bcf5c892a15c2efcbaf2a468fb292c1e534b67d47b6ac2c707cd`. It uses JPEG quality 90, MozJPEG and 4:4:4 chroma. The nominal RGBA8 texture with its full mip chain occupies 178,956,972 bytes, excluding driver overhead and decoded CPU memory. The adjacent JSON records source credit, reproducible processing, dimensions and hashes. The browser does not request the original 64 MB GeoTIFF or contact NASA. Developer source and rebuild instructions are in `scripts/assets/README.md`.

## Historical Earth comparisons

Europe at Night is now the sole production Earth: the 8K night map above. The
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
