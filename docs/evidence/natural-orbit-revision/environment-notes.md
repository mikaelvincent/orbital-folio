# Cloud structure revision v11

Integrated source: `components/orbital-environment.ts`. The packaged CPU audit and its SHA-256 are in `environment-audit.json`. This research memo originally accompanied the third staging candidate; final GPU appearance has not been approved.

## Why the field changed

The second v10 browser image showed regularly sized white islands, little visible weather hierarchy and weak directional relief. Increasing coverage had exposed more of the same cellular pattern. V11 therefore gives the main cloud body to a continuous stratiform sheet. Small cellular cumulus is restricted to the cold side of that front; it no longer cuts holes through every cloud system.

A spherical flow axis at `normalize(-0.48, 0.79, 0.38)` places a curved comma/front within the initially visible part of the planet. Its changing width creates a broader head and narrower trailing section. The axis is in rotating planet coordinates, not fixed screen coordinates. Low-frequency warp and fractal perturbations break up the front boundary; four desktop / three mobile frequencies vary its interior density. A secondary regional deck remains elsewhere. Directionally stretched cirrus samples follow the frontal shoulder with separate, weaker opacity.

Two sunward density probes and a bounded density-gradient normal provide directional relief. The gradient uses derivatives of density and world position, with a determinant guard and maximum slope. All texture and gradient operations occur before discard. This is still a thin-shell approximation: it has no true volumetric parallax, complete ray integration or multiple scattering. A soft secondary region remains visible in the CPU preview; neither the CPU statistics nor these approximations establish a realism pass.

## Primary research and visual reference

- [Guerrilla: Nubis, Authoring Real-Time Volumetric Cloudscapes with the Decima Engine](https://www.guerrilla-games.com/read/nubis-authoring-real-time-volumetric-cloudscapes-with-the-decima-engine) informed the separation of regional weather, cloud types, local noise and lighting. V11 is original code using those broad ideas, not copied Nubis code or noise assets.
- [NASA Earth Observatory: Cloud Streets and Comma Clouds Near Svalbard](https://science.nasa.gov/earth/earth-observatory/clouds-streets-and-comma-clouds-near-svalbard-87749/) describes organized cumulus bands and comma clouds formed as moist air wraps around colder air. This motivated a localized cold-sector field and a coherent curved front rather than globally uniform small clouds. It is a visual organization reference, not a claim that V11 simulates this meteorology.
- [PBRT 4th ed.: Transmittance](https://pbr-book.org/4ed/Volume_Scattering/Transmittance) supports the use of exponential extinction. The candidate's optical thickness and shadow probes are bounded approximations, not unbiased heterogeneous-volume transport.

The existing NASA cloud overview was inspected locally for its varied sheets, clear sectors and small-cloud regions. No Earth/cloud image, external noise asset or reference pixels were inserted into the implementation. Network texture requests remain zero; only original procedural code is delivered.

## Costs and preserved behavior

| Cost | Desktop | Mobile |
|---|---:|---:|
| Cloud volume | 64³ RG8 | 32³ RG8 |
| Cloud base array | 524,288 B | 65,536 B |
| Cloud logical GPU mip chain | 599,186 B | 74,898 B |
| Sky base array | 131,072 B | 32,768 B |
| Sky logical GPU mip chain | 174,764 B | 43,692 B |
| Total base texture arrays | 655,360 B | 98,304 B |
| Total logical GPU texture mip bytes | 773,950 B | 118,590 B |
| Cloud sample instructions | 12 | 11 |
| Sunward probes included above | 2 | 2 |

The texture dimensions and bytes are unchanged from v10. Sample counts increase from 9/7 to 12/11: approximately 33% / 57% more texture instructions, plus additional derivative lighting arithmetic. An uncached corner-read estimate for RG8 3D linear filtering across two mip levels is 384 / 352 bytes per fragment; this is not measured bandwidth. Driver format allocation, caching and mip selection determine actual memory traffic. Logical costs exclude geometry, render targets, driver padding and Three's shared 1,024-byte DFG lookup.

No extra cloud draw or render target is added. The environment still draws at most nine objects including three simultaneous meteors. The existing water surface, atmosphere, placement, APIs, `.003 rad/s` surface rotation and `.0072 rad/s` cloud rotation remain. Meteors retain the revised 3.8–5.2-second group gaps, 1.15–1.50-second streaks, subdued companions and maximum three. All motion uses caller active time; no timer/RAF/fetch is introduced.

## Audit and preview evidence

Portable allocation/animation audit:

```sh
node scripts/orbital-environment-audit.mjs . components/orbital-environment.ts docs/evidence/natural-orbit-revision/environment-audit.json
```

Results: `environment-audit.json`. Both tiers pass texture format/dimension/mip accounting, 256 selected cellular texels against an exhaustive periodic reference (zero byte error), sampled seamless period checks, no texture updates during animation, pause invariance, future-facing meteor events and idempotent disposal of all 14 unique resources. A 1,800-second sweep at 20 ms steps finds maximum three meteors and some visible during 33.60% of sampled time. Strict TypeScript checking passes. No GLSL compilation or GPU timing is claimed.

This run measured one-time procedural generation at 47.21 ms desktop / 2.42 ms mobile. Five warm constructions ranged 16.84–58.77 ms desktop (median 21.48) and 2.36–2.72 ms mobile (median 2.37). These host/JIT-sensitive CPU figures do not describe browser startup or frame time.

Camera-aware CPU previews: `v11-weather-desktop-0.png`, `v11-weather-desktop-16.png`, `v11-weather-desktop-60.png`, with matching `phone` files. `cloud-cpu-patch-metrics.json` records the sampled proportions.

| Active time | Desktop alpha > .1 | Desktop clear alpha < .02 | Phone alpha > .1 | Phone clear alpha < .02 |
|---|---:|---:|---:|---:|
| 0 s | 65.2% | 26.6% | 28.9% | 66.3% |
| 16 s | 66.2% | 25.8% | 38.9% | 54.4% |
| 60 s | 37.9% | 52.6% | 39.9% | 54.2% |

These previews copy the shader equations, use actual sphere/camera transforms, approximate GPU LOD with finite-difference gradients, and compose over a fixed ocean color. They omit foreground spacecraft/navigation and the actual browser atmosphere/color pipeline. Their useful finding is structural: the viewed cloud density is dominated by a broad sheet and a clear sector, while cumulus is localized. They do not prove realism, alias reduction, actual screen coverage, or acceptable GPU frame time. Root's supported browser must assess those.

The CPU previews are retained as design-review artifacts, not automated correctness tests. Their temporary approximation harness is not part of the runtime. Use the packaged environment audit for reproducible allocation and motion checks; inspect the real browser render for visual approval.
