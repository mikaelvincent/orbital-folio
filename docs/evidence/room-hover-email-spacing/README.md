# Room wall isolation and compact email callout

26 September 2026. Baseline: `c997981b83df1f704ffdeb5a67a67cbaa5c86ae6`.

The two center partitions previously used one material linked to both adjacent
cabins. Hovering Case studies therefore brightened the Projects-facing wall;
Contact likewise brightened the About-facing wall. Each face now uses its own
cabin's material and reader-dismiss ownership. The physical partition, geometry,
camera and shared iris/tunnel lighting are unchanged. Selection, transit and
reader-wall feedback obey the same per-face ownership.

The shared ContactForm email callout previously stacked two 44px rows, separating
the short label and address excessively. Both rows now use 28px minimum height,
with centered text/icons; dismiss/copy controls retain their 44px width. The
callout is 66px high for the standard email, down from 98px. Longer addresses may
still wrap. Email links and dismiss/copy behavior are unchanged. A first 32/44px
row experiment left the label off-center and was replaced before final captures.

## Visual checks

All images are live rendering in the hidden built-in Chromium browser using the
existing development server. No finite fixture, native Safari or disabled-effect
substitute was used. No console errors were reported. Pointer drags from empty
sky onto labels exercised room hover without navigating. Camera/background motion
is live; these are visual checks, not fixed-time performance comparisons.

| State | Wide | Portrait |
| --- | --- | --- |
| Case studies hover | [Capture](case-studies-hover-wide.png) | [Capture](case-studies-hover-portrait.png) |
| Contact hover | [Capture](contact-hover-wide.png) | [Capture](contact-hover-portrait.png) |
| Contact room application | [Capture](contact-app-wide.png) | [Capture](contact-app-portrait.png) |
| Contact Reading view | [Capture](contact-reading-wide.png) | [Capture](contact-reading-portrait.png) |

Wide hover used an actual 1280×720 CSS viewport at device DPR 2, with browser
screenshots returned at 1280×720 pixels. Final wide contact captures used an actual
1280×720 viewport at DPR 1 after a viewport override. Portrait was an actual
390×844 viewport at DPR 1, with matching image dimensions. Rendering-buffer size
was not recorded. Final contact images all match the final 28px-row CSS. The
portrait reading capture includes keyboard focus on the dismiss button; its
dismiss/reopen and focus restoration were exercised. No contact message, call
request or mail draft was submitted. Temporary browser tab/viewport were cleaned
up, and the main server still returned HTTP 200 at localhost:3000.

## Verification and cost

The new raycast regression checks actual batched partition faces in wide and
compact layouts, covering all four cabins' hover/selection/transit, return to
idle, and Projects/About/Contact reader dimming and wall feedback. All four tests
fail against the baseline model and pass against the fixed model. The initial
test harness used a nonexistent model cleanup method; that hook was removed
before the successful run. Existing full-suite coverage also checks the shared
iris/tunnel behavior.

The independent per-face materials prevent the two opposing faces batching into
one mesh on each deck: an expected two additional mesh submissions when both
partitions are visible, with unchanged triangles. No timing, thermal or battery
benefit is claimed. Compact controls use 28px CSS minimum height and 44px width,
smaller than the former touch target. The in-room window can scale those controls;
this is not an accessibility-compliance claim. Native Safari and a physical touch
device were not tested.

Verification ran in a disposable source-only checkout with fresh test secrets,
D1/R2 state and explicit `TEST_BASE_URL=http://127.0.0.1:3033`, preserving the
owner's server/store. The full run passed 593 of 595 tests; two initial API tests
received `403 Owner access required` because the fresh fixture had not yet
claimed its test owner. Both passed on the focused rerun after the fixture's
owner setup completed, accounting for all 595 passing tests. Typecheck, affected
TypeScript/test lint, and the production build passed. No failing check remains.
The temporary server, checkout and emulator state were removed. Diff, evidence
links and [source identities](source-hashes.json) were checked.

## Independent critic

A separate critic reviewed final source, tests, current-context changes, hashes
and all eight final images: **94/100**, no implementation blockers.

| Rubric | Score |
| --- | --- |
| Fulfillment | 25/25 |
| Correctness | 24/25 |
| Visual quality | 19/20 |
| Evidence | 17/20 |
| Scope/performance | 9/10 |

The critic requested that control-size notes distinguish CSS dimensions from
scaled in-room targets; that wording is corrected above. The review's remaining
completion gates were the required suite/build and replacing pending-results
wording, both now complete. Native Safari and physical-touch verification remain
outside the evidence. The first spacing experiment and a focus-only overview
capture were discarded; all retained images match the final relevant source.
