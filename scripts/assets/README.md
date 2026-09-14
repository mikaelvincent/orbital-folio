# Satellite texture sources

## Night Earth color map

`public/textures/earth-black-marble-8k.jpg` is the production 8192×4096 night map. It is derived directly from NASA's 13500×6750 Black Marble 2016 color GeoTIFF, rather than resizing an earlier JPEG. The retained 2K and 4K night maps can still be requested explicitly for comparisons and reproducing previous evidence. No map is enlarged. The browser requests only the selected checked-in JPEG from this site; source download and image preparation happen only during development.

Credit: **NASA Earth Observatory / Joshua Stevens; Suomi NPP VIIRS data from Miguel Román, NASA GSFC**. [NASA's map page](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/) and [processing explanation](https://science.nasa.gov/earth/earth-observatory/night-light-maps-open-up-new-applications-90008/) describe a historical composite selected from cloud-free nights throughout 2016. It is not live weather or a photograph of the whole Earth at one instant. This source has no cloud overlay; some NASA promotional globe images add Blue Marble clouds for aesthetic effect. Our asset has no added clouds, glow, sharpening or artistic color adjustment. NASA is acknowledged as the imagery source, without implying endorsement; see [NASA's image usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).

To reproduce it, download the [original color GeoTIFF](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_3km_geo.tif), install the repository's pinned dependencies, then run:

```sh
node scripts/prepare-night-earth-texture.mjs /path/to/BlackMarble_2016_3km_geo.tif 8192
```

The output width defaults to 8192. Pass `2048` or `4096` to reproduce the retained comparison maps. The loader supports all three night-map sizes. Day-map defaults remain 8192 so the historical benchmark recipes are unchanged.

The source is 64,383,740 bytes, SHA-256 `e915ef2a20d84e2a59e1547d3ad564463ad4bcf22bfa02e0e0b8ed1cd722e9c0`. The script verifies that hash and the 13500×6750 dimensions, uses one Sharp worker for Lanczos3 resizing, and encodes sRGB JPEG quality 90 with MozJPEG and 4:4:4 chroma to retain the fine colored light patterns. Image rows run north to south, longitude columns run west to east, and the antimeridian is at the seam. There is no geographic flip or crop during preparation; the production loader applies the same single vertical flip as the day map.

| Night map | Encoded bytes | Nominal RGBA8 texture with mipmaps | SHA-256 |
| --- | ---: | ---: | --- |
| 2K, comparison | 179,391 | 11,184,812 | `83c0929a419f416741592b2dbf6b189aebd55c4b141c963518fa391a42d595d6` |
| 4K, comparison | 637,946 | 44,739,244 | `f2e4e44a0cc209f076ba9169753a005d216939e6b39011d16bc66a08dfba411e` |
| 8K, production | 2,329,878 | 178,956,972 | `48270283df64bcf5c892a15c2efcbaf2a468fb292c1e534b67d47b6ac2c707cd` |

The current 8K map has four times the pixels of 4K and retains finer city-light detail. It adds 1,691,932 encoded bytes and approximately 134.2 MB of nominal texture allocation versus 4K; the 4K map uses 72.6% fewer download bytes and 75% less nominal texture allocation. The 2K map is the lightest option. These are asset/allocation calculations, not measured frame-rate claims. Driver padding and decoded CPU image memory are additional. Each adjacent manifest preserves the complete recipe, source credit, source and output hashes, dimensions and codec versions; the retained manifests' explicit width arguments keep their recipes reproducible when the default changes.

## Combined Earth color map

`public/textures/earth-blue-marble-8k.jpg` is the retained 8192×4096 day map combining land, ocean color, sea ice and clouds. It preserves the original TIFF's resolution rather than upscaling an earlier JPEG. Its adjacent JSON manifest records provenance, dimensions, hashes, encoding and nominal texture memory. The app serves this checked-in JPEG locally when the day map is requested; it never downloads the 51 MB source TIFF or runs the image encoder. The historical 2K and 4K JPEGs and manifests remain available for the resolution comparison lab; those recorded day-map experiments remain reproducible after the switch to night.

The map is adapted from NASA Goddard Space Flight Center / Reto Stöckli, Blue Marble (2002), with enhancements by Robert Simmon and support from the MODIS science teams. [NASA's source description and credits](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/) document a historical satellite composite, not live weather.

To reproduce it, download the [original combined 8192×4096 TIFF](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57735/land_ocean_ice_cloud_8192.tif), install the repository's pinned dependencies, then run:

```sh
node scripts/prepare-earth-texture.mjs /path/to/land_ocean_ice_cloud_8192.tif 8192
```

The script verifies the source SHA-256 before encoding and defaults to width 8192 when the final argument is omitted. Pass 2048 or 4096 to reproduce the historical lower-resolution maps. Every size is derived directly from the same verified original TIFF; the 8K map is not upscaled. The script preserves the north-to-south image rows and west-to-east longitude columns, with the antimeridian at the image seam. A standard Three.js sphere requires one vertical flip and `SRGBColorSpace`. Our production loader applies `imageOrientation: flipY` during `createImageBitmap` decoding and sets the texture's `flipY` to false, so the image is flipped exactly once.

JPEG quality 85 encoding at the original 8K dimensions produces 6,615,276 bytes, SHA-256 `f634e862be1689420d2d2dc5adf8fa460acece6896c9df1d9a67b3adde04f6de`. The nominal RGBA8 texture and full mip chain occupy 178,956,972 bytes, excluding driver padding and decoded CPU image memory. The historical Lanczos3 downsampled JPEGs contain 1,925,103 bytes at 4K and 526,263 bytes at 2K; their adjacent manifests retain the individual hashes. JPEG quality values are encoder settings, not objective quality scores.

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
