# Performance case-study candidates

Nine candidates remain available for the owner's final topic choice. Entries
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
| **9. Let the visible scene rest** | Default inactivity scheduling stops ambient motion and all recurring scene submissions after 15 seconds, then resumes on interaction. Four ten-second idle windows fell from 587–603 frames to zero; active rendering quality stays unchanged. | Adopted. Stillness is the deliberate tradeoff; frame counts do not quantify energy savings. [Source, alternating comparisons, wake-up checks and limits](evidence/performance/scene-rest/README.md). |

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

Ranked for **likely reduction of sustained foreground rendering work** when the
owner leaves the portfolio open on a MacBook Air M4. These are the highest-leverage
proposals, not an exhaustive optimization list. None has a measured temperature,
power or throttling benefit; the exploratory GPU timings below precede the current
lighting specialization and do not predict its gains. Effects overlap and must
not be added. All proposals remain **held pending explicit authorization**;
implementation needs a concrete visual/interaction tradeoff and the recommended
experience. Preserve the existing reduced-motion and hidden-page behavior.

Automatic inactivity rest is now the default, with the outcome retained in
candidate **9** above. The remaining proposals are still deferred.

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
   most during movement and ambient scanning while automatic rest is not engaged.
   [Evidence](evidence/performance/idle-lighting/README.md) and
   [diagnostic scope](performance-diagnostics.md#interpret-the-work-correctly).
3. **Cache the stationary spacecraft while ambient motion continues.** The
   current drawing pass clears the canvas and renders the entire spacecraft on
   every active frame, even with a settled camera and unchanged hull. Investigate
   caching the stationary portion's rendered color and depth while drawing Earth,
   sky, the dish and Contact animations separately. Preserve their motion and
   correct occlusion, shadows and contact shading; invalidate affected caches on
   camera, viewport, lighting, material or geometry changes, including hover and
   room transitions. Extra render targets and compositing cost memory and GPU
   work, and incomplete invalidation risks stale pixels or lighting. Compare net
   cost against the current automatic-rest behavior: any benefit is confined to
   active frames with reusable spacecraft pixels, since a resting scene already
   submits no frames. Check navigation, hover, moving-part boundaries and wake-up
   before retaining an implementation. No performance gain is established.
