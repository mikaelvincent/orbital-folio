# Earth texture provenance

Verified and downloaded 2026-09-09. These are actual NASA satellite-data composites, not AI-generated Earth imagery.

## Daytime color map

- Recommended file: earth-day-2048.webp (2048 x 1024, RGB, 152768 bytes)
- JPEG alternative: earth-day-2048.jpg (2048 x 1024, RGB, 236097 bytes)
- Original: earth-day-nasa-original-5400.jpg (5400 x 2700, 1617810 bytes)
- NASA product: Blue Marble: Next Generation, July 2004, base map without baked topographic relief.
- Product page: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
- Direct download: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg
- Credit: NASA Earth Observatory. Created by Reto Stöckli, NASA Goddard Space Flight Center.
- Credit source: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/
- Processing: Lanczos resize to 2048 x 1024. WebP quality 86, method 6; JPEG quality 88, progressive, optimized. No artistic changes.

## Cloud opacity map

- Recommended file: earth-clouds-2048.webp (2048 x 1024, grayscale, 351856 bytes)
- Smaller alternative: earth-clouds-1024.webp (1024 x 512, grayscale, 128162 bytes)
- JPEG alternative: earth-clouds-2048.jpg (2048 x 1024, grayscale, 644917 bytes)
- Original: earth-clouds-nasa-original-2048.jpg (2048 x 1024, 829367 bytes)
- NASA product: Blue Marble: Clouds (2002), a multi-day MODIS composite with polar infrared data.
- Catalog page: https://visibleearth.nasa.gov/images/57747/blue-marble-clouds/77558l
- NASA Visible Earth catalog pages currently redirect to the Earth Observatory home after website migration; the NASA-hosted original binary remains available and returned HTTP 200 with image/jpeg content.
- Direct download: https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg
- Credit: NASA Goddard Space Flight Center / Reto Stöckli; enhancements by Robert Simmon.
- Supporting current NASA source for original Blue Marble composites: https://science.nasa.gov/earth/earth-observatory/the-blue-marble-2181/
- Processing: Converted equal-channel RGB image to grayscale. WebP quality 74, method 6. Small alternative uses Lanczos resize and quality 80. JPEG alternative quality 88, progressive, optimized. White represents cloud coverage; black represents clear sky. It is an opacity/data map, not a premultiplied RGBA texture.

## Usage and attribution

NASA content is generally not subject to copyright in the United States. NASA's media guidelines permit personal webpages and computer graphical simulations; acknowledge NASA as the imagery source and do not imply NASA endorsement. These Earth-only assets have no NASA logos, people, or third-party copyright notices. The applicable terms are NASA media-use guidelines, not CC-BY or the Three.js MIT code license.

Policy: https://www.nasa.gov/nasa-brand-center/images-and-media/

Suggested short site credit: “Earth imagery: NASA Earth Observatory. Clouds: NASA / Reto Stöckli.”

## Rendering notes

Both maps use global 2:1 equirectangular projection and can share sphere UVs. Use sRGB color handling for the daytime map and no color-space conversion for the cloud opacity map. NASA's deep-ocean base is uniformly dark blue; directional sunlight, modest ocean specularity, and a restrained atmosphere rim supply the visible globe's lighting and shape. Put clouds on a sphere approximately 1.003 to 1.008 times the surface radius, with slightly different slow rotation, low alpha threshold and depthWrite disabled. Keep atmosphere shells separate from opaque Earth geometry.
