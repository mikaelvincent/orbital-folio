# Stationary cache validation

Retain a small representation change: compare mesh world matrices against retained
matrices and remove temporary signature arrays. Do not replace the validator with
a model revision. This extends candidate **10**, with a separate CPU-only baseline;
its gain must not be added to earlier pixel, bounds, shadow or HTML comparisons.

Baseline: `5e3be54ed242f066efb784d64168018b54fdddcd`. The
[raw CPU report](cpu-comparison.json.gz) hashes both original cache modules, the
candidate modules, model, lockfile and runner. The browser reports contain the
frozen source/asset manifests. Production shaders, cache admission, AO/shadow
policies and rendering quality are unchanged.

## Mutation audit and design

`changed()` has one production caller: the renderer wrapper, after camera,
quality, transition and unsupported-state gates and drawing-buffer resizing.
Runtime model updates and `updateRenderSceneMatrices` run before its consumers.
The model's geometry revision covers authored geometry/visibility changes; its
independent dish revision identifies the rigid root sweep. Neither is a complete
visual revision. Three's matrix-dirty flag is consumed during synchronization;
material versions describe recompilation, not every color or map edit.

| Input | Checks retained and reason |
| --- | --- |
| Scene/camera/renderer | Parent and child-count guards, visibility/layers, camera/projection and drawing size, exposure, environment identity/version/intensity/rotation, shadow settings and eligibility gates. Unknown topology or material eligibility changes keep full rendering. |
| Lights | Color/intensity stay in the color-only signature. Geometry, world/target matrices, shadow camera projection, filter/bias/map dimensions and emitter footprint remain live checks. |
| Materials/textures | Every original material field and texture slot remains polled, including version, identity and UV transforms. Notebook maps swap directly; About images repaint asynchronously with `texture.needsUpdate` and a wake callback. Those changes cannot be inferred from the geometry revision. |
| Geometry/instances | Geometry/index identities, versions/counts, draw ranges, instance versions/count and current attributes remain checked. Buffer edits signal `needsUpdate`, while replacement/addition/removal requires reading current membership. |
| Transforms/dish | World matrices still compare every element, independent of revisions or matrix identity. The dish root's rotation alone is exempt under the existing full-sweep contract; its position/scale, parent world matrix and descendants' local matrices remain checked. |
| Live content | Existing live meshes, ambient material animation, notebook readiness and runtime `kick()` invalidation remain intact. Color/emissive/light-intensity edits recapture color; simultaneous geometry changes still require full AO and influence preparation. Shadow-map control remains with the existing per-light controller. |

The Node-authored model contains 511 candidate meshes and 495 distinct candidate
geometries: geometry deduplication offers little here. Cached attribute-name lists
would need their own mutation contract; live `for…in` enumeration with own-property
checks avoids `Object.values` allocations while retaining membership checks.
Texture/material reads also remain conservative rather than introducing setter
instrumentation across content, animation and asynchronous loading paths.

There are 507 non-dish transform snapshots. Unchanged matrices avoid signature
flattening; changed matrices are copied immediately. The dish's fixed descendant
list is built once and appends directly to the existing signature buffer. In this
fixture the flattened signature falls **32,161 → 24,049 entries**, removing 8,112
per-frame entries and 511 attribute-list arrays. This is work accounting, not a
measured memory reduction. Each retained matrix also needs an object and inventory
entry; its 16 numeric values replace corresponding prior-signature values.
Attachment storage is unchanged. Construction and first-validation observations
are in the raw report: one per variant/layout, insufficient for a precise startup
or memory claim.

## CPU evidence and limits

Run on Apple M4, macOS 27.0.1, Node 26.0.0, Three r185. The disposable source copy
used fresh test secrets/D1/R2; tests/builds and browser rendering finished before
recovery. AC power, 80%, not charging; Low Power Mode off and nominal OS thermal
pressure at all 47 observations. These observations do not establish equal clocks,
temperature or energy. Other user activity was not controlled.

