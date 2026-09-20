# Independent critic review — portrait Earth placement

Reviewed 20 September 2026 by the independent `portrait_earth_review` agent.
The reviewer inspected source, documentation, rendered captures and verification
records; it did not edit the implementation. This review is the reviewer's only
file change.

**Final score: 94/100. No unresolved blockers. Recommendation: keep.**

| Criterion | Score | Assessment |
| --- | --- | --- |
| Request fulfillment | 25/25 | The portrait overview now places Earth's horizon below and toward the left of the spacecraft, resolving the previous vertical strip on the right. Landscape composition remains intact. |
| Visual quality | 28/30 | Phone and tablet views have a coherent cinematic horizon and recognizable illuminated geography beneath the ship. The blue crest remains restrained. The Earth occupies a substantial lower portion of the phone view, but supports the requested composition without covering the title or controls. |
| Correctness and regression protection | 23/25 | Compensation uses the live layout roll, the correct physical pivot and the authored transform rather than accumulated rotations. Ordinary camera movement and physical sky motion remain. Tests cover intermediate rolls, a round trip to zero, changed camera poses, texture phase and resource reuse. Coverage is carefully bounded rather than claimed universal. |
| Organization and scope | 9/10 | The runtime change is localized to the existing environment/camera boundary, with current project instructions and context updated. No unrelated optimizations, new assets or camera behavior were introduced. |
| Verification and performance honesty | 9/10 | The full suite, typecheck, affected lint and build passed; both geometry audits and actual viewport captures are retained. No unsupported frame-time or thermal claim is made. Safari and exhaustive live transition recording were not performed. |

## Findings and resolution

- The camera applies the inverse spacecraft layout roll. Earth and its atmosphere
  now receive the corresponding conjugated world rotation, including reference
  translation and orbital scale. This produces the desired unrolled Earth view
  without substituting an unrolled camera for the whole background. The stars
  and meteors continue to use the physical camera.
- The transform is recomputed from the authored Earth matrix only when layout
  roll changes. Returning to zero restores that matrix; hover, drag and travel
  still change the relative view. No texture phase reset, upload or extra render
  resource is required.
- The atmosphere's world light direction remains unchanged. The reviewer checked
  its visible crest in the final phone, tablet, transition, Contact and landscape
  captures and found no brightness or placement defect requiring shader changes.
- The updated instructions correctly identify this as a narrow owner-authorized
  exception to the preceding fully fixed-world layout behavior.

## Evidence inspected

The reviewer visually inspected `before-phone.jpg`, `after-phone.jpg`,
`after-tablet.jpg`, `after-phone-contact.jpg`, `portrait-transition.jpg` and
`after-landscape.jpg`. These are actual 390×844, 768×1024 and 1280×720 browser
viewports. The before/after phone images compare composition and are not matched
texture-phase pixel-difference measurements.

The saved full-suite summary reports **344 tests passed, zero failed**, with no
skipped or cancelled tests. Typecheck and affected lint logs contain no errors;
the build log completes successfully, with the existing Vinext route-classification
notice. The reviewer also ran `git diff --check` successfully.

Both final coverage reports were checked: **48,314 poses** across desktop and
mobile meshes. The worst retained crop margins are approximately **85.333 rows
north and 137.927 rows south**, exceeding the chosen 64-row allowance. The
geometric UV seam remains at least **115.3125°** away. The reviewer independently
hashed all audited final source files and confirmed that each matches its report
or the documented comment/format-only reconciliation. The geometric domain and
interpolation limitations remain explicit in `coverage-method.md`.

## Remaining limitations

This review uses hidden built-in Chromium captures and recorded browser actions,
not native Safari or an exhaustive transition video. The mathematical audit
covers its stated viewports and relative pose neighborhoods, not every possible
screen size or spring trajectory. The change adds no GPU resources or draw pass,
but showing a different area of Earth can change fragment work; no new performance
benchmark was performed. These limits do not block this focused placement fix.
