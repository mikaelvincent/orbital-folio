# Procedural Earth environment v6

Artifact: `/tmp/orbital-environment-v6.ts`. No project checkout edits. All external NASA texture loading is removed. The imagery is an original procedural blue water world, with no land imagery or third-party media dependency.

| Generated field | Desktop | Mobile |
|---|---:|---:|
| Seamless single-channel R8 noise volume | 64×64×64; 262,144 bytes | 32×32×32; 32,768 bytes |
| Baked RGBA8 navy sky | 256×128; 131,072 bytes | 128×64; 32,768 bytes |
| CPU typed-array texture data, combined | 393,216 bytes | 65,536 bytes |
| GPU generated texture allocation, including exact sky mip chain | 436,908 bytes / 0.4167 MiB | 76,460 bytes / 0.0729 MiB |
| Unique geometry attribute/index data | 670,476 bytes | 366,476 bytes |
| External image transfer | 0 bytes / 0 requests | 0 bytes / 0 requests |

GPU byte counts are the application's two generated textures, excluding driver alignment, Three.js internal textures, shaders, canvas color/depth/MSAA buffers and the separate spacecraft scene. Safari reports three renderer texture objects after the first render: the two generated fields plus Three.js’s shared 16×16 RG16F DFG material lookup table (1,024 bytes, no mipmaps; verified in `node_modules/three/src/renderers/shaders/DFGLUTData.js`). Total identified sampled texture storage is therefore 437,932 bytes desktop / 77,484 bytes mobile; this is still not total renderer/GPU memory. Geometry arrays also have CPU copies and uploaded GPU buffers.

The ocean has a solid blue standard material. A cloud shell samples the periodic 3D noise lattice on normalized sphere positions, avoiding UV seams and polar distortion. Two localized vortices, latitude shear and low-frequency domain warping form broad weather patterns; intermediate broken clouds and a derivative-filtered fine layer add detail. Desktop uses six trilinear R8 volume samples per cloud fragment, mobile five. Cloud work is restricted to the visible sphere; the sky uses one texture lookup per screen pixel from a field baked once. This is a stylized atmosphere, not an observational Earth map or volumetric simulation.

Surface rotation is 0.0015 rad/s; clouds rotate at 0.0021 rad/s with slow low-amplitude field morphing. The existing tangent placement is preserved: the limb intersects the left edge at 76% viewport height and the bottom at 86% viewport width. All motion uses the caller's active-time clock. `update(..., false, ...)` freezes surface rotation, cloud motion, star twinkle and meteor state. No independent timer, animation loop or asynchronous image callback is introduced.

Two sparse meteor actors alternate. Their deterministic combined start spacing is mathematically bounded to 8–14 active seconds; durations are 1.1–1.6 seconds. Warm white/cyan heads and narrow glowing tails use tightly bounded quads. A navigation-region mask keeps the top quiet. The schedule currently allows one visible meteor at a time; two actor slots give an absolute capacity of two. Normal rendering uses six calls; one active meteor adds one (budget eight). First-frame readiness is immediate after synchronous procedural generation.

Independent verification:
- Strict TypeScript compilation passed against the repository's Three.js types.
- Real Three.js API checks passed for desktop and mobile: readiness, exact texture byte counts, rotation, paused-state equality, 500 active seconds of meteor scheduling, and idempotent disposal of all 13 unique disposable objects.
- The 500-second scan found 46 scheduled events, observed intervals 8.1887–13.8502 seconds, and maximum simultaneous meteor count one. The mathematical schedule covers the wider 8–14 bounds.
- Actual Safari WebGL render was opened through CUA in an isolated localhost preview. Clouds and blue ocean rendered successfully; shader error list was empty. Initial render: six calls, 97,282 triangles, 3,100 star points. Procedural generation took 17 ms in this Safari run; Node runs took 8.56 ms desktop / 4.01 ms mobile. These are construction timings, not frame-rate or low-end-device benchmarks.
- Native first-frame capture: `/tmp/orbital-environment-v6-desktop-initial.png`; WebGL numbers: `/tmp/orbital-environment-v6-desktop-initial-webgl.json`; API evidence: `/tmp/orbital-environment-v6-api-report.json`.

The attempted isolated Playwright browser installation failed and has stopped; no headless browser was installed or used. Visual QA above used native Safari through CUA. The parent owns final integrated desktop/mobile and meteor visual QA. Old NASA images remain untouched on disk but are not referenced by this artifact.
