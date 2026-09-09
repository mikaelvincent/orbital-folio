# Door-label movement shimmer: bounded source diagnosis

Scope: read-only inspection of `components/spacecraft-model.ts`, `components/spacecraft.tsx`, label CSS and installed Three 0.185.1. No browser reproduction, application edits or Earth work. Line references identify the inspected source before the model agent's repair.

## First fix: coincident opaque plaque faces

In `spacecraft-model.ts:3485–3507`, the above-door backing is depth `.09` at local Z `-.048`, while enamel is depth `.028` at Z `-.017`. Their front faces both equal **Z = -.003**:

- Backing: `-.048 + .09 / 2 = -.003`.
- Enamel: `-.017 + .028 / 2 = -.003`.

The rounded-box construction retains a flat central face, so most of the enamel overlaps the backing at the same depth. Separate opaque materials and batches then compete for depth during camera movement. This is a concrete z-fighting defect, not merely a filtering hypothesis. The transparent ink plane itself is at Z0, approximately `.003` forward.

Minimal repair: recess the backing, for example center Z `-.056` → front Z `-.011`, preserving enamel, ink, wall orientation and caption metadata. Verify the new backing still overlaps the wall. Prefer genuine surface separation to disabling depth testing or forcing render order; those alternatives can make ink appear through the doorway/hull. No global camera near/far or polygon-offset change is required for the proven overlap.

## Secondary contributors to check only if needed

1. **Tiny oblique lettering.** `portalLabel()` at model lines 3287–3328 draws a 1024×192 canvas for the `.96×.18` caption, with anisotropy 4. Three's `Texture` defaults already supply `LinearMipmapLinearFilter`, `LinearFilter` and generated mipmaps; this is not a missing-mipmap bug. Some phone views previously projected side-facing ink to approximately five pixels. Camera movement can resample those subpixel strokes even with a high-resolution source texture. Increasing canvas dimensions alone cannot fix inadequate projected area. If residual shimmer is confined to text edges, compare anisotropy 8 or the renderer-supported maximum on label textures only; retain mip filtering and the physical plaque orientation. The renderer's MSAA does not provide temporal stabilization of alpha-texture strokes.

2. **Shadow reception survives batching.** `mesh()` at model line 462 sets both shadow flags true. `portalLabel()` clears `castShadow`, but the final batch at lines 3688–3691 independently sets `receiveShadow = true`. Installed Three's `shadowmap_pars_fragment.glsl.js:129–143` uses screen-space `gl_FragCoord` noise to rotate its PCF samples. Moving labels crossing shadow edges can therefore show additional sampling variation even though the shadow map is cached. A scoped experiment must change shadow reception on the final portal-label batch or preserve that flag through batching; setting only the original ink mesh is insufficient. Keep physical enamel/backing shadow behavior. The ink is Lambert, so specular sparkle in the ink material itself is not the leading suspect.

3. **Desktop GTAO.** `spacecraft.tsx:227–250, 1109–1137, 1309` generates AO at `.65×` CSS dimensions, refreshes it during movement and multiplies it over the whole WebGL scene. Three's `GTAOPass.js:500–505, 654–665` overrides meshes with `MeshNormalMaterial` and only hides points/lines. Transparent ink quads consequently contribute solid rectangular depth/normal surfaces; their texture alpha and original `depthWrite:false` are not honored by that override. This can add moving shading variation near a plaque. It cannot explain the same effect on mobile, where this AO branch is disabled. If required, compare a brief AO-disabled control, then consider excluding decorative ink quads from the AO prepass while preserving the solid enamel as the occluder. Avoid changing the whole AO pipeline before the coplanar repair is checked.

## Ruled out / integration cautions

Portal HTML hotspots are invisible, and keyboard focus uses transparent text with an outline (`globals.css:3707–3721`), so there is no second visible CSS caption competing with the texture. The camera range is already `.5–80` (`spacecraft.tsx:161`), not an extreme near/far ratio. Label textures are generated during model construction, not redrawn each frame.

Do not casually replace the ink with `MeshBasicMaterial`: `roomMat()` and the dimming loop assume `.emissive` exists. A lighting-material change needs that contract handled. The minimal first action remains separating the two opaque plaque faces, followed by one actual moving/rest comparison of the same doorway. Residual text-edge aliasing, shadow noise and AO variation should be distinguished before another fix is selected.
