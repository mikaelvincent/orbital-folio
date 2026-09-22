# About social icons — 22 September 2026

The owner requested icons alone on the three cards above the notebook, popular
preset choices and ordinary downloadable SVG/PNG uploads. This supersedes the
photo/badge/caption treatment in [the preceding implementation](../about-photos-socials/README.md).
**Later size refinement:** the owner requested smaller marks matching Contact.
The current extent is 50%; this page's 72% treatment and original captures are
historical. See [the current sizing comparison](size-refinement/README.md).

Baseline: `998dd57`. The square portrait, card mounts, notebook, camera fit,
Contact placement and native link behavior are preserved.

## Delivered design

Each configured cream card carries one centered mark at 72% of its face width.
The studio offers twelve recognizable brand marks plus Website and Custom (14
choices); [upstream sources and licenses](../../social-icons/README.md) are pinned.
A custom icon replaces the preset in About and its readers. Selecting a preset
clears the custom override without deleting the library asset. Custom images use
contain sizing, preserving their colors, transparency and full aspect. Legacy
social-photo fields remain round-trippable but are neither drawn nor fetched and
no longer lock media publication/deletion. The main portrait remains unchanged.

The uploader accepts standard static SVG (1 MiB) and PNG (5 MiB), decodes them in
an image context and stores a PNG bounded to 512 pixels (384 only for unusually
large encoded output). Ordinary SVG namespaces, public doctypes, groups,
transforms, classes, currentColor, local definitions/references and gradients are
supported. Scripts, animation and external resources are rejected. Uploaded SVG
markup never enters the live DOM or the media server. The restricted image
context is described by [MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image)
and [SVG 2](https://www.w3.org/TR/SVG/conform.html).

## Browser evidence

Hidden built-in Chromium, live application rendering, actual CSS viewports
1280 × 720, 390 × 844 and 360 × 800. Captures are unscaled viewport screenshots;
the initial half-size browser capture was rejected and replaced after resetting
its viewport. Native Safari, physical touch, pointer-hover movement and OS
reduced-motion changes were not tested. No timing or memory comparison was run.

- [Desktop room](about-desktop.jpg): existing local square dummy portrait and
  GitHub, LinkedIn and Website marks; no photograph under any social icon.
- [Desktop keyboard focus](about-keyboard-focus.jpg): native GitHub link and
  readable destination label. Pure model tests cover dim/focus/travel states.
- [Phone room](about-phone.jpg), [narrow room](about-narrow.jpg): neutral targets
  measure 26.31 and 24.19 CSS pixels respectively (desktop 60.56).
- [Phone Reading view](reading-phone.jpg): full names and wrapping native links.
- [Preset picker](studio-presets.jpg): complete 14-choice grid, selected state,
  and the established studio form treatment. Changing the preset preserves URL.

Main localhost:3000 was read-only throughout this change. Upload/publication
checks use a disposable source checkout on localhost:3003 with fresh test D1/R2
and test-only secrets. The main database, environment and uploads were not copied
or mutated. Browser fixture details and final review are recorded below.

## Verification and revisions

See [validation metadata](validation.json) for exact commands, source hashes and
logs (trailing whitespace trimmed). The 465-test full suite passed before the final Studio-only fixes; focused
helper tests, typecheck, affected lint and production build were repeated on
final source. The unchanged renderer/content portions are covered by the full
suite. Unit/API checks include PNG resolution, inactive legacy photos, private
media/alias and MIME guards, atomic slot claims, backup round-tripping, image
contain sizing, load failure, disposal and room interaction availability.

Independent review identified a preset/upload timing race. Preparation now
locks preset selection as well as the upload controls, with cleanup on success,
failure and unmount. Further helper checks preserve explicit SVG dimensions and
reject CSS animation as well as SMIL animation.

The first real downloaded SVG upload failed because the existing CSP disallows
blob image URLs. The converter now uses FileReader data URLs, which the existing
policy permits; no CSP capability was expanded. Intermediate passing unit/build
results did not establish upload success and are retained as intermediate logs.
The browser upload checks below were repeated against the corrected helper.

### Final upload workflow

The corrected real studio accepted an unmodified pinned Simple Icons Discord SVG
(1,374 bytes), a rectangular SVG with a public doctype, namespaces, classes,
currentColor, transform, gradient, local use and clipPath, a 2,404,540-byte
transparent PNG, and a 1400 × 700 transparent PNG. All became private PNG media;
outputs preserve alpha and were 512 × 512, 512 × 256, 512 × 307 and 512 × 256.
[Input/output metadata](browser-uploads.json) records hashes and sizes. Small
[representative fixtures](upload-fixtures/) are retained; the large synthetic PNG
is identified by its hash rather than adding a 2.4 MB testing asset to the repo.
Discord's SVG uses the same CC0 source revision recorded in social-icons sources.
The two geometric fixtures are authored test images, not additional presets.

A linked-file SVG was rejected with guidance to use a self-contained SVG or PNG.
A corrupt PNG passed the signature preflight but failed actual browser decoding
with a readable error. Neither failure replaced the selected asset; controls
unlocked afterward. Choosing GitHub then cleared the custom image and selected
media ID and set the preset's pressed state; the destination remained unchanged.
Explicit icon publication, draft save and link publication succeeded in the
isolated studio. The fixture's three published slots were then arranged through
the same authenticated API for room/reader inspection.

[Custom SVG editor](studio-custom-svg.jpg) shows the faithful cream surface and
uncropped rectangular artwork; [phone picker](studio-phone.jpg) has no horizontal
overflow at 390 pixels. [Custom cards in the room](custom-icons-room.jpg) show
Discord, the styled SVG and transparent PNG at their complete proportions.
[Custom reader icons](custom-icons-reader.jpg) load in contained 19 × 19 boxes,
with 44-pixel link heights and full names. The final room/reader tab logged no
warnings or errors. Image-load fallback and disposal are verified by focused
canvas tests; a live failed-network-image browser simulation was not performed.

## Independent review and completion

The independent critic scored the completed change **94/100**, with no unresolved
blockers. [The full rubric](review.md) records fulfillment, visual quality,
correctness/safety, evidence, organization/performance, revisions and limitations.
Temporary review tabs were closed, the viewport reset, and the disposable test
server/state removed. Main `http://localhost:3000/about` responds HTTP 200.
