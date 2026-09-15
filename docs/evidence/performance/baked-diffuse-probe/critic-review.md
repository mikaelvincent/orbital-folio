# Independent critic review — baked diffuse probe

Reviewer: `/root/wall_hover_critic`, 15 September 2026.
Final source: `b005614a-4515-47c9-8493-107d2721cf37`.
Baseline: `6e689c2`.

**Score: 95/100. No unresolved blocker for retaining this developer-only
experiment and leaving production illumination unchanged.** The score evaluates
the authorized investigation, implementation boundaries and evidence, not the
unadopted candidates as proven optimizations. Neither candidate has approval to
change the normal site.

## Rubric

| Area | Score | Assessment |
| --- | ---: | --- |
| Request fulfillment and approval boundary | 25/25 | Candidate 5 was implemented as a bounded, reversible comparison. Delivered GTAO, illumination, geometry, Earth and interactions remain intact. The proposed visible alternatives are documented rather than silently adopted. |
| Visual validation and adoption judgment | 23/25 | Source-matched wide, portrait and compact comparisons cover useful camera, hover, door, reader and travel states. Saved A/B/C images preserve the design while exposing subtle shading differences. Static views and one engine do not establish perceptual equivalence, particularly for B's specular energy. |
| Correctness and organization | 19/20 | GPU capture, independent offline fitting, reversible material replacement and shared replay have coherent responsibilities. Shader substitution follows the installed Three implementation, preserves material sharing/feedback and fails on unsupported replacement markers. It remains a version-specific developer prototype rather than a general production asset pipeline. |
| Performance method and interpretation | 18/20 | Preparation, coefficient storage, geometry, pass counts and GPU/CPU timings are separated. The failed readiness gate is honored and the subsequent survey is explicitly descriptive. No accepted comparative timing or cross-engine/startup benefit is established. |
| Documentation and reproducibility | 10/10 | Current ledger/context/diagnostics agree on baseline retention. Source identity, training and held-out data, pilot/final distinctions, compressed raw reports, checks and limitations are retained. |

## Findings and decision

The fit approximates an existing, already-prefiltered PMREM field; it does not
bake new scene bounces or local contact shading. Shader review confirmed the
normal transform, environment rotation and single PI/intensity scaling match
Three r185. Probe declarations precede their use. Original material hooks,
including neutral cabin paint, remain chained.

B replaces irradiance shared by environment diffuse and specular
multiscattering. C substitutes only the diffuse contribution and retains the
original irradiance lookup for specular energy. Both still require PMREM,
view-dependent specular radiance, direct light loops, shadows and GTAO. Thus
neither coefficient size nor a removed lookup proves useful frame savings.

I independently viewed the final wide idle A/B/C images and portrait idle
A/B/C images. The wide originals are 2560×1440 and were displayed at
2048×1152; the portrait images were viewed at their actual 900×1200 size.
Composition, text, silhouettes and smooth contact shading remain convincing.
I saw no new flare, coarse patches or obvious metallic-highlight failure in
those views. Broad surface shading changes are subtle, and B versus C's metallic
appearance is difficult to distinguish at this scale. This does not justify
claiming either is invisible or that B's specular change is perceptually absent.

Final report checks confirm 50 comparisons per layout, 150 total, with zero GL
errors and pixel-exact A restoration. The wide idle candidates change about
1.59 million pixels, with maximum channel difference 37/255. Their approximately
5.29% held-out irradiance error is not a final-image error percentage.

The rested run correctly stops with no candidate blocks after unchanged-baseline
GPU spread reaches 6.09%, beyond the declared 5% gate. Its CPU stability and
nominal thermal context cannot override that result. The subsequent 24-window,
2,880-frame survey has zero GL errors and unchanged draws/triangles, but remains
unranked evidence. In particular, later baseline pass variation prevents a
causal speedup or slowdown claim.

**Keep the delivered illumination.** The tiny probe asset is not sufficient
reason to introduce visible approximation without an established net benefit.
Retain the reusable developer experiment and before/after evidence. Production
adoption would need user acceptance of the appearance and a repeatable benefit.

## Revisions addressed during review

- Added held-out directional validation using actual clamped Float32 shader
  predictions against independent GPU PMREM samples; retained all raw values
  separately from training residuals.
- Added required shader-marker count checks and excluded invalid normals and
  authored emitted/printed surfaces from the candidate selection.
- Reset and dispose candidate material caches on capture retries; preserve
  original material sharing and update feedback scalars once per material.
- Preserve capability failure and exact original-material restoration; dispose
  temporary capture targets, textures and materials in the capture cleanup.
- Handle zero-energy reference channels explicitly and reject nonfinite GPU
  validation values.
- Clarify Projects-only baseline wording and distinguish 108 coefficient bytes
  from full material/program/capture memory and the larger retained renderer.

## Verification and review limits

I independently compared the current source files with the final manifest,
including its 85 non-dependency inputs, and read the final responsive reports,
timing outcomes and retained check logs. The full suite records 301 passing
tests; production build, typecheck and affected lint pass. The last
developer-only finite/zero-reference guard followed the full suite/build and
received final typecheck, affected lint and actual GPU/replay validation.

This review used source, saved reports/logs and saved images. I did not run a
browser, benchmarks or another test suite. Root performed the replay and runtime
smoke checks. The evidence is hidden Chromium on the reported M4/ANGLE Metal
configuration, not native Safari or a device-independent performance result.
I did not visually inspect every captured transition or the compact images.
Canvas evidence excludes HTML reader text; full accessibility, reduced-motion
behavior and trusted native input were not independently revalidated here.

No cold visitor load, process/GPU memory, energy, battery, heat or cross-GPU
agreement benefit is established. Other user/system workloads and ambient
conditions were not controlled. The shared contact wrapper compiled but its
expensive contact bake was not rerun for this task. These limits are disclosed
and do not block keeping both candidates out of production.
