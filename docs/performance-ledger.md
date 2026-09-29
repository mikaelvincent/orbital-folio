# Performance case-study candidates

Ten candidates remain available for the owner's final topic choice. Entries
combine related investigations, not their numerical gains. Historical counts and
timings describe their identified sources, not today's authored scene. Read only
the relevant evidence when investigating that system; ordinary changes do not
require this ledger or its archive. For measurement, use the
[diagnostics guide](performance-diagnostics.md).

| Candidate | Problem, intervention and supported outcome | Status and evidence |
| --- | --- | --- |
| **1. Submission and hardware cost** | Batching and targeted tessellation reduce unnecessary geometry/submissions. Straight hull spans and sibling hardware remove 40,568 wide-layout triangles and 14 meshes; five finite Chromium view pairs remove 10–16 draws. Earlier bevel/hardware reductions retain their separate baseline. Current timing gains are unmeasured. | Mechanisms retained. Merges **01–02** with the current geometry budget. [Baselines, tradeoffs and evidence](performance/batching-and-hardware.md). |
| **2. When exact caches lose** | Conservative transform/iris caches cost more than native work; rested retests retain failures and a tiny 0.000908 ms settled-lighting signal. No browser benefit established. | Candidates disabled. CPU-cache portions of **03–04**. [Methods, revised decisions and raw runs](performance/exact-work-candidates.md). |
| **3. Direct geometry instead of runtime welding** | Runtime indexing added work and failed stable startup controls. Direct indexed cylinder generation later saved 1,408,064 retained array bytes with exact expanded inputs; broader offline arrays imposed delivery cost. | Direct generator adopted; broader bake/welding rejected. Indexing portions of **03–04** plus **20**. [Exactness, separate baselines and inconclusive timings](evidence/performance/offline-geometry-compaction/README.md). |
| **4. Earth representation and resolution** | Prebuilt cloud fields trade transfer/storage for generation work; satellite day/night comparisons distinguish shader cost, native detail and startup burden. Resolution rankings remain uncertain. | Historical predecessors. Merges **05–13**. [Cloud, day and night cohorts](performance/earth-representation.md). |
| **5. Invalidate AO for geometry, not color** | Material feedback needlessly refreshed contact shading. Three accepted Contact blocks reduced refreshes 75→0 per 180 frames and callback mean 4.559→4.082 ms; failed fourth block retained. | Production policy retained; measured source historical. Former **19**. [Source, GPU sampling limits, raw/excluded runs and motion checks](evidence/performance/camera-invalidation/README.md). |
| **6. Limits of offline lighting bakes** | Historical native shadow transport fails changing portrait lighting; static contact shading adds 313,812 triangles and visible artifacts; fitted irradiance changes appearance with ~5.3% held-out error. None establishes a qualified net speedup. | Offline candidates remain unused; current authored lighting is covered by **8**. Merges **21–23**, preserving separate sources/protocols: [shadow](evidence/performance/static-shadow-bake/README.md), [contact](evidence/performance/static-contact-bake/README.md), [diffuse](evidence/performance/baked-diffuse-probe/README.md). |
| **7. Native-detail regional Earth loop** | A protected original Europe core plus fictional coastal continuation reduces 4096×3072→2560×1536 footprint: 21.05% fewer download bytes, 68.75% less nominal mip storage. Drift prevents a desktop GPU ranking. | Current asset; later camera/atmosphere behavior supersedes original captures. Regional-loop portion of **29** plus **30**. [Provenance, visual tradeoffs, raw timings and coverage](evidence/earth-consistent-loop/README.md). |
| **8. Lighting work and authored sources** | Exact zero-contribution skips exposed the cost of fragment lighting. A historical five-source cabin-only design observed stationary GPU means 6.700→5.106 ms, similar moving GPU time, ~5.5% higher CPU means and ~103 KB additional gzip JavaScript. Current art direction uses four cabin lamps, two ladder worklights and a faint exterior sun. Per-light reuse now distinguishes verified non-caster motion while tracking moving receivers and omitted dish poses: matched door/page/key replays generated 71–84% fewer maps, with unchanged stationary submissions and tested pixels. | Exact specialization, room linking and precise reuse remain. [Shadow validity, comparison and uncertainty](evidence/performance/shadow-reuse/README.md) extends this candidate and supports **10**; large timing drift limits speed claims. [Earlier specialization](evidence/performance/idle-lighting/README.md), [historical authored comparison](evidence/performance/cabin-lighting/README.md), [current art direction](PROJECT-CONTEXT.md#spacecraft-design). Do not combine gains or apply historical timings to the revised lighting; no thermal/energy claim. |
| **9. Let the visible scene rest** | The historical 15-second inactivity policy reduced four ten-second idle windows from 587–603 frames to zero, preserving active rendering quality. | Superseded by the owner's preference for continuous visible motion. Hidden/offscreen suspension remains; measured frame savings remain valid for the historical source, not the current visible scene. [Tradeoff, source and comparisons](evidence/performance/scene-rest/README.md). |
| **10. Stationary pixels, moving costs** | Keeping the dish and receiving surfaces live preserves moving shadows/AO while reusing 99.72% of full-cycle frames. Six historical desktop blocks observed 5–21% lower CPU callback means and 9–51% lower sampled GPU means across three views; variation limits precise claims, and GPU sampling misses the single rebuild frame. | Implementation adapted to the current seven-light rig; dirty interior maps force a full redraw before pixel reuse resumes. The historical single-source gains came with 140.625 MiB nominal desktop cache storage and minor edge differences; the initial fallback prototype remains reverted. [Original trial](evidence/performance/stationary-pixel-cache/README.md) and [current decision, tradeoffs, retest and historical exclusions](evidence/performance/stationary-pixel-cache/receivers/README.md). |

Routine art, interface and interaction revisions are current requirements in
[project context](PROJECT-CONTEXT.md), not additional performance stories. Their
count changes alone did not justify retaining case-study entries. The retained
raw reports preserve distinct baselines, failed/excluded attempts and measurement
scopes; nominal texture/geometry bytes are not measured process or GPU memory.

Candidate **10** also includes [native notebook and HTML reuse](evidence/performance/native-html-cache/README.md):
separate static/dish occlusion and whole-subsystem projection guards retain exact
native geometry while avoiding unrelated work. Two desktop orders observed
HTML phases fall from 1.39–1.46 to 0.028–0.031 ms; overall callback gains varied
14–23%. These CPU observations have a separate baseline from the pixel-cache
GPU comparisons and must not be added to them.

Candidate **10** also includes [local bounds reuse](evidence/performance/local-bounds/README.md),
shared with **8**'s shadow preparation. Versioned geometry/instance metadata removes
unchanged vertex scans while retaining fresh world bounds. Two opposing Node CPU
orders observed 94–96% lower interaction/preparation kernel means, with a small
dish-only overhead and no browser/GPU speed claim. This is a separate baseline.

## Candidate selection

After a change or investigation, briefly screen **only the information already
gathered**: is there a meaningful technical problem, engineering insight, credible
result, or instructive failure/tradeoff? Routine work that fails this screen needs
no shortlist reading, ledger update, rejection record or permanent evidence dossier.
Screening does not authorize extra benchmarking.

For promising work, read the candidate summaries above first; open deeper evidence
only to resolve a selection or support question. Judge significance, engineering
insight, evidence quality, project relevance and distinctiveness. Prefer extending
or merging an existing candidate when it strengthens the same coherent story.
Otherwise add it only when worthwhile. Keep **at most ten** final candidates: if a
new entry would exceed ten, replace the least promising only when the newcomer is
stronger; otherwise keep the shortlist. Ten is a ceiling, not a target, and the
owner's final topic choice stays open.

Keep each retained claim's source/asset identities, method, raw/excluded results
and necessary comparisons traceable. Separate incompatible baselines and never
add independent gains. Before consolidating or removing support, check its other
consumers and preserve technical dependencies, rebuild inputs and provenance;
case-study value is not the only reason to retain a file.

## Deferred backlog

Ranked for **likely reduction of sustained foreground rendering work** when the
owner leaves the portfolio open on a MacBook Air M4. These are the highest-leverage
proposals, not an exhaustive optimization list. None has a measured temperature,
power or throttling benefit; the exploratory GPU timings below precede the current
lighting specialization and do not predict its gains. Effects overlap and must
not be added. All proposals remain **held pending explicit authorization**;
implementation needs a concrete visual/interaction tradeoff and the recommended
experience. Preserve the existing reduced-motion and hidden-page behavior.

Continuous visible motion is now the default; the superseded inactivity policy
remains candidate **9** as an appearance/work tradeoff. Stationary spacecraft caching with live dish receivers is
now retained after retesting under the revised decision rules; it shares candidate
**10** with the earlier reverted fallback prototype.
The remaining proposals are still deferred.

1. **Lower the 3D drawing resolution in low-heat mode.** Start with an effective
   desktop DPR cap around 1.25–1.5 instead of 2, leaving HTML text at native
   resolution. At DPR 2, the exploratory half-width/half-height main-buffer
   setting changed whole-frame GPU mean from 15.99 to 10.65 ms (about 33%); it
   does not establish a current-site or thermal gain at the proposed cap. A
   2→1.5 DPR change draws about 44% fewer main-buffer pixels. Expect softer
   spacecraft edges and fine detail; check room labels and resolution changes
   during navigation before choosing a default. [Evidence](evidence/performance/idle-lighting/README.md).
2. **Disable GTAO contact shading in low-heat mode.** The existing diagnostic
   that skipped both GTAO refresh and composite changed the exploratory
   pre-specialization whole-frame GPU mean from 15.99 to 13.79 ms (about 14%).
   That is not an expected current-site or thermal saving. Scanning refreshed
   GTAO on 239/240 measured frames and camera movement on 238–239/240; even when
   a quiet hold reused the cache, its composite remained in the main frame.
   Expect flatter contact depth around objects and room surfaces. This helps
   most during movement and ambient scanning.
   [Evidence](evidence/performance/idle-lighting/README.md) and
   [diagnostic scope](performance-diagnostics.md#interpret-the-work-correctly).
