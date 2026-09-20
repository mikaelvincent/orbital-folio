# Fixed Earth scene and compact coastal loop

Approved 20 September 2026. Baseline Git `4e215f2556fe17003df041c457bfedc7649347a6`.
Delivered runtime and asset commit: `319fdd0`.
This is an authorized visual/camera change, not evidence that unrelated held
performance-ledger candidates were implemented.

## Delivered result

Earth has one physical placement/orientation and spacecraft-world registration.
Responsive framing uses a 38° vertical landscape lens and 38° horizontal portrait
lens, capped at 78° vertical. Camera roll/travel naturally change the background;
there is no viewport-specific Earth placement. Different responsive spacecraft
poses still reveal different pixels. The same-eye mathematical invariant is a
consistent physical scene, not identical screenshots across all devices.

The protected Europe opening is retained at native 8K-source density. A shorter
**112.5° / 436.332 s** loop uses a native AI-authored coastal continuation. Normal
speed remains 0.0045 rad/s; the temporary playback controls remain available.
A fixed sphere scrolls U coordinates through one sampler. No runtime synthesis,
extra blend pass or second map is introduced. The geometric globe U boundary is
outside the audited view envelope, so changing camera limits requires a new audit.

| Asset property | Before | After |
| --- | ---: | ---: |
| Dimensions | 4096×3072 | 2560×1536 |
| Encoded bytes | 3,625,576 | 2,862,376 |
| Nominal RGBA8 full mip chain | 67,108,860 B (64 MiB) | 20,971,512 B (20 MiB) |
| Decoded RGBA8 base level | 50,331,648 B | 15,728,640 B |
| Loop period | 698.132 s | 436.332 s |
| Runtime Earth map samples | 1 | 1 |

Download decreases 21.05%; nominal mip storage decreases 68.75%. These are exact
asset/allocation calculations, not measured process/GPU memory or frame-time,
heat or battery gains. Driver overhead and other scene allocations are additional.
The loop period shortens 37.5% at unchanged apparent angular speed.

Final image SHA-256:
`19ac5ed0c9796d81a36c2619a67396e1630f36b9915e1bd716c0057b65bf3cf1`.
[Public manifest](../../../public/textures/earth-europe-loop.json) records full
input/output hashes and codec versions. Rebuild with
`node scripts/build-regional-earth.mjs` from the checked-in NASA JPEG and AI PNG.
No regeneration is required. Original Europe 1536×1536 decoded pixels are checked
byte-for-byte; the full assembled RGB buffer survives WebP encoding losslessly.
Coarser mips and fixed mesh sampling can still differ at subpixel level.

## Art process and attribution

**71.654% source pixels / 28.346% generated pixels**, measured by assembly
attribution. Generated geography is fictional; the NASA source attribution must
not imply NASA created or endorsed the composite. Native 1024×1536 AI input is
`scripts/assets/earth-europe-ai-bridge.png`.
[Final prompt](art/prompt-v3.txt) and [guide](art/bridge-guide-v3.png) preserve the
workflow. Minimum-error boundary cuts preserve original European/core/wrap pixels
without a blurred dissolve. Both inputs use source rows 384–1919; no padding
extrapolation or upscaling remains.

Rejected iterations: v1 produced 1173×1341 rather than requested native dimensions;
v2 used an earlier latitude window, with repeated bottom-edge padding that the
wider portrait lens's conservative envelope could reach. V3 regenerates at the
final window. Original prompts and small previews record these decisions. The
original 4096 collage remains in baseline Git history and its historical evidence.

## Coverage and visual evidence

[Coverage method](coverage-method.md) documents actual-triangle clipping across
**48,314** desktop/mobile-mesh poses in 17 viewport shapes. Exact visible source
rows 469–1479; guarded envelope 469.333–1805.333. Retained 384–1919 leaves 85.33/114.67
rows around it. This satisfies the chosen 64-row practical allowance. It is a
conditional bounded-domain result, not a universal optimal crop for arbitrary
browser dimensions. Width 112.5° exceeds the 87.1875° guarded span. Raw compressed
poses, source hashes and superseded narrow-lens summaries are retained beside it.

`captures/before-desktop-000.jpg` and `after-desktop-000.jpg` show matching openings;
`before-desktop-218.jpg` and `after-desktop-218.jpg` compare the continuation at the
same elapsed time. Candidate 109/218/327/436 s frames sample a complete loop.
These are actual 1280×720 hidden built-in Chromium viewport captures, DPR 2,
background-only lab renders with all environment effects and no spacecraft/AO.
Portrait lab captures are actual 390×844, using each version's delivered lens
but neutral shared camera pose, **not** production portrait roll.

`app-desktop.jpg` and `app-portrait.jpg` show actual production framing. The rejected
38° portrait lens cropped Earth out; `rejected-portrait-crop.jpg` preserves that
finding. The accepted wider lens restores a curved Earth limb and readable ship.
A critic-found identity overlap was fixed by using the same lens for annotation
unprojection. Application Contact/reading checks retain their normal room framing.

