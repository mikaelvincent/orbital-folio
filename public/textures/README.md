# Texture sources

## Night Earth

The default night scene uses `earth-black-marble-8k.jpg`: an 8192×4096 NASA Black Marble 2016 color map, downsampled from the verified 13500×6750 GeoTIFF. Credit: **NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS data from Miguel Román, NASA GSFC**. [NASA's source map page](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/) documents a historical composite selected from cloud-free nights. It is not live weather or one simultaneous full-globe photograph. No clouds, glow or artistic color adjustments were added to the prepared map.

The locally served JPEG contains 2,329,878 bytes, SHA-256 `48270283df64bcf5c892a15c2efcbaf2a468fb292c1e534b67d47b6ac2c707cd`. It uses JPEG quality 90, MozJPEG and 4:4:4 chroma. The nominal RGBA8 texture with its full mip chain occupies 178,956,972 bytes, excluding driver overhead and decoded CPU memory. The adjacent JSON records source credit, reproducible processing, dimensions and hashes. The browser does not request the original 64 MB GeoTIFF or contact NASA. Developer source and rebuild instructions are in `scripts/assets/README.md`.

## Retained daytime Earth

`earth-blue-marble-8k.jpg` is the previous 8192×4096 combined NASA Blue Marble map with land, ocean color, ice and clouds. It is encoded directly from the original 8192×4096 TIFF, without upscaling. The JPEG contains 6,615,276 bytes, with SHA-256 `f634e862be1689420d2d2dc5adf8fa460acece6896c9df1d9a67b3adde04f6de`. The same-origin image is decoded once with an explicit vertical flip and displayed as sRGB on the rotating globe. It is a historical composite, not live weather.

The `earth-blue-marble-2k`, `earth-blue-marble-4k` and `earth-blue-marble-8k` images and manifests preserve the earlier quality and performance experiments. The resolution comparison lab can still load each day version; the stored day-map benchmark evidence describes those maps, not the later night map.

## Retained cloud experiments

`cloud-satellite-v2.cfd.gz` contains cloud coverage adapted from **NASA Goddard Space Flight Center / Reto Stöckli, Blue Marble**, with enhancements by Robert Simmon and support from the MODIS science teams. Source: [NASA Blue Marble (2002)](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/).

The cloud mask is based on a historical satellite composite. Orbital Folio adds artistic shallow height and responsive lighting; this is not measured altitude, current weather or an endorsed NASA product. The adjacent JSON manifest records source and derived hashes and the processing recipe. Developer rebuild instructions are in `scripts/assets/README.md`.

The older `cloud-banks-v1` files preserve the previous procedural-cloud experiment for the performance record. The retained before/after benchmark requests `cloud-satellite-v2.cfd.gz` for its reference; the production scene does not request either cloud-only asset.
