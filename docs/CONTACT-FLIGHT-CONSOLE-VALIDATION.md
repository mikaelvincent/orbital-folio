# Contact: Flight Operations Console

The Contact room now contains a static three-display control station based on the approved [Flight Operations Console concept](evidence/contact-flight-console/approved-concept.png). The former wall radio and amber telephone receiver are replaced with an integrated console, an inclined physical control deck, a detailed microphone and a docked headset. This is editable Three.js geometry, not a room-sized image.

Baseline: `e68fd31`. Exact candidate hashes and successful commands are recorded in [checks.json](evidence/contact-flight-console/checks.json). The [independent critic report](CRITIC-REPORT.md) scores only this visual rebuild and its stability.

## Construction

- One cream console shell, inset graphite deck, amber front handhold and fitted saddles. Two structural legs meet the existing floor; diagonal braces and wall shoes support the rear.
- A large central communications display and two smaller inward-angled instruments. Cream bezels, rubber seals, rounded screen apertures, physical function keys and satin fasteners establish thickness and assembly. The redundant Contact-only upper plaque is removed; its navigation/framing metadata is retained.
- A solid wedge backs the inclined control cassette. A keypad, guarded rocker, four collared toggles and two fluted encoders form distinct working groups. Perforations and a mounted service enclosure add detail without new room-wall panels.
- A gooseneck microphone has a fitted PTT base, socket, shaped capsule, physical grille pattern and terminated lead. The headset has padded oval cups, yokes/sliders, an extruded arched headband, a retaining dock and a connector-ended cable. The dock sits outboard of the signal monitor.
- Three static canvas display textures use mipmaps and anisotropic filtering. Restrained local reflection preserves deep navy screens. The Contact title and amber hue retain the existing content/theme inputs.

Explicit TypeScript import suffixes and the no-emit compiler option keep the new module graph loadable by native Node inspection tools. The new furnishings live in `components/contact-flight-console.ts` and `components/contact-flight-audio.ts`, with a single integration point in `spacecraft-model.ts`. Their authoring origin is the existing cabin floor. The room inherits the existing dimming, batching and resource cleanup; it introduces no lights, animations or listeners. Existing readers, native actions, picking proxies and navigation remain in place. No form or reader functionality was rebuilt or exercised for this pass.

## Visual inspection

Actual in-app WebGL captures:

- [Desktop room, 1440×900](evidence/contact-flight-console/01-desktop.png)
- [Bounded oblique view](evidence/contact-flight-console/02-oblique.png)
- [Portrait room, 430×932](evidence/contact-flight-console/03-portrait-room.png)
- [Portrait overview](evidence/contact-flight-console/04-portrait-overview.png)
- [Desktop overview](evidence/contact-flight-console/05-desktop-overview.png)

The console stays inside the room, both feet meet the floor, the handhold mounts meet the fascia, and display/audio assemblies remain attached in the inspected angles. The selected Contact silhouette remains recognizable in both overviews. The unchanged narrow-screen camera leaves more surrounding space visible; this pass does not adjust framing. [Browser inspection](evidence/contact-flight-console/browser-check.json) recorded one canvas and no captured error/warning logs.

## Geometry, preservation and cost

The [portable audit](evidence/contact-flight-console/geometry-audit.mjs) executes the actual baseline and candidate modules, resolving their TypeScript import graphs. Its [results](evidence/contact-flight-console/geometry-audit.json) establish:

- All 776 protected source meshes match across eight wide/compact overview, selected, hover and transit states. These include the other rooms, chassis, ladder, docking hardware, Contact pressure surfaces, portals and reader proxy.
- Navigation metadata and the renderer, background, annotation and reader source files remain unchanged.
- New positions, UVs, normals and indices are valid; new furnishings have invariant transforms across room states, no animated ancestors and no new lights.
- Room-local bounds are X ±1.56, Y −1.3205 to 1.26, Z −0.99 to 0.509. Floor isolators embed 0.5 mm in the existing Y=−1.32 floor. Both feet and the complete furniture envelope fit.
- All rendered geometries, materials and three display textures are reachable by the unchanged cleanup traversal.

The new console uses 32 draw meshes and 71,332 triangles. Whole-vessel static counts before frustum culling rise from 358 to 377 draw meshes and 549,400 to 608,906 triangles (about 10.8%). These are geometry costs, not an FPS or physical-device performance claim. The audit records canvas drawing commands on the CPU; the browser images provide separate GPU evidence. Neither AABB attachment checks nor a few inspected angles certify every possible surface intersection.

Typecheck, lint and the required production build pass. Existing build warnings concern Node deprecation, a large client chunk and vinext route classification. The prior portrait audit's fake DOM installation was changed to `Object.defineProperty` to avoid DOM overload deprecation lint errors; its actual behavior is unchanged and [900 horizontal comparison frames plus portrait edge cases still pass](evidence/contact-flight-console/portrait-audit-regression.json). No production annotation code changed.

The older `scripts/spacecraft-model-audit.mjs` loads the new module graph but stops on its obsolete compact-reader X=−1.65 assertion; the current wide model remains X=−2.25. That reader behavior is outside this pass and is identical to the baseline in the scoped comparison. Older single-file data-URL audits target their historical asset revisions; the current Contact audit resolves the module graph.

The local preview remains available at `http://localhost:3000/contact`; no public deployment was performed.
