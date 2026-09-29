# Reuse local geometry bounds during interaction

This extends candidate **10** and the shadow preparation discussed in **8**.
Retain the focused cache: the authored model repeatedly scanned unchanged vertex
buffers during interactions. Local bounds can survive rigid motion while their
world placement, receiver-ray volumes and projected influence regions still update.
The shadow-map invalidation policy, lighting, appearance and motion are unchanged.

## Scope and cost

The baseline is `6a680225bdfc63c945b23c1d11a29ce44948cbab`. Only the shadow and
dish-influence bounds consumers differ in the comparison; both variants use the
current model and npm lockfile. The measured wide model has 565 meshes, 529 distinct
geometries, 1,302,541 vertex positions and 33 instance groups. Canvas-dependent
textures and keyboard legends are absent in this Node fixture.

The cache follows Three's position/instance buffer update contract, independently
of the model revision that also covers transforms and visibility. Shared geometry
changes invalidate dependent instance boxes even when another consumer refreshed
the geometry first. World bounds always use current matrices, including hidden
receivers. Interleaved, morph and skinned inputs retain native recomputation paths.
The detailed invalidation contract lives in
[local-bounds.ts](../../../../features/spacecraft/local-bounds.ts).

Storage is two weak maps with one small record per ordinary geometry/instance:
529 geometry records with seven fields and 33 instance records with six fields
for this model. Native Box3 objects are reused; no vertex arrays or GPU resources
are copied. This is an inventory bound, not measured process memory. Cold use
still scans each geometry once; subsequent shadow and influence preparation share
the result. Dynamic buffers replace only their affected metadata records.

## Method and results

[The runner](../../../../scripts/benchmark-local-bounds.mjs) measures CPU kernels
in Node, not browser frames. Doors, notebook turns, keyboard presses and dish-only
motion replay 120 matched steps at 1/60 simulation seconds. The timed total includes
model update, world-matrix synchronization, shadow controller and consuming dirty
flags. The nested bounds metric times the shadow controller. Influence preparation
is a separate repeated operation at varying settled camera poses: the production
pixel cache falls back during transitions and prepares after settling, so these
costs must not be charged to every navigation frame.

The declared order is two A controls, then **ABBA, BAAB**, for each workload.
Each sample has 120 operations; both variants warm up for 120 steps per workload.
There is a 30-second initial nonrendering rest, one second between samples and
ten seconds after controls and between blocks. GC and state reset occur outside
timing. The run has a ten-minute timing budget and no retries. Counts and exactness
checks are separate untimed passes. Counters and timings use **wide layout**;
correctness covers wide and compact models.

[Raw results](timing.json.gz) retain all 50 captures (10 controls and 40 comparison
captures), individual operation times, nearest-rank p95s, counters, source/lockfile
hashes and telemetry. None was excluded or retried. Node 26.0.0 ran on Apple M4,
macOS 27.0.1, AC power at 80%, not charging, Low Power Mode off. All sampled OS
pressure readings were nominal. The timed schedule, including rests, lasted
206 seconds. User applications and actual CPU clocks were not controlled.

The following means average the four scheduled samples per variant, excluding
controls. Each block's effect compares its two A and two B means; reference spread
uses all six chronological A means and their median as denominator.

| CPU operation                             | A mean (ms) | B mean (ms) | Block effect ranges     | A reference spread |
| ----------------------------------------- | ----------: | ----------: | ----------------------- | -----------------: |
| Door shadow preparation / model step      |       6.151 |       0.297 | −95.13% to −95.21%      |              1.18% |
| Notebook shadow preparation / model step  |       1.150 |       0.069 | −94.02% to −94.03%      |              1.04% |
| Keyboard shadow preparation / model step  |       4.110 |       0.222 | −94.54% to −94.66%      |              1.85% |
| Dish-only shadow preparation / model step |     0.00118 |     0.00186 | +0.00053 to +0.00082 ms |              8.86% |
| Settled influence preparation / operation |       6.083 |       0.250 | −95.80% to −95.97%      |              0.70% |

