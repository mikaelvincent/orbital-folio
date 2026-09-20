# Stable Earth during portrait navigation — 20 September 2026

Baseline: `e238e60`. The owner rejected its visual reference-frame mismatch:
Earth counteracted the camera roll while the spacecraft and stars responded to
it. The old regression test deliberately asserted that mismatch. This correction
supersedes that motion policy and its earlier positive critic assessment.

## Delivered behavior

`setViewportComposition` chooses a portrait or landscape Earth anchor from the
viewport. Initial setup and reduced motion apply it immediately. A later
orientation change eases it with the normal active clock; same-orientation
observer notifications do not restart the transition. The original geography,
phase, speed, texture, atmosphere and canonical orbital registration remain.

`followCamera` now accepts only the physical camera and reference transform. It
cannot change Earth's placement. During room navigation both Earth and atmosphere
keep fixed world matrices while the camera rotates. Earth moves naturally out
toward the left during portrait room entry and back below-left on returning to
overview; it may be outside the frame in a room. The surrounding sky follows the
same physical camera. No mesh-trimming or texture optimization was implemented.

## Visual evidence

Hidden built-in Chromium, live production application, not a paused fixture:

- [Phone overview](phone-overview.jpg), actual 390×844.
- [Outbound sequence](outbound/): frame 00 before Contact selection, then 22 actual
  sequential captures over about 10 seconds. [Timing](outbound/timing.json).
- [Return sequence](return/): frame 00 before selecting Overview, followed by 22
  captures through the full return. [Timing](return/timing.json).
- [Tablet overview](tablet-overview.jpg), actual 768×1024, and
  [landscape overview](landscape-overview.jpg), actual 1280×720.
- [Direct About URL arrival](portrait-about-direct.jpg), actual 390×844:
  initialized in portrait overview and completed entry. The initialization test
  also asserts the portrait anchor is applied before the flight.
- The [extreme resize recording](resize-wide/)
  used viewport-only screenshots that were clipped/scaled by the capture surface
  (576×768 for its first frame, then 1849×768), despite the DOM and canvas being
  4096×768. Those frames show no edge defect in the captured portion, but are
  partial evidence, not whole-frame proof. A subsequent full-page capture produced
  duplicated fixed-canvas/UI strips and was **rejected**. One
  [representative artifact](rejected-full-page.jpg) and the
  [failed-capture manifest](rejected-captures.json) are retained. A correct complete
  ultrawide visual recording remains unavailable; do not infer it from image size.

Capture timings include screenshot/automation overhead and are not frame-time
measurements. Ordinary texture motion continued, so these are movement/composition
checks rather than matching-phase pixel diffs. Native Safari was not tested.
Captured browser warning/error entries were empty. Temporary tab and viewport
override were cleaned up; the existing localhost:3000 server remains available.

## Verification

- **345 tests passed, 0 failed**: [full suite](tests.log).
- [Typecheck](typecheck.log), [affected lint](lint.log) and [production build](build.log)
  passed. Build retains its informational Vinext route-analysis and chunk notices.
- [Independent critic](critic-review.md): **93/100**, recommendation keep, no
  unresolved implementation blockers. The reviewer examined the sequential
  movement evidence and retained the crop/capture limitations below.
- The replacement regression checks fixed Earth/atmosphere matrices, moving
  projections through both roll directions, matching physical camera transforms,
  round-trip restoration, texture/resource preservation, independent orientation
  easing, initial portrait placement and reduced-motion behavior.
- [Coverage method and results](coverage-method.md) distinguish ordinary
  navigation, exact resize samples and conservative stress neighborhoods. Some
  deliberately enlarged ultrawide resize neighborhoods exceed the retained crop;
  that stronger certificate is not claimed. The targeted real-frustum follow-up
  and rendered checks are separate finite evidence, not a universal guarantee.

## Cost assessment — recommendation only

The surface and atmosphere share one sphere geometry. An installed-Three audit
finds 12,513 vertices / 24,320 triangles / 546,336 attribute + index bytes on desktop;
compact is 6,305 / 12,096 / 274,336 bytes. Two draws submit the sphere twice, sharing
approximately 0.52/0.26 MiB of array storage. The unchanged map uses approximately
20 MiB nominal RGBA8 storage including mips; neither value is measured GPU-process
memory. No new timing or battery/temperature claim is made.

Back faces are culled and offscreen portions clipped before rasterization;
invisible geometry can still cost vertex/primitive work. The whole texture is
not shaded every frame: visible fragments sample it. See
[Three.js material-side documentation](https://threejs.org/docs/pages/Material.html),
[Khronos face culling](https://wikis.khronos.org/opengl/Face_Culling) and
[OpenGL ES pipeline specification](https://registry.khronos.org/OpenGL/specs/es/2.0/es_full_spec_2.0.pdf).

A partial sphere could save geometry work but needs the same regional texture
if it shows the same geography through the loop and camera range. The asset is
already a 2560×1536 regional crop, repeated around the sphere. Further texture
savings require proving image content is dispensable, reducing detail, or
changing the authored loop. A flat or bent plane does not itself establish that
proof; an approximate billboard can change curvature/parallax, while analytic
ray-sphere shading trades vertices for per-pixel work.

**Recommendation:** keep the sphere; a small future exact partial-mesh A/B is
reasonable but low priority, without a promised gain or automatic texture saving.
Do not further shrink the texture based on current bounded coverage alone.
Potential pixel costs worth separately profiling include Earth hidden behind the
spacecraft (background renders first before depth is cleared) and atmosphere-shell
fragments whose computed glow is nearly zero. Those are held ideas, not changes
or measured savings. Previous background timings do not isolate sphere vertex work.
