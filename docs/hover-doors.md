# Hover doors and uninterrupted ordinary navigation

Ordinary room-to-room travel and ladder entry use the existing camera springs
without waiting for door progress. The ladder exit retains its pause until the
entrance has sealed and the exit has opened. The upper and lower ladder doors
remain mutually exclusive; the two blade faces of each physical doorway always
move together.

Hover and keyboard focus open the same first-hop door highlighted by navigation.
Travel intent takes over when activated, avoiding a closing pulse on click.
Existing feedback cancellation handles leaving the target, dragging, reading
mode, and inactive navigation. Immediate initial/resize transitions no longer
leave idle hover animations permanently instantaneous.

## Verification

- Full typecheck and test suite: 93 tests passed.
- Production build and changed-file formatting passed.
- Independent scoped critic: 98/100, no blocking findings; 34 focused checks
  passed independently.
- Added checks for ordinary travel independent of door progress, ladder-only
  interlocking, both directions, threshold reversals, mid-bay retargets, paired
  hover opening, smooth hover-to-travel handoff, and hover cleanup in both layouts.
- Actual ordinary travel from a closed door: 74 frames, no wait; the focus was
  already moving with door progress approximately 0.008.
- Downward ladder route: 210 frames, 66 frames waiting at the exit, no overlapping
  ladder openings. Entry movement began with door progress approximately 0.013.
- Upward ladder route at 390×844: 210 frames, 66 exit-wait frames, none outside the
  ladder bay and no overlapping ladder openings.
- Fresh-load navigation focus produced 48 intermediate opening frames, then a
  fully open doorway. Leaving focus settled all doors closed.

## Evidence

- [Opened paired doorway](evidence/hover-doors/paired-door-focus.jpg)
- [Direct ordinary travel](evidence/hover-doors/ordinary-cold-flight.json)
- [Travel through an already opened door](evidence/hover-doors/ordinary-flight.json)
- [Downward ladder route](evidence/hover-doors/ladder-flight.json)
- [Narrow upward ladder route](evidence/hover-doors/ladder-reverse-portrait.json)
- [Fresh-load opening](evidence/hover-doors/fresh-hover.json)
- [Closed state after departure](evidence/hover-doors/hover-close.json)
