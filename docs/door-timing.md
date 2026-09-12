# Door opening and passage timing

Doors open in approximately 0.53 seconds at 60 Hz, compared with the original
1.00 second opening. Opening motion uses twice the original frequency and speed,
with four times the acceleration. During travel, ladder hatches close at that
same rate so the entry can seal before the camera departs the center of the bay.
Ordinary cabin doors and idle hover closure retain their previous settings.

During travel, the requested doors are recalculated from the current camera focus
to the current waypoint. Both faces remain open until the focus clears the doorway
by the existing 0.35-unit margin. They then begin closing while the camera finishes
moving into the room. Reversing direction requests the doorway again.

The ladder exit is requested one leg early: as the camera leaves the center
waypoint toward the exit landing. The entrance still seals before the exit
opens. While the iris retracts, the camera can approach the doorway's existing
0.35-unit clearance boundary instead of stopping at the landing. A hard spring
bound protects that clearance during interrupted routes; crossing still requires
a fully open iris. Releasing a crossed exit does not create another pause.
Ordinary room passages and ladder entry retain their existing camera movement.

## Current validation

- `npm run check`: all 105 tests passed. New coverage verifies center-departure
  anticipation, mid-bay retargeting, threshold clearance, and ladder-only travel
  closure at 30, 60, and 120 Hz.
- Sites production build passed.
- Actual browser traces for both ladder directions at desktop and 390 × 844:
  zero door-wait frames and zero simultaneous ladder openings. The camera keeps
  moving while the exit opens. Ordinary About → Contact travel also has no waits.
- No browser console errors. Independent scoped review: 98/100, no blockers.
- Flight evidence: [ladder anticipation traces](evidence/ladder-exit-anticipation/flights.json).

## Earlier opening-speed validation

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
