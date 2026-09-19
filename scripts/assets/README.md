# Satellite texture sources

## Production regional night Earth

`public/textures/earth-europe-loop.webp` is the only Earth image fetched by the
application: **4096×3072**, losslessly encoded from native pixels of the retained
8192×4096 night source. The chosen Europe opening remains **12° longitude,
48° latitude, −10° roll**, rotating at **0.0045 rad/s (1.5× the former base rate)**.
The authored regional landscape repeats every **180° / 698.13 seconds**, with
continuous forward sphere rotation and the original source texel density.

Rebuild deterministically from the checked-in full night source:

```sh
node scripts/build-regional-earth.mjs
```

The builder checks the source hash, retains a **1536×3072** original European
core, and joins native-scale satellite patches along minimum-error terrain paths
to form the connecting fictional geography. It does not resize, blur, relight or
generate AI pixels. The lossless encoder preserves the decoded core byte for byte.
Its manifest records the seed-derived patch choices, codec versions, source
identity and core comparison. Source recovery from Git `c645c83` is a fallback
when the local JPEG is absent. No rebuilding or encoding runs in the browser.

The delivered file contains **3,625,576 bytes**, SHA-256
`6c4101fb65ee6584a03d89a0adbde475c5db1b53162fc7074677e809ec3a671c`.
Its nominal RGBA8 mip chain occupies **67,108,860 bytes (64 MiB)** versus
178,956,972 bytes (170.67 MiB) for the full map. Delivery grows from the source
JPEG's 2,329,878 bytes; preserving pixels takes priority over compressing this
authored texture further. Allocation calculations are not measured process/GPU
memory or frame-time savings. See [regional-loop evidence](../../docs/evidence/europe-regional-loop/README.md).

The atlas covers source columns from x=3712, crops rows from y=128 for 3072 rows,
and retains the original 8192×4096 coordinate scale. The loader applies one
vertical flip during `createImageBitmap` decoding, sets Three.js `flipY=false`,
repeats U twice and clamps V. The integer horizontal repeat keeps the sphere's
antimeridian phases identical throughout physical rotation.

## Retained 8K night source and historical baseline

`public/textures/earth-black-marble-8k.jpg` is the **8192×4096** source derived from
NASA's 13500×6750 Black Marble 2016 color GeoTIFF. Keep it for rebuilding,
regression tests and historical comparisons. Ordinary application visits do not
fetch it; retaining it in public assets does not imply a second runtime request.

Credit: **NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS data from
Miguel Román, NASA GSFC**. [NASA's map page](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/)
and [processing explanation](https://science.nasa.gov/earth/earth-observatory/night-light-maps-open-up-new-applications-90008/)
describe a historical composite selected from cloud-free nights throughout 2016,
not live weather or a simultaneous global photograph. The prepared source JPEG has
no added clouds, glow, sharpening or artistic color adjustment; the regional
derivative changes geography as described above. NASA is acknowledged
as the imagery source without implying endorsement; see
[NASA's usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).

To reproduce the full source JPEG, download the
[original color GeoTIFF](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km_geo.tif),
install the repository's pinned dependencies, then run:

```sh
node scripts/prepare-night-earth-texture.mjs /path/to/BlackMarble_2016_3km_geo.tif 8192
```

The source is 64,383,740 bytes, SHA-256
`e915ef2a20d84e2a59e1547d3ad564463ad4bcf22bfa02e0e0b8ed1cd722e9c0`.
The preparation script verifies that hash and its dimensions, then uses Sharp
Lanczos3 resizing and sRGB JPEG quality 90, MozJPEG, 4:4:4 chroma. The source JPEG
is 2,329,878 bytes, SHA-256
`48270283df64bcf5c892a15c2efcbaf2a468fb292c1e534b67d47b6ac2c707cd`.
Its nominal RGBA8 mip chain is 178,956,972 bytes, excluding driver overhead and
decoded CPU image memory; this is an allocation calculation, not measured GPU
memory. The adjacent JSON preserves codec versions, source credit and recipe.

Full-source image rows run north to south and longitude columns west to east,
with the antimeridian at the seam. Source preparation applies no geographic flip
or crop. The regional builder performs the separately documented crop and collage.

## Archived day and resolution experiments

The daytime renderer, Blue Marble JPEGs and 2K/4K night JPEGs no longer ship with
the application. Source-identified results remain in `docs/evidence/performance/`.
Their provenance manifests were moved out of public assets to
[`earth-fourway/assets`](../../docs/evidence/performance/earth-fourway/assets/) and
[`night-earth-resolution/assets`](../../docs/evidence/performance/night-earth-resolution/assets/).
The old day source was NASA Goddard Space Flight Center / Reto Stöckli,
Blue Marble (2002), with enhancements by Robert Simmon and support from the MODIS
science teams; [NASA's source page](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/)
provides its description and credits.

Recover the old renderer, preparation script, full-size images and comparison lab
from Git commit `56c67bb123b4afab0c34d39560100db3e2366ea2` in a separate checkout.
The [historical resolution guide](../benchmarks/earth-resolution-lab.md) explains
that workflow and the retained saved-result audits. Do not restore unused runtime
switches merely to reproduce an old experiment. The night preparation script can
still derive smaller offline images when an explicitly authorized comparison
requires them; the current application has no resolution selector.

## Previous cloud-only field

`nasa-cloud-mask-2048.gray.gz` is a developer input, not a runtime request. It contains 2048×1024 unsigned greyscale bytes with south-to-north rows. `nasa-cloud-source.json` records the original source, processing, hashes and credit.

Cloud coverage is adapted from NASA Goddard Space Flight Center / Reto Stöckli, Blue Marble (2002), with enhancements by Robert Simmon and support from the MODIS science teams. The [NASA source description](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/) explains the historical composite. Our inferred cloud height and lighting are artistic, not measured cloud altitude. This is not live weather or a NASA-endorsed renderer.

Rebuild the runtime asset using the checked-in mask:

```sh
node scripts/bake-satellite-clouds.mjs
```

To reproduce the input mask, download the [original NASA 8192×4096 cloud-only TIFF](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif), then run:

```sh
node scripts/prepare-satellite-cloud-mask.mjs /path/to/cloud_combined_8192.tif
node scripts/bake-satellite-clouds.mjs
```

The original is 35,870,468 bytes, SHA-256 `d137775d8966ab8d443fd5126dc6e7ad72072bc1ed50555c5818d221735daf0f`. Source preparation uses the pinned Sharp developer dependency for a Lanczos3 downsample, greyscale extraction and vertical flip. The TIFF is not included in the browser bundle. The resulting mask has no baked lighting or ocean/land color.

The shader uses a full-globe map once around the sphere, without multiplying or tiling its coverage. NASA's [account of creating the mosaic](https://science.nasa.gov/blogs/earth-matters/2011/10/06/crafting-the-blue-marble/) describes some cloned gap-fill features in the source; satellite-derived does not mean every feature is unique.