The declared schedule was 30 seconds without rendering, 240-step warmups,
two A controls then **ABBA, BAAB** for each workload, one-second sample and
ten-second block rests, no retries, ten-minute timing budget. All **150 captures**
completed in about 8.5 minutes after verification. Each has 240 steps. Timings use
only the **wide** model; compact also receives correctness replay. The Node model
has no DOM-generated canvas artwork; real texture readiness is checked separately.
Each sample collects garbage and resets the cache before its measured steps;
warmups do not establish equal clock or allocation conditions.

`validation` measures the actual extracted `changed()` function, including snapshot
maintenance. `wrapper` measures its real admission/fallback, masking, target and
influence-preparation code with a no-op renderer. Model updates are outside both
timers; shadow rendering is stubbed and AO is outside the wrapper timer. Direct
validation during changing states intentionally also tests inputs that production
transition gates can bypass. Neither scope measures a complete browser CPU frame,
GPU time, frame pacing, energy, or browser performance.

Means below average the four scheduled samples per variant; controls are excluded.
P95 is the mean of each capture's nearest-rank p95, not a pooled p95. Reference
spread uses all six chronological A means in that workload. Full frame samples and
per-block/control spreads are in the [raw report](cpu-comparison.json.gz) and
[summary](summary.json).

| Scope / workload | A → B mean, ms | ABBA / BAAB change | A → B p95, ms | A spread |
| --- | --- | --- | --- | --- |
| validation / hold | 0.3020 → 0.2516 | -16.6% / -16.8% | 0.4431 → 0.3789 | 3.7% |
| validation / dish | 0.2996 → 0.2530 | -15.7% / -15.4% | 0.4406 → 0.3776 | 3.2% |
| validation / color | 0.3397 → 0.2444 | -31.6% / -24.0% | 0.5373 → 0.3505 | 17.5% |
| validation / doors | 0.2584 → 0.2111 | -21.4% / -15.0% | 0.4697 → 0.3931 | 23.9% |
| validation / notebook | 0.2875 → 0.2405 | -15.4% / -17.3% | 0.4625 → 0.3862 | 1.9% |
| validation / keyboard | 0.2839 → 0.2292 | -23.1% / -15.1% | 0.5191 → 0.4049 | 23.1% |
| wrapper / hold | 0.3002 → 0.2613 | -11.1% / -14.7% | 0.4343 → 0.4110 | 8.3% |
| wrapper / dish | 0.3104 → 0.2565 | -17.8% / -17.0% | 0.4729 → 0.3842 | 12.3% |
| wrapper / color | 0.1223 → 0.1004 | -18.2% / -17.7% | 0.5034 → 0.4108 | 2.9% |
| wrapper / doors | 0.0597 → 0.0477 | -21.1% / -19.2% | 0.4645 → 0.3760 | 8.6% |
| wrapper / notebook | 0.2430 → 0.2036 | -15.1% / -17.3% | 0.4887 → 0.3971 | 2.4% |
| wrapper / keyboard | 0.1437 → 0.1217 | -15.7% / -14.9% | 0.5190 → 0.4229 | 21.0% |
| wrapper / camera | 0.0035 → 0.0030 | -19.7% / -12.9% | 0.0002 → 0.0002 | 6.3% |
| wrapper / resize | 0.4050 → 0.3687 | -10.3% / -7.5% | 0.6034 → 0.5649 | 13.8% |
| wrapper / rebuild | 0.4051 → 0.3605 | -10.3% / -11.7% | 0.6164 → 0.5288 | 16.5% |

Reuse validation saves about **0.05 ms/check** in both orders: 15–17% for the held
and moving-dish states, against 3.2–3.7% reference spread. The wrapper hold saves
about 0.039 ms and dish about 0.054 ms. Those wrapper reference spreads are larger
(8.3–12.3%), so their exact gains are less certain. Every measured state favors B
in both orders; camera's sub-microsecond typical fallback difference is negligible.
Resize and repeated rebuild results include influence preparation and favor B,
but 13.8–16.5% reference spread limits precise claims there.

