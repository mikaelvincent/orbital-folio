# Independent critic — mounted About notebook

**Final assessment: 94/100. No unresolved application blockers found.**

The reviewed implementation fulfills the revised approval: desktop uses the actual
retained notebook, and phones deliberately show the same complete spread at a
smaller scale. The earlier right-page-only and relocated-marker proposals are not
the approved mobile scope.

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Fulfillment and flow | 20/20 | Stationary notebook, camera approach, physical chapter markers, page turn and room return implement the approved object interaction without a detached dialog. Additional chapters remain reachable through the three-marker window and previous/next controls. |
| Design and composition | 28/30 | Warm paper, navy binding, real clips/cradle, original mountain artwork and clear chapter typography fit About and the physical-reader pattern in other rooms. Desktop registration and spacing are convincing. Phone content is intentionally small; this is scope compliance, not a claim of optimized mobile readability. |
| Correctness and accessibility | 23/25 | Chapter focus, return focus, legacy line breaks, remembered scroll readiness, geometry batching and reduced-motion cancellation are addressed. Shared native scrolling and media controls remain available. Final browser and geometry evidence covers the important failure modes; Safari and physical touch behavior remain untested. |
| Content and authoring safety | 15/15 | Journal editing reuses the shared safe Markdown/media path, with scoped soft-break preservation and chapter heading IDs. Publication guards protect referenced media. Existing records are not renamed or rewritten; mutating tests use isolated state. |
| Evidence and performance honesty | 8/10 | Full-suite logs record 479/479 passing; later UI changes and follow-up checks are disclosed and final source hashes match. Earth coverage distinguishes finite samples from its incomplete expanded filtering-margin certificate. Added leaf/texture cost is reported without an unmeasured speed, heat or battery claim. Safari, physical devices and universal Earth coverage remain outside the evidence. |

## Findings addressed

The initial review scored 87/100 and identified two concrete regressions:

1. Closing returned focus to the main scene rather than the notebook trigger.
   The final arrival handling restores that trigger and focuses the chapter
   heading when opening.
2. Replacing the old `pre-line` text renderer collapsed existing journal soft
   line breaks. Notebook, Reading view and Studio journal preview now opt into
   preserving them without changing Project or Case study Markdown behavior.

The root's subsequent browser checks found and corrected remembered-scroll
restoration before projection readiness, and native focus scrolling the whole
scene on the smaller desktop viewport. The scoped fixed-viewport rule follows
the existing screen-application approach while retaining transparent ink on the
physical paper. Marker text padding was also corrected. Source review found no
additional application blocker after these revisions.

## Reviewed evidence and limits

Reviewed the final application/content/editor diffs, notebook projection and
camera helpers, new behavior tests, test logs and coverage assumptions. Inspected
`desktop-1440x900.png`, `mobile-390x844.png`, `room-1440x900.png`, the refreshed
`markdown-chapter-1280x720.png`, `markdown-media-1280x720.png`,
`empty-notebook-1280x720.png`, and `studio-preview-1280x720.png`. The refreshed
Markdown image visibly demonstrates a fifth-entry collection's chapter window,
nested lists, formatting and preserved line break on the actual paper. The
mobile image demonstrates the deliberately unchanged full spread. The final
managed-image capture visibly shows the green 480×280 fixture on the paper after
native scrolling. The empty-journal capture retains the introduction/invitation,
blank passive flags and disabled previous/next controls.

The root performed live browser interactions; this critic independently reviewed
source, recorded outcomes and images, rather than claiming a separate browser
run. The full suite preceded the disclosed readiness/focus UI refinements; those
have targeted browser and renewed typecheck/build/lint verification. No native
Safari or physical-device check was performed.

The media and source-hash follow-up is complete: the earlier incorrectly timed media capture was
replaced and inspected, and the final metadata identifies all four post-suite UI
files, including the last CSS cleanup. Independently compared 396 recorded main
source files and found no unexpected hash mismatches. The fixture-only Vite cache
configuration has its own explicit exception and both hashes. This resolves the
previous media-capture and source-record findings without changing the application
verdict.

Earth's source-identified finite About probes show no sampled edge/seam exposure.
The expanded pose-neighborhood filtering margin is not certified at eight extreme
ultrawide travel cases. That stated limitation must remain; this review does not
convert finite camera coverage into a universal guarantee.

Root evidence-finalization note: the referenced `checks/format-final-css.log` was
copied from the actual isolated check output after the critic reported its absence.
All check-metadata artifact references now resolve.
