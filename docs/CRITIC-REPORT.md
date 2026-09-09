# Independent critic — consistent overview connectors

**88.0/100. Pass for this iteration’s 75/100 target, with every area above 6/10. No unresolved scoped requirement blocker was found.** This is a fresh review of connector routing and its render integration. Deferred readers, forms, admin, SEO and unchanged background effects are excluded without penalty.

| Equally weighted render area | Score | Assessment |
|---|---:|---|
| Visual consistency | 9.0/10 | Landscape leaders now read as one repeated mirrored shape. Portrait rails form a clear, orderly frame around the vessel. |
| Connector geometry | 9.5/10 | Actual SVG evidence confirms two segments per leader, matching landscape lengths and 45-degree turns. |
| Responsive routing and clearance | 8.2/10 | Portrait routes clear the panels in the recorded rest and opposite-drag views. The short landscape layout sacrifices considerable ship size and has tightly adjacent upper labels. |
| Interaction continuity | 8.6/10 | Native drags preserve overview without accidental activation, with the same renderer through the development viewport sequence. Native keyboard entry to Projects was verified by the implementation agent. |
| Maintainability and validation | 8.7/10 | The change is confined to annotation routing and camera reservations. Shared geometry avoids individual leader adjustments; build checks and compact recorded-path verification pass. |

Overall = sum of the five scores × 2.

I independently inspected the current source, saved GPU views and [browser records](evidence/consistent-connectors/browser-qa.json), then ran my own [recorded-path audit](evidence/consistent-connectors/path-audit.json). Browser capture and keyboard operation were performed by the implementation agent.

All **nine recorded overview states pass**. Four landscape states preserve equal first/second segment lengths and 45-degree turns within 0.02 pixels/degrees. The nominal template is a 20×20-pixel diagonal followed by a 16-pixel vertical segment; its common scale and mirrored placement retain those invariants. Every path contains precisely `M–L–L`. Five portrait states pass **80 segment-versus-panel checks**, testing both segments against both projected solar rectangles expanded by eight pixels. This directly addresses the previous panel crossings, rather than checking only whether an elbow lies outside a panel.

The [production desktop](evidence/consistent-connectors/production-desktop.jpg) and [390-pixel portrait](evidence/consistent-connectors/production-phone390.jpg) views support the geometric result. The [320-pixel opposite drag](evidence/consistent-connectors/phone320-opposite-drag.jpg) and [tablet portrait](evidence/consistent-connectors/tablet-portrait.jpg) retain readable labels and clear exterior rails. Labels derive their positions from the connector endpoints, avoiding the separate endpoint clamp that would break landscape equality. Portrait segment lengths can differ with perspective; the exact equality requirement applies to landscape.

[Typecheck](evidence/consistent-connectors/typecheck.txt), [lint](evidence/consistent-connectors/lint.txt) and [production build](evidence/consistent-connectors/build.txt) pass. [Source hashes](evidence/consistent-connectors/source-hashes.json) identify the reviewed implementation. No new dependency or model geometry is required for the routing change.

The principal remaining polish issue is the [700×480 layout](evidence/consistent-connectors/compact-landscape.jpg): its wider label reservation leaves a small craft, and measured Projects/Case studies pill spacing is approximately **0.79 pixels**. The buttons do not overlap in that capture, but more separation would improve the visual rhythm and focus-outline clearance. This is non-blocking at the current threshold. Portrait’s smaller vessel is also an explicit tradeoff for unobstructed connector rails.

The numerical audit covers recorded states, not every possible camera pose or text configuration. Projected rectangular obstacles are conservative approximations, complemented by inspected images. Viewport emulation does not establish physical-touch or OS screen-reader behavior. No new performance benchmark or speed improvement is claimed for this small routing refinement.
