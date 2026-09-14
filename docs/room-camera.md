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
