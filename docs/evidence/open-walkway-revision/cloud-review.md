# Cloud refinement candidate — 9 September 2026

Artifact: `/tmp/orbital-environment-cloud-refinement.ts`. Checkout was read only. Same environment API, water-only surface, atmosphere placement, meteors and active-time clock. No image requests or new external assets.

## Observed issue and change

The two supplied overview captures show enlarged, soft mottled cloud patches. The existing random-value field forces a zero slope at every lattice plane, even after quintic interpolation. Increasing that lattice would increase its repetition period, not add meaningful local cloud detail.

The candidate bakes periodic gradient noise into the same R8 volume, with eight samples per underlying noise cell. It uses trilinear mip filtering of that field, coherent stretched/advection-shaped strands, and smooth low-opacity edges. The underlying mathematical gradient field is C2; the sampled R8/trilinear result is continuous C0, not an infinite-resolution or globally C2 field. Shorter repeat periods are 8 cells desktop and 4 mobile; warped, rotated octaves conceal direct tiling.

At 4,096 sampled integer x-planes the old scalar field has near-zero x slope at 100% of samples; the new field does so at 0.0488%. RMS plane slope is 0.374 desktop / 0.313 mobile, compared with roughly 1.6e-8 before. This directly checks removal of forced flat lattice shoulders. Repeat-period error is below 1.1e-14; wrap-seam continuity checks pass.

## Reviewable evidence

- `/tmp/cloud-sampler-comparison-desktop.png` — matched 1440×1000 camera and cloud field, visible lower 29% crop.
- `/tmp/cloud-sampler-comparison-phone.png` — matched 390×844 camera and cloud field, visible lower 29% crop.
- `/tmp/preview-cloud-refinement.py` plus `/tmp/export-cloud-volumes.mjs` reproduce the comparison from actual generated data.
- `/tmp/cloud-field-sampling-audit.json` and `/tmp/audit-cloud-field-sampling.mjs` verify the scalar sampler mechanism.

These are CPU sampler previews at active time 0, not browser screenshots. Sphere coordinates, noise domains and shader coverage are reproduced; ocean/light composition is simplified, and CPU finite-difference/mip filtering approximates GPU behavior. The candidate visibly changes short puffy patches into finer aligned strands in these previews. The supplied actual overview images were inspected; the new GLSL was not compiled or visually tested through a browser in this read-only subtask.

One limitation is explicit: the cross-resolution check does not prove lower aliasing. Its 1× versus averaged 2× alpha MAE is 0.00125 → 0.00929 desktop and 0.01001 → 0.03640 phone. The higher-frequency structure and footprint-dependent fading make the candidate more resolution-dependent than the broad original. Browser QA should inspect slow motion at the actual renderer DPR for shimmer and assess the lower mobile cloud coverage. Do not claim that a GPU aliasing/performance improvement has been measured.

## Costs and API verification

| Quantity | Desktop | Mobile |
|---|---:|---:|
| Generated volume | R8 64³ | R8 32³ |
| Volume mip payload | 299,593 B | 37,449 B |
| All procedural texture mip payload | 474,357 B | 81,141 B |
| CPU texture arrays | 393,216 B | 65,536 B |
| Temporary gradient array | 6,144 B | 768 B |
| Cloud texture lookups / covered fragment | 8 | 7 |
| Environment draw calls | 6 normally, 8 maximum | 6 normally, 8 maximum |
| Generation time: first / warm median in final Node run | 24.67 / 13.69 ms | 2.23 / 2.48 ms |

Payload totals are the logical decoded texture storage including mip levels, unchanged from the checkout; driver tiling/overhead, render targets and all other application textures are excluded. Three’s shared 16×16 RG16F DFG adds 1,024 bytes when allocated. Environment geometry arrays remain 670,476 bytes desktop / 366,476 bytes mobile. No per-frame texture uploads.

Baking the gradient volume adds one-time CPU work: earlier local runs ranged around 27–103 ms desktop and 4–17 ms mobile as host load varied. Generation occurs once at construction, never on resize/update. Shader removes per-sample floor/fract/quintic coordinate remapping; three morph sin/cos operations move from every cloud fragment to the existing CPU update. Three detail-footprint evaluations are added desktop, two mobile. Texture sample count and draw count do not establish GPU time; no GPU timing claim is made.

Cloud rotation remains 0.0072 rad/s (4.13° per 10 seconds), with surface rotation 0.003 rad/s. Morph and all meteor/star motion still use accumulated active time. The portable audit checks a 3,600-second meteor run in 20-ms steps, frozen diagnostics during pause, exact texture costs, and all 13 disposable objects. Maximum two meteors and 5–9-second groups are preserved. Strict TypeScript checking passes.

Run: `node /tmp/audit-orbital-cloud-refinement.mjs /Users/mikaelvincent/Documents/GitHub/orbital-folio /tmp/orbital-environment-cloud-refinement.ts`. Audit: `/tmp/orbital-cloud-refinement-audit.json`.

## Identity

Baseline at checkpoint ac09c63 SHA-256: `e45f9ecd2c1c24ea854e0a0f7840f6145e670f24f89f69845558ded0c783c7f9`
Candidate SHA-256: `f2400c39e137f757b1ad5945022957cd6b8e0203eabd3fbbf04fe06bb65a887d`

No NASA or other third-party image content is used by this module; the procedural field is generated by the code. Existing saved evidence images are used only for visual review.

## Integrated verification

The raw candidate above was formatted and integrated. The current checkout SHA-256 is `6cef740cd57c1e348989fe5ef5093e54b78ce96bb569118b1d7a8fc9566dea62`, matching environment-audit.json. The original note accidentally captured this post-integration hash as its baseline; the baseline identity above is corrected against Git. CPU comparison previews remain approximate historical sampler studies. Browser captures under this evidence directory show the compiled shader. No reduction in GPU aliasing or universal frame-time improvement is claimed.
