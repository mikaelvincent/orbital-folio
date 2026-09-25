# Independent review — Stage 11 spacecraft cohesion

**Final score: 95/100. No unresolved blockers or required revisions.**

Baseline: `60c723f85f5b1ad1d4e7d452599960731fb9c6f9`. This review covers
the final runtime/test source, seven matching finite before/after pairs (Projects,
About, ladder, docking, service, roof and underside), and all 22 live captures.
The invalid half-scale live Projects capture was replaced; this review inspected
the valid final image. All 36 retained images were visually inspected.

## Rubric

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Material hierarchy and cross-assembly visual cohesion | 33/35 | Exposed hardware responds more consistently, with quieter broad alloy highlights and restrained bronze. The improvement is subtle at ordinary overview scale. |
| Composition, room identity and visual usability | 14/15 | Established focal points, negative space, readable treads and material exceptions survive the integration pass. |
| Fulfillment and protected scope | 15/15 | The correction addresses specific finish inconsistencies without adding filler, changing approved geometry or taking over later environment/UI work. |
| Implementation, interaction and regression correctness | 20/20 | Explicit creation-time profiles, protected route paint, full-model invariants and final regression checks support the narrow implementation. |
| Evidence and rendering implications | 13/15 | Seven controlled pairs and all-room live checks are well identified. Live before/after viewport/DPR differences and single-engine coverage limit comparative claims. |
| **Total** | **95/100** | **Visual design carries 50% of the rubric.** |

## Design and implementation judgment

No implementation or visual blocker remains in the reviewed source and
evidence. This is a restrained finish correction. The broad exterior alloy
surfaces have quieter, broader reflections, most legible at the service throat,
docking rim and access supports. Smaller room fasteners and retainers change
subtly. The screenshots support improved consistency; they do not support a
claim of a dramatic transformation, a generally brighter scene or new detail.

The shared helper changes only roughness, metalness, environment response and a
material metadata tag. It preserves color, emissive values and feedback. Applying
it during material creation is straightforward and does not introduce per-frame
work. The separate route-paint source retains the prior iris treatment instead
of inheriting hardware shading. Keeping the brushed ladder grasps, dark floors,
natural study materials, solar blues, screen media and meaningful signal paints
as exceptions protects purpose and the approved visual hierarchy.

Existing forms remain coherent: carbon equipment reads against ivory structure,
small bronze fittings stay accents, and exterior access hardware still has clear
dark grasping surfaces and alloy supports. There is no justification in these
views to add equipment or reshape completed rooms for this pass.

The live overview and all four cabins retain their focal hierarchy in landscape
and portrait. Workshop fasteners and supports read as related hardware; the
study's warm natural surfaces remain distinct. The metal response does not turn
small passive fittings into brighter competing controls. Live images verify
integration only: desktop viewports and all before/after drawing resolutions
differ, and background animation is not fixed.

All 45 final transitive source hashes, 36 image hashes/encodings/dimensions and
image source-tree bindings match. Each of the seven finite pairs has matching
pose, CSS viewport, drawing buffer, both DPR values, time and reported draw/
triangle counts. The model audit's manifest binding and protected source hashes
also match. README/context/ledger accurately describe the narrow material change
and its exceptions. The browser-DPR documentation precision finding is resolved.

## Findings and revisions

- The independent review identified imprecise DPR wording in the initial
  handoff. Final documentation correctly distinguishes browser DPR 2 from
  forced renderer DPR 1 in the finite fixture. Resolved; no source change.
- The parent rejected malformed half-scale browser output and replaced the live
  Projects capture before final review. The replacement is a valid 1280 × 720
  JPEG of the whole CSS viewport. Failed captures are not approval evidence.
- The implementation remained frozen throughout final review. No additional
  geometry, lighting or decoration is needed to make this bounded correction
  successful. The final description appropriately calls the effect restrained.
- There are no open corrective findings. User feedback takes precedence over
  this score.

## Verification and costs

[Verification records](verification-checks.json) and the retained logs confirm
**588/588 tests**, typecheck, production build with geometry precheck and affected
lint passing. I independently rechecked all 13 tested file hashes against the
working source, the 12 runtime bindings against the visual manifest, and all four
normalized log hashes. Typecheck/build used the frozen runtime before the new
JavaScript regression test was synchronized; the full suite and 13-file lint
included that final test. No failed or interrupted full-suite run is concealed.

The added tests inspect emitted hardware materials through layout, room,
interaction and cloning paths, including the iris source chain and protected
material families. They meaningfully guard against applying the finish too
broadly or losing it on cloned components; they do not substitute for the image
review. The model audit records identical geometry, transforms, metadata,
textures and protected feedback in both layouts, with 48 changed hardware
signatures and 239 protected signatures.

Both layouts retain 610 mesh nodes, 545 unique geometries and 56,231,352 bytes of
geometry typed arrays. Wide/compact visible triangle potential remains
1,020,976 / 997,776. These are construction/traversal inventories, not GPU memory
or production frame cost. Seven finite paired renderer counts also match. The
new route-paint template is an additional construction-time material, with no
added rendered mesh or texture. No speed, memory, heat or battery benefit is
measured or implied.

The isolated suite used a disposable source checkout, fresh test-only D1/R2 and
secrets, and explicit `TEST_BASE_URL` at port 3003. No private environment or main
store was copied. Cleanup is recorded complete: isolated fixture removed,
comparison/test services stopped, owned browser tabs/viewport override cleared,
and the main server retained at HTTP 200. Build warnings remain disclosed.

## Evidence limitations

The finite images use hidden built-in Chromium 153 at 1280 × 720 CSS pixels,
browser DPR 2 and forced renderer DPR 1, at time zero with fixed lighting and
shadows. Actual JPEG dimensions and drawing buffers are both 1280 × 720. They
omit GTAO, orbital sky/Earth, live screen interfaces and navigation. All finite
views use the wide model; compact layout correctness is covered by the model
audit and tests, not a compact rendered comparison.

Live baseline desktop views are 1440 × 900 at browser/render DPR 1; final desktop
views are 1280 × 720 CSS/JPEG at browser/render DPR 2, with a 2560 × 1440 buffer.
Portrait CSS/JPEG dimensions remain 390 × 844; baseline DPR is 1, final browser
DPR is 2 and renderer DPR is 1.75 (682 × 1477 buffer). GTAO is on for live desktop
and off for phone portrait, with shadows retained. Those live views establish
integration, not isolated shading deltas. Background animation was not frozen.

The parent performed live navigation and cleanup; this critic independently
reviewed source, actual images, metadata and logs rather than replaying a browser
session. The released drag is not a held envelope endpoint. Native Safari,
physical touch hardware, an assistive-technology session and an OS reduced-motion
override were not exercised. No controlled CPU/GPU timing or process/GPU-memory
experiment was performed. These limitations are explicit and do not conceal a
failing required check.
