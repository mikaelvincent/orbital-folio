# Room composition and alignment

Reviewed all five rooms for balanced spacing and consistent horizontal and vertical alignment. Existing primary furniture proportions, architecture, headings, camera framing, and interactions are preserved.

- All four furnished cabins now keep their furniture origin on the room centerline in both layouts. The legacy horizontal correction scales with the furniture; it no longer leaves a 0.0512 m sideways offset in compact views. Edge fittings and the About locker use the same centered frame of reference.
- Projects keeps its existing 2×2 display bank. The tool board and retained lead share the bank's vertical midpoint. Underbench drawers and task lights follow the display columns.
- Case studies keeps its five-row archive and inclined terminal. Rear service columns and the thermal accumulator align with the middle cartridge. The lower transport case is centered in the clear wall space between the floor and the upper column.
- Contact keeps its symmetric three-screen arrangement and functional microphone/headset asymmetry. Rear umbilicals align with the social screen enclosures; the outboard radio rack follows the main display's center at both scales. Control recesses have equal gaps and outside margins, the keyboard and bezel keys are centered, and the signal graphic fits between its header and footer rules. The headset moves inward by 0.01 m to retain its minimum compact wall clearance after recentering.
- About retains the balanced berth/study/locker composition and existing uniform poster row. The bedding roll shares the berth's vertical midpoint. Compact recentering also brings the desk and folded perch onto the same column.
- The ladder already has aligned service columns, evenly spaced rungs, and mirrored upper/lower lights and fittings. Its layout is unchanged.

Shared row and column datums live in `lib/cabin-composition.ts` so secondary fittings follow changes to the primary furniture. Mounting shoes remain fitted to the actual pressure surfaces.

Validation: type checking, production build, and 15 focused geometry/regression checks passed. Checks cover furniture centering across repeated layout changes, clearances, actual wall mounting, text visibility across the room camera range, fixed framing, and ladder symmetry. Independent source and visual review found no actionable issues. Live desktop and 390×844 views were inspected; evidence is in `docs/evidence/room-composition/`. Local preview only.
