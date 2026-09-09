# Spacecraft model V10

Integrated source: `components/spacecraft-model.ts`. Current source SHA and results appear in the packaged model and branding audits.

## Model/API contract

- Canonical 2×2 order: Experience top-left, Projects top-right, About bottom-left, Contact bottom-right. In `wide`, centers are X ±2.25 / Y ±1.7; in `compact`, X ±1.65 / Y ±1.7. Both layouts retain roll zero.
- `group.userData.circulation` is `['projects','experience','about','contact']`. `adjacency`, the six directed `portals`, and `activeRoute` use this same C route. Experience↔About goes through the left walkway; its portal metadata provides the three detour waypoints.
- All doors remain open, side-wall-mounted passages. No ceiling/deck portals. The inner docking entrance now has a sealed rounded backing, continuous gasket, pressure leaf, handwheel and locking dogs.
- `portals[].labelPosition`, `labelRotation`, `labelRight`, `labelUp`, `labelNormal` are world-space data recomputed by `setLayout`. Rotations are exactly `[0,+PI/2,0]` for left walls and `[0,-PI/2,0]` for right walls. Normal points inward. The ink measures 0.96×0.18; its physically attached plate measures 1.04×0.24. Compound portal pick geometry includes both the opening and this oriented plate. Labels are literally above their hatch, distinct from the frontal room-title header.
- `setLayout` keeps room/reader/portal objects stable, updates room anchors, aperture bounds, oriented framing points, hotspots and project slots. Reader anchors remain `[actualRoomX, actualRoomY, 1.72]`; portrait reader surface contract is unchanged.
- New optional `vesselName?: string` prints the exact supplied text on two symmetric low-relief upper/lower pressure bands. The front face sits at Z1.598, ahead of the collar bevel; their solid body extends back to Z1.06 to retain physical attachment. Empty/missing value produces no invented name. `group.userData.branding` describes both surfaces.
- Existing `projects`, `sampleLabel`, `projectPageSize`, `setProjects`, `setProjectPage`, `setLabelOrientation`, `update` and hovered-project behavior remain compatible. Nine empty compartments contain nine different secured props; no spare has a fake project label or project pick.

## Lighting and construction

Idle room material base colors are 0.035× normal; screen emission is 0.025×, warm-fixture emission 0.015×, other interior emission 0.055×. Active and hovered rooms return to normal. Exterior materials, exterior labels, stairs/walkway, service equipment, docking hardware and branding stay at 1×.

Pressure skins and bulkheads have distinct interior/exterior material batches, so dimming an inner wall does not darken the outer shell. Physical room emitters remain constant at two 0.35-intensity lights per cabin and two 0.55 lights in the walkway. This deliberately prevents unshadowed PointLight leakage from changing external brightness on hover. Room-local surface colors/emission provide the dimmer. Runtime values are in `group.userData.lightingState`.

Centered header backing/enamel is narrower to leave the side doorway plaques unobstructed. The inner front gasket/light guide is 0.12/0.108 wider, preserving the outer pressure collar silhouette while clearing phone-hover sightlines. Hidden plaque backing overlaps the actual wall by at least 0.019 world units. Both branding bands overlap two hull collars and have no stand-off feet.

## Bounded validation

Run the portable audit against the current checkout model:

```sh
node scripts/spacecraft-render-audit.mjs .
```

Or pass an explicit model and output:

```sh
node scripts/spacecraft-render-audit.mjs . components/spacecraft-model.ts /tmp/spacecraft-render-audit.json 320
```

Requires Node with TypeScript stripping (22.18+), installed Three, and the repository camera helpers. The Canvas path uses a deterministic text-measurement stub; it tests geometry and mappings, not browser font rendering. No browser/admin/reader UI actions are performed.

Passed: strict TypeScript check; counts 0/1/8/9/10/18/19 with 198 slot/page mappings in both layouts; reorder/shrink/grow; eight reader-anchor checks; all 16 route pairs; 3,240 oriented portal ink rays; 1,944 compound-plate pick rays; 1,080 header rays; 300 unobstructed passage rays; 706 rays through the original rounded docking aperture, all blocked by the new closed leaf/backing; all 16 physical plaque/branding mounts; 25 lighting states with all 55 exterior materials exactly invariant. Geometry has 796,834 unique-geometry vertices, finite positions and unit normals. Nine populated slots plus Canvas labels render approximately 237 color meshes (shadow passes excluded).

The current renderer fit is audited at 390×844 and 320×844 with the complete 25-view drag envelope, 24px top and 80px bottom reserved space. Each uses rest and ordinary-hover rays at the computed distance, and separately labels reference/historical poses. Four small aperture trims clear both phone cases: the guide is 2.58 wide, inner gasket 2.74 wide, front lip 0.13 thick and retired side collar 0.34 wide. The outer hull and attached signs are unchanged.

## Practical visibility limit

Ordinary-hover ink and pick rays pass at both widths. Literal side-facing text is severely foreshortened on a centered phone view, down to about five pixels in the narrowest sampled pose. Bottom-left navigation provides readable equivalent destinations and the whole doorway is a render pick target. Extreme optional drag can hide the far sign: 12/48 diagnostic poses at390, 18/48 at320. Do not claim every physical sign is simultaneously legible at all camera angles.

The separate branding audit passes 4,080 overview/rest/hover rays including the camera from the formerly occluded screenshot. These are geometry checks with synthetic Canvas measurements; actual browser images independently show the upper and lower domain labels after repair.

Exterior nameplate ink is visible in overview and hides in selected-room views, matching the existing outer room-label behavior. The solid pressure bands and all exterior lighting remain unchanged; this avoids a giant cropped domain above a phone room.
