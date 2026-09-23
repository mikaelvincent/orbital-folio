# Soft graphite desktop adoption

The owner selected **A · Soft graphite** after the room-context comparison at
`7091716`. The earlier [proposal evidence](../palette-room-refinements/README.md)
remains a historical record of the choice, not the current implementation status.

## Implemented treatment

The single shared canvas now uses the exact A gradient anchors `#56616B`,
`#303C47`, `#45515D` and folded highlight `#65717C`. The existing alloy gradient,
texture size and attachment remain. This supplies populated Projects screens,
the Case studies terminal, Contact main/social screens, and the wallpaper around
open native application windows. Carbon equipment paint remains independent.

The approved preview already raised Contact main-screen secondary ink to ivory.
Adoption checks also found low-contrast social descriptions/COM labels and Case
terminal subtitle/footer/count. These now use ivory when populated. The small
Case count and Contact footer labels also have a translucent carbon field over
the lower glow; the Contact side-screen field supports descriptions and links.
This canvas-only treatment preserves the selected wallpaper and keeps its lower
text readable during bright hover. Standby
artwork, decorative bronze rules/status dots and signal arcs retain their prior
colors. Typography, labels, geometry, camera, lights, emission, material finish,
hover/focus multipliers and animation timing are unchanged. No persisted content
or credentials are rewritten and no performance proposal is implemented.

## Verification

The final source passed **516/516 tests**, typecheck, production build and
affected four-file lint from a fresh isolated checkout and loopback server on
port 3003. Test-only secrets and D1/R2 state were created there; no main private
environment or persisted content was copied. The first run was cancelled before
the footer correction; its partial log is explicitly not a completed pass.
See [check results](checks/results.json).

The [15 final captures](captures.json) use the live application through the
**hidden built-in Chromium browser**, at actual **1440×900** landscape and
**390×844** portrait viewports. All three affected rooms were checked at rest
and in portrait; Case/Contact hover, Projects/social keyboard focus, all three
open applications, and Projects/Case open portrait views were inspected. The
final Projects browser session had no error-level console entries. Native Safari
is not controlled or tested. Contrast samples are bounded estimates
from rendered JPEG text cores, not a universal accessibility certification.

[Rendered samples](contrast.json) record the count/footer contrast correction
and its limits. Small decorative instrument IDs retain the existing room-scale
projection; do not interpret these finite screenshots as proof for every size
or animation frame. The application windows retain opaque carbon surfaces and
their existing accessible text; portrait room-screen text is inherently small.

## Review and local server

The [independent critic](review.json) scored the final source and matching
evidence **94/100**, with no blockers. It records the rubric, reproduced
contrast samples and finite browser/state limitations.

The isolated test fixture/server on port 3003 was removed after verification.
Temporary browser tabs were closed and the viewport override reset. The main
`npm run dev` server remains on `http://localhost:3000` (PID 45500), returning
HTTP 200. Its existing store and private environment were preserved.
