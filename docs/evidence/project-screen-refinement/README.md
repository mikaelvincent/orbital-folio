# Project screen refinement — 21 September 2026

Baseline: `194d359`. Requested UI and sample-content corrections, not a held
performance experiment. [Source hashes](source-hashes.json) identify the final
application, tooling and regression-test changes.

## Result

- Projects removes the app's exterior shadow and the scrollbar's broad dark
  backing. The thin window outline, persistent track/thumb and keyboard focus
  feedback remain.
- The landscape application occupies more of the physical glass: total inset
  0.06 → 0.02, with 2px inner desktop padding. The original 0.06 rectangle still
  determines camera framing; camera destination, projection and motion are
  unchanged. Portrait retains its original physical rectangle. The preceding
  desktop padding media rules are removed; Contact returns to uniform 14px.
- Tools captures pointer toggle intent before focus dismissal can occur, so
  the click cannot reopen a menu just dismissed by that same interaction.
- Relay demonstrates all supported project formatting/media and source/live
  links. Its introduction explicitly attributes the example destinations to
  BullMQ; they are not presented as a deployed Relay product. No new arbitrary
  HTML/iframe embedding support is introduced.
- Meter moves to Systems: 9 All, 6 Systems, 3 Interfaces, 0 Experiments. The
  empty category retains a working physical monitor and opens an empty state.
- Case studies restores the exact original wide terminal source from before
  `81208a7`; the test specific to the rejected 16:9 design is removed.

## Live visual verification

Hidden built-in **Chromium**, actual top-level viewport overrides, normal live
rendering and effects. No native Safari, real touch or mobile keyboard testing.
These are design/interaction checks, not synchronized pixel comparisons or
runtime performance measurements.

| Capture | CSS viewport / DPR | Check |
| --- | --- | --- |
| [Gallery](gallery-desktop.png) | 1280×720 / 2 | Smaller wallpaper margin, clean app edge |
| [Scrolled detail](detail-scroll-desktop.png) | 1470×830 / 1 | Clean persistent scrollbar and detail chrome |
| [Relay links](relay-links-desktop.png) | 1470×830 / 1 | Actual populated resource row and attribution |
| [Nested lists](relay-nested-lists.png) | 1470×830 / 1 | Visible ordered, unordered and deeper nested markers |
| [Media](relay-media-desktop.png) | 1470×830 / 1 | Native video player and GIF |
| [Project room](projects-room-empty-category.png), [empty app](experiments-empty-desktop.png) | 1470×830 / 1 | Empty Experiments is still selectable |
| [Relay portrait](relay-links-portrait.png), [Tools](tools-open-portrait.png) | 390×844 / 1 | Readable links and accessible bottom controls |
| [Narrow Relay](relay-narrow.png) | 320×640 / 1 | Retained scroll and title-bar controls, no page overflow |
| [Restored Case terminal](case-room-restored.png) | 1470×830 / 1 | Original wide monitor and attachments |
| [Contact](contact-padding-restored.png) | 1470×830 / 1 | Restored padding, physical screen and keyboard containment |

Relay's native player was started using its visible Play control: readyState 4,
duration 4 seconds, currentTime advancing, paused false. Its image and GIF assets
loaded successfully. Tools second-click closure was verified at desktop and
portrait sizes. Chromium already handled an ordinary second click before the
fix; the regression test specifically reproduces focus-dismissal-before-click
ordering. This does **not** establish Safari reproduction or verification.
The inspected tab's runtime error log was empty; no Contact form was submitted.

## Content preservation and checks

The explicit sample-update request was applied to the main local server only
through fingerprint-guarded population: Relay and Meter updated, one revised
Meter cover uploaded, owner-edited records skipped by design. A later Relay
introduction clarification updated only Relay with no uploads. Both subsequent
runs were no-ops. Older media records remain intact.

The complete suite used a separate source snapshot, fresh test secrets, its own
D1/R2 state and isolated Vite cache at port 3003. **411/411 passed**, no skips or
failures; [verification record](verification.json). Final code matched the
snapshot. The temporary server/state were cleaned up; the normal server remains
at port 3000. Typecheck, production build, affected lint and diff checks pass.
Focused regressions cover visible bezel containment across all four displays,
screen sizes and hover/drag extrema; unchanged framing; safe sample upgrades;
format/media rendering; resource attribution; and Tools event ordering.

## Structural performance record

[Inventory](geometry-inventory.json) includes baseline/candidate model archives,
source identities, inert-Canvas fixture limitations and normal wide/compact
idle/Contact-open inventories. Reproduce with the existing
[inventory tool](../project-interface-polish/geometry-inventory.mjs), passing
`194d359` and this folder's output path.

Restoring the original Case canvas (1536×864 → 1536×318) reduces nominal
RGBA8+mip texture storage by **4,474,704 bytes (4.27 MiB)**. Retained model estimate
106,283,500 → 101,808,796 bytes. Meshes, triangles, material submissions and
geometry arrays are unchanged. This excludes canvas backing, driver/process
memory, Earth/sky, environment maps and render targets. It is a design reversal,
not a measured runtime optimization.

Meter's replacement WebP is 15,470 bytes versus 15,682 previously (212 fewer).
The managed demo asset set totals 206,327 bytes; assets load on demand. No new
texture pass, renderer or backend service is added. CPU/GPU timing, FPS, heat,
battery and total session delivery were not measured; no gains are claimed.

## Independent review

Independent critic: **94/100 — keep**, no unresolved blockers.

| Criterion | Score |
| --- | --- |
| Request fulfillment | 25/25 |
| Visual design and responsive usability | 28/30 |
| Correctness and compatibility | 19/20 |
| Organization and maintainability | 9/10 |
| Verification and evidence | 13/15 |

Review corrections: clarify the BullMQ example destinations immediately before
Relay's resource links in both views, add the corresponding rendering regression,
and refresh the gallery capture after that final content update. The reviewer
then verified matching source/model hashes, asset hashes and evidence links.
They found the smaller physical gap improved Projects without changing framing,
the final captures readable at all inspected sizes, and the Case restoration an
exact match for the requested historical source. Limitations: no native Safari,
real touch or runtime performance testing; texture estimates are not speed gains.
