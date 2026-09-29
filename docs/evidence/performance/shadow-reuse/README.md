# Shadow-map reuse through non-caster animation

This extends candidate **8**, alongside candidate **10**'s stationary pixel cache.
The change preserves the authored lighting, continuous dish motion, iris masks,
keyboard travel, notebook turns, AO policy and quality/fallback settings.

## Validity and cost

The former controller refreshed all seven maps for every non-dish geometry revision.
The assembled model confirms that iris leaves, keyboard caps and moving notebook
paper/markers do not cast PCF shadows. Iris leaves and caps receive shadows; model
batching also makes some notebook parts receivers. Constructor flags alone would
have missed the latter.

The model now records these verified non-caster changes separately. The general
geometry revision still invalidates AO, HTML and stationary pixels. Unknown edits
(including rack/cartridge changes), layout changes and explicit invalidation still
refresh the full rig. VSM includes receivers in its shadow pass, so non-PCF paths
keep the original conservative policy. Immediate notebook chapter changes now
also advance the geometry revision when they move the paper markers.

Receiver movement cannot simply be ignored: lamps deliberately retain old dish
poses when the dish cannot affect their receivers. A moving receiver might then
expose that old shadow. Rebuild the padded receiver-ray volumes and intersect them
with one accumulated dish-motion AABB since the last full refresh. It includes
old and new poses, not only the latest two. An empty history means no dish motion
has been omitted since the full refresh. The box can over-refresh a lamp after
receivers move, but its storage is constant. Dirty flags remain pending until
Three consumes them. The sun's complete map needs only caster changes.

This comparison added one model revision, two controller revision comparisons and
one Box3, without GPU targets, meshes, textures or dependencies. It retained
whole-model bounding-box reconstruction on geometry changes; the current
[local bounds cache](../local-bounds/README.md) measures that separate opportunity
against a later baseline. The stationary cache still observes non-dish geometry revisions,
rebuilds its influence/pixel/AO caches, and requires a full unmasked draw whenever
an interior map is dirty. No stationary-cache or dish-influence implementation
changes were needed.

## Comparison method

Baseline source: `052db4f983ba6074ec62070372d245e3e9a5216d`.
The retained replay fixture uses the repository's frozen production React lab,
actual runtime, public seed content and one hidden built-in Chromium 154 tab on
Apple M4 / ANGLE Metal. It is not a deployed Vinext performance claim. Tests used
a separate disposable source checkout with freshly generated secrets, D1/R2 state
and explicit `TEST_BASE_URL=http://localhost:3003`. No private environment, database
or uploads were copied. Tests and build finished before timing.

Desktop: 1280×720 CSS, native/effective DPR 2, 2560×1440 drawing buffer, 512-square
maps at 4× softness, all brightness multipliers 100%, normal AO and stationary
cache enabled. Earth/sky time is held at zero; the dish and selected interaction
advance at the same fixed simulation steps in A and B. Doors replay in About,
notebook pages in About, keys in Contact, and stationary scanning in Projects.
The interaction replay drives the real model APIs; it does not measure form entry
or native notebook text work. A uses the original shadow controller, B the candidate.
Both use the revised model, so timings include classification work in both variants;
the new model bookkeeping consists of constant-time counters, not an inventory scan.

Predeclared schedule: two A controls, then **ABBA, BAAB**, with 30 seconds of initial
nonrendering rest, 1 second between captures and 10 seconds between blocks; no
retries and a ten-minute budget per workload. Active captures contain 360 frames
(six simulation seconds); stationary captures contain a complete 1,080-frame,
18-second dish cycle. Controls are 360 frames. Eighty fixed-pose warmup frames and
camera settling precede captures. The reports retain wall durations, raw frame
records, query coverage, source/asset hashes, quality, camera and power/OS thermal
observations. CPU means cover the complete callback, including model updates and
shadow-controller/bounds bookkeeping. Whole-frame GPU queries are sampled every
15th frame and are not integrated GPU or energy measurements.

## Results and decision

Retain the focused implementation. It consistently removes substantial depth-map
work in all three affected interactions, preserves the tested pixels, and adds
constant-sized state without increasing stationary submissions. Timing drift limits
the magnitude of the speed claim; the decision also rests on actual removed work,
regression coverage and the narrow invalidation contract.

| Workload / order  | CPU callback mean A → B (ms) | Sampled whole-frame GPU A → B (ms) | Maps generated A → B |
| ----------------- | ---------------------------- | ---------------------------------- | -------------------- |
| doors / ABBA      | 9.473 → 8.785                | 12.576 → 11.065                    | 1779 → 284           |
| doors / BAAB      | 12.091 → 11.932              | 15.236 → 13.068                    | 1779 → 284           |
| keyboard / ABBA   | 6.112 → 5.982                | 9.588 → 8.189                      | 977 → 284            |
| keyboard / BAAB   | 6.204 → 5.907                | 9.151 → 8.924                      | 977 → 284            |
| notebook / ABBA   | 16.976 → 13.383              | 42.154 → 26.596                    | 1231 → 284           |
| notebook / BAAB   | 25.502 → 21.869              | 63.173 → 42.326                    | 1231 → 284           |
| stationary / ABBA | 3.660 → 3.363                | 8.423 → 8.484                      | 569 → 569            |
| stationary / BAAB | 2.968 → 2.854                | 8.420 → 8.533                      | 569 → 569            |

