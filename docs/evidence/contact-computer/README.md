# Contact computer — 16 September 2026

The main monitor hosts the Contact application. Landscape includes the new
82-key keyboard; portrait fits a tall, single-column application inside the
existing glass. The monitor geometry is not stretched. Both views share one
form, draft and submission state. This is an authored feature baseline, not an
optimization experiment or a change to the deferred lighting candidates.

## Submission boundary

Existing `/api/contact` saves general messages to the private inbox. No backend,
schema, delivery or calendar work was added. Optional company/subject are included
in the existing message field; an omitted name becomes `Name not provided` and
the existing internal intent is `project`. These categories are not shown as
visitor choices. Validation counts metadata within the existing 5,000 limit.

Call requests have no corresponding backend. They validate date, time, explicit
device time zone and shared fields, then acknowledge **demo only** before transport.
No call request is persisted, sent or booked. Drafts live in React state, including
across reading/interactive view switches and rotation, and disappear on reload.
Form controls fail closed before hydration; a no-JavaScript message retains the
configured email link. This prevents native GET fallback from exposing demo data
in the URL. Sample contact details remain explicitly identified.

`submission-check.json` records a real UI message reaching the existing local
inbox with an omitted name, company and subject. It matched exactly one disposable
test record, which was deleted afterward. The earlier demo message was absent
from the inbox. No private inbox contents, identifiers or credentials are retained.

## Verification and visuals

Live **built-in Chromium**, hidden from the user's desktop. Screenshots use actual
1280×720, 390×844 and 900×1200 CSS viewports. The verified rendering dimensions
are 2560×1440 / DPR 2 for 1280×720; 390×844 / DPR 1 for compact portrait; and
1732×2309 / requested drawing DPR 1.9245 for 900×1200 (the existing pixel budget
caps the larger buffer). The latter was reconfirmed on final source in a fresh
hidden tab. Browser screenshots are exported at CSS dimensions, not at the larger
desktop WebGL buffer size. An initial blanket DPR-1 note was corrected against
the renderer's actual metadata before committing the record.
They include WebGL and native CSS3D HTML, normal live lighting and 8K Earth; no
offline static-camera image is presented as the application. Compact rendering
retains its existing quality policy. Native Safari, iOS keyboard behavior and
physical touch were not tested. Desktop viewport overrides do not emulate those
devices or prove identical performance.

| Evidence | State |
| --- | --- |
| `room-computer-hover.png` | 1280×720: idle room, computer hover/focus after a bounded drag |
| `landscape-call.png` | 1280×720: initial call option with monitor and keyboard |
| `landscape-message.png` | 1280×720: message option and retained draft after reading-view switch |
| `portrait-form.png` | 390×844: app-only framing, single-column form and secondary email callout |
| `portrait-demo.png` | 390×844: explicit demo acknowledgment |
| `portrait-scrolled.png` | 390×844: lower time field focused; title bar/close remain visible |
| `portrait-large.png` | 900×1200: one form column even at 522 logical content pixels |
| `reading-view.png` | 900×1200: existing semantic layout with matching form and retained date/time |
| `message-success.png` | 900×1200: real local inbox acknowledgment |

Checked native mouse click and Enter activation, Back to room, copy/dismiss/reopen
email, form typing, date/time pickers, validation, scrolling, view switches and
viewport changes. An 83.8-pixel drag beginning on the computer recorded
`dragged: true`, `activated: false`, then sprang back; it did not open the app.
The closed room restored its idle screen. Native keyboard observation does not
prevent typing/shortcuts. Unit tests independently exercise held Shift+A, repeats,
individual release, Meta handling, composition, blur/visibility/close cleanup,
legend/cap transforms, reduced-motion settling and stable batching anchors.

