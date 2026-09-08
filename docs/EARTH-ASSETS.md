# Earth texture provenance and rendering budgets

Verified 2026-09-09. These maps derive from NASA satellite-data composites, not generated imagery. The cloud source is a native 8192×4096 TIFF; the high tier does not enlarge the old 2K cloud map.

| Selected tier | Day / cloud dimensions | Transfer bytes | GPU RGBA8 texture payload, with mipmaps |
| --- | --- | ---: | ---: |
| High desktop | 5400×2700 / 8192×4096 | 6,889,306 | 244.82 MiB |
| Default desktop / tablet | 4096×2048 / 4096×2048 | 2,926,348 | 85.33 MiB |
| Mobile / low texture limit | 2048×1024 / 2048×1024 | 859,258 | 21.33 MiB |

High requires at least eight hardware threads, **reported** device memory of at least 8 GB and adequate texture support. Missing memory information selects the default tier. Width below 700 pixels selects mobile. The actual maximum texture size can lower either tier further. Selection occurs on scene creation, so resizing alone does not download replacement maps. Reading view exits the renderer. The environment also supports an unused optional 4K mobile-cloud setting; it is not enabled by this application.

GPU figures sum all actual integer mip dimensions. They are texture payload estimates, not measured process memory; decoding and driver overhead are additional. The grayscale cloud content uploads through a normal four-channel texture. Native 5400 day uses WebP quality90, native8K cloud quality82; 4K day/cloud use92/88; 2K uses90. The six exact asset hashes are recorded in `docs/evidence/mockup-revision/earth-texture-manifest.json`.

## Sources

- Day: [NASA Blue Marble: Next Generation, July2004 base map](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/), created by Reto Stöckli, NASA Goddard Space Flight Center. [Original5400 JPEG](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg). Credit: **NASA Earth Observatory**.
- Clouds: NASA Blue Marble: Clouds (2002), NASA Goddard Space Flight Center / Reto Stöckli, enhancements by Robert Simmon. [Original8192 TIFF](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif). The former Visible Earth catalog page redirects after NASA's website migration; the original image binary remained available.
- Terms: [NASA images and media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/). Acknowledge NASA and do not imply endorsement. These Earth-only images contain no NASA logo, identifiable person or third-party copyright notice. They do not inherit the Three.js MIT code license.

Both maps use equirectangular 2:1 UVs. Color uses sRGB; cloud opacity uses no color-space conversion. Downsampling uses Lanczos, followed by WebP encoding. The shader lifts dark, blue-dominant ocean color while preserving land/ice detail. Separate slowly rotating cloud and atmosphere shells provide depth. Mipmaps and anisotropic filtering reduce oblique shimmer. A two-map readiness gate prevents partially loaded Earth from appearing.

Stars, meteors, navy background and atmosphere are procedural project source. Suggested attribution: “Earth imagery: NASA Earth Observatory. Clouds: NASA / Reto Stöckli.”