Short-window drift is substantial: **39 of 40** held/dish captures across both
scopes exceed 5% between disjoint 120-frame halves (maximum 33.6%). Changing-state
reference spread reaches 23.9%. No samples were dropped or rerun. Held/dish
validation still favors B in both halves of both orders (14.6–17.2% lower);
wrapper hold/dish halves also favor B (7.2–18.0%). These warnings prevent a strong
stable-clock or device-general speed claim. Consistent direction, removed work,
small implementation scope and unchanged decisions support retaining the change
under the repository's evidence-based decision guidance.

## Correctness and browser checks

- **8,640 paired steps:** 36 replay cases across compact/wide, direct validation
  and wrapper scopes. Exact change classifications and per-frame cache decisions,
  build/hit/fallback counts, dimensions and cached/live membership counts match A.
- **664 full tests**, **56 benchmark tests**, typecheck, affected-file lint and
  production build passed using the disposable verification checkout. New
  regressions cover unrevisioned world transforms, matrix replacement/return poses,
  attribute addition/removal/replacement, geometry replacement, texture readiness,
  UV/environment/viewport edits and dish-descendant local matrices. Existing tests
  cover eligibility, live animation, color/AO separation, six interior shadow maps,
  regional repair, unsupported states and release/wake. Independent read-only
  review found no invalidation regression.
- Hidden built-in **Chromium 154**, not native Safari: 1280×720 CSS with a
  2560×1440 buffer, then AO-enabled 900×1200 with a 900×1200 buffer. The latter
  reported DPR 1; desktop native DPR was not separately recorded. The frozen
  existing receiver lab completed **108 pixel comparisons plus two lifecycle
  records**, spanning all five views, full dish cycles, hover, doors, navigation
  and release/wake, with no WebGL errors.
- Browser comparisons are candidate caching versus fresh rendering, **not a
  browser A/B timing or exact old-validator/new-validator image comparison**.
  Nonzero cache-edge differences remain; mean absolute channel difference in the
  hold comparisons is at most 0.1281/255 desktop and 0.2352/255 portrait. Visual
  inspection of the pairs below found no new appearance issue. The Node replay
  establishes matching decisions; the browser exercises actual textures/rendering.

[Desktop raw verification](browser-desktop.json.gz) and
[portrait raw verification](browser-portrait.json.gz) retain all metrics and source
manifests. Original PNG names in those reports identify temporary QA output; only
these representative pairs are retained, as lossless WebP with identical decoded
RGBA bytes:

- Projects hold: [fresh](desktop-before.webp), [cached](desktop-after.webp)
  (desktop record 7).
- Portrait overview at dish frame 390: [cached](portrait-before.webp),
  [fresh](portrait-after.webp) (portrait record 3).

## Reproduce

Use the [isolated verification procedure](../../../OPERATIONS.md#isolated-verification).
Extract `features/spacecraft/{stationary-pixel-cache,dish-influence-cache}.ts` from
the baseline commit into an external baseline directory. Run from the disposable
checkout with shared dependencies or `npm ci`:

```sh
node --expose-gc scripts/benchmark-pixel-validation.mjs \
  --baseline-dir=/absolute/path/to/baseline \
  --baseline-ref=5e3be54ed242f066efb784d64168018b54fdddcd \
  --telemetry=/absolute/path/to/compiled-thermal-sampler \
  --out=/tmp/pixel-validation.json
```

`--verify-only` runs equivalence without timing; telemetry is optional and missing
observations remain unknown. Instrumented modules exist only temporarily and are
removed in `finally`; no validation hook is added to the shipped API. Browser QA
uses `scripts/benchmarks/camera-invalidation-lab.mjs --experiment receivers` in that
checkout and **Verify rooms** at the two viewports, as in the existing lab.
