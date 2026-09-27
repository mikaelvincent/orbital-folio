# Prepared-cloud visual comparison — 14 September 2026

Historical support for the [Earth representation story](../../performance/earth-representation.md).
The exact source/asset identities and timing limitations are in the separate
[cloud-delivery audit](../performance/cloud-delivery/gpu-audit.md). These images
show a changed design, not pixel-equivalent optimization.

| View | Initial | 60 active seconds | 180 active seconds |
| --- | --- | --- | --- |
| Desktop | [0](cloud-desktop-0.png) | [60](cloud-desktop-60.png) | [180](cloud-desktop-180.png) |
| Phone-sized desktop viewport | [0](cloud-phone-0.png) | [60](cloud-phone-60.png) | [180](cloud-phone-180.png) |

[Original reference](cloud-reference-desktop-0.png) shows scattered fragments;
[early prototype](cloud-prototype.png) shows the rejected sheet-like phase.
The final rotating density/height atlas has connected banks and shaded flanks,
replacing continuous weather morph. Fixed-time samples cover different exposed
geography/horizon, not temporal aliasing or physical-phone performance.
[Correctness audit](cloud-correctness-audit.json) retains loading, exact field
restoration and lifecycle checks. Unrelated room-finishing captures were removed.
