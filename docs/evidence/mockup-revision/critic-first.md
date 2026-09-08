# Independent critique — first working v5.1 revision

9 September 2026. Reviewed the supplied fresh `docs/evidence/mockup-revision/desktop-overview.png`, compared with original mockups01–05 and07, and read the current spacecraft, environment, immersive navigation, world-reader and CSS source. No checkout changes, shared browser operations or final score.

## Visual assessment of the supplied overview

The silhouette and discovery model are much closer to the references. The three front-facing project lockers carry actual content; rooms have substantial frames; the upright paired solar panels improve the original composition; About now reads as enclosed. The cream navigation matches the intended ship materials. These are observable improvements in the supplied image.

The render is not yet at the premium visual target. The broad hull faces read as uniformly white and weakly shaded, the interior lights read as narrow yellow strips without much warm falloff, and the Earth occupying the lower third is visibly smeared/blocky. Compared with mockup03, the hull needs clearer curved volume and separation between ivory exterior, warm recessed lining and dark joints. The room interiors should have soft contact depth around lockers, sill and floor. Adding tiny geometry will not resolve these issues.

Bounded visual fixes:

1. Tune the lighting/material balance with two or three fixed-camera comparison renders. Current exposure1.12, hemisphere0.62, environment0.43 and three fairly strong directional lights may be flattening the midtones together. Retain a soft bright exterior, but make interior warm lighting and contact shadows distinguishable. Avoid solving this by darkening everything or turning thin seams black.
2. Compare Earth day-only, day+clouds and full atmosphere at the same time/camera. Identify whether blur is source resolution, grazing texture magnification, dense cloud cover or compositing. The existing4K day747KB plus4K cloud2.1MB download is already substantial; resolution should buy visible detail. Verify provenance if the cloud source is merely upscaled from the2048px source described in the older document. The original reference's crisp blue limb and lower-left Earth placement matter more than a larger file alone.
3. Verify the major curved edges at DPR1 and in a slow cursor sweep. The supplied still cannot establish that black seam shimmer is solved. The left docking sleeve in particular still has very narrow dark rings that deserve a close-up stability pass.
4. Require new room/reader/hover/mobile images before approval. One overview cannot establish whether the physical reader and small-screen framing meet the new direction.

## Concrete source findings to fix or verify

- **Invalid reader state from URLs.** An independent call to `destinationFromURL` returns `open:true` for both `/?open=1` and `/projects?open=1`. `WorldReader` then falls through to its ContactForm branch because neither has a project. Restrict explicit `open` to the supported nonproject reader sections; a project reader requires a resolved project slug.
- **Contact return state is dropped.** `/contact?sent=1` and `?error=1` parse flags but leave the instrument closed. `WorldReader` does not pass those flags to `ContactForm`. A successful native submission or reload of its URL therefore loses visible feedback after enhancement. Preserve the flags, open the relevant instrument, and pass the initial result into the form. Compare these flags in same-destination/history handling where needed.
- **Chapter navigation is unbounded inside fixed paper.** Experience and About render every record as a nonwrapping footer button. At compact360px logical width, even six44px chapter buttons plus arrows, gaps and padding exceed the paper width. The article uses `overflow:hidden`, so additional admin-managed records can become clipped. Use a bounded chapter window or a compact chooser; exercise more than three records.
- **Reduced motion still changes the view on hover.** `hoverLift` is set instantly when stopped, but `distance * (1 - .025 * hoverLift)` remains unconditional. Background receives live pointer coordinates while stopped as well. Gate hover dolly and background parallax off for paused/reduced motion, alongside the rotation already disabled.
- **Small-screen text is scaled down by the world camera.** At320×568, reading distance8.7 with38° FOV projects the2.4-unit paper into roughly228 screen pixels from its360px logical width: an18px body becomes about11.4px. Fit the paper against the available viewport width and height or intentionally enter a readable layout when the physical surface cannot maintain legible text. Test320px and real200% browser zoom; Three's installed CSS3DRenderer documentation explicitly says it supports100% browser/display zoom only.
- **Contact compact selectors do not match the component.** New CSS targets `.contact-form` and `.intent-options`, but `ContactForm` renders `.comms-screen`, a plain form, and `.intent-field`. The intended compact layout/font overrides therefore do not apply.
- **Avoid text DOM replacement every frame.** Each draw assigns every hotspot's `textContent`, even if the label is unchanged. This replaces text nodes at the scene refresh rate and adds layout work. Update on content/page changes or compare before writing. This is an avoidable cost in the new CSS3D architecture.
- **Return focus to the opened object.** The current arrival effect focuses the first available hotspot. Closing the second/third project therefore returns to the first instead of its source. Preserve the originating slot or slug for focus return; global nav remains an appropriate fallback.

## Improvements confirmed in source, awaiting browser proof

The flawed30fps modulo-less cap has been removed. The renderer now uses a single requested frame, accumulated clamped active time and delta-based camera damping, with resume timestamp reset and hidden-flight offset. Earth rotation/clouds/twinkle/meteors consume that active clock. Section pick proxies avoid full-model pointer raycasts. Physical doors/readers retain independent motion groups, and static geometry receives separately batched treatment. Hidden world surfaces and hotspots are made inert and CSS3DRenderer hides invisible objects. These address the earlier architectural findings, but source review does not substitute for actual pause/visibility/frame-time and hidden-control evidence.

Physical paper is currently positioned using duplicated hard-coded deployed coordinates, while the model exposes actual `readerSurfaces`. The current final dimensions match by inspection, but attaching the CSS surface to the model's world matrix would avoid alignment drift after future asset changes. At minimum assert their four-corner agreement after every pose change.

## Review status

No final score. The supplied overview supports closer art direction, but the visible lighting/Earth shortcomings and concrete reader state/scale issues prevent visual and interaction acceptance. Five equally weighted criteria and the90/100, each≥8 target remain unchanged. The previous revision's score and screenshots are not evidence that these new behaviors pass. Hosting's already documented external incident remains separate from this local revision.
