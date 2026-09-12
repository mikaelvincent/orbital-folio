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
