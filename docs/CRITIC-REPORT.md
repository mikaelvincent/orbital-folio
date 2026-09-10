# Independent critic — misplaced hull bars and strips

**96.8/100. The scoped fix passes; no remaining blocker was found.** This is a fresh assessment of the raised cream bars below cabin apertures and the long dark exterior strips. It does not score unrelated portfolio features.

Reviewed model SHA: `d49e9153b13d6f221176e16ae522e487f3312ab5686f5608753f168b364a2c67`.

| Equally weighted area | Score /10 | Finding |
| --- | ---: | --- |
| Dark-strip removal | 9.9 | The decorative channel geometry is deleted from both layout variants. The legitimate aperture seals remain. |
| Cream-bar correction | 9.8 | The actual deck fronts are seated inside the chassis face; no covering panel or visibility trick replaces the protruding bars. |
| Floor and enclosure integrity | 9.7 | Floor heights, width and rear edges are preserved. Targeted downward/oblique rays and the close render show a supported threshold without new gaps. |
| Preservation of the remaining render | 9.8 | The model comparison is limited to deck depth/center and channel construction. The audit preserves 742 unrelated geometries and their transforms. |
| Current visual/source verification | 9.2 | Fresh front, oblique, selected-room and portrait renders corroborate the actual-mesh checks. Coverage remains finite. |

I inspected the three supplied annotations and the final [front overview](evidence/hull-bars/overview-front.jpg), [oblique overview](evidence/hull-bars/overview-oblique.jpg), [Projects threshold](evidence/hull-bars/projects-threshold.jpg), and [430×932 portrait](evidence/hull-bars/overview-portrait.jpg). The unwanted straight strips are absent above and below the cabin rows. The four deck edges stay within their apertures instead of forming raised exterior bars. The close threshold remains continuous, and the ordinary aperture seals are intact.

The [actual-mesh audit](evidence/hull-bars/geometry-audit.json), whose implementation and results I reviewed, confirms **four decorative channel objects removed** across the two variants. All four decks retain their width, vertical extent, walking height and rear edge at Z≈−1.12; only the front moves from Z≈1.34 to Z≈1.27. **742 unrelated geometries/transforms** remain exact in both layouts. Across **540 targeted samples**, 180 former bar hits now reach the original chassis face, and 360 front-threshold rays introduce no new misses or exposed backing surfaces.

Limits: these are current desktop GPU captures, including a resized portrait viewport, and finite CPU probes—not physical-device testing or an exhaustive camera sweep. The score makes no new performance, deployment, reader or admin claim. Earlier unrelated defects and deferred features are outside this iteration.
