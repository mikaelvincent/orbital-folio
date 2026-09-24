# About interaction polish

24 September 2026. Baseline: `4c0644f9dd88c17e6ddc180233f4ea475e2b2d74`.

## Design and behavior

Social prints now put the owner-authored destination below the icon, with an
outward arrow for web links. The icon keeps its half-card extent and moves up to
make room for the caption. Long names ellipsize; native link labels retain the
complete destination. Email links omit the new-tab arrow. The floating tooltip
and bronze hover frame are removed. The established 0.65→1.15 brightness easing
remains, and keyboard focus adds a carbon outline. The studio preview matches the
composition and proportional typography.

Notebook marker hover now fades in an ink underline and strengthens the section
number. The paper color, label position and plain selected state remain stable.
Keyboard focus retains its outline; reduced motion disables the CSS transition.

Investigation separated two overlaps. A raised page projects past the resting
page edge and can correctly hide part of a stationary tab. That physical occlusion
remains. The carried tab's buried 30px adhesive strip, however, was rendered above
the moving paper in both directions. Only the exposed 125px now has visible mesh
and printed faces, with cropped UVs preserving the original label placement and
full logical anchor. No tab is forced to draw over the page.

A second related defect emerged in reverse-turn capture: a stationary tab's
native text showed through the carried tab passing over it. The existing native
ink occlusion mask now includes the carried tab's actual mesh during boundary
turns. It respects ordinary geometry depth and uses the existing mask pipeline;
the page-turn cutout remains unchanged. The extra geometry is considered only
while a section tab is moving.

## Rendered checks

Hidden built-in **Chromium**, live development renderer at localhost:3000,
existing published content, no content writes. Landscape viewport **1440×900**;
initial investigation captures used **DPR 2**. Final captures use **DPR 1**
after the portrait override, except the separately verified notebook keyboard
capture at **DPR 2**. Portrait is **390×844, DPR 1**. Screenshots contain actual viewport pixels,
with normal live scene lighting, shadows, AO and adaptive drawing buffer; they
are not finite isolated model renders. One landscape observation recorded a
2529×1581 drawing buffer before the portrait check; final social checks record
1440×900. Resolution differences mean these are not pixel-matched comparisons. These are functional/visual checks, not timed benchmarks.
Native Safari, physical touch and the authenticated studio preview were not
visually tested. Studio preview composition was checked in source.

- Social idle, pointer hover and native keyboard focus; all three destination
  URLs/target attributes checked without opening external sites.
- Notebook idle, right marker hover, left marker keyboard focus, forward/reverse
  boundary turns and the internal page turns crossed along those routes.
- Portrait room and mounted reader retain the established scaled desktop spread;
  tiny text at that scale is an existing limitation, with Reading view available.
- Browser warning/error log was empty during checks.

The browser API provides virtual drag rather than a standalone hover move;
short drags ending over the target established real pointer hover, confirmed with
`:hover` and active-state reads. Keyboard checks used native Tab/Shift+Tab.
Turn frames are consecutive live samples, not exhaustive frame-by-frame proof.
HMR/loading captures were rejected and refreshed. Before-turn images contain the
new social cards but original notebook geometry/feedback; they isolate the
notebook defect, not a whole-scene baseline.

| State | Evidence |
| --- | --- |
| Social cards | [Rest](social-idle.png), [hover](social-hover.png), [keyboard](social-keyboard.png) |
| Notebook markers | [Rest](notebook-idle.png), [hover](notebook-hover.png), [keyboard](notebook-keyboard.png) |
| Buried adhesive before the fix | [Forward face](before-turn-3.png), [reverse face](before-turn-4.png) |
| Corrected moving marker | [Forward sequence](after-forward-3.png), [reverse overlap](final-overlap-1.png) |
| Portrait | [Room](portrait-room.png), [notebook](portrait-notebook.png) |

[Capture identities](captures.json) bind final source and PNG hashes;
[browser observations](browser-checks.json) record actual dimensions and limits.
[Keyboard focus observations](notebook-focus-check.json) confirm the refreshed
marker capture uses native focus-visible and a 2px outline.
The numbered before/after PNG series retain the surrounding live samples.

## Verification and review

Focused regressions cover configured safe destinations, independent card
brightness, full custom-icon proportions, failed/disposed image loads, bounded
long names, email arrow semantics and buried adhesive visibility from both sides
through forward/reverse turns. Existing notebook registration, pagination,
retargeting, bank and reduced-motion coverage remains.

The final full suite passed **519/519**, with zero skipped tests. Typecheck,
production build and affected lint also passed. Tests ran from a disposable source
copy against **TEST_BASE_URL=http://127.0.0.1:3003**, fresh isolated D1/R2 and generated
test-only secrets, with a separate Vite cache. No main private environment, database
or uploads were copied. [Final verification](checks/validation.json) records exact
source hashes and logs; [focused notebook checks](notebook-checks.txt) passed 27/27.
The earlier 518-test pass predates the carried-tab ink fix and is retained as
[superseded evidence](checks/superseded-test-run.json), including its interrupted
build. Log trailing whitespace is normalized without changing outcomes.

The [independent critic](review.md) reviews the final source, captures and checks.
Temporary browser tabs were closed and the viewport override reset. The main
server remains at localhost:3000.

There is no measured performance claim: captions
use the existing static canvas maps; the old tooltip work and social rim geometry
are removed, and hidden tab geometry is cropped. No texture request, render pass,
or frame-loop text painting is added. The moving tab adds its three existing
meshes (60 input triangles) to the existing native-ink mask during boundary turns; stationary frames retain cache
reuse. This additional projection work has not been separately benchmarked.
