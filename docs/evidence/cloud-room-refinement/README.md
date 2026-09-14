# Cloud and room refinement evidence

Captured and checked on 14 September 2026. These images document the requested visual changes; the separate [cloud performance evidence](../performance/cloud-delivery/README.md) records measurements, native context and limitations. All unrelated optimization candidates remain on hold.

## Rooms and entrance

- [About, desktop](about-desktop.png): the berth rail is centered between the bed frame and notebook cradle; its wider lamp remains balanced in the upper gap. The mountain photo moves slightly right.
- [Case Studies, desktop](cases-desktop.png): the oxygen tank has a contrasting slate-blue body; the black rear fitting beside the archive moves right and up.
- [Tilted entrance, production](docking-tilted-production.png): the circular cream mounting collar and dark retaining ring have smooth side and bevel normals. Their dimensions and bore remain unchanged.
- [Production overview](overview-production.png) and [390×844 overview](overview-phone-production.png): room arrangement and spacecraft silhouette remain intact.
- [About at 390×844](about-phone-production.png) and [Case Studies at 390×844](cases-phone-production.png): compact layouts retain readable labels and clear object spacing.

Desktop room captures were made against the development app; overview, tilted entrance and phone-sized room checks also used the completed production build. Browser checks reported no console errors. The production cloud loader reported `developer-baked-atlas`, with no load error or generator fallback. Phone-sized captures use this Mac's browser at a narrow viewport; they are not physical-phone tests.

## Cloud appearance

The final field uses connected fronts, broad banks, rounded height variation and shaded flanks. It is original procedural data informed by NASA orbital photographs, not an embedded photograph. The globe keeps rotating, and volume lighting responds to the view; the former continuous weather morph is replaced by a fixed global field.

| View | Initial orientation | After 60 active seconds | After 180 active seconds |
| --- | --- | --- | --- |
| Desktop | [0 seconds](cloud-desktop-0.png) | [60 seconds](cloud-desktop-60.png) | [180 seconds](cloud-desktop-180.png) |
| Phone-sized | [0 seconds](cloud-phone-0.png) | [60 seconds](cloud-phone-60.png) | [180 seconds](cloud-phone-180.png) |

[Original reference, desktop](cloud-reference-desktop-0.png) shows the previous scattered fragments. [Early prototype](cloud-prototype.png) is retained as development history: its smoother sheet-like appearance was refined into the final banked volume, so it must not be used as the final result.

These frozen time samples check different exposed portions of the globe and horizon. They are visual evidence, not temporal-aliasing or performance measurements. The standalone browser lab and its frozen source hashes are documented with the [GPU audit](../performance/cloud-delivery/gpu-audit.md).

## Validation

- **23 focused tests passed**: cloud environment, cloud codec, smooth docking ring, wall layout and rounded cabin interior. [Complete test output](focused-tests.txt).
- Type checking passed. Type-aware lint passed for the changed environment and new cloud/hull modules.
- The production build passed. [Build output](build.txt).
- The updated cloud correctness audit passed **12 tests**, overlapping the focused suite rather than adding twelve independent checks. [Structured audit](cloud-correctness-audit.json).
- Geometry checks cover both room layouts, mounting clearance, smooth ring normals, closed ring geometry and a clear bore. Cloud checks cover exact data restoration, malformed payloads, both gzip transport forms, transforms, texture storage, pause/reset and cleanup.

The prior full repository suite was not rerun for this iteration. Focused tests and visual checks do not establish Safari performance, temperature, battery savings or physical-phone behavior.