The complete model/matrix/shadow replay means were 6.306→0.467 ms for doors,
1.272→0.234 ms for notebook turns, and 4.228→0.365 ms for keyboard motion. The
120-step windows include 120, 22 and 80 receiver revisions respectively; notebook
and keyboard means include their unchanged steps. Door controller p95 ranged
6.362–6.441 ms in A and 0.423–0.513 ms in B. Other per-capture p95s remain in the
raw report. Node operations do not measure display pacing or GPU work.

Dish-only total replay means increased 0.133→0.177 ms and 0.126→0.149 ms in the
two orders. Its total A-reference spread was 8.56%, exceeding the 5% warning
threshold. The controller itself added only 0.00053–0.00082 ms; most of the total
difference was outside the changed code. Retain despite this small absolute
regression, without assuming its cause or an equivalent browser-frame effect.
No stationary speedup is claimed. The active effects were large, consistent and
well beyond their reference variation. No GPU, FPS, energy or battery claim follows.

Untimed counts explain the active savings. Door geometry scans fell 63,480→120
(156,304,920→92,640 visited vertex positions): only the changing hidden iris mask
is rescanned. Notebook scans fell 11,638→0. Keyboard geometry scans fell 42,320→0
and instance scans 2,640→80, retaining the edited cap group's full instance union.
Repeated influence preparation fell 63,840→0 geometry and 3,960→0 instance scans.
Dish-only scans remain zero in both variants.

First combined shadow/influence preparation on fresh models was observed once per
layout/variant: compact A/B 14.415/8.983 ms, wide 12.475/6.697 ms. These unconditioned
single observations describe preparation cost, not a qualified startup speedup.
Sharing the local records avoids the second vertex scan, while initial creation
remains proportional to geometry size. Physical heap, browser callback time and
other devices remain unmeasured. The modest metadata and explicit invalidation
contract are justified by the repeated work removed; broader shadow invalidation
changes were unnecessary.

## Correctness and limits

Both layouts compare every frame's requested lights and five poses per workload
before and after influence preparation: all local/world boxes and live-receiver
membership must match the baseline exactly. Comparing before preparation prevents
the second consumer from concealing a stale shadow bound. Unit tests additionally
cover in-place edits, replacement buffers/geometry, shared instances, count changes,
cleared boxes, hidden transforms, dish-only vertex edits, morph/interleaved/skinned
fallbacks, omitted dish history, reduced-motion snaps and layout changes. The
authored door/page/key tests assert that only edited buffers are rescanned.

Verification passed 652 isolated full-suite tests, typecheck, production build,
affected-file lint and 56 benchmark tests. The disposable source checkout used
fresh test-only secrets and D1/R2 state with `TEST_BASE_URL=http://localhost:3023`;
the owner's server and store were preserved. Hidden Chromium 154 visual checks
covered the 1280×720 overview/About room, paired doors at 900×1200, and Contact at
390×844, with no observed console errors or visual regression. These were smoke
checks, not a pixel-difference experiment; Safari and physical phones were untested.
Independent source and measurement review found no remaining actionable issue.

## Reproduce

In a disposable source checkout with npm dependencies, extract the baseline's
`features/spacecraft/shadow-updates.ts` and `dish-influence-cache.ts` into a temporary
directory as `shadow-updates-baseline.ts` and `dish-influence-cache-baseline.ts`.
These baseline modules are self-contained apart from erased Three type imports.
Run:

```sh
node --expose-gc scripts/benchmark-local-bounds.mjs \
  --baseline-dir=/absolute/baseline-directory --out=/tmp/local-bounds.json
```

Use `--verify-only` for counts and exactness without timing. Optionally compile
the repository's `mac-thermal-snapshot.swift` before recovery and pass its binary
as `--telemetry=/absolute/binary`. Known serious/critical pressure stops the run;
missing telemetry stays unknown. Follow the
[evidence-based decision guidance](../../../performance-diagnostics.md#decide-with-the-available-evidence).
