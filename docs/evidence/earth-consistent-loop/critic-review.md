# Independent critic review

Reviewed on 20 September 2026 by the independent `earth_scene_critic` agent.
The critic did not implement the renderer, camera, atlas or audit. Its only file
edit is this review. Review covered final source, source-hashed verification,
the supplied rendered captures, coverage derivation and both timing exports.

**Score: 94/100. No unresolved blockers. Recommendation: keep.**

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Request fulfillment and physical scene behavior | 24/25 | Earth and world registration stay fixed; projection and physical camera movement determine the view. Native Europe detail, a shorter loop, AI continuation and playback inspection are delivered. Responsive spacecraft poses remain different viewpoints, explicitly documented rather than described as identical photographs. |
| Visual quality and loop continuity | 27/30 | The original Europe opening remains attractive. The fictional continuation supplies varied lit coastlines, and corrected portrait framing retains both Earth and readable spacecraft content. Quarter-cycle and wrap images show no conspicuous join. Some phases still have substantial water or sparse lights; generated settlement networks are more intricate than the source. |
| Correctness and coverage defensibility | 19/20 | Actual-mesh clipping and continuous pose neighborhoods support the chosen crop and hidden geometric seam. Tests cover projection, playback clocks, loading/disposal, source pixels and the annotation regression. The audit appropriately stops short of a universal minimum-height proof or complete runtime-trajectory coverage. |
| Organization, rebuildability and provenance | 10/10 | Placement, texture loading/scrolling and camera framing have cohesive responsibilities. The static AI input, prompt, deterministic builder and source/output hashes make the atlas reproducible without regeneration. Current project records distinguish this version from historical experiments. |
| Verification and performance interpretation | 14/15 | Full tests/build and affected checks pass. Balanced timed runs preserve raw data and reject unsupported rankings. The evidence distinguishes asset savings, startup observations, frame pacing and GPU time. Native Safari and whole-application performance remain unmeasured. |

## Findings addressed during review

1. The first fixed-scene portrait view lost Earth entirely. That intermediate
   was rejected. The delivered responsive lens preserves a useful horizontal
   field of view while retaining a fixed Earth; the actual portrait capture now
   has a visible curved limb along the right side.
2. The wider portrait lens exposed an annotation defect: the site identity
   overlapped the spacecraft because annotation unprojection still used 38°.
   Layout now requires the actual camera FOV. A regression test exercises the
   real projection/unprojection through a DOM fixture, and the refreshed
   portrait capture restores the title above the ship.
3. Earlier coverage prose described the old ray-sampling/integer-repeat method.
   It now describes triangle clipping, the fixed sphere and conditional camera
   neighborhoods. The larger lens also invalidated the previous AI padding
   assumption; the final bridge was regenerated for rows 384–1919, with no
   repeated-edge padding or upscaling. The evidence distinguishes original sweep
   hashes from the transparent metadata rebase.
4. The desktop pooled timing suggested a saving despite substantial control
   drift. The final record rejects that ranking. The small portrait increase
   likewise remains below observed repeated-control variation. Neither result
   is presented as a thermal diagnosis or whole-application performance claim.
5. Evidence prose spacing was corrected, and current context, asset provenance
   and the ledger now identify the final dimensions, mapping and AI attribution.

## Visual judgment

The critic inspected matching desktop openings, the before/after 218-second
continuation, candidate 109/218/327/436-second frames, the actual portrait
overview and room captures, and the rejected empty-Earth portrait. At 218 seconds
the new continuation has a more interesting balance of water, islands and lit
coasts than the former broad dark-water region. The opening and wrap retain the
recognizable European composition. The final portrait title is legible and the
vertical limb complements the upright spacecraft without requiring Earth to
move separately from the world.

This is an aesthetic improvement overall, not a claim that every instant is
better. The 109-second view still contains a broad dark sea, and the 327-second
view has sparsely illuminated original terrain. A 7:16 repeat may be recognizable
sooner during extended visits or fast-forward. The more intricate AI settlement
patterns are plausible at the reviewed rendering scale but are fictional. These
are disclosed tradeoffs, not blockers requiring another implementation cycle.

## Performance judgment

The atlas decreases from 3,625,576 to 2,862,376 bytes, and nominal RGBA8 mip storage
from 64 to 20 MiB. Those reductions are definite; physical process/GPU memory is
not measured. They do not prove lower heat, lower power or faster frames.

Desktop GPU control spread of about 85%/72% overwhelms the apparent pooled 6.5%
saving. Portrait GPU means increase about 2.5%, below the 3.59%/3.95% control
variation. Portrait CPU block means also vary enough to prevent a dependable
regression claim: candidate blocks are approximately 0.369 and 0.304 ms, versus
baseline 0.290 and 0.299 ms. Similar observed frame pacing does not establish equal
GPU cost. Startup preparation is local and cache/order-sensitive.

**Keep for the improved art, consistent world and smaller delivered asset.**
The evidence establishes neither a reliable steady-rendering improvement nor a
regression. In particular, the wider portrait lens can change the visible
spacecraft workload; the background-only fixture does not measure that complete
production cost. Reverting is not justified by the measured timing differences.

## Evidence and limits

- [Final runtime verification](runtime-verification.json): the critic checked
  that all listed source and asset hashes match the working tree. Final full
  suite is **343 passed, 0 failed**; production build completes. Root also
  confirmed final typecheck and affected lint passed.
- [Coverage derivation](coverage-method.md): 48,314 actual-mesh poses and guarded
  bounds, with finite viewport/trajectory and mip-filtering limits. The chosen
  height is conditional, not a mathematically universal optimum.
- [Timing data](timing-summary.json), [desktop export](desktop-timing.json) and
  [portrait export](portrait-timing.json): 7,200 measured frames in total, with
  no discarded GPU queries. Both textures coexist in the fixture; production
  uses one. The portrait fixture uses a neutral camera, not production roll/AO.
- [Browser verification](visual-checks.json) and [captures](captures/): root
  recorded live playback through the wrap and responsive/Contact checks; the
  critic independently inspected the supplied images and matching source.
  This was hidden built-in Chromium, not native Safari or the user's desktop.

There is no claim of exhaustive frame-by-frame visual certification, native
Safari validation, arbitrary-aspect coverage, equal hardware clocks or measured
battery/temperature improvement. The owner's visual preference remains the final
judgment; this score does not override later feedback.
