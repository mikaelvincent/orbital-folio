# Ivory / Carbon / Bronze — palette implementation

23 September 2026. Color-only implementation of the owner’s written anchors;
AI-cropped reference images informed color relationships, not scene structure.

## Scope and exceptions

Shared `lib/palette.ts` / CSS semantic tokens use ivory #EEE9DE, carbon #1F2730,
bronze #AA8054. Architecture and light panels are ivory, equipment is carbon,
and hardware/trim is muted bronze. The material saturation/darkening transform
was removed. Screen emission is neutral white to avoid tinting canvas artwork;
its existing intensity is preserved. Light/dark text and accessible bronze
variants replace low-contrast accent text. Legacy default orange metadata renders
as bronze without a database rewrite; explicitly saved nondefault custom accents
remain supported. Functional text is independent of that override.

Preserved exceptions: original photos, project media and custom brand artwork;
solar-cell blues; optical and instrument phosphors; blue coolant-vessel enamel;
satin alloy; linen, quilt, wood, natural paper texture and colored notebook
section markers; warm lamp emission; meaningful success/error colors; Earth/sky.
White multipliers preserve authored textures. Existing light/exposure settings,
geometry, room/camera layout, typography, material roughness/metalness, navigation,
dimming, animation, content, authentication and persistence are unchanged.
No held performance proposals were implemented or measured.

## Verification protocol

Live visual review uses the **hidden Codex built-in Chromium browser**, the main
localhost:3000 server, 1440×900 landscape and 390×844 portrait CSS viewports.
Production screenshots are actual viewport captures, not scaled fixtures; no
renderer effects are deliberately omitted. The additional ladder views use the
existing `spacecraft-polish-preview.mjs HEAD` finite geometry fixture at
1280×720 and 390×844. They use its static lighting/camera, omit GTAO and sky,
and have no persisted content or runtime navigation/dimming. They establish
ladder hardware color relationships, not production frame appearance. The
live overview also shows the complete ladder. Pixel dimensions/drawing buffer and state
samples are recorded alongside captures. Browser review does not establish native
Safari or iOS behavior. The preserved full-spread portrait notebook remains small;
Reading view remains its readable alternative, as previously approved.

Mutation-bearing tests run from a source-only disposable checkout on
localhost:3003 with fresh fixture-local D1/R2 state, test-only secrets, explicit
TEST_BASE_URL and isolated Vite cache. No private environment, database, uploads
or inbox records were copied from the main workspace. The fixture also hosts
studio and submission-state QA; the main store is not used for test writes.

## Evidence and checks

[Final source hashes](source.json), [capture dimensions and hashes](captures.json),
[check outcomes](checks/summary.json), rendered contrast/state samples and the
independent critic’s rubric/score are stored beside this record. Check logs retain
command output with trailing whitespace and surplus end-of-file blank lines removed.

- **512 distinct tests passed in partitions:** 379 non-content tests from the
  full-suite attempt, then all 133 content tests after fixture recovery. This is
  complete test-file coverage, not a claim of one uninterrupted all-green run.
  Three final CSS corrections followed the first partition; earlier and final
  hashes are retained. The final iris test comparator received a focused 10/10
  rerun after its lint correction.
- Final **typecheck, production build, affected-file Oxlint and diff checks passed**.
  All 42 final implementation/test file hashes match the completed check record.
- Rejected attempts remain in `checks/`: the first fixture lacked its initial
  owner claim and two assertions still expected superseded colors. A subsequent
  source sync unnecessarily rewrote Vite configuration, repeatedly restarting
  the fixture worker and producing API 500s. Skip-unchanged synchronization and
  a clean restart restored the fixture; all 133 content tests then passed.
  Neither failure involved the main store. An early preview with stale HMR CSS
  was discarded and recaptured after reloading the current styles.

## Visual coverage

The browser supplied JPEG-encoded screenshot bytes. Captures were losslessly
decoded to PNG without resizing or color edits; dimensions come from the image
decoder and both original encoding and final hashes are recorded in the inventory.

All five live scene views are captured at both landscape and portrait sizes:
[overview](overview-landscape.png), [Projects](projects-landscape.png),
[Case studies](case-studies-landscape.png), [About](about-landscape.png) and
[Contact](contact-landscape.png), with matching `*-portrait.png` files.
Exterior equipment, the dark floors and doorway signs are visible in these views.

Representative states include the [focused physical monitor](projects-focus.png),
[project library](projects-library.png), [immersive focused action](project-detail-focus.png),
[selected reading category](projects-reading-portrait.png),
[focused reading action](reading-detail-focus-portrait.png),
[mounted notebook](about-notebook.png), [contact form](contact-form-landscape.png),
[portrait form](contact-form-portrait.png), [contact validation](contact-validation.png),
[Tools menu](tools-menu.png), [Earth playback](earth-playback.png) and
[diagnostics](diagnostics.png). The immersive focused-action capture is portrait.
Room views include passive standby and unavailable cartridges. Browser clicks
exercise hover/pressed feedback; keyboard navigation exercises focus.

Studio captures come exclusively from the disposable fixture: [focused fields](studio-identity-focus.png),
[selected record and tab](studio-projects.png), [validation](studio-validation.png),
[confirmation dialog](studio-dialog.png), [portrait](studio-portrait.png) and
[successful draft save](studio-saved.png). The destructive dialog was cancelled.
The unchanged fixture draft was saved without publishing; the saved-state capture
also shows disabled media insertion controls. Studio portrait/save captures are
390×844. No inquiry was sent or call booked.

After review, all temporary browser tabs, the finite preview server and the
isolated API/studio server and store were removed. The existing main server
remained on localhost:3000 and returned HTTP 200.

The [landscape ladder fixture](ladder-landscape-fixture.png),
[portrait ladder fixture](ladder-portrait-fixture.png) and
[door detail](ladder-door-fixture.png) supplement the live exterior overview.
Their limitations are described in the protocol above; they are not live
production ladder-flight captures. Native Safari was not controlled or tested.

## Readability and scope checks

Representative local screenshot samples include lighting, emission, dimming and
antialiasing: Projects plaque 9.31:1, idle screen label 7.49:1, focused label
10.31:1, archive populated cartridge 8.24:1, unavailable cartridge 7.61:1,
Contact idle title 9.60:1 and mounted notebook body 5.90:1. These are approximate
local interior-glyph/background measurements, not an all-pixel/pose WCAG
certification; rectangles and the quantized mode method are in
`screenshot-contrast.json`. `rendered-colors.json` records computed foreground,
background, ancestor transparency/filter and focus colors from live HTML.
[HTML contrast samples](html-contrast.json) include the focused live action
12.47:1 in both views, selected reading category 7.16:1 after compositing,
studio validation 8.60:1 and success 7.44:1. Base bronze remains decorative;
functional text and selection/focus indicators use stronger tonal variants.

The critic identified inherited focus-ring aliases, weak studio selection
borders and dark/transparent reading-category labels/counts. Scoped ring aliases,
stronger selected borders and opaque accessible text resolve those findings.
Existing dimming/timing is preserved. Source integration audit compared 246
geometry/light/transform/material-property expressions across 18 spacecraft files
and found no differences. CSS declaration audit found no layout/typography/timing
changes; opacity and the old color-brightness filter were treated as color changes.

## Independent review

The [final independent critique](review.json) scored **94/100**, with no unresolved
findings or blockers. It preserves the rubric, resolved source/evidence findings,
independent rendered samples and limitations. The critic verified the final
source hashes and all 31 corrected capture dimensions/hashes before approval.
