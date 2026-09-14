# Satellite Earth texture cost probe — 2026-09-14

Read-only production investigation: downloaded official sources to `/tmp/orbital-earth-options-costs`, resized and encoded local alternatives, and recorded sizes. No app source, public texture, or renderer was changed. These are actual encoded file sizes, not a browser rendering benchmark or a claim of comparable visual quality at every camera angle.

NASA's [Blue Marble source article](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/) exposes both the combined land/ocean/ice/cloud map and separate land/ocean map. It describes a stitched satellite composite, rather than a simultaneous whole-Earth photograph or live weather. The article's old Visible Earth download links currently redirect to an index, but the original NASA GSFC asset endpoints return the actual files.

| Item | Exact transfer bytes | Description |
| --- | ---: | --- |
| [NASA combined 2K JPEG](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57735/land_ocean_ice_cloud_2048.jpg) | 593,729 | Ready-made 2048×1024 map with land, ocean, ice and clouds. |
| [NASA combined 8K TIFF](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57735/land_ocean_ice_cloud_8192.tif) | 51,115,006 | Lossless developer source for the encodes below; visitors would receive only the resized derivative. |
| [NASA land/ocean/ice 8K PNG](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_8192.png) | 24,147,269 | Separate cloud-free base. |
| [NASA spinning MP4 embedded in that article](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/57000/57760/rotate_hd_1280_lossless.mp4) | 1,486,885 | Actual downloaded MP4; filename says 1280. Separate video investigation verifies dimensions, duration and playback tradeoffs. |

Full source hashes, dimensions, HTTP types, encoder versions and output hashes are in [texture-sizes.json](texture-sizes.json). Inputs were decoded once per size, reduced with Lanczos3 to 2:1 dimensions, converted to RGB sRGB and encoded without metadata. WebP uses effort 4; JPEG uses mozjpeg and 4:2:0 chroma. Quality settings are codec parameters, not objective image quality measures.

| Candidate | WebP quality 80 | WebP quality 85 | JPEG quality 80 | JPEG quality 85 |
| --- | ---: | ---: | ---: | ---: |
| Combined 2048×1024 | 500,454 B | 596,442 B | 448,013 B | 526,263 B |
| Combined 4096×2048 | 1,828,326 B | 2,178,026 B | 1,636,627 B | 1,925,103 B |
| Land/ocean 2048×1024 | 165,742 B | 205,720 B | 190,394 B | 227,210 B |
| Land/ocean 4096×2048 | 573,622 B | 718,690 B | 647,664 B | 778,329 B |

For context, the current cloud field alone downloads **2,781,463 bytes** and is 2048×1024 RGBA8. A combined 2K map therefore needs about 0.45–0.60 MB in the tested encodes and replaces the cloud field plus procedural ocean; it does not add that transfer on top. A tested 4K combined map needs about 1.64–2.18 MB, still below the current cloud-field download. The 4K option's texture memory is higher: **44,739,244 bytes** versus **11,184,812 bytes** for one 2K RGBA8 map with its full mip chain. Exact mip estimates include the final 1×1 level and exclude driver padding, other scene textures and temporary decoding buffers. WebP/JPEG are download compression, not GPU texture compression.

If land is added under a separate cloud shell, its transfer is additive: the tested cloud-free land map costs about 0.17–0.23 MB at 2K or 0.57–0.78 MB at 4K. Its texture storage is also additive unless combined into a different packed representation. A single combined texture loses independent cloud drift; the globe itself can still rotate. Neither a combined map nor a separate flat shell needs a dense imported globe model: the existing sphere geometry can carry either representation. Shader and whole-page timing must be measured separately before claiming a percentage performance gain.
