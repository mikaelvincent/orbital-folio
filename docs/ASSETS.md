# Editable assets

`components/spacecraft-model.ts` is the editable source asset. It creates approximately 190 meshes plus instanced repeated details using Three.js geometries and physically based materials. No opaque render, purchased model, texture download, or Blender file is required to change it.

The common centerline runs along X. Up is +Y; the open reading side faces +Z. Project lockers, mission console, and crew cabin sit at X = -3, 0, and 3. The docking nose and communications dish sit toward -X; the engine and solar wings sit toward +X. `group.userData.roomAnchors` records semantic anchors.

`createSpacecraft(THREE, { accent, labels })` returns the scene group, interactive mesh targets, and an update function. It has no renderer or network code. Owner labels and the accent are passed from database settings. Room capacity is structural: the project bay opens the complete database collection, so a fourth, fifth, or fiftieth case study requires no scene edit.

To alter the physical design, edit the material palette, rounded geometry helper, module shells, and individual cabin sections. Repeated fasteners, floor markings, and solar cells use instancing. The renderer lives separately in `components/spacecraft.tsx` and disposes geometries, materials, label textures, and listeners when unmounted.

The renderer caps pixel ratio at 1.5, targets at most 30 animation frames per second, stops offscreen/when hidden, and draws a static scene for reduced motion. Dragging is bounded to useful camera angles; touch retains vertical page scrolling. Pause and reset have semantic button equivalents, and all room destinations have ordinary links. WebGL failure and save-data preference retain the complete reading interface.

The dossier clipboard, console housing, journal, and locker surfaces are editable CSS in `app/globals.css`. Case-study diagrams are simple code-native schematics, not screenshots of invented working products. The favicon is generated from database initials and accent. Uploaded portfolio images and their alternative text are managed in the studio.

The supplied mockups were used as visual inspiration only. They are not bundled, and their embedded copy is not treated as implementation instructions.
