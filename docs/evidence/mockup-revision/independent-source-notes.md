# Independent source notes before final evidence review

9 September 2026. Read-only source review and numerical geometry probes. No final score yet.

## Verified fixes

- Contact draft values are lifted to the immersive parent and passed to both the world instrument and reading view. The latest change also lifts `{status,error}`; pending submission disables/guards the replacement form and the completed request updates shared success state. `initialSent` is now derived live rather than captured only at mount. This resolves the previously identified in-flight mode-switch source defect. Actual delayed-response switching remains a useful final browser check.
- Automatic viewport fallback now defers while an editable field is focused. The working browser record additionally preserves populated name/message fields through keyboard resize and a switch to reading mode.
- The CSS reader now decomposes the physical anchor's real world matrix and uses a separate CSS scene root. It follows partially deployed trays and avoids duplicate ship roll.
- Portrait height adjustment is mathematically consistent. Independent27-case checks covered stretch1/1.22/1.5, roll0/.065/.91 and partial/fully deployed poses. Maximum physical/CSS world-corner difference was1.05e-15 units. The apparent `scale.y *= stretch` does not accumulate, because `model.update` first resets every tray's base scale. Evidence: `/tmp/mockup-reader-transform-audit.json`.
- The updated raised docking band is continuous in the supplied center, cursor-left and cursor-right seam captures. The earlier jagged ring is absent in those samples. This resolves that specific visible seam defect in the evidence provided; it does not claim exhaustive temporal inspection of every surface.
- GTAO caching tracks camera position/orientation, ship roll, geometry while moving, the frame immediately after geometry stops, and explicit resize invalidation. It can reuse the result while only lights/Earth/stars change. The moving-reader groups do not cast into the cached directional shadow map.
- Capability selection now defaults unknown memory to the4K Earth tier. The highest texture tier requires both sufficient thread count and reported memory at least8GB; known smaller memory chooses4K and mobile chooses2K. AO capability is separately gated on thread/memory hints and the float-buffer extension. The environment records texture dimensions and estimated decoded memory, which is useful for honest performance reporting.
- Earth remains hidden until both day and cloud textures finish loading, avoiding an interim untextured globe.

## Remaining review notes

1. No additional hard source blocker found in the four requested areas after the last fixes. Final confidence still depends on the new browser/runtime evidence, particularly contact submission across a mode switch, mobile paper fit, sustained frame intervals, reduced motion and lost-WebGL fallback.
2. Marking `aoDirty=true` in `go()` is inexpensive defensive invalidation for instantaneous same-pose geometry changes. The current observed routes generally also change camera pose, and the previous-motion flag covers normal settling, so this is a maintenance improvement rather than a reproduced user blocker.
3. Hardware hints are not GPU memory measurements. The8K tier's roughly244.8MiB estimated Earth texture allocation remains a material cost even after capability gating. Final reporting should distinguish4K/mobile and8K evidence, and avoid treating a fast loopback response or CPU render-submit time as GPU frame time.
4. `go()` still ignores sent/error flags in its same-destination comparison. Direct contact result loading is fixed, but Back/Forward between otherwise identical contact query states should be checked. This is a narrow remaining query-state edge case, not evidence of a broken ordinary AJAX submission.
5. The shared contact draft is memory-only, which preserves mode changes without retaining private messages in browser storage. Reload persistence is neither implemented nor claimed, and was not requested.

Earlier model evidence remains relevant:0/1/3/8-project page mapping passes; blank slots remove stale slugs; all four deployed reader anchors match exactly; six About wall probes hit real surfaces; cheap proxy picks select the intended page records. Those checks are numerical source-level evidence, not a substitute for current DB/admin or browser interaction validation.

The final review will still use five equally weighted areas and the requested90/100 overall, each at least8/10, with no local requirement blockers. No old visual score is carried forward. The previously documented hosted-deployment incident remains separate from the local revision.
