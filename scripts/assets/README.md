# Asset rebuilding

These are offline procedures using the repository's locked dependencies. Runtime
loads prepared assets only. Credits and runtime status live in
[texture provenance](../../public/textures/README.md); hashes/recipes live in the
linked manifests rather than being repeated here.

## Production regional night Earth

```sh
node scripts/build-regional-earth.mjs
```

The builder verifies the pinned hashes of
`public/textures/earth-black-marble-8k.jpg` and `earth-europe-ai-bridge.png`, then
writes `public/textures/earth-europe-loop.webp` and its manifest. The AI bridge is
a native 1024×1536 output; rebuilding never regenerates it. Its
[exact prompt](../../docs/evidence/earth-consistent-loop/art/prompt-v3.txt) and
[reference workflow](../../docs/evidence/earth-consistent-loop/README.md) preserve
fictional-geography provenance.

Minimum-error cuts combine natural boundary strips and the AI continuation
without resampling or blurring city lights. The assembled image is checked for
lossless equality; its protected European core is separately checked byte for
byte. The [manifest](../../public/textures/earth-europe-loop.json) records the
crop, pixel attribution, hashes and codec versions. Camera changes require
rechecking the bounded [seam/crop coverage](../../docs/evidence/earth-consistent-loop/coverage-method.md).

## Rebuild the 8K night source

Download the [original NASA Black Marble color GeoTIFF](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km_geo.tif),
then run:

```sh
node scripts/prepare-night-earth-texture.mjs /path/to/BlackMarble_2016_3km_geo.tif 8192
```

The script verifies source SHA-256 and 13500×6750 dimensions before downsampling.
The [source manifest](../../public/textures/earth-black-marble-8k.json) records
encoder versions, recipe, orientation and full credit. This preparation performs
no geographic crop or flip; the regional builder owns that transformation.
Keep the checked-in JPEG because its exact decoded pixels are a rebuild contract.

## Historical Earth and cloud experiments

The daytime renderer and 2K/4K night images no longer ship. Recover the old
renderer, images and lab from Git `56c67bb123b4afab0c34d39560100db3e2366ea2` in an
isolated checkout; [the resolution guide](../benchmarks/earth-resolution-lab.md)
explains reproducibility and saved-result audits. The first regional collage is
recoverable from Git `4e215f2`. Do not restore unused runtime controls to reproduce
an experiment. The [performance index](../../docs/performance-ledger.md) links
retained comparisons with distinct source versions and limitations.

The cloud lab retains `nasa-cloud-mask-2048.gray.gz`, a 2048×1024 grayscale mask
with south-to-north rows. [Its manifest](nasa-cloud-source.json) records source,
processing and hashes. Rebuild the comparison atlas from this checked-in mask:

```sh
node scripts/bake-satellite-clouds.mjs
```

To rebuild the mask itself, download the [NASA cloud-only TIFF](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif)
and run:

```sh
node scripts/prepare-satellite-cloud-mask.mjs /path/to/cloud_combined_8192.tif
node scripts/bake-satellite-clouds.mjs
```

The preparation script checks the source hash, downsamples with Lanczos3, extracts
grayscale and flips vertically. The mask contains no baked lighting or land/ocean
color. NASA's [mosaic account](https://science.nasa.gov/blogs/earth-matters/2011/10/06/crafting-the-blue-marble/)
notes cloned gap-fill features; satellite-derived does not mean every feature is
unique. Production requests neither this mask nor the cloud comparison atlases.
