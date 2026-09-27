# Historical Earth resolution lab

The resolution fixture and unused day/2K/4K images were retired when the owner
selected Europe at Night. These are reproduction instructions, not production
controls. The [curated Earth story](../../docs/performance/earth-representation.md)
indexes the original day/night cohorts and their limitations.

## Restore the historical fixture

Use an isolated checkout at `56c67bb123b4afab0c34d39560100db3e2366ea2`, with that
revision's source/assets/lockfile. Install with `npm ci`, then run from there:

```sh
node scripts/earth-resolution-lab.mjs --night --port 3004
```

Open `http://127.0.0.1:3004/` using the hidden built-in browser. No database or
production server setup is needed; preserve the main server at 3000. The server
freezes compiled modules, copied assets and SHA-256 identities. Restart to change
the snapshot; close it after use.

This checkpoint preserves the final helper-era implementation, whose night
opening is East Asian. **Exact Mediterranean or day evidence reproduction also
requires that report's original source revision, opening, clock and hashes.**
Equal textures alone do not make a new capture the historical measurement.
Historical native Safari access does not authorize controlling the user's browser.

The optional `--thermal-sampler /absolute/path/to/compiled-sampler` captures native
context outside timed work. Compile it before recovery, following the
[diagnostics guide](../../docs/performance-diagnostics.md#thermal-aware-comparison-procedure).
Without it telemetry is unknown; the fixture remains usable on other devices.

## Cohorts and protocol

| Mode | Variants and orders | Measured work |
| --- | --- | --- |
| `--night` | A=2K, B=4K, C=8K; **ABC, BCA, CAB, ACB, CBA, BAC** | Ten warmup +120 measured frames/block; 720 measured frames/resolution after six accepted rounds. |
| No `--night` | A=original procedural clouds, B=2K, C=4K, D=8K; **ABDC, BCAD, CDBA, DACB** | Ten warmup +60 measured frames/block by default; 240 measured frames/variant after four accepted rounds. |

Run the complete order set per browser/viewport/DPR and save each complete or
partial report with **Download JSON**. Night and day are separate designs and
must not be pooled. The procedural design differs visually from satellite maps;
resolution variants within a family share their snapshot's geometry/shader and
opening. The night default is frozen time zero; historical day evidence uses
180 seconds. Check each report's actual configuration.

Each block starts after 20 seconds blank with no rendering loop. All complete
environments are prepared before steady samples and remain resident. Their
satellite mip payload alone is about 235 MB, excluding decoded images, other
textures/geometry/targets and driver allocations; this is not production memory.
Preparation records import, factory, readiness/fetch/decode, compile and first
submission separately. Deduplicate reused records across rounds. A reload does
not prove cold browser/driver caches; first submission is not presentation.

GPU queries cover only the background draw. CPU update/submission, cadence,
render counts and query statuses are stored separately; CPU/GPU time cannot be
added. Shader/asset identity, successful loading and decoded dimensions must
match. Missing textures or fallback scenes cannot qualify as faster versions.
Native pressure/power changes, hiding, resize, context loss and disjoint/missing
GPU samples invalidate the affected comparison. Unsupported GPU timing is
explicitly CPU/frame-only. Keep raw failures and exclusions; a fixed rest and
nominal pressure are not guarantees of equal clocks or no throttling.

One-shot previews at matching time/viewport/DPR support visual comparisons. No
scene continues rendering after a completed/cancelled round. The lab excludes
spacecraft, UI and camera travel; it does not measure whole-site FPS, energy or
physical-phone performance from a narrow desktop viewport.

## Audit retained results from today's checkout

```sh
node scripts/audit-earth-fourway.mjs --verify-only
node scripts/audit-night-earth-results.mjs --partial
```

These start no renderer/native sampler and leave saved reports unchanged.
`--input-dir PATH` selects copied evidence with the corresponding protocol.
Omitting the no-write option regenerates summaries; use copied evidence for
exploration. Day and night auditors verify their own historical cohort, not an
arbitrary new opening. They check identities, order, dimensions, counters, query
validity, native context and unique preparations; retries and interruption
exclusions remain visible.

The night auditor reads original images/manifests from Git revision
`56c67bb123b4afab0c34d39560100db3e2366ea2`; that history must be available. Source
mismatches are disclosed, not rewritten to make old runs current. Retained
[day asset manifests](../../docs/evidence/performance/earth-fourway/assets/) and
[night manifests](../../docs/evidence/performance/night-earth-resolution/assets/)
identify dimensions, sources and encoding. Raw reports, matched previews and
qualified conclusions remain in their respective evidence directories.
