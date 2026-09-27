# Texture provenance

The application fetches only **`earth-europe-loop.webp`**, a 2560×1536 lossless
regional atlas with an unchanged 1536×1536 European core at the original source
pixel density. Its coastal continuation includes **AI-generated fictional
geography**, not observed Earth or a NASA-produced image. The
[manifest](earth-europe-loop.json) records exact source/input/output hashes,
prompt, generated-pixel attribution, crop, codec and protected-core verification.

`earth-black-marble-8k.jpg` is a rebuild/test/comparison input, not a second
runtime request. It is downsampled from the 13500×6750 NASA Black Marble 2016
color GeoTIFF. Credit: **NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS
data from Miguel Román, NASA GSFC**. This is a historical composite of cloud-free
nights, not live weather or a simultaneous photograph. The
[source manifest](earth-black-marble-8k.json) carries credit, source links, hashes,
recipe and [NASA usage guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/).
The prepared JPEG has no added clouds, glow or artistic color adjustments.

The retained `cloud-satellite-v2` experiment derives coverage from **NASA Goddard
Space Flight Center / Reto Stöckli, Blue Marble (2002)**, with enhancements by
Robert Simmon and support from the MODIS science teams. Its inferred height and
lighting are artistic, not measured altitude or current weather. The adjacent
[manifest](cloud-satellite-v2.json) records source and derived identities. It and
the earlier `cloud-banks-v1` procedural asset are used only by historical labs.

[Rebuild instructions](../../scripts/assets/README.md) distinguish current assets
from historical experiments. [Project context](../../docs/PROJECT-CONTEXT.md)
owns composition requirements; the [performance index](../../docs/performance-ledger.md)
links source-identified comparisons and their limitations. Nominal texture bytes
in manifests are allocation calculations, not measured GPU/process memory.
