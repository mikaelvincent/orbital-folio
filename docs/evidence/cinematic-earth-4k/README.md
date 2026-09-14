# Cinematic 4K Mediterranean Earth — 14 September 2026

The user requested 4K and rejected the muted gray/warm atmosphere, preferring a space sci-fi movie treatment.

## Changes

- Production uses the **4096×2048 night map**, generated directly from the retained and verified 13500×6750 NASA Black Marble GeoTIFF. The fixed Mediterranean composition, rotation and room navigation remain unchanged.
- The atmospheric shader replaces the warm upper airglow and desaturated haze with a narrow luminous cyan-blue crest, a saturated cobalt halo and an indigo fade into space. The glow varies in intensity along the curved horizon and falls away quickly over the surface, preserving dark water and city lights.
- This is explicitly an artistic treatment. Both glow profiles still use the existing **single atmospheric sphere draw**, sharing geometry with Earth. There is no new texture, bloom render target, blur pass or animation.
- The offline preparation script now defaults to 4096 and supports 2048, 4096 and 8192. Explicit smaller/larger assets remain available for comparison; only the selected 4K map loads in production.

## Asset costs

| Property | Previous 2K night | Current 4K night |
| --- | ---: | ---: |
| Dimensions | 2048×1024 | 4096×2048 |
| JPEG bytes | 179,391 | 637,946 |
| Estimated RGBA8 texture with full mip chain, bytes | 11,184,812 | 44,739,244 |
| Earth surface / atmosphere draws | 1 / 1 | 1 / 1 |

Texture storage is approximately four times the 2K payload and 75% below 8K. Figures exclude decoded CPU image memory and driver overhead. The 4K image improves geographic and city-light detail, with higher transfer/decode/upload and texture-storage costs. No timed rendering comparison was requested or run; unchanged draw count does not establish unchanged GPU time. No unrelated performance candidate was enabled.

The 4K JPEG SHA-256 is `f2e4e44a0cc209f076ba9169753a005d216939e6b39011d16bc66a08dfba411e`. Its [manifest](../../../public/textures/earth-black-marble-4k.json) records exact source identity and preparation.

## Validation

Actual desktop Safari and Chromium responsive views were inspected for color, smooth curvature, outer falloff and clear city lights. [Safari desktop](safari-desktop.png) · [390×844 compact](compact.png) · [1920×640 wide](wide.png). These are live-scene captures, not matched-frame comparisons. The [DOM-backed environment record](environment.json) confirms Mediterranean, night appearance, a loaded 4096×2048 image, 637,946 bytes and no load error. Chromium's [warning/error log](browser-errors.json) is empty. Temporary browser viewports were reset and the test tab closed; the user's Safari tab remains available.

**25 focused tests pass**, covering all supported loader sizes, the active 4K asset's dimensions/hash/provenance, Mediterranean framing at 0/5/10 seconds, readiness and active-clock behavior, cancellation and resource ownership. Type checking, targeted type-aware lint and the production build also passed. [Tests](tests.log) · [Type checking](typecheck.log) · [Lint](lint.log) · [Build](build.log).
