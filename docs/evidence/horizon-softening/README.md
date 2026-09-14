# Softer cinematic night horizon comparison

Matched finite stills, captured in native Safari on 14 September 2026. All three use the same frozen pre-camera-refactor orbital environment, the same 8K Mediterranean photograph, time zero, a 1184×768 native window and DPR 2. These are actual rendered screenshots with controls hidden; no image generation or screenshot alteration was used. Browser chrome remains in the evidence. The comparison isolates atmosphere color/width; it does not benchmark GPU time.

| Variant | Minimum crest width | Edge footprint multiplier | Linear crest color |
| --- | ---: | ---: | --- |
| baseline | 0.24 | 0.65 | 0.006, 0.28, 0.85 |
| cooler-crest | 0.24 | 0.65 | 0.005, 0.13, 0.46 |
| gentler-crest | 0.40 | 0.85 | 0.005, 0.15, 0.46 |

The cobalt-to-indigo outer halo is unchanged in both alternatives. Neither adds textures, meshes, blur/bloom passes or animation. The broader crest remains much thinner than the outer halo and does not spread a gray layer across the surface.

## Visual selection

Recommended **gentler-crest**. The baseline has an intense thin blue stripe. Lowering the crest color alone makes it more restrained but retains that outline quality. The gentler option gives a rounder light transition into the existing halo and a less piercing crest while maintaining the futuristic blue atmosphere. Fine city lights remain legible and dark ocean areas remain dark. This is an artistic judgment from the matched images, not a claim of objective visual superiority.

- [Baseline](baseline.png)
- [Lower color only](cooler-crest.png)
- [Gentler selected option](gentler-crest.png)

## Camera-motion correction

The selected production source also transforms the authored light direction from orbital-world coordinates into view coordinates in the vertex shader, using `viewMatrix * vec4(-0.6, 0.7, 0.3, 0.0)`. The fragment shader compares its view-space tangent against that direction. This preserves the exact approved identity-camera opening and stops the brightness source following camera turns. Direction w=0 excludes translation. This correction was added after the matched still captures; at their identity camera it is mathematically identical. `illumination-check.json` records directional dot invariance through four camera rotations (errors at floating-point roundoff).

`../../../components/night-atmosphere.ts` contains the selected artistic change plus the world-fixed direction. Production navigation captures and independent review are recorded in `../world-camera/`. `comparison-manifest.json` retains the original environment hash and exact shader variants; `capture-record.json` hashes the native screenshots. The developer-only fixture is `scripts/benchmarks/night-horizon-preview.mjs`, uses port 3016, and never enters a production route. Its source freeze happened before the camera edits; restarting that fixture after a camera change produces a new environment composition, so compare variants from one launch only.