Map counts are per matched capture, not per frame. Interaction spacecraft draws
fell by 53–61%; shadow generation fell by 71–84%. Receiver-bound reconstruction
still costs CPU: for example, the door ABBA `matrices` phase was 5.350 → 5.339 ms.
Model-update and matrices phases remain in the raw reports; saved shadow work is
not presented as eliminating that bookkeeping. Stationary captures retain exactly
569 generated maps, 111.56 mean spacecraft draws, 1,078 cache hits, one capture and
one fallback per 1,080 frames in both variants.

All active captures resolved 24 whole-frame GPU samples; full stationary cycles
resolved 72. Queries sample the same relative frames (0, 15, …) in both variants.
There were no pending, discarded or skipped queries, no GL errors and no hidden
frames. Sparse queries do not represent every occasional rebuild, so CPU/counts
and cache statistics are retained separately. Nearest-rank p95, frame intervals,
wall durations and controls are in [summary.json](summary.json).

These are variable observations, not a stable percentage guarantee. Chronological
A-reference spread was CPU/GPU **38.3%/21.8%** for doors, **92.4%/64.0%** for
notebook turns, **5.3%/13.0%** for keys, and **25.0%/2.5%** for complete stationary
cycles. Stationary 360-frame readiness controls cover a different phase window
and are not pooled with full-cycle references. CPU and GPU means were lower in
both interaction orders, but several effects are smaller than the reference
variation. Stationary GPU means rose **0.7–1.3%**, within the observed reference
spread; the CPU decrease has no removed-work explanation and is not claimed as a
stationary improvement. Runs remained on AC power, charging, Low Power Mode off;
OS pressure ranged nominal/fair for interactions and nominal for stationary work.
No serious/critical observation occurred. User-app load and clocks were not
controlled. There is no cross-device, FPS, power, thermal or battery-life claim.

Raw captures, including source/asset identities and OS observations:

- [doors](shadow-reuse-doors-timing-1790671005868.json.gz)
- [keyboard](shadow-reuse-keyboard-timing-1790671399536.json.gz)
- [notebook](shadow-reuse-notebook-timing-1790671224494.json.gz)
- [stationary](shadow-reuse-stationary-timing-1790671663536.json.gz)

## Correctness, verification and limitations

[Verification records](verification.json.gz) cover six animation poses, A and B,
and stationary caching off/on for desktop doors (1280×720), desktop notebook
turns (1280×720), portrait doors (900×1200) and phone keys (390×844). All 48
comparisons to freshly rendered maps with pixel caching disabled had zero changed
pixels. The later three workloads also compare A/B buffers directly: all 36 B
frames, including cached frames, were pixel-identical to A. The initial desktop
door run predates that extra direct A/B check; its fresh-reference results match
in both variants. Phone cache eligibility was false and its AO-free path matched
fresh rendering in every comparison. All GL error checks returned zero.

With the stationary cache enabled, settled desktop/portrait frames retain its
existing differences from a complete fresh render (up to 47,775 changed pixels
and 144 maximum channel difference across these views); these are identical in
A and B. Moving frames use the normal reconstruction path. This change does not
claim to repair the stationary cache's existing coverage differences. Visual
inspection included the About cabin's paired doors, notebook/contact shading and
the phone Contact console. Browser checks used hidden Chromium, not native Safari
or an actual phone. Comparison records preserve numerical results, scene state,
source identities and original PNG hashes; repetitive full-resolution PNG pairs
are omitted from Git and can be regenerated.

Validation: **645 full tests**, typecheck, production build and affected-file lint
passed. **56 benchmark tests** also passed. Unit regressions cover an older omitted
dish pose becoming relevant, hidden receivers, vertex/instance bounds, simultaneous
caster changes, pending dirty requests and VSM fallback. Actual assembled wide and
compact ships verify non-caster inputs, receiver flags, AO revisions, immediate
changes/final snaps and full layout invalidation. Existing regional shadow/AO and
stationary-cache regression tests pass unchanged. An independent read-only review
found no actionable correctness issue.

## Reproduce

Use a disposable source checkout of this change, with the installed npm dependencies,
per [isolated verification](../../../OPERATIONS.md#isolated-verification). Do not
copy private environment files or stores. The frozen lab has no persistence/write
APIs. Preserve the baseline and candidate controller beside the normal entry point,
then apply the [comparison fixture](replay-fixture.patch.gz) **only in that checkout**:

```sh
cp features/spacecraft/shadow-updates.ts features/spacecraft/shadow-updates.candidate.ts
git show 052db4f983ba6074ec62070372d245e3e9a5216d:features/spacecraft/shadow-updates.ts > features/spacecraft/shadow-updates.baseline.ts
gzip -dc docs/evidence/performance/shadow-reuse/replay-fixture.patch.gz | git apply
swiftc -O scripts/benchmarks/mac-thermal-snapshot.swift -o /tmp/orbital-shadow-thermal
node scripts/benchmarks/camera-invalidation-lab.mjs --port 3019 --experiment receivers --thermal-sampler /tmp/orbital-shadow-thermal
```

Open the lab in the hidden built-in browser, set the viewport, choose **Workload**
and use **Compare current workload** or **Verify current workload**. Leave rendering
quality at defaults. The fixture intentionally uses the existing receivers server
and stores its reports under that temporary evidence directory. `/status` reports
completion. Preserve results before removing the disposable checkout. Timing and
verification share one fixture; the old controller is never bundled into the site.
Follow [the decision/measurement guide](../../../performance-diagnostics.md),
including stopping for serious/critical OS thermal pressure. The recorded bounded
runs encountered neither; fair pressure and reference drift remain warnings.
