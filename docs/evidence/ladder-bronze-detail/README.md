# Restrained bronze ladder fittings

24 September 2026. Baseline `32302d204f3a6515e05cc2700be349adcda5cbed`.
The owner requested more bronze in the current ladder, without overdoing it.

Eight existing rail clamps at the four support levels and four small terminal
caps now reuse the ladder's existing bronze material, whose base color is the
shared **`#AA8054`**. The larger carbon surfaces and bright alloy treads retain
their hierarchy. This adds warmth to real attachment points without new parts,
bronze tread stripes or repeated accents at every rung. End grips, spanners,
exterior access ladders, cabin architecture and navigation are unchanged.

## Visual evidence

| View | Before | Final |
| --- | --- | --- |
| Fixed front, 1440×900 | [Before](before-front-wide.jpg) | [After](after-front-wide.jpg) |
| Fixed compact front, 390×844 | [Before](before-front-compact.jpg) | [After](after-front-compact.jpg) |

Additional final views: [reverse oblique](after-reverse-wide.jpg),
[landscape overview](after-overview-landscape.jpg),
[portrait overview](after-overview-portrait.jpg) and
[portrait transfer](after-transit-portrait.jpg).

All eight original JPEGs were inspected in hidden built-in **Chromium 153**.
CSS viewports, drawing buffers and images are 1440×900 or 390×844 at browser/render
DPR 1, without scaling. Both live orientations use the wide model and shadows;
GTAO is enabled in landscape and disabled in portrait under the existing policy.
The compact fixture is checked separately. Its far rail is partly occluded by
the cabin divider, with reverse and live transfer views providing other coverage.

The finite fixture uses identical before/after camera poses, time 0, FOV 38,
RoomEnvironment intensity 0.24, fixed lights and requested PCF shadows. It omits
GTAO, Earth/sky, navigation and live screen applications. Live captures use the
preserved localhost:3000 server and public content. [Metadata](browser-captures.json)
records exact poses, dimensions, effects and image hashes; the
[source manifest](source-manifest.json) freezes 44 transitive sources per version
at `2026-09-24T13:18:32.995Z`. Only `ladder-service-spine.ts` changes at runtime.

## Verification and cost

All **560 tests**, typecheck, production build including geometry checks,
affected lint and formatting passed in a disposable source-only checkout with
fresh test-only D1/R2/secrets, its own Vite cache and explicit
`TEST_BASE_URL=http://127.0.0.1:3003`. No main state or private environment was
copied. [Verification records](verification-checks.json) preserve exact source
hashes, commands, logs and cleanup. Non-failing build warnings concern Node
DEP0205, chunk size and Vinext static route analysis. No new tests were added for
this material-only edit. The independent critic scored **96/100**, with no
unresolved findings or blockers. Its [review](critic-review.md) records the
visual-weighted rubric, resolved byte-total wording correction and limits.

The [material/geometry audit](structural-costs.json) confirms exactly 12 material
reassignments. All 429 authored service-spine parts have identical raw geometry
and local/world transforms. The other 417 parts keep their material descriptors;
the changed fittings use the same material object as existing bronze markers.
Protected assemblies, bounds, framing and routes match.

Both layouts retain **70,180 spine triangle inputs, 17 mesh submission candidates
and 2,846,768 geometry-array bytes**. Whole-scene counts and geometry-array byte
totals also match.
Finite front rendering remains **772 wide / 598 compact calls**, with unchanged
triangle inputs including requested shadow work. These counts do not establish
equal timing, actual process/GPU memory, heat or power. No timing benchmark or
held optimization candidate is included.

Keyboard overview entry and portrait Projects→About transfer completed. The
[sampled trace](navigation-smoke.json) has at most one open ladder hatch per
sample and reaches About; it is not exhaustive animation-frame coverage. Final
browser error sampling returned no entries. No persisted content was changed.
Native Safari, a physical phone and a browser reduced-motion override were not
checked. The hidden tab was closed, viewport reset and finite preview stopped.
The isolated test fixture/server were removed; main localhost:3000 remains HTTP 200.

Carry forward bronze at support stations and terminal caps, with clear alloy
steps against the continuous dark backing. Keep the paired end fittings and
intentional empty spaces. This refines Stage 06; the docking and exterior scopes
remain separate.
