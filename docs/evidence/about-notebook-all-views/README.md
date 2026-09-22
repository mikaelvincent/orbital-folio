# Notebook content in every camera view

23 September 2026. Baseline: `cd20515`.

The previous implementation retained the real Markdown through About's reading
zoom, but still hid it during cross-room entry and unmounted it in overview or
another room. The notebook now owns a dedicated native surface for the entire
immersive scene. Its content and automatic pagination stay mounted through
overview, room travel, reading zooms and other rooms' applications.

## Visibility and interaction

Actual opaque scene geometry supplies a partial SVG luminance mask for each ink
surface. Overlapping black blocker polygons form a union rather than punching
holes into each other. The existing iris aperture silhouette replaces the raw
shader-clipped blade stock. Instancing, reflected transforms, material sidedness,
invisible ancestors and camera near/far planes are respected. The notebook's own
geometry is excluded; its existing page-turn cutout remains independent. Turning
front/back/under-page surfaces receive masks for their own physical anchors.

Masking and back-facing opacity retain the DOM's fixed layout, so occlusion cannot
reset measured page counts. The room/overview preview remains inert, excluded from
accessibility navigation and click-through. Only a settled open About notebook
becomes interactive or takes the `world-reader` focus/skip-link ID. Other room
readers keep their existing host. The About-specific fixed layout remains scoped
to About rather than expanding to every room merely because the notebook exists.

## Live browser evidence

Hidden built-in **Chromium**, live main development server and existing published
sample content. No content/authentication writes. Desktop viewport: **1280×720,
DPR 2**. Portrait viewport: **390×844, DPR 1**. Captured images use viewport pixels;
they are not drawing-buffer screenshots or enlarged/cropped scene fixtures. Normal
lighting/postprocessing ran; no effect was disabled for these captures.

| Check | Evidence |
| --- | --- |
| First real page already visible in overview | [Desktop overview](desktop-overview.jpg) |
| Native ink stays on the physical book during room entry | [Entry sample](enter-about.jpg) |
| Ink remains after About → overview | [Returned overview](returned-overview.jpg) |
| Visible notebook in neighboring About, partially covered by the room structure | [Contact room](contact-room-partial.jpg) |
| Printed backs and fronts remain on multi-section turns | [Reverse leaf](section-turn-0.jpg), [front leaf](section-turn-2.jpg) |
| Later page survives closing and visiting Contact | [Closed book](later-page-room.jpg), [returned room](return-about-room.jpg), [reopened reader](later-page-returned.jpg) |
| Contact reader coexists without duplicate focus IDs or notebook styling | [Contact screen](contact-reader.jpg), [DOM/focus observations](contact-reader.json) |
| Portrait overview, drag/release and room/reading views retain the same spread | [Overview](portrait-overview.jpg), [drag/release](portrait-drag-release.jpg), [room](portrait-room.jpg), [reader](portrait-reader.jpg) |
| Fresh direct `/about?open=1` reaches the first real page | [Direct entry](direct-entry.jpg) |

[Continuity observations](continuity.json) hold an actual `.notebook-columns`
reference across UI actions, comparing its identity, connection and text at 18
samples per check. All samples retain the same connected node/text with `display:
block` through desktop entry/exit, opening, later-page closing, departure for
Contact, reopening, portrait resize and portrait room entry. Mask polygon counts
change during camera travel rather than toggling the whole surface off. The initial
3-second observation reached the browser-tool timeout and was discarded; retained
probes use 18 × 95 ms sampling. Screenshots are separate samples, not a continuous
video or proof of every frame. Redundant settled captures were removed.

[Browser state records](browser-states.json) include page/count state, mask work
counts, idle cache reuse, interactivity, viewport and focus-ID counts. Counts are
in DOM order: the selected section first, followed by measurement sections.
The later-page route uses Learning notes, page 2 of 4. Contact's active reader has
one `world-reader` ID, normal `filter: none` and normal input while notebook content
remains mounted/inert. Escape restores Read notebook focus in About. Browser
warning/error logs were empty after desktop, portrait and direct-entry checks.

## Geometry checks and cost

Six focused regressions compare projected coverage with Three.js pixel rays and
exercise overlapping/partial masks, geometry behind the page, eye/near/far clipping,
reflected and instanced meshes, cache invalidation and four iris opening states.
They include 6,500 ray comparisons. The
[finite model inventory](structural-work.json) identifies fixture/model/helper
hashes and viewpoint matrices. Three synthetic viewpoint probes and the production
notebook reading-fit eye visit 8,364–35,652 triangles out of the fixture's 1,003,510
visible triangles, emitting 0–312 polygons. These are structural CPU-work/path
counts, not live browser timing, GPU work, process memory or a speedup claim.

The implementation adds no scene mesh, material, texture asset or render pass by
source inspection. It adds CPU geometry bounds/chunk caches and SVG mask updates;
unchanged camera/geometry state reuses coverage. Markdown/media also mount earlier,
at scene entry. Dynamic CPU/CSS-mask costs have not been timed. The existing
192-segment iris silhouette is the aperture approximation. Low-opacity (below
0.98), alpha-tested, alpha-map and transmissive materials are excluded; near-opaque
materials are blockers even with `transparent: true`. Opaque backing geometry
still masks ink. No camera framing, orbital placement or held optimization candidate changed.

## Verification and review

**509/509 tests passed**, plus typecheck, affected lint/format and production build.
The [isolated verification record](checks/verification.json) contains final test,
typecheck, lint/format and production-build results, exact source hashes and logs.
The full suite runs from a disposable source checkout on loopback port 3003, with
fresh D1/R2 state, test-only secrets and a private Vite cache. No main database,
uploads or private environment file is copied. Application/test source remains
unchanged after the checked snapshot and matching visual captures; later
documentation changes are identified separately. Terminal padding and empty final
lines are trimmed from retained logs; their messages and results are unchanged.

The [independent review](critic.md) records its rubric, final score and findings.
Native Safari, physical touch and live OS reduced-motion were not tested. Model
tests cover reduced-motion settling. Portrait retains the intentionally small
desktop spread; this work does not implement the deferred mobile redesign. Drag
evidence is a real drag/release sample, not a certified full-envelope sweep. No
performance or battery conclusions are drawn from the visual checks.
