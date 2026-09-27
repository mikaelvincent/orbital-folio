# Cloud-versus-current-Earth comparison lab

`node scripts/cloud-browser-lab.mjs --port 3004` freezes a loopback-only background
fixture. Open `http://127.0.0.1:3004/` in the hidden built-in browser. This adds no
portfolio routes or visitor work and needs no database. Keep the main server on
3000; stop the lab after use. Restart after source/asset edits to make a new
snapshot.

- **A / reference:** `satellite-volume-reference.ts`, the 14 September 2026
  satellite cloud volume, with its retained `cloud-satellite-v2.cfd.gz` and shader.
- **B / current:** `features/orbit/orbital-environment.ts`, now the 2560×1536
  lossless regional night loop. Native Europe detail and fictional coastal
  continuation repeat over 112.5° / 436.332 seconds at 0.0045 rad/s.

These are different authored designs, not equal imagery or an isolated
optimization. Saved [2K satellite results](../../docs/evidence/performance/satellite-earth-2k/audit-summary.md)
used an older B source. The original procedural reference (`cloud-reference.ts`)
is another baseline, used by the historical [resolution lab](earth-resolution-lab.md).
Use recorded source/asset manifests and original revisions to reproduce those
comparisons; today's live fixture cannot stand in for them.

**Preview selected version** renders one frame at 0, 60 or 180 seconds. Match
viewport, drawing DPR and time for comparisons; controls may be hidden. Previewing
does not start a continuing render loop. The immutable build manifest records all
imported source and copied assets. Missing textures or fallback generation
invalidate the intended comparison.

For **Start paired GPU comparison**, run both ABBA and BAAB at each chosen
viewport. Each four-block run uses a 20-second blank rest before each block, ten
warmup frames and 60 measured frames by default (120 optionally). Both complete
environments stay resident, so lab memory is not single-Earth production memory.
The initial preparation reports import, factory, fetch/decode/readiness, compile
and first submitted render separately; repeated rounds reuse preparation records.
These local observations are not repeated cold-network starts or presentation
latency.

Each GPU query encloses background rendering only. CPU update/submission, frame
intervals, draw counts and individual GPU validity remain separate. Unsupported
GPU timing yields CPU/frame-only results; missing/disjoint samples invalidate
GPU comparisons. Stop, hiding, resize or context loss cancel the finite run and
retain partial reports. Copy JSON after every attempt, including failures.

Follow the [measurement protocol](../../docs/performance-diagnostics.md) for power
context, competing work, balanced order and baseline drift. Blank rests and
nominal OS pressure do not establish equal clocks or cooling. This fixture
excludes spacecraft/UI/navigation; no whole-site FPS, heat or battery claim follows.
For the original atlas startup/codec kernels, use the retained
[cloud delivery evidence](../../docs/evidence/performance/cloud-delivery/README.md).
