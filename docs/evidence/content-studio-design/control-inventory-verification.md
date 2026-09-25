# Studio control preservation review

Independent coordinator review completed 2026-09-25T11:08:00.792Z. Baseline: `496e91b55288792adf9abe1e9b6b7884965202ea`. This is a bounded source/SSR/handler review, not the final visual critic or a replacement for isolated workflow verification.

## Source identity

| Source | SHA-256 |
| --- | --- |
| Baseline `features/studio/admin-studio.tsx` | `22790d031aa532e42eef69a61638a08cbf1e8c63ed7fb7ecbfd3dfb1c76899d8` |
| Reviewed `features/studio/admin-studio.tsx` | `ad425cd60e336f7ddc0fdbd3c89ad41f92a0b03b2c838ef23ee37bf756126038` |
| Reviewed `features/studio/social-link-fields.tsx` | `6ab9ba1bdcbadbb887118f77b4131dd622c80b957bc9fb4ab0671a84dcefc399` |
| Reviewed `features/studio/studio-content-fields.tsx` | `531c4af1451e011a3b931257c90aef9c95d1f7278f93fea97bc2fc99d75c21e9` |

The coordinator hash was checked before and after the run and remained stable. No production files were changed by this review. All records, messages, addresses and network responses were synthetic; no main-server requests, persisted content, credentials or private inquiries were accessed.

## Coordinator behavior comparisons

Actual baseline and current coordinator source were bundled with esbuild. A deterministic hook harness supplied the root component's state and collected its setter calls. It replaced only that component's hook import, disabled model-context effect registration, and supplied a local fake `fetch` returning synthetic records. The actual event callbacks and draft-normalization helpers were exercised; no API request was issued.

The state matrix covered six record kinds (identity, project, case study, journal, link and media) and private, published, changed saved draft, unsaved, busy and new-record states. The impossible new-identity case was excluded: **35 action inventories passed**. Compared attributes included element/button type, disabled and aria-disabled state, preview/export destinations, target and rel. Moving controls and removing the duplicate header export were not treated as failures; content export remains available in Access & portability.

**128 actual handler comparisons passed.** For available controls, the comparison invoked Save, Preview, Preview About, Publish, project ZIP export, Unpublish, Delete and Discard handlers and compared prevented-default behavior, submitted payloads and state-update queues. Disabled buttons were inspected but not artificially activated. Save still submits the same form; publish and management actions remain explicit button actions with their existing record/revision payloads. Dirty previews still prevent navigation, and Discard retains its editor reset and draft restoration.

**25 Entry-selector guard comparisons passed.** Across the five non-identity record kinds and five existing-record states, the new native select's actual change handler produced the same state updates as the baseline record button. Clean selection changed the record; unsaved selection retained the draft and reported the existing error; busy selection made no state change. The controlled selected value and New entry option were also inspected.

**Five draft-state cases passed:** Private draft, Draft matches published, Saved draft · unpublished changes, Unsaved changes, and the unchanged matching status during a busy operation. These labels derive from the existing draft/published objects; they introduce no persisted state.

Full React static rendering with ordinary child components verified **one feedback container and one copy of each synthetic success/error notice on each of the three tabs**. The polite live region and alert role remain present. The review initially flagged the new fragment target as needing explicit keyboard focus. The implementation now gives `#draft-actions` `tabIndex={-1}`; the rendered element tree confirms this target and its matching return link. Actual focus movement and subsequent Tab order remain browser checks.

## Earlier content-field comparison

The bounded social/content-field implementation was checked with **12 baseline/current SSR control-inventory comparisons**: three synthetic social configurations (preset/automatic placement, email with occupied slots, and custom icon) plus three identity groups (profile, SEO and copy), each with busy false and true.

The comparison extracted input, textarea, select, option and button attributes, including values, selected/pressed states, constraints and inherited disabled fieldsets. It ignored generated IDs and presentation attributes and sorted the inventory to allow the authorized field reordering. Every control inventory matched. Synthetic input objects were unchanged after rendering. Additional checks passed for unmatched-search status text, declared profile-field order, and sample labels that no longer promise public notices. The social handlers and upload/placement conditions were also compared in the source diff and remain unchanged.