The full suite passed **314/314**, with no skips, before the final local CSS
scroll containment and compact-inset correction. After the inset correction,
the 16 affected Contact/model tests, typecheck, affected lint and production build
passed. A final CSS-only `overflow: clip` correction was checked by repeating
lower-field focus, Tab and demo submission in the live browser, then rebuilding.
Build output retains existing large-chunk/deprecation
and route-classification notices. One test fixture's contextual typing triggered
an incorrect deprecated-overload lint finding; separating the stub object fixed
it. Contact tests additionally render the real form before hydration with valid
prefilled call/message drafts and verify that controls remain disabled. Demo
transport isolation and failed-send draft preservation are independently tested.
The hydrated landscape and portrait accessibility audits found zero violations
(24 passes each); portrait reading view also found zero (23 passes). The raw audit
outputs are retained beside these images. Audits supplement, rather
than certify, keyboard/screen-reader accessibility.

Review found and resolved: mismatched mouse-down/up computer selectors, columns
on larger portrait screens, unhydrated native demo submission, and native focus
scrolling the document instead of the app pane. A compact layout reservation was
also stabilized so overview pose calculations cannot alter the Contact HTML size.
An additional critic pass caught that `position: fixed` alone was insufficient:
`overflow: hidden` still allowed the host itself to scroll programmatically.
Both the active Contact host and window now use `overflow: clip`; only the inner
body scrolls. The lower-field and acknowledgment screenshots were refreshed after
repeating that interaction, with the title bar and close button still visible.
VisualViewport handling reduces
the inner scroll area when a phone keyboard obscures it, without moving the camera;
native-device verification remains outstanding.

## Design-cost comparison

`model-costs.json` and `compare-model-costs.mjs` compare baseline `d0fb599` with
archived current model sources. Both gzip archives include the model-owned source
and SHA-256 identities. To compare that Git baseline with the current working tree:

```sh
node docs/evidence/contact-computer/compare-model-costs.mjs d0fb599 /tmp/contact-model-costs.json
```

The two positional arguments select the baseline revision and output path. Restore
the candidate archive into an isolated checkout to reproduce this historical
candidate after the model changes. The script creates temporary source copies,
uses installed dependencies and never touches the studio database. The retained
inventory uses real Three.js geometry and canvas creation
dimensions with inert canvas drawing operations; it is not a GPU rendering run.

Wide and compact have the same delta: visible mesh structural submissions
433→438; triangle inputs 1,012,868→1,013,532 (+664); unique visible geometry/index
arrays 36,310,280→36,083,204 bytes. Including hidden variants, retained arrays
fall 388,324 bytes after removing the old Contact tablet. Instance arrays add
3,864 bytes. Structural submissions do not include frustum/occlusion decisions,
shadow/AO passes or actual renderer draw counting.

The 1024×512 keyboard label atlas adds 2,097,152 base RGBA8 bytes, or 2,796,204
nominal bytes with mipmaps (2.667 MiB). It is generated once, with no image-file
download. JavaScript delivery, texture upload/generation latency, steady CPU/GPU
time and actual process/GPU memory were not measured. No speed, temperature or
battery claim follows from these counts. Keyboard motion increments geometry
revision for GTAO; held settled keys add no continuing geometry updates. Animated
keys stay out of the cached static shadow map. Future timing comparisons must use
the ledger's rested, source-matched protocol and include typing and both camera
states; the old room baseline is no longer the same authored workload.

## Independent review

The independent critic approved the final source/evidence at **94/100**, with no
unresolved blockers: fulfillment/safety 30/30, visual composition 23/25,
interaction/accessibility 19/20, organization/performance discipline 9/10 and
verification 13/15. Initial approval was withheld for the correctness issues
above, including the ancestor-scroll defect found in the next visual pass. The
critic independently checked all 17 final source/test hashes and the archived
model identities, and viewed the refreshed lower-field/acknowledgment images.
Remaining deductions reflect the untested native Safari/touch keyboard and
steady timing, plus the relatively small secondary landscape text and need to
scroll within the monitor. No score overrides future user feedback.
