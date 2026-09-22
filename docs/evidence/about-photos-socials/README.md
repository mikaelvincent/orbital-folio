# About photograph and social cards

22 September 2026; baseline `04f678e`. The owner approved implementation after a
design proposal. The passive mounted photo now uses the existing identity
portrait, with independent room and Reading view crops. Three equal paper prints
above the notebook use explicitly assigned social links, optional photos, shared
platform icons and the established dim/focus feedback. Contact assignments and
room camera framing are preserved. No owner content was populated or rewritten.

## Evidence and method

- [Desktop room](room-desktop.jpg), [keyboard focus](room-desktop-focus.jpg),
  [phone focus](room-phone-focus.jpg), [narrow room](room-narrow.jpg) and
  [narrow focus](room-narrow-focus.jpg): actual live application in hidden built-in
  Chromium at 1280 × 720, 390 × 844 and 360 × 800. These are viewport screenshots,
  not resized desktop images or native Safari tests. DPR/drawing-buffer and room
  state are retained in [final capture records](browser-captures.json). The
  [screenshot manifest](screenshot-manifest.json) records actual image sizes and
  hashes; the browser returned JPEG bytes, retained without conversion or scaling.
- [Empty room](room-empty.jpg) retains the landscape and three passive prints,
  with zero About native links. [Overview](overview-inert.jpg) hides all three
  configured targets; [Contact](contact-regression.jpg) retains the original two
  sample links independently of the temporary About records.
- [Reading view desktop](reading-desktop.jpg) and [phone](reading-phone.jpg)
  exercise the same selected portrait and links. Links are 44 pixels high with
  14-pixel labels; the measured desktop document width equals its viewport.
- Studio screenshots and [studio QA](studio-qa.json) use a finite component
  fixture with actual studio components/styles at desktop and phone dimensions.
  They cover independent crops, keyboard sliders, draft/live positions, conflicts,
  image selection and required fields. This fixture does not establish backend
  persistence or real upload behavior; the isolated API tests cover those paths.

The full application used a disposable source checkout, fresh isolated D1/R2,
test-only secrets and server on localhost:3003. A synthetic illustration with
numbered crop landmarks exercised real uploaded image bytes and three temporary
social records (GitHub with photo, LinkedIn without photo, custom website with
photo). Their destinations were harmless example.com paths. The fixture records
were cleared and original fixture identity restored before the full suite. They
were reseeded after checks for the final square-frame captures, then cleared
again. Reader captures precede only the room-frame revision; their independent
square portrait crop and reader implementation are unchanged. Main
localhost:3000 identity, uploads and private configuration were never copied or
mutated.

[Browser observations](browser-observations.json) preserve the earlier target
measurements and final corrections. At 360 × 800, each final native target is
24.19 × 24.19 pixels with 3.44 pixels between adjacent target bounds. At 390 × 844,
targets are 26.31 square; at 1280 × 720 they are 60.56 square. These are neutral
room measurements at the recorded viewport, not a guarantee at every possible
viewport or dragged angle. The same destinations remain available as larger
Reading view controls.

Keyboard focus selects one bright card and inset rim, with a full-size label.
Enter opened the configured GitHub example URL in a new tab while leaving About
open. A mouse drag beginning inside the first card moved 122 pixels, recorded
`dragged: true`, `startedOnControl: true`, `activated: false`, stayed in About and
left one tab open. No warnings or errors were observed in the final populated
room/reader/overview browser session.

## Revisions and limits

The initial 0.38 × 0.34 prints produced only 23.54-pixel-high targets at 390 × 844.
They were rejected and replaced by 0.38-square prints; canvas and studio previews
were updated together. The camera, notebook and card centers did not change.
The owner then requested the main photograph and its physical object be square.
The final printed face is 0.44 × 0.44 local units, with resized backing and correctly
positioned retainers. Raising its center from 2.01 to 2.0275 preserves the old
lower edge and avoids colliding with the right social card. The studio room crop
and 1024-square print match; the separate square reader crop remains independent.
Room and portrait-editor evidence was refreshed for this final source.

Review also found inherited notebook CSS distorting reader controls, a studio
crop preview missing the actual platform badge, and photo loading unnecessarily
delaying scene readiness. All were corrected before final evidence.

Browser full-page captures showed tiling/scaling artifacts; screenshots taken in
the same call as a following viewport resize could capture intermediate sizes.
Those captures were rejected and replaced with viewport-only captures. Repeated
capture names in the raw observations refer to earlier attempts; the last record
and the separate final-capture file identify the retained image. Formatting-only
changes after room capture do not affect rendering.

Native Safari, a physical touch device, native pointer-hover movement, live OS
reduced-motion changes and timed CPU/GPU/memory measurements were not tested.
The source/model regressions exercise shared feedback availability in travel and
reading states; browser keyboard focus exercises its actual rendering.

## Resource implications

This adds up to three native targets and highlight rims. Static model inventory
after geometry batching finds 136 triangles per rim, 408 total. Four configured
paper textures (1024 × 1024 and three 512 × 512) have 9,786,704 nominal RGBA8 bytes
including mipmaps, approximately 9.33 MiB. They replace existing paper textures.
This estimate excludes uploaded image decode buffers, canvas copies, other
textures and driver allocations. Images deduplicate by URL within one scene;
fallbacks render immediately and pending image handlers are cancelled on disposal.
No performance optimization or unmeasured heat/battery improvement is claimed.

## Validation and review

[Validation](validation.json) records **453/453 passing tests**, zero failures or
skips, production build (including geometry precheck), typecheck and affected
lint. Complete command logs are linked from that record. The API suite ran only
in the disposable checkout, with an explicit test base URL and fresh test-only
storage. [Source hashes](source-hashes.json) and the independently captured
[validation source](validation-source.json) identify the matching implementation.

The [independent implementation review](review.md) scored **92/100**, approved
with no unresolved blockers. Its rubric gives visual quality and visitor
experience substantial weight and records the remaining platform limitations.
After verification, temporary browser tabs and both review servers/checkouts
were removed. The main localhost:3000 server returned HTTP 200.
