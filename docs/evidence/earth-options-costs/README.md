# Earth representation cost inquiry — 14 September 2026

This is an investigation and isolated visual prototype. No production rendering, assets, room design or performance candidate was changed. Numbers below concern the Earth/cloud representation, excluding the spacecraft, atmosphere, stars and other unchanged assets.

## Result

A combined satellite land/ocean/cloud texture on the existing sphere is expected to cost less ongoing GPU work than the current shallow cloud volume. A still image can be uploaded once while the sphere keeps rotating. The current planet already is a full sphere; no external globe mesh is required.

| Representation | Transfer | Estimated RGBA8 mip storage |
| --- | ---: | ---: |
| Current cloud atlas over plain ocean | 2.781 MB | 11.185 MB |
| Combined satellite map, 2048×1024 | 0.448–0.596 MB | 11.185 MB |
| Combined satellite map, 4096×2048 | 1.637–2.178 MB | 44.739 MB |
| Keep existing clouds; add land-only 2K map | +0.166–0.227 MB | +11.185 MB |
| Keep existing clouds; add land-only 4K map | +0.574–0.778 MB | +44.739 MB |

The combined-map figures replace the current cloud asset. The land-only figures are additions. Ranges are actual JPEG/WebP quality80/85 encodes of the NASA lossless originals, not forecasts; quality suitability still needs a full land-texture review at our close horizon. See [source files, hashes and byte measurements](texture-sizes.json), [method and source links](texture-notes.md), and [workload arithmetic](workload-estimates.json).

Storage estimates include conventional uncompressed RGBA8 mip chains, excluding decode buffers and driver allocations. JPEG/WebP compression reduces downloads, not that texture-storage estimate. [Three.js texture memory explanation](https://threejs.org/manual/en/textures.html).

The current cloud fragment shader performs twelve atlas samples with ray traversal, extinction and shading arithmetic, over a separately rendered ocean sphere. A single combined map can use one image sample in a simpler material and one globe draw instead of separate ocean/cloud draws. That is an engineering basis to expect lower planet rendering cost, **not a measured GPU percentage or a twelve-fold FPS prediction**. A 4K map costs more memory and potentially bandwidth/cache work than 2K. Whole-site savings remain constrained by the spacecraft and other rendering.

## Video

The compact [NASA MP4 embedded in the Blue Marble article](https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/57000/57760/rotate_hd_1280_lossless.mp4) is **1,486,885 bytes**, SHA-256 `0ce62ae71a911902514b802efaba70285613af2eb938b285d8c3f1244e045616`. Container metadata inspection found **1280×720, 8 seconds, 240 H.264 frames at 30fps, no audio**. Its filename does not prove lossless encoding. The older [24-second SVS animation](https://svs.gsfc.nasa.gov/2709/) offers a much larger 12.7MB640×480MP4, illustrating why one file cannot establish all video download costs.

Video can be smaller than the current cloud atlas. Its cost includes continuing decoding and display, and a Three.js video texture updates for new frames. [Three.js VideoTexture](https://threejs.org/docs/pages/VideoTexture.html). The M4 Air has hardware video acceleration, so high CPU use must not be assumed; actual browser playback, power and decode buffers were not measured. [Apple hardware specifications](https://support.apple.com/en-us/122209).

The existing movie is a rendered disc, not an equirectangular image suitable for wrapping directly around a sphere. As a backdrop it fixes perspective, lighting and rotation cadence. Enlarging/cropping that full-disc movie to our close horizon can lose detail, especially around clouds and coastlines. A seamless loop and responsive cropping would need review. The source imagery on a rotating sphere keeps more control and avoids recurring video decode. NASA's animation description itself says its imagery was placed on a globe and rotated.

## Flat versus shallow volume

An isolated developer preview used the actual environment, same camera,2048×1024 atlas,1280×720DPR2 and frozen180-second view:

- [Current shallow cloud volume](current-volume.png).
- [Flat-cloud prototype](flat-cloud-preview.png).

The prototype replaces the cloud material with a one-sample flat shell, retaining the satellite distribution and a column-opacity approximation to keep density broadly comparable. It omits height traversal and slope lighting. [Exact exploratory source](flat-preview-source.txt). It intentionally uses the current atlas for this appearance comparison; it is not the proposed compressed RGB combined land/ocean texture, and its bytes must not be substituted for the combined-map cost table.

At this view, depth differences were subtle; the flat version remained convincing and slightly crisper. This is a visual judgment from one background view, not proof of pixel equivalence or all-angle quality. No timing benchmark was run. Clouds can show relief and shadows from orbit, especially under low sun, as NASA's [ISS account](https://science.nasa.gov/earth/earth-observatory/watching-the-world-go-by/) describes. Simulating those effects is nevertheless optional for this background's composition.

Recommendation for a future implementation: preview a4K combined satellite texture on the existing rotating sphere, compare2K at the same framing, and retain the smallest version that keeps coastlines and clouds clear. Both eliminate the cloud volume loop. A flat separate cloud shell remains an intermediate option if independent cloud drift is wanted. All live code remains unchanged pending that design decision.
