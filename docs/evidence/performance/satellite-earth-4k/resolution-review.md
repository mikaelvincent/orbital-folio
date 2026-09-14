# Satellite Earth resolution review

Date: 2026-09-14. Scope: explain why the 2K map is soft and whether 4K is a sufficient final resolution. This is a read-only projection analysis, not a GPU benchmark, visual approval, or an 8K implementation.

## Finding

4K doubles texture detail in each direction compared with 2K, but it does not guarantee a sharp foreground in the current desktop composition. The image covers the entire planet while the low orbit camera enlarges a small geographic patch. This magnification is the dominant source of softness; a 4K whole-globe texture is not equivalent to a 4K image filling the screen.

At a representative desktop foreground span (CSS y=710, x=64 to x=1000), 936 CSS pixels / 1,872 display pixels span approximately 233 texels on the 4K map. The same path spans approximately 116 texels at 2K and 466 at 8K. Those figures describe texture-coordinate distance, not a rendered image quality score.

## Method and recorded results

The existing `createOrbitalEnvironment` was instantiated in Node with an injected dummy texture. No image was decoded or uploaded and no browser or GPU was used. The actual camera, responsive globe placement and initial globe rotation were used, at active time zero and neutral pointer parallax. Rays were intersected with an analytic sphere of radius 180, matching the globe. The hit points were transformed to the globe's local coordinates to obtain spherical texture coordinates.

At each point, a forward step of one physical pixel in the horizontal and vertical directions estimates the texture-coordinate Jacobian for a 4096×2048 image. Its smaller singular value is the texel density in the most magnified direction. Sampling covers rows at 78%, 80%, …, 98% of viewport height, with horizontal increments of viewport width / 60. Samples that miss the sphere or have a neighbor outside it are excluded.

| Viewport / DPR | Valid samples | 10th percentile | Median | 90th percentile |
| --- | ---: | ---: | ---: | ---: |
| 1280×720 / 2 | 472 | 0.09096 | 0.11763 | 0.15395 |
| 390×844 / 2 | 374 | 0.44472 | 0.48149 | 0.55213 |

Values are **4K texels per physical display pixel** in the most magnified direction. A value below one means the map is magnified. The desktop median corresponds to about 8.5 display pixels per texel; the compact median corresponds to about 2.1. The desktop bottom sampled row has a median near 0.10, or approximately 10 display pixels per texel.

The recorded globe centers were `[-35.47595482077385, -195.71853949523836, -77.72328445216223]` for desktop and `[-94.35802770540113, -247.33992051593836, -331.53813527139283]` for compact.

Reproduce from the repository root:

```sh
node docs/evidence/performance/satellite-earth-4k/projection-check.mjs
```

The script reads the current environment implementation, so future camera changes intentionally change its output. The original investigation used the same calculations before the 4K asset swap; that swap does not change camera or sphere geometry. The analytic sphere approximates the rendered triangulated mesh and does not model filtering, compression, source contrast, atmosphere, spacecraft occlusion, or perceptual detail. These numbers are not GPU timings or a proof of visible quality at every screen size.

## Memory cost

Exact nominal RGBA8 texture storage summed over the full mip chain:

| Map dimensions | Bytes | Decimal MB |
| --- | ---: | ---: |
| 2048×1024 | 11,184,812 | 11.18 |
| 4096×2048 | 44,739,244 | 44.74 |
| 8192×4096 | 178,956,972 | 178.96 |
| 16384×8192 | 715,827,884 | 715.83 |

Each doubling adds four times the pixel count and texture memory. These are texture storage estimates, not compressed download sizes, and exclude the decoded CPU image and driver overhead. They do not imply the same multiplier for per-frame rendering time.

## Source, filtering and recommendation

The retained NASA combined land/ocean/cloud source is 8192×4096. The 4K version must be generated directly from that source, not by enlarging the 2K JPEG. Upscaling beyond this particular source would add memory without recovering geographic detail. NASA documents other Blue Marble products up to 21,600 pixels across; 8K is therefore the limit of our verified current source, not a universal maximum for NASA imagery. The old combined-product link currently redirects, so a higher-resolution replacement has not been verified here. [NASA Blue Marble source documentation](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/).

The current loader uses sRGB, linear magnification, trilinear mip filtering, and anisotropy 4. There is no obvious filtering configuration defect. Anisotropy can help oblique minification near the horizon at the cost of additional samples, but cannot invent detail in an enlarged foreground. JPEG quality 85 with 4:2:0 chroma can soften color edges; it is secondary to the measured large magnification. [Three.js texture documentation](https://threejs.org/docs/pages/Texture.html).

**Recommendation:** use the requested 4K version as an intermediate quality/memory balance and review it in the actual composition. Do not promise complete desktop sharpness. If it remains too soft, a native 8K comparison is a reasonable next investigation, with its roughly 179 MB texture cost made explicit. For sharper detail while preserving this close perspective, a future system that loads higher-resolution tiles only for visible regions is a stronger long-term candidate than a very large global texture. Moving the globe farther away would also reduce magnification but changes the composition and is outside this request. No 8K render, bake, or future optimization was performed for this review.
