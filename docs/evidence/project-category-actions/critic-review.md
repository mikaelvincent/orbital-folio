# Independent critic — project availability and live action

Reviewed 21 September 2026 by the independent `projects_critic` agent. The critic
did not implement the application changes; this review record is its only authored
file for the task. Final implementation identities are in
[source-hashes.json](source-hashes.json).

**Score: 95/100. Recommendation: keep. No unresolved blockers.**

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Request fulfillment | 25/25 | Empty categories retain their hardware but lose text, hover, activation and accessible controls. Populated categories remain usable. The live action is prominent beside the title; source stays secondary below the introduction in both views. |
| Visual quality and responsive design | 24/25 | The dormant face reads as a powered-off monitor. The amber action fits the spacecraft palette and establishes clear hierarchy. Desktop, portrait and narrow reading captures remain legible and contained. |
| Correctness and interaction resilience | 24/25 | Availability is shared across model, runtime and readers. Mounted content updates synchronize before framing without remounting. Empty-to-populated and all-empty handling, cloned materials, retained wall blockers and safe optional links are covered. |
| Organization and scope | 9/10 | A small shared category-count helper, shared resource components and a narrow scene API keep the responsibilities clear. No camera, asset, backend or persisted-content changes are introduced. |
| Verification and cost transparency | 13/15 | The isolated full suite, final focused checks, source identities and real Chromium captures support the result. Structural counts are clearly separated from unmeasured timings and actual memory. Native Safari, physical touch and a live content-update scenario remain unverified. |
| **Total** | **95/100** | |

## Findings resolved during review

1. **Mounted scene synchronization:** the initial candidate updated availability
   through `model.setProjects`, but the React wrapper did not call it when project
   props changed. The final scene API shares the initial project mapping, updates
   the model and feedback, and requests a frame. Its React effect precedes
   selection framing. The new shell fixture exercises empty/repopulated updates,
   effect order and the absence of scene remount or unnecessary camera travel.
2. **Reading portrait overflow:** the initial 390px capture exposed a 512px-wide
   document. The dossier inherited start alignment when its layout became a
   column flex container. Scoped `width: 100%` and `min-width: 0` contain the paper;
   refreshed 390px and 320px captures show complete wrapping without reducing text.
3. **Capture reliability:** half-scale browser compositor artifacts were rejected.
   The critic inspected the valid replacements, including the final desktop
   capture recovered with a fresh hidden tab. Those artifacts are not accepted as
   responsive layout evidence.

## Evidence reviewed

- Final model/runtime/React availability guards, screen texture repaint and
  visibility handling, reading filters, live/source components, CSS and relevant
  regressions.
- All six final images listed in the [evidence README](README.md): desktop detail,
  immersive portrait, reading portrait/narrow, dormant room monitor and populated
  reading categories.
- [Verification record](verification.json): **414/414** isolated full-suite tests
  passed. The only later implementation change was the disclosed reading-paper
  CSS correction; final renderer tests **15/15**, typecheck, affected lint and
  production build passed. The critic reviewed these records rather than claiming
  to have independently rerun the full suite.
- Independently compared the full-suite manifest to the checkout: only
  `app/globals.css` differed, matching the disclosed final hash. All **15** final
  source hashes and every candidate model dependency hash matched the reviewed
  checkout. Evidence links resolve.
- [Geometry inventory](geometry-inventory.json): zero structural deltas for its
  identical populated-category fixtures. Those fixtures do not measure dormant
  pixels or runtime performance. The inherited tool-method wording is explicitly
  qualified in the README.

## Limits

Browser interaction checks were performed by the implementing agent in hidden
Chromium; the critic independently inspected their captures and reviewed the
supporting source and records. There is no native Safari or physical-touch claim.
Content-change synchronization is supported by the real wrapper's hook fixture
and model tests, not a browser-driven Studio publish scenario. No CPU/GPU timing,
frame-pacing, measured memory or thermal gain is established or required for this
design change. The dark monitor deliberately retains its geometry and texture
allocation.
