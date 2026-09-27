# Performance case-study candidates

Eight candidates remain available for the owner's final topic choice. Entries
combine related investigations, not their numerical gains. Historical counts and
timings describe their identified sources, not today's authored scene. Read only
the relevant evidence when investigating that system; ordinary changes do not
require this ledger or its archive. For measurement, use the
[diagnostics guide](performance-diagnostics.md).

| Candidate | Problem, intervention and supported outcome | Status and evidence |
| --- | --- | --- |
| **1. Submission and hardware cost** | Exact static batching/matrix reuse cut overview draws 466→436; subsequent targeted tessellation removed 62,976 triangles. Timing drift limits the batching claim; hardware GPU observations are bounded to two Chromium room pairs. | Mechanisms retained; art/counts historical. Merges **01–02**. [Baselines, tradeoffs and evidence](performance/batching-and-hardware.md). |
| **2. When exact caches lose** | Conservative transform/iris caches cost more than native work; rested retests retain failures and a tiny 0.000908 ms settled-lighting signal. No browser benefit established. | Candidates disabled. CPU-cache portions of **03–04**. [Methods, revised decisions and raw runs](performance/exact-work-candidates.md). |
| **3. Direct geometry instead of runtime welding** | Runtime indexing added work and failed stable startup controls. Direct indexed cylinder generation later saved 1,408,064 retained array bytes with exact expanded inputs; broader offline arrays imposed delivery cost. | Direct generator adopted; broader bake/welding rejected. Indexing portions of **03–04** plus **20**. [Exactness, separate baselines and inconclusive timings](evidence/performance/offline-geometry-compaction/README.md). |
| **4. Earth representation and resolution** | Prebuilt cloud fields trade transfer/storage for generation work; satellite day/night comparisons distinguish shader cost, native detail and startup burden. Resolution rankings remain uncertain. | Historical predecessors. Merges **05–13**. [Cloud, day and night cohorts](performance/earth-representation.md). |
| **5. Invalidate AO for geometry, not color** | Material feedback needlessly refreshed contact shading. Three accepted Contact blocks reduced refreshes 75→0 per 180 frames and callback mean 4.559→4.082 ms; failed fourth block retained. | Production policy retained; measured source historical. Former **19**. [Source, GPU sampling limits, raw/excluded runs and motion checks](evidence/performance/camera-invalidation/README.md). |
| **6. Limits of offline lighting bakes** | Native shadow transport fails changing portrait lighting; static contact shading adds 313,812 triangles and visible artifacts; fitted irradiance changes appearance with ~5.3% held-out error. None establishes a qualified net speedup. | Existing cached shadows/GTAO/illumination retained. Merges **21–23**, preserving separate sources/protocols: [shadow](evidence/performance/static-shadow-bake/README.md), [contact](evidence/performance/static-contact-bake/README.md), [diffuse](evidence/performance/baked-diffuse-probe/README.md). |
| **7. Native-detail regional Earth loop** | A protected original Europe core plus fictional coastal continuation reduces 4096×3072→2560×1536 footprint: 21.05% fewer download bytes, 68.75% less nominal mip storage. Drift prevents a desktop GPU ranking. | Current asset; later camera/atmosphere behavior supersedes original captures. Regional-loop portion of **29** plus **30**. [Provenance, visual tradeoffs, raw timings and coverage](evidence/earth-consistent-loop/README.md). |
| **8. Idle scene, sustained lighting work** | Stationary hull geometry concealed continued animation and expensive fragment lighting. Skip proven zero-contribution Standard-material lighting and back-facing directional shadow samples. Exploratory quiet-idle GPU means 14.13→11.00 ms; strict readiness and moving-camera timing failed stability gates. | Specialization adopted with unchanged authored quality; 152 image comparisons differed by at most 1/255. Thermal/energy benefit unverified. [Cause, necessary updates, raw/excluded measurements and limits](evidence/performance/idle-lighting/README.md). |

Routine art, interface and interaction revisions are current requirements in
[project context](PROJECT-CONTEXT.md), not additional performance stories. Their
count changes alone did not justify retaining case-study entries. The retained
raw reports preserve distinct baselines, failed/excluded attempts and measurement
scopes; nominal texture/geometry bytes are not measured process or GPU memory.

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

These proposals remain **held pending explicit authorization**. Cleanup and design
work do not authorize them; a visible/feel change needs a concrete benefit,
tradeoff and recommended experience before implementation.

- **Exact partial Earth mesh/coverage:** low priority; prove surface/atmosphere
  visibility through navigation, drag and resize and measure net benefit. Fewer
  vertices do not imply a smaller texture or less fragment work. The retained
  crop has bounded evidence, not a universal certificate.
- **Distance-dependent hardware detail, adaptive drawing resolution, optional
  slower idle rendering:** only after profiling identifies a worthwhile target.
  Inspect transition pops, legibility, motion and wake-up latency respectively.
- **Proven room visibility or movement-only AO quality changes:** adjacent rooms,
  doors, reflections and contact shading prevent assuming simple equivalence.
- **Revisit broader geometry or lighting precomputation only with new evidence.**
  Current reports explain why runtime caches/welding and the three lighting bakes
  were not adopted. Preserve smooth authored hull/detail; global simplification
  is not an approved fallback.