Affected TSX lint, formatting and diff checks passed in that bounded pass. These checks were ephemeral read-only commands, not added implementation-mirroring snapshot tests.

## Review outcome and limits

No coordinator data/action regression was found. The native Entry selector is a labeled native control, uses the existing selection guard, and replaces the desktop list through complementary CSS visibility rules at the narrow breakpoint. Save remains the form's submit action; secondary controls retain explicit types. The destructive confirmation callback, collection-change logic, model tools and before-unload protection were unchanged by source comparison.

This review does **not** verify CSS geometry, responsive visibility in a browser, native select keyboard operation, sticky-bar obstruction, screen-reader announcements, actual focus order, asynchronous React scheduling, dialog focus trapping, or authenticated server behavior. The harness substitutes state scheduling and network responses; it establishes callback/data equivalence, not end-to-end behavior. Root browser checks and isolated API/workflow tests must cover those boundaries. No speed, memory or rendering-cost claim is made.

## Final accessibility refinement supplement

Reviewed 2026-09-25T11:19:38.815Z. The earlier exact coordinator snapshot and all comparison counts above remain preserved; those counts are not relabeled as runs on this later source.

| Final reviewed source | SHA-256 |
| --- | --- |
| `features/studio/admin-studio.tsx` | `24fe113241894441a5b602afd77bad996c91bbec494ac0dd02ef43b8ea1c6068` |
| `features/studio/journal-page-preview.tsx` | `fef6e506ac464ef691cf0d3d1cd6a71ad6a387dc2da00853b606523e78ed7d18` |
| `features/studio/studio-presentation.css` (supporting CSS inspection) | `acef72f15bce057d6e4981745daf2f456956478b783f90f23a4c245522216fec` |

Removing only the new `useRef` import, command-bar ref/effect, and JSX ref attribute from the final coordinator reproduces the earlier reviewed SHA-256 `ad425cd60e336f7ddc0fdbd3c89ad41f92a0b03b2c838ef23ee37bf756126038` exactly. This byte-level comparison establishes that the action handlers, gates, state derivation and payload code exercised by the earlier harness are unchanged.

The measurement effect runs after the command-bar ref is attached, writes its border-box `offsetHeight` immediately, and observes that same element for changes from feedback, wrapping and viewport width. It writes only a CSS custom property used for scroll margins; that property does not size the measured bar, so this change does not introduce a measurement/layout feedback dependency. No animation-frame loop, request or persisted state is added.

The dependency is `[tab]`: leaving Content invokes the previous observer's disconnect cleanup; when the panel is absent, the null-ref guard exits without creating another observer. Returning to Content rebinds to the newly mounted bar and immediately replaces the prior height. Record/kind changes retain the unkeyed command-bar element; its ResizeObserver handles height changes without another effect subscription. Strict-mode setup/cleanup replay also disconnects the previous instance. The last numeric property remains on the studio during other tabs; it cannot retain a DOM reference or observer, and is replaced on return. This can retain extra desktop scroll clearance outside Content, not an active overlay or input obstruction.

A focused execution of the **actual extracted effect callback**, with a synthetic ref/style target and mock ResizeObserver, passed six lifecycle checks: immediate measurement/observation, height-change update, disconnect, absent-panel no-op, remount/re-measure, and second disconnect. Two mock observer instances were created and both disconnected. This verifies callback behavior; actual React commit timing and browser geometry remain the root browser checks. Desktop scroll margin uses the measured height plus 24px; the narrow layout has a static bar and overrides control scroll margins to 24px.

For the journal snapshot `fef6e506…` identified above, removing only the new hint and focusable-region attributes reproduces the baseline file exactly. The final `6e57f7c8…` source adds only the documented lint-exception comment; verification.json preserves that distinction. Biography selection, published-media preference, signatures, page count/selection, callbacks and NotebookSectionPages props are unchanged. The wrapper gains a named `role=region` with `tabIndex=0`; its existing horizontal overflow can receive keyboard focus. The narrow-only hint explains sideways scrolling. No page reflow or geometry change is introduced: the existing 438×428 ink area and pagination renderer are untouched. Source review found no blocker. Arrow-key scrolling, visible focus, adaptive toolbar clearance and narrow-screen presentation remain browser checks, not claims made by this supplement.