Art assessment: recommend **keep**. The opening remains recognizable and the
fictional midpoint provides a more varied lit coastline than the former broad
water view. Some phases still contain a large sea or sparsely lit terrain; this
is not a uniformly bright loop. Generated roads are somewhat more intricate than
real Europe. The repeat is shorter and may be noticed during extended viewing,
especially fast-forward. No visible wrap pop was found in the captured cycle.

## Measured performance

Hidden built-in Chromium 153 / ANGLE Metal / Apple M4, not native Safari. Desktop
viewport 1280×720 and drawing buffer 2560×1440 (DPR 2). Eight balanced blocks
**ABBA + BAAB**, 600 measured frames/block after 30 warmup frames, with 60 seconds
of blank recovery before each block. A=baseline, B=candidate. Normal-motion
replay advances Earth and sky at 1/60 s per frame from the same starting clock.
GPU queries sample every fifth frame. Source/assets were frozen at lab launch;
no builds, tests or other review renderers ran during timing. Unrelated user
applications and hardware clocks were not controlled.

[Desktop raw export](desktop-timing.json) includes 2,400 frames and 480 valid GPU
queries per version, complete preparation data and the frozen source/asset
manifest. No GPU query was discarded. This is background-only rendering,
excluding spacecraft, AO and application UI, not whole-application performance.

| Desktop observation | Before | After |
| --- | ---: | ---: |
| GPU block means, chronological within each version |4.718,4.077,2.003,2.003ms|3.902,4.089,2.055,1.928ms|
| Pooled GPU mean, descriptive only |3.201ms|2.993ms|
| Pooled CPU update + submission mean, descriptive only |0.374ms|0.338ms|
| Mean frame interval |16.667ms|16.666ms|
| Frame interval p95 |17.70ms|17.70ms|

**GPU ranking is inconclusive.** Repeated baseline/current GPU means span 85%/72%,
well beyond the predeclared 5% stability gate. The pooled 6.5% apparent saving is
not accepted as a gain. Neither a speedup nor a slowdown is established. Equal
observed pacing is not proof of equal GPU cost. Timings cannot diagnose thermal
throttling or establish equal temperature/clocks. Matched frames have identical
draw, triangle and point counts; counts alone do not prove equal speed.

Desktop local preparation observed 85.3→45.2ms image decode and 362.0→64.3ms to
first submitted ready frame. The baseline was prepared first; shared shader/
driver/browser caches and other startup work can favor the second version.
These are single, locally served observations, **not a cold-start improvement
claim**. First CPU submission is not actual presentation time. Full raw phases
remain in the export rather than combining CPU and GPU duration.

[Portrait raw export](portrait-timing.json): actual 390×844, drawing buffer
780×1688, DPR 2, BAAB with the same 600-frame/60-second protocol. There are 1,200
frames and 240 valid GPU queries per version, with no discarded queries.
Baseline uses 38° vertical FOV; candidate uses 73.384°, its delivered portrait
lens. Both use a neutral shared physical test pose. This includes a composition
change, not only a map-size change, and does not reproduce production portrait
roll, spacecraft camera position, occlusion or AO.

| Portrait observation | Before | After |
| --- | ---: | ---: |
| GPU block means | 1.624, 1.566 ms | 1.603, 1.667 ms |
| Pooled GPU mean | 1.595 ms | 1.635 ms |
| Pooled CPU update + submission mean | 0.295 ms | 0.336 ms |
| Mean frame interval | 16.665 ms | 16.665 ms |
| Frame interval p95 | 18.50 ms | 18.60 ms |

Portrait repeated GPU controls satisfy the 5% gate, but the apparent 2.5% increase
is smaller than their 3.59%/3.95% variation. **No reliable GPU regression or gain
is established.** CPU observations are also too small/variable to establish a
regression. The additional portrait probe is one balanced BAAB sequence, not an
independently repeated opposite-order confirmation. Both maps remain resident in
the lab, unlike production's single map; these timings cannot prove real-device
memory-pressure behavior. No full-application or Safari performance comparison
was performed.

## Verification

- Final full suite: **343 passed, 0 failed**. [Log](full-tests.log).
- Typecheck, affected lint, geometry prebuild check and production build passed.
  [Build log](build.log); [source-hashed runtime checks](runtime-verification.json).
  Vinext's existing route-classification notice remains informational.
- Three stale crop/latitude expectations failed during final asset assembly;
  they were corrected, targeted tests passed, then the complete suite passed.
  [Original rejected check](rejected-stale-expectations.log) is retained.
- [Browser checks](visual-checks.json) cover actual responsive framing, Contact
  application framing and playback including a normal-speed 7:16→0:00 crossing.
  No native Safari, physical memory, power or temperature measurement was made.
- Independent [critic review](critic-review.md): **94/100**, no unresolved
  blockers; recommendation **keep**.

**Recommendation: keep for the improved continuation, fixed scene and reduced
asset footprint.** The evidence does not support a frame-time speedup or claim
that whole-app performance is unchanged. Further performance-ledger candidates
remain held. The narrower repeat and more intricate fictional settlement patterns
are aesthetic tradeoffs; the protected opening retains original satellite detail.
