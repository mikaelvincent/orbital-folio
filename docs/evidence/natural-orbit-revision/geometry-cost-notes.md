# Conservative model tessellation reduction

The accepted model is `components/spacecraft-model.ts`. Its pre-optimization source is reproducible with the retained `tessellation.patch`. Both include the current branding visibility behavior.

## Changes

1. Rounded cuboids omit one redundant midpoint along each straight core span: 10→9 segments for larger boxes and 6→5 for small boxes. All curved bevel coordinates, normals and UV samples are retained exactly. This changes planar triangulation, including door-face interiors, without reducing their curved-edge detail.
2. Small cylinders use 16 segments at radius≤0.06, 24 at≤0.18, and 32 at≤0.30. Larger cylinders retain 40 segments; explicit segment overrides still work.
3. Rings at radius≤0.25 use 8 tube segments and 24/32 circumference segments. Very thin indicator rings use 6 tube segments. Larger docking/service rings retain their original 10×56 tessellation.
4. Small spheres use 16×12 instead of 24×16. The half-circle headset band uses 8×24 instead of 10×32.

All pressure-frame extrusions, pressure skins, door frames, docking/service lathe silhouettes, dish geometry, wall openings, labels, material appearance, lighting and interaction contracts are unchanged. No draw calls are merged or added.

## Measured cost

The counts below are the live model graph with nine populated project slots and Canvas labels, excluding Earth/background, post-processing and renderer culling:

| Measure | Before | Candidate | Change |
| --- | ---: | ---: | ---: |
| Color triangles | 510,280 | 436,152 | −74,128 / −14.5% |
| Potential shadow-caster triangles | 460,262 | 391,426 | −68,836 / −15.0% |
| Color draw calls | 237 | 237 | unchanged |
| Live unique-geometry vertices | 796,834 | 734,924 | −61,910 / −7.8% |
| Geometry attribute + index bytes | 29,038,400 | 26,489,896 | −2,548,504 / −2.43 MiB |

With nine empty spare-equipment bays, triangle reduction is 16.3%. These are geometry measurements, not a measured FPS claim. Draw calls, pixel fill and post-processing cost are unchanged. Browser timing is required to determine the real desktop frame-time benefit.

## Verification and risk

Strict TypeScript checking, the current model audit and branding audit pass. All ordinary-hover labels, mounting contacts, reader anchors, project mappings and routes remain valid.

The cost audit compares 120 unique rounded-box geometries used by 331 source meshes. Every retained position/normal/UV sample exactly matches the baseline, and every deleted sample is a straight-core midpoint. No curved bevel samples are removed. The sampled overall model bounds differ by only 0.000846 world units in Z from the smaller curved fittings.

The visual risk is slight faceting on small knobs/ring cross-sections at unusually close inspection. Large pressure geometry is unchanged. At the current room framing, the difference should be small; this task did not use the browser and does not claim screenshot equivalence.

## Portable evidence

From the repository root, reconstruct the baseline without modifying the working source, then measure both:

```sh
patch -R -o /tmp/orbital-before.ts components/spacecraft-model.ts < docs/evidence/natural-orbit-revision/tessellation.patch
node scripts/spacecraft-model-cost-audit.mjs . /tmp/orbital-before.ts components/spacecraft-model.ts /tmp/orbital-cost.json
```

The committed measurements are in `geometry-cost-audit.json`. The final production overview and Projects screenshots retain the hull bevels and small fitting silhouettes at the displayed scale. Browser frame intervals remain host-dependent and variable; no causal FPS gain is claimed.
