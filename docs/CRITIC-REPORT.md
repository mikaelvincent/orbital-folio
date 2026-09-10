# Independent critic: ladder shoulder lip

**96.2/100 — the fresh 95-point target is met for this defect. No remaining scoped blocker found.** This is an assessment of the raised upper/lower shoulder strip and its correction, not a new score for the whole portfolio. No earlier score carries forward.

The earlier central-docking audit did not prove this strip was fixed: a raised sheet can pass a closure ray, and tangent alignment does not establish the full curved edge. The decisive evidence here is the fresh, matched close-up [before](evidence/ladder-lip/before-ladder-2560.jpg) and [after](evidence/ladder-lip/after-ladder-2560.jpg). The extra cream edge and its abrupt termination beside the dock are visible before and absent after. The broad lining and narrow dark seal remain.

| Equally weighted, defect-specific area | Score /10 | Finding |
|---|---:|---|
| Exact offending strip removed | 9.8 | The change removes the legacy cap’s forward face and bevel, rather than shifting the docking wall or adding a cover. The [actual-mesh comparison](evidence/ladder-lip/actual-mesh-audit.json) confirms exactly 386 removed triangles: 192 lower and 194 upper. |
| Curved surface and edge continuity | 9.6 | Both [oblique](evidence/ladder-lip/after-oblique-2560.jpg) and [opposite-oblique](evidence/ladder-lip/after-opposite-oblique-2560.jpg) views show continuous lining without the raised cream return. Across the sampled front, tangent and oblique rays, no previously covered location becomes uncovered. |
| Both shoulders and layouts | 9.5 | Wide and compact geometry checks remove all 223 previously exposed lip hits. They now reach existing lining or the collar seal. The [portrait capture](evidence/ladder-lip/after-portrait-390.jpg) provides an additional compact-layout visual check. |
| Preservation of adjacent structure | 9.8 | The same audit retains all 746 non-cap individual mesh geometries, 748 individual transforms/material records and 17 instance assemblies per layout. Remaining cap attributes match the baseline within 0.000001. The lining, docking mount, doors, floors and furnishings were not repositioned. |
| Strength of verification | 9.4 | The [source/pose check](evidence/ladder-lip/critic-source-and-pose.json) isolates the model change to one removal helper and its call site. Fresh baseline/final renderers have distinct IDs and matching recorded camera, viewport and drawing-buffer settings. [Typecheck, lint and build records](evidence/ladder-lip/checks.json) pass. |

Calculation: `(9.8 + 9.6 + 9.5 + 9.8 + 9.4) × 2 = 96.2`.

Reviewed final model SHA-256: `052c89287d2dcebf943f7afb13c04972c334521a33ebafcf256d7fc3d4f01d26`; baseline model: `edfabdd791027046a2aad9074ac41739e01d24c56f276ddca7db1b86b24e1fe1` from revision `b6cd2c1`.

I independently inspected the final source, matched crops, both oblique views, portrait view and actual-mesh audit. I also checked source-change isolation and capture metadata. Another agent produced the 43,048-ray geometry comparison; the implementing agent produced the browser captures and build records. Stale HMR captures and the rejected transient-baseline audit are excluded.

Limits: finite samples and saved development-renderer images do not certify every camera pose, physical device or production runtime. The whole-scene triangle counter includes dynamic background geometry and is not used to establish the removal count. The conclusion is that this particular raised strip is visibly removed, with directly related structure preserved.
