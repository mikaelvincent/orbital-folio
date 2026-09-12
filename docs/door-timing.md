# Door opening and passage timing

Doors open in approximately 0.53 seconds at 60 Hz, compared with the original
1.00 second opening. Opening motion uses twice the original frequency and speed,
with four times the acceleration. Closing motion retains its previous settings.

During travel, the requested doors are recalculated from the current camera focus
to the current waypoint. Both faces remain open until the focus clears the doorway
by the existing 0.35-unit margin. They then begin closing while the camera finishes
moving into the room. Reversing direction requests the doorway again.

The ladder exit classification stays fixed for each travel leg. The entrance seals
before the exit opens, and the camera still pauses before the exit until it is
ready. Releasing a crossed exit does not create another pause. Ordinary room
passages and ladder entry continue without waiting for doors.

## Validation

- `npm run check`: 95 tests passed, including opening/closing timing at 30, 60,
  and 120 Hz, paired-face clearance, reversal, and ladder sequencing.
- Sites production build completed successfully.
- Desktop About → Contact and Contact → About: no waits; doors start closing
  approximately 0.83–0.92 seconds before arrival, with matching paired faces.
- Desktop About → Projects and 390 × 844 Projects → About: exactly one exit
  wait per route, no simultaneous ladder openings. Entrance closure begins
  approximately 2.65 seconds before arrival; exit closure approximately 0.87
  seconds before arrival.
- Visually inspected the desktop opening and narrow room transition. No browser
  console errors were reported.
- Independent scoped review: 98/100, no blocking findings.

The recorded application flight traces and open-door screenshot are in
`docs/evidence/door-timing/`.
