# Independent review — restrained bronze ladder fittings

24 September 2026. Reviewed baseline `32302d2` against the final source frozen at
`2026-09-24T13:18:32.995Z` in the [manifest](source-manifest.json).

**Score: 96/100. No unresolved findings, implementation blockers or required
visual revisions.**
The requested additional bronze is visible at meaningful support points without
weakening the owner's preceding dark-backing/alloy-tread correction. This verdict
is specific to this small material change; it does not override later user
feedback or approve other ladder/exterior work.

| Criterion | Weight | Score | Assessment |
| --- | ---: | ---: | --- |
| Visual restraint, hierarchy and spacecraft cohesion | 50 | 47 | Four paired support stations give the ladder a warmer construction rhythm. Small terminal caps finish the rails; bright alloy steps remain dominant. |
| Fulfillment and material choice | 15 | 15 | More bronze uses the existing spacecraft material on eight clamps and four caps, with no new decorative parts. |
| Construction, protected scope and usability | 15 | 15 | Geometry, transforms, access space, end equipment, picking and navigation remain unchanged. |
| Verification and evidence quality | 15 | 14 | Matching responsive captures, exact source identities, material audit and passing isolated checks; browser/device coverage remains bounded. |
| Rendering implications and reporting | 5 | 5 | Unchanged measured counts are separated correctly from unmeasured timing and memory behavior. |
| **Total** | **100** | **96** | |

## Design assessment

I inspected all eight original saved captures, including both before/after front
pairs, the final reverse, both live overviews and the portrait transfer. In the
[wide pair](after-front-wide.jpg), the changed clamps read as structural nodes
at four levels. They connect the ladder visually to nearby bronze door hardware
and service fittings. The continuous dark field, long carbon rails and alloy
rungs still carry the main composition. The new finish does not make the ladder
look striped or introduce a passive object that resembles a new control.

The [portrait transfer](after-transit-portrait.jpg) is the strongest usability
check: individual steps remain clear, with small warm accents at the supports.
At [portrait overview](after-overview-portrait.jpg) scale, some cap detail becomes
too small to distinguish separately. That is an acceptable limit for secondary
hardware; increasing its size or extending bronze across every rung would weaken
the requested restraint. The [reverse view](after-reverse-wide.jpg) confirms the
paired treatment and retained breathing room around the end grips and tools.

No implementation revision was requested. The initial recommendation favored
existing clamps and, if needed, terminal caps. The final twelve-part choice is
supported by the actual captures. Exterior access ladders remain a separate
scope, consistent with the current transfer-ladder conversation.

## Source, checks and documentation

The runtime diff changes only the `rail-split-clamp` and `rail-end-cap` material
arguments in `ladder-service-spine.ts`, plus a clarifying comment. Both reuse
`m.amber`, including its existing finish properties and palette/accent handling.
The [audit](structural-costs.json) finds exactly 12 changed material descriptors
among 429 authored parts; all raw geometry and local/world transforms match.
The other 417 parts, protected assemblies, bounds and framing/route metadata
remain unchanged. There is no new geometry or interaction to exercise.

I independently checked all 44 final runtime hashes, all eight JPEG hashes and
actual dimensions/encoding, source bindings, the two paired camera poses, the
audit's manifest hash and all five retained verification-log hashes. I read the
[verification record](verification-checks.json) and logs: **560/560 tests**, zero
failures/skips/cancellations, typecheck, build/geometry check, affected lint and
formatting pass on the final source. The isolated checkout used fresh test-only
state and explicit `TEST_BASE_URL`; cleanup is recorded complete. I did not
independently rerun the suite or operate a browser.

The README, current project context and ledger entry 58 describe the material
scope and preserve the preceding contrast correction. **The minor documentation
finding is resolved:** the README now says “counts and geometry-array byte
totals also match.” Material batching can regroup the affected vertices;
equal byte totals do not establish identical post-batch buffers. I verified this
correction and the ledger's more precise statement that fixture placement is
unchanged. These documentation edits require no new rendered evidence or suite.

Both layouts retain 70,180 spine triangle inputs, 17 mesh submission candidates
and 2,846,768 geometry-array bytes. Matched finite front calls remain 772 wide
and 598 compact. These are inventory/render-count observations, not evidence of
equal CPU/GPU time, process memory, temperature, power or battery consumption.

## Limits

Evidence uses hidden built-in Chromium 153 at actual 1440×900 and 390×844,
DPR 1, without image scaling. Finite fixtures omit GTAO, Earth/sky, navigation
and live applications. Both live orientations use the wide model with shadows;
portrait disables GTAO under the existing policy. Compact geometry is checked
separately, with partial far-rail occlusion in its front view. The keyboard
transfer trace reaches About with at most one open hatch per sample; it is not
continuous animation-frame coverage. Native Safari, a physical phone, a browser
reduced-motion override and rendering timing were not checked.
