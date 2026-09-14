# Cloud representation review — 2026-09-14

The requested change is scattered cloud groups, varied thickness, soft detail, and substantial visible ocean. It is not a request to replace the low-orbit horizon composition with a small, distant Earth.

## What already exists

`components/orbital-environment.ts` already constructs a complete spherical Earth, with separate ocean, cloud, and atmosphere meshes. The globe is large and below the camera, so the portfolio presents a close, oblique horizon. Importing another globe model would not itself fix the cloud distribution. The important choices are the source of the weather pattern and the way its height and transparency are rendered.

## Options

The behavior and cost comparisons below are engineering assessments from the current implementation, not newly measured benchmark results.

| Representation | Benefit | Cost or limitation | Fit |
| --- | --- | --- | --- |
| A fixed satellite photograph behind the spacecraft | Observed shapes and fine cloud detail; very little scene work | Lighting and perspective are baked in. It cannot reveal different portions of the globe or maintain separate cloud motion. Cropping a distant globe to make a low-orbit horizon magnifies the source. | Good for a static landing illustration; poor for this moving environment. |
| A sphere with one combined land/ocean/cloud satellite texture | Globe curvature and rotation with a simple surface shader | Clouds remain painted onto the ground, have no independent drift, and carry baked shadows/highlights. Close oblique views reveal the flatness. Adding a model download does not change this. | A reasonable budget globe, but misses the requested varying volume. |
| A sphere with a separate satellite cloud mask on a thin shell | Observed gaps, fronts, broken cells, and large-scale variation; independent cloud motion; much simpler than a full weather simulation | A plain shell has little height at the horizon. Soft edge filtering is needed to prevent sharp pixel noise. One captured weather pattern repeats when the planet completes a rotation. | Strong foundation. |
| Existing sphere plus satellite-derived mask and shallow varying cloud height | Observed morphology with water showing between groups; separate motion, responsive light, and modest visible relief | More shading work and texture data than a single flat image. Height inferred from image brightness is artistic relief, not measured atmospheric altitude. Exact cost depends on the final renderer. | Recommended balance for the existing camera and the supplied references. |
| Fully procedural weather generation | Unlimited authored variation, no photographic source dependency | Harder to avoid recognizable noise scales and uniformly thick regions; generating on visitors' devices adds startup work, while full per-pixel noise costs GPU time. | Keep only if it clearly outperforms the observed-pattern option visually. |

Use the satellite map as a spatial field, not a tiled stamp. Preserve mixed thin wisps and smaller detached cells rather than turning every bright value into a tall, opaque bank. Apply moderate relief mainly to brighter cores and preserve clear intervals between them. Judge several rotations and both desktop and portrait framing, because a globally plausible map can still put one cloudy region under the opening camera.

## Verified official source

NASA's [Blue Marble source description](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/) separates land/ocean and clouds. Its current HTML embeds this [2048×1024 cloud-only image](https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/content-feature/bluemarble/images/cloud_combined_2048.jpg?w=2048&h=1024&fit=clip&crop=faces%2Cfocalpoint). The cloud map combines visible imagery with polar thermal-infrared coverage; it is a composite, not live weather.

The original NASA GSFC files remain accessible even though their old Visible Earth catalog page now redirects:

| Developer source | Verified response and size |
| --- | --- |
| [8192×4096 cloud-only TIFF](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif) | HTTP 200; `image/tiff`; 35,870,468 bytes. Range-read TIFF header confirms RGB, LZW compression, 8192×4096. |
| [2048×1024 cloud-only TIFF](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.tif) | HTTP 200; `image/tiff`; 2,687,040 bytes. Range-read TIFF header confirms RGB, LZW compression, 2048×1024. |
| [2048×1024 cloud-only JPEG](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg) | HTTP 200; `image/jpeg`; 829,367 bytes. |

Prefer the larger TIFF as an offline developer input, then ship an appropriately filtered and compressed derivative. Visitors should not download the 35.9 MB source. The TIFF avoids adding JPEG blocks/ringing to a mask that will subsequently control opacity and shading.

NASA's [Crafting the Blue Marble](https://science.nasa.gov/blogs/earth-matters/2011/10/06/crafting-the-blue-marble/) explains that the cloud mosaic was assembled from about 200 satellite scenes. It also acknowledges cloned features used to fill orbital gaps and a Greenland streak. Therefore describe the result as satellite-derived; do not claim it is free of every repeated feature or scientifically exact weather.

## Attribution and usage

NASA's [media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) cover texture maps and personal web pages, require acknowledging source material, and prohibit implying endorsement. The Blue Marble article explicitly permits using and modifying its source files. This asset contains no logo or identifiable person. Suggested factual source credit for a derivative: “Cloud coverage adapted from NASA Goddard Space Flight Center / Reto Stöckli, Blue Marble. Height and lighting are an artistic interpretation by Orbital Folio.” Preserve the source URL, original hash, resolution, and transformation recipe beside the shipped asset. This is source attribution, not a claim that NASA produced or approved the portfolio renderer.
