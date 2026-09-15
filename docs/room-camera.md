# Consistent room camera framing

The camera previously fitted a different set of furniture bounds for each room.
At 1280 × 720, About used a distance of 4.87465, Projects and Case studies 5.05355,
and Contact 6.04403. Contact's closest object depth was combined with its lowest
pedestal position in an enclosing box, pulling the camera about 24% farther away
than About. The base view direction and field of view were already identical.
Navigation also preserved the previous pointer goal, so an old pointer tilt could
remain after arriving in another room.

All rooms now use one symmetric framing reference in cabin-local coordinates:
the fixed back-wall envelope, room headers, and doorway sign corners. Furniture
bounds remain available for diagnostics but no longer determine camera distance.
Every room shares the same fit, 38-degree field of view, and neutral direction.
At 1280 × 720, the shared distance is 4.91795. Resizing fits this same reference
to the available screen area, preserving matching room scale and perspective.

Navigation resets the pointer goal alongside the drag goal. Their existing springs
ease back smoothly; fresh pointer movement, door peeking, and dragging still work.
Reading views, overview framing, and the recent door/ladder timing are preserved.

## Validation

- 97 tests pass, including two new regression tests.
- Production build succeeds.
- The new geometry test projects actual room apertures, header and doorway sign
  corners, and Contact social screens over nine viewport sizes and 81 camera
  angles per room. Room architecture matches across all four rooms, and the
  navigation and social screens remain within the available screen area.
- Adding or rearranging furnishings does not change the shared camera frame.
- Visually checked every room at 1280 × 720 and 390 × 844, plus Contact at
  1024 × 768. All four rooms report the same distance at each shared viewport:
  4.91795 on desktop and 14.36240 on the narrow screen, with neutral arrival angles.
- An actual pointer tilt of approximately 0.0111 pitch / -0.0218 yaw returns to
  zero after travelling from About through the ladder to Projects.
- Actual desktop ladder navigation retains one exit pause and no simultaneous
  entrance/exit opening.
- Independent scoped review: 98/100, with no blocking findings.
- Runtime measurements and room screenshots are in `docs/evidence/room-camera/`.

## Stationary spacecraft, shared camera motion — 14 September 2026

The rendered spacecraft and its CSS labels now remain fixed in world space.
Portrait overview orientation uses an inverse camera transform instead of rotating
the vessel. If the old camera transform is C and the former vessel roll is R, the
new camera is R⁻¹C. Its view matrix is C⁻¹R, exactly the previous model-view matrix.
The existing room fit, springs, door timing, ladder pauses, pointer response and
annotation projection are preserved. The annotation layout keeps a non-rendered
virtual frame so its portrait ordering and fade timing remain unchanged.

Earth, stars, the nebula and meteors now use that same physical viewpoint. A fixed
registration places the authored orbital scene at the overview and scales it by
32 relative to vessel units. This keeps Earth beyond every supported camera path,
including very tall layouts. Registration changes only when the viewport changes;
it does not follow room selection. Camera travel and dragging therefore move the
background naturally rather than resetting it around each selected room.

The external light rig, shadow-map orientation and reflection environment compensate
for the former vessel roll to retain the approved room appearance. This preserves
lighting rather than optimizing it: shadows still refresh on roll, and one fixed
shadow bake is not automatically valid. Background ray projection adds shader
arithmetic; no GPU timing improvement is claimed.

See [implementation and validation evidence](evidence/world-camera/README.md) and
[the held performance plan](performance-ledger.md#next-candidates).

## Drag release returns to hover — 15 September 2026

Releasing a drag now sends its offset back to zero through the existing spring,
preserving its position and velocity. Mouse/pen release inside the canvas restores
the ordinary hover target at that pointer position; touch and outside releases
return to neutral. Re-grabbing during this return starts from the visible offset,
so a second drag does not jump to the previous goal. A normal capture-release event
cannot erase the newly restored hover target. Cancellation and blur use the same
return path, and a completed drag still suppresses accidental activation.

An actual browser gesture settled in 1.883 seconds across 114 recorded frames,
with a maximum adjacent rotation change of 0.393 degrees and no accidental click.
A second capture covers re-grabbing during the return. These describe the observed
gesture, not a fixed animation duration or a performance benchmark. See the
[release and re-grab evidence](evidence/spacecraft-polish/README.md).

## Responsive overview composition and calmer hover — 15 September 2026

The overview now reveals a little more of the roof and outer shoulders on broad
screens, with a gentler sideways lean on portrait screens. Before normalization
and the existing portrait camera roll, its direction changes smoothly from
`[-0.10, 0.18, 1]` at aspect ratios up to 0.9 to `[-0.28, 0.20, 1]` at 1.8 and
above. A smoothstep interpolation joins these poses, avoiding an additional
angle jump at square or tablet sizes. The prior direction was
`[-0.18, 0.14, 1]` at every aspect ratio. Room cameras retain their shared frontal
view and architectural fit; the spacecraft remains fixed in world space.

The safe-area fit still measures the actual header, identity and navigation.
Overview callout spacing now uses 18% of the remaining height, bounded to
42–72 pixels in landscape and 42–48 in portrait. Normal desktop and portrait
screens retain the prior 72/48-pixel spacing. Short landscape screens give more
space to the vessel while retaining a minimum gutter for the callout pills.
Below 480 pixels in height, the application still starts in Reading view; this
framing change applies only after the visitor explicitly chooses Interactive
view. The renderer now sizes and initializes that explicit opt-in at its actual
width and height. A previous 480-pixel guard stretched short canvases and could
leave landscape callout coordinates cached on the first portrait resize.
Transient panels below 240 pixels are still ignored. The reading fallback and
its content are unchanged.

Pointer hover pitch changes from ±0.025 to ±0.021 radians, and yaw from ±0.045
to ±0.036 radians: approximately ±1.20° and ±2.06°. The smaller excursion makes
ordinary movement calmer while retaining door peeking and the selected room's
small translation/dolly. Pointer springs, drag ranges, smooth drag release,
navigation timing and the camera-to-background registration are unchanged.

The overview regression projects real spacecraft support points through 169
camera angles and four extreme room-hover offsets at nine viewport sizes, after
fitting with the production 25-angle sample. It checks containment including the
2.5% hover dolly; the existing room-framing and world-camera tests remain separate.
These are projection checks, not GPU measurements or proof of readable callout
placement. Browser captures and the task's final validation record are in the
[composition and equipment evidence](evidence/composition-equipment/README.md).

The deeper desktop angle trades roughly 5% of the projected vessel width for
more visible hull depth in the conservative geometry comparison; portrait scale
stays close to the previous composition. That comparison uses representative UI
reservations. Actual screen dimensions, measured controls and the integrated
exterior geometry determine the production camera distance.
