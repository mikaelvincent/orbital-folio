# Projects payload workshop

The Projects room now follows the approved [payload workshop reference](evidence/projects-workshop/approved-concept.png): four mounted category modules above a supported cream workbench. This is editable procedural Three.js geometry. The reference's lower catalog close-up is intentionally deferred.

Baseline: `3a19df9`. The [independent critic](CRITIC-REPORT.md) scores this static room **95.5/100**. Exact application fingerprints are recorded in both that report and the [geometry audit](evidence/projects-workshop/geometry-audit.json).

## Construction

- Four modules: All projects, Systems, Interfaces and Experiments. Each has a closed graphite rear enclosure, an extruded ivory bezel with a genuine opening, a recessed gasket and a rounded display surface. Corner reinforcement, captive fasteners with separate slots, release latches, grab loops, capped edge connectors, ventilation slots and retained diffuser strips supply assembly detail.
- Narrow rails and wall shoes support the bank through overlapping standoffs. The existing pressure wall remains the wall; no new lining sheet or cover slab is added.
- The cream workbench has a solid top, apron, controlled gasket seam, recessed service pulls, retained top clamps and a continuous amber grip seated in circular saddles. Two legs meet the existing floor through layered soles and isolators. Rear braces terminate at wall shoes; a protected cable trunk terminates at an underbench junction.
- Four 1024×640 canvas textures use mipmaps and anisotropy 8. The category labels remain visible even though the legacy renderer disables its old screen-label option. Emissive display content preserves navy color under warm room lighting; these four screens neither cast nor receive shadows after batching.
- Repeated module hardware shares material instances. The new furnishing root is static and floor-referenced, using the existing dimming and cleanup traversal. No new lights, animation state or event handlers are introduced.

All projects displays the actual current collection count. Other category counts are omitted until the taxonomy is implemented. Count changes repaint the same texture. The old nine project lockers, their spare props, physical header and individual slot proxies/hotspots are removed with the replaced furnishings. Existing reading routes, reader surfaces, page APIs and room navigation remain available; no category browsing behavior is added or tested in this pass.

## Visual verification

The implementation owner inspected and captured the actual in-app WebGL render:

- [Desktop room, 1440×900](evidence/projects-workshop/01-desktop.png)
- [Oblique room using the existing bounded drag](evidence/projects-workshop/02-oblique.png)
- [Portrait room, 430×932](evidence/projects-workshop/03-portrait-room.png)
- [Portrait overview](evidence/projects-workshop/04-portrait-overview.png)
- [Desktop overview](evidence/projects-workshop/05-desktop-overview.png)

The independent critic also inspected all five images. The bench stays grounded, the modules remain attached and inside the room, and both doors stay clear. The four-module silhouette is recognizable in both overview orientations. The unchanged portrait camera makes the room smaller; camera framing and fine reader usability were explicitly outside this visual stage. The reviewer notes that the module silhouette is slimmer than the reference's rugged equipment.

[Browser inspection](evidence/projects-workshop/browser-check.json) recorded one canvas and no captured warnings or errors. The temporary viewport override was reset, and the Projects preview was left open. These checks are visual samples and structural audits, not an exhaustive temporal shimmer test or a physical-device frame-rate benchmark.

## Structural preservation and cost

The [portable audit](evidence/projects-workshop/geometry-audit.mjs) imports the actual candidate and baseline module graphs. It passes with:

- 825 protected source meshes unchanged across 12 wide/compact room, hover, transit and reader states. This includes Contact, Case Studies, About, the hull, ladder, Projects pressure surfaces and door assemblies.
- Unchanged camera, environment, renderer, annotation, navigation and reader source modules. Framing metadata remains identical; only removed Projects slot hotspots and explicit workshop descriptive metadata differ.
- Finite positions, normals, UVs and valid indices. New furnishings have invariant transforms, no animated ancestors and no added lights.
- Cabin-local bounds X ±1.565, Y −1.3205 to 1.2215, Z −0.985 to 0.3375. The floor datum is −1.32, with the isolators embedded 0.0005 units.
- Four rendered textures reachable by existing cleanup. Counts 0, 17 and 9 update without reallocating textures or changing geometry.

The workshop uses 188,252 triangles and 51 render meshes after batching. Scene-visible overview inventory changes from 284 to 283 draw meshes and 500,734 to 605,246 triangles, before frustum culling. Geometry detail therefore costs more triangles despite fewer draws. These measurements do not imply unchanged GPU time.

Typecheck, lint, the scoped geometry audit and the required Sites production build pass. Build warnings are the existing Node deprecation, client chunk size and vinext route classification messages. No database, dependency, hosting or other-room changes were required.

Local preview: `http://localhost:3000/projects`. No deployment was performed.
