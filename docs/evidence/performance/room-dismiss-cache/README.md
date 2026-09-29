# Reuse detailed room-dismiss picks during dish motion

Retain this focused extension of candidate **10**. The detailed wall-dismiss cache
used the whole model's geometry revision, so the dish invalidated it even though
none of the four pickers considers that subtree. Subtracting the existing,
independently counted dish revision removes repeated work without introducing a
per-room mutation graph. All other geometry changes still invalidate conservatively.

## Boundary and correctness

The target sets contain marked pressure walls and non-proxy furnishings under
the Contact console, Projects workshop, Case studies archive and About study.
The wide fixture has respectively **4/36, 2/66, 2/48 and 2/83 walls/blockers**.
The dish is disjoint from every set. Actual-model tests verify unchanged target
matrices, geometry and visibility through its cycle, and compare cached hits and
misses with fresh raycasts. Keyboard instances, notebook leaves, final animation
snaps, screen visibility, cartridge rearrangement and layout changes retain their
geometry invalidations, including when relevant motion coincides with the dish.

Each picker owns one cached intersection or miss, exact ray, clipping range,
layer mask and revision. Rebuilding the target sets creates new pickers; navigation
clears existing records. Direct content updates clear the affected picker.
Notebook content changes also publish world matrices first because pointer
feedback precedes the next model update. Tests cover this otherwise unrevisioned
setter, parent/material visibility, buffer and instance edits, camera/projection
changes, room ownership and unversioned calls. The raw nearest-hit algorithm is
unchanged. There are at most four small cache records, with no geometry copies or
GPU resources; physical memory and startup time were not measured.

Live DOM hit testing remains outside this cache. Tool menus, overlays and native
controls are reconsidered every frame; a stationary pointer still receives a new
ray as the camera changes. This is a geometry-query cache, not cached UI feedback.

## Comparison

The baseline is `9a683e9ba4c9d21be987d289bca0eee3efddcab7`. A uses its raw picker
and original runtime cache; B uses the picker-owned cache and dish exclusion.
Both use the same current model and npm dependencies. [Raw results](timing.json.gz)
include source/lockfile hashes, all **56 samples**, cycle counts, checksums,
per-sample means and cycle-mean p95s, reference variation and telemetry. No sample
was excluded or retried. The report retains the exact measured runner source;
[the runnable copy](compare.mjs) has only formatting and const-binding lint fixes.

The workload replays an actual **1,080-step revision trace** from a full 18-second
dish cycle at 60 Hz. Model updates and target preparation occur outside timing;
the relevant walls and furnishings remain fixed. Each timed replay begins with
an invalid cache and includes all 1,080 checks. Cases cover exposed walls in all
four rooms, a Contact blocker and sky miss, and a Contact ray alternating position
every step. Canvas-dependent textures and keyboard legends are absent in Node.

Each case runs **ABBA, BAAB**, with 100 ms warmup and at least 200 ms of complete
cycles per sample. There is a 30-second initial nonrendering rest, one second
between samples and five seconds between blocks. Builds and tests finished and
the review tab closed before timing. Node 26.0.0 ran on Apple M4, macOS 27.0.1,
AC power at 80%, not charging, Low Power Mode off. Pressure was fair before
recovery and nominal at all 14 block snapshots and the final observation. User
applications and actual CPU clocks were not controlled.

Means below average four samples per variant. Effects compare the two A and two
B means within each block. Reference spread is `(max - min) / median` over its
four A means, not a confidence interval.

| Picking workload     | A mean/check (ms) | B mean/check (ms) | Block effect range     | A spread |
| -------------------- | ----------------: | ----------------: | ---------------------- | -------: |
| Contact wall         |          0.086648 |          0.000164 | -99.81% in both orders |    4.63% |
| Contact blocker      |          0.086569 |          0.000164 | -99.81% in both orders |    2.25% |
| Contact sky          |          0.000097 |          0.000012 | -87.25% to -87.19%     |    3.22% |
| Contact changing ray |          0.160409 |          0.160112 | -0.84% to +0.47%       |    0.94% |
| Projects wall        |          0.509534 |          0.000889 | -99.83% to -99.82%     |    3.15% |
| Case studies wall    |          0.235589 |          0.000417 | -99.82% in both orders |    1.49% |
| About wall           |          0.086917 |          0.000165 | -99.81% in both orders |    0.93% |

Stationary cases perform **571 -> 1 detailed picks** per cycle, including misses;
changing rays remain **1,080 -> 1,080**. Cold work is included once per replay.
Projects cycle-mean p95s range 0.5010-0.5171 ms/check in A and
0.000924-0.000952 ms/check in B. These are percentiles of whole-cycle mean costs,
not individual pick latency or browser frame pacing; other values remain in the
raw report. The changing-ray control has opposing small effects within reference
variation, so it establishes no speedup or consistent slowdown. Moving blockers
were checked for correctness, not separately timed.

The stationary savings are large relative to variation and require little extra
invalidation machinery. Sky already costs very little. This supports retaining
the narrow exclusion without claiming a browser callback, FPS, GPU, thermal,
energy or battery improvement. Other devices and engines remain unmeasured;
these results have a separate baseline from the other candidate **10** comparisons
and must not be added to them.

## Verification and reproduction

Verification passed **660 isolated full-suite tests**, a final 32-test focused
run, typecheck, production build and affected source/test lint. Fresh test-only
secrets and D1/R2 state used `TEST_BASE_URL=http://localhost:3019`. The owner's
main server and store were preserved. Independent review caught the notebook
matrix ordering and early-initialization optional guards; both were fixed.

Hidden built-in Chromium checks at 1280x720 and 900x1200 covered Contact keyboard
blocking, native form typing/focus, Tools and Escape, exposed Contact/About wall
dismissal, a notebook page turn, Projects Escape and production Case studies'
native close button. One settled Contact observation reused the result through
981 rendered frames without another detailed pick. That observation is unpaired
and supports cache behavior, not browser timing. Safari and physical touch devices
were not tested; existing automated input coverage passed.

For reproduction, follow [isolated verification](../../../OPERATIONS.md#isolated-verification).
Export the baseline's `features/spacecraft/navigation/contact-room-dismiss.ts`
as `.room-dismiss-reference.ts` in the disposable checkout root. Copy `compare.mjs`
there as `.room-dismiss-benchmark.mjs` so its relative imports resolve, then run:

```sh
node .room-dismiss-benchmark.mjs --counts-only
swiftc -O scripts/benchmarks/mac-thermal-snapshot.swift -o /tmp/orbital-picking-thermal
node .room-dismiss-benchmark.mjs
```

The measured runner writes `/tmp/orbital-room-picking-results.json`; preserve any
prior report before running. It stops at known serious/critical pressure and has
no retries. Collect before/after power observations outside timing with the
thermal helper's `--pmset --settings` options. The retained runner intentionally
reproduces this bounded Node comparison, not the full browser benchmark workflow.
