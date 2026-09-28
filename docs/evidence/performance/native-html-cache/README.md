# Reuse stationary notebook masks and native projections

Retain both changes. The notebook previously invalidated its entire opaque
visibility mask whenever the dish moved. Native reader controls, CSS projections
and overview leaders also repeated work with unchanged inputs. Separate polygon
unions now reuse stationary blockers while the dish remains a live occluder.
Whole HTML updates depend on camera/projection, viewport, non-dish geometry,
interaction, notebook state and explicit collection changes. Annotation opacity
advances independently of settled projection geometry, preserving the original
fade curve, including its asymptotic tail.

These caches retain CPU values and polygon strings, without new GPU targets or
changes to lights, resolution, animation cadence, text rendering or shadows.
Door movement, page turns, live content edits, navigation and resizing still
refresh their affected results. The existing geometry revision contract and
fixed scene inventory remain required.

## Bounded desktop comparison

The [raw report](timing-1790638138386.json.gz) contains two A controls followed by
ABBA and BAAB. A uses the previous notebook implementation and forces HTML and
annotation projections each frame; B uses the delivered caches. Both run in the
same warmed runtime with the existing spacecraft pixel cache enabled. The
[source archive](source.json.gz) records source hashes, baseline commit and exact
standalone harness, including its comparison-only build substitutions. It is
developer verification code, never imported by the application.

- Actual portfolio runtime, production React bundle and public seed data in the
  hidden Chromium 154 browser; ANGLE Metal, Apple M4. Overview, 1280×720 CSS and
  drawing buffer, effective DPR 1, Low 512 shadows, softness 4, lighting 100%,
  automatic contact shading and pixel density. These are this test's settings.
- One 30-second initial rest, 120 warm frames and 600 captured frames per sample,
  using actual RAF and the same ten simulated seconds of dish movement. Earth
  and background time held at zero. One-second gaps, five seconds after the
  controls and ten seconds between orders; no retries or excluded captures.
- Tests/builds completed and the isolated app server stopped before timing.
  Other user applications, power, thermal state and clocks were uncontrolled.
  Both mask implementations remained resident. Construction/startup is untimed.

| Order | HTML-related CPU phases, A → B | Whole render callback, A → B |
| --- | --- | --- |
| ABBA | 1.387 → 0.028 ms | 4.337 → 3.351 ms (22.7% lower) |
| BAAB | 1.460 → 0.031 ms | 4.492 → 3.863 ms (14.0% lower) |

HTML phases are `annotations`, `html-sync` and `css-render`, including notebook
occlusion. They measure callback work, not the browser's complete layout and
compositing pipeline. Initial A controls were 4.404 and 4.338 ms, but the first
block's A references varied from 4.009 to 4.666 ms. Retain that variation: the
large, consistent removal of HTML work supports the decision, while the exact
whole-frame percentage is not stable or transferable to other views/devices.
Frame intervals remained about 16.667 ms; this run establishes no FPS gain.
Sampled GPU results are retained but make no GPU, energy or temperature claim.

## Correctness and interaction checks

The [desktop](verify-1790637730422.json.gz),
[portrait](verify-1790637830455.json.gz) and
[phone](verify-1790637905088.json.gz) reports cover 1280×720, 900×1200 and 390×844.
Each compared six dish poses in all five views: 90 matched states total. Checks
compare projection styles, visibility, interaction/accessibility attributes and
SVG mask polygons. Mask IDs and the order of same-winding union polygons are
normalized; animation time is held for each comparison pair. These are exact
DOM/geometry comparisons, not screenshots or timing cohorts.

All three sizes also passed a live same-count Systems → Interfaces collection
edit and an animated notebook page turn. Notebook screenshots were inspected;
no browser console errors or warnings were recorded. Pure regression tests
verify moving blockers entering/leaving the mask against rays, no repeated
stationary vertex projection, visibility/geometry/camera/paper/marker changes,
mutable matrix snapshots and ongoing fades without repeated label projections.

Final checks: 627 tests in a disposable checkout with isolated D1/R2 state,
typecheck, production build, affected lint and formatting passed. Independent
review found a missing content trigger; explicit invalidation in the three
collection callbacks fixes it and the live browser edit covers that regression.
