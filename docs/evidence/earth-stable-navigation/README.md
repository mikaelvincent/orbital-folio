# Fixed-anchor Earth coverage — historical 20 September 2026

The viewport anchor must remain fixed through navigation; compensating for live
camera roll made Earth move in a different reference frame from the stars and
spacecraft. Current requirements belong to [project context](../../PROJECT-CONTEXT.md).
This folder retains technical crop/seam evidence, not a current performance claim.

[Coverage method](coverage-method.md) preserves front-triangle clipping, viewport
fixtures, independent resize easing, 64-row filtering margins and limitations.
Both meshes pass ordinary navigation; four deliberately expanded ultrawide resize
neighborhoods per mesh fail the sufficient bound, while exact perturbation samples
pass. This is an inconclusive stronger certificate, not proof of a visible defect
or universal resize safety. Reports retain hashes and compressed raw poses.

The later [roof-biased overview audit](../portrait-roof-biased-overview/README.md)
changes camera bounds; [right-drag](../portrait-right-drag/README.md) and
[application extensions](../earth-consistent-loop/README.md#coverage-follow-ups)
provide subsequent scoped evidence. Routine navigation captures/check logs are
recoverable from Git baseline `1b901fa`; they are not additional current guidance.
