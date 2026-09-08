# Editable scene assets

`components/spacecraft-model.ts` is the procedural Three.js source. The hull uses rounded pressure frames, thin graphite expansion joints, a connected canopy and layered decks. The rooms contain archive lockers and cargo, a detailed console, and a furnished cabin. Repeated fasteners and solar cells use instancing; static geometry is batched by room and material. No Blender application or purchased model is required.

The centerline runs along X; +Y is up and +Z faces the open reading side. Rooms sit at X −3, 0 and 3. Docking and communications are toward −X, engines and solar wings toward +X. `roomAnchors` and `roomBounds` describe the spaces. Room labels and the accent come from database settings. Decorative equipment serials are structural markings, not portfolio content. Each room opens the complete database collection, with no fixed content capacity.

`createSpacecraft(THREE, { accent, labels })` returns the group, section-tagged pick targets and `update(time, active, instantHighlight)`. Materials are isolated per room so hovering warms one entire bay. Reduced motion and Pause freeze the radar and apply highlights immediately. Label textures are generated from editable labels, with correct face UVs.

`components/spacecraft.tsx` owns lighting, camera, interaction and disposal. Its camera quaternion is set once; every destination translates the camera along a fixed direction. Pointer movement translates the overview camera by at most 0.16 horizontal and 0.10 vertical scene units. Dragging cannot rotate either camera or model. The model has a fixed diagonal composition on phones; viewport changes do not hand visitors rotation control.

The renderer uses ACES tone mapping, image-based lighting, warm key light, blue rim light and cached shadow maps. It targets at most 30 frames/second, caps pixel ratio at 1.75 desktop / 1.5 phone, and stops animation when hidden, offscreen or paused. Responsive changes invalidate static shadows. WebGL loss or Save-Data switches to complete HTML reading. Geometry, materials, textures, observers, shadow maps and renderer resources are disposed on exit.

`components/orbital-environment.ts` provides a distant scene: NASA day/cloud textures, atmospheric limb and haze, deterministic point stars and a subtle procedural navy background. See [EARTH-ASSETS.md](EARTH-ASSETS.md) for map sources and attribution. Textures total about 281 KB. No external runtime image request or tracker is used.

`components/immersive-portfolio.tsx` keeps one scene mounted across local navigation. It changes meaningful URLs and updates metadata from the same function used by server rendering. A reader appears after the fixed camera flight; browser Back/Forward and Escape preserve the environment. All content is server-rendered before enhancement. Reading view removes GPU work; normal document flow remains usable without JavaScript.

Reader housings, paper, lockers and journal surfaces are CSS in `app/globals.css`. Portfolio media, alt text and favicon identity remain database-managed. The supplied mockups are inspiration only; their pixels and embedded instructions are not shipped.

The custom scene requires more initial engineering than a static hero, but avoids ongoing model-file tooling and makes every part editable in TypeScript. Navigation and content are separate from geometry. The deliberate performance tradeoff is roughly 183 KB gzip for Three.js, 11 KB gzip for the model and the texture maps; the semantic portfolio remains readable while those optional assets load.
