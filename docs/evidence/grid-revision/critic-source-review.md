# Independent source review — integrated v6 grid

Scope: read-only inspection of `components/spacecraft.tsx`, model/environment, flight controller, loader, immersive navigation, database migration, relevant CSS and tests, plus the first three desktop captures and model/environment audit artifacts. No final scores are assigned; this is an in-progress defect review. No application files, database records or browser surfaces were changed by the critic.

## Concrete findings

**Follow-up source verification:** root applied fixes during this review. Current source freezes pointer/hover/dolly integration with `motionDelta=0` while preserving their rendered contributions; reading targets zero through the spring instead of bypassing it. Initial reading selection now honors `#room-reader`, and `.world-css-renderer` uses `overflow:clip!important`. The three findings below document the defects and their proof obligations; they are no longer open source-level blockers after this verification. Fresh browser traces/alignment are still needed to confirm the fixes in the working result.

### 1. Retained controller state is dropped and reapplied on pause/resume

In the inspected renderer, `pause()` sets `lastFrame=0`, so the next stopped draw has delta0. `moveCameraAxis` correctly retains its prior pointer/hover/dolly values at zero delta. However the final camera calculation disables cursor rotation with `stop`, excludes hover offsets with `if (!stop)` and removes dolly with a stopped ternary. Thus the rendered camera jumps to neutral while the stored state remains non-neutral. Resume's first zero-delta draw reapplies that retained state immediately, creating a second jump.

Reproduce by settling overview with the pointer at an extreme over a room, then pausing and resuming without moving it. A centered-pointer pause test misses the problem. Preserve/freeze the actual current rendered offsets, or otherwise ensure the output is not conditionally removed and reapplied. Deliberate immediate navigation under reduced motion is a separate behavior.

The same bypass appears when a reader opens: the pointer controller targets zero smoothly, but `cursorRotation(..., stop || reading)` immediately returns zero when `reading` becomes true. The current angle disappears before the bounded state can decay. Include room→reader at a non-centered pointer in validation.

### 2. Pre-hydration reading choice is not preserved

The boot loader's Reading view link targets `#room-reader`, and CSS hides the boot overlay for that target, exposing full server-rendered content. Initial enhancement currently reads only `?view=reading` or short viewport height when deciding reading mode. If the visitor follows the reading escape while JavaScript is delayed, later hydration enters3D and undoes their explicit choice.

Honor the hash in initial reading-state selection, or use a meaningful reading-mode URL. Verify by delaying JavaScript, choosing Reading view, then allowing hydration; the page must stay readable without another action.

### 3. Physical reader mismatch observed and already diagnosed by root

The first `desktop-atlas-dossier.png` showed HTML starting near y63 while the physical housing began around y160, with its footer ending around y695 and a blank paper strip continuing to about y815. This is a real integration failure despite the model-space anchor audit being correct.

Root independently diagnosed native focus scrolling of the CSS3D root (`scrollTop≈121.5`) and reports changing it from `overflow:hidden` to `overflow:clip!important`. This is a plausible direct fix. The critic has not yet reviewed the replacement capture/corner evidence. Validate desktop and mobile after reader focus, page change, Back, and keyboard scrolling: the projection root must stay unscrolled while the inner document scrolls normally. Keep the corrected DOM-versus-projected bounds, not only the source-world transform audit.

## Integrations that look sound

- The renderer now consumes the model's two-dimensional room anchors/bounds/readers and hotspot layout. It no longer forces picking proxies onto Y=0.
- `PROJECTS_PER_PAGE=9` is shared across model options, DOM lookup, initial/history page calculation and transport UI. The model audit covers empty, single, nine and twelve-record cases and verifies isolated compartment5 hover. Final browser evidence should still include a second-page deep link and focus return.
- Room labels are a screen-aligned DOM layer projected from model anchors, so mobile roll no longer rotates the glyphs. Their long-copy wrapping, projected location and overlap still need narrow-viewport inspection. The implementation's mobile minimum is14px, below the planning target16px; this is a visual quality check rather than a categorical failure.
- The new controller preserves axis velocity across ordinary retargeting and imposes explicit per-axis acceleration and speed bounds. Tests cover rapid reversals at30/60/120Hz. This does not independently prove continuity of the final composed camera, because the bypasses above and nonlinear composition occur after those helpers.
- Both ray-picking and DOM pointer/focus handlers now carry individual project slug hover, and the model gives each compartment an independent signal/pull-forward response. Selected rooms remain lit even without a hover, which is appropriate for touch.
- The DB migration updates only the old default “Ship view” string, preserves owner-customized values and null published snapshots, and the new fixture says “Interactive view.”
- The loader has editable status copy, a nonnumeric visual animation, a no-JS hiding rule and reduced-motion CSS. After enhancement, the existing Reading view button has a higher stacking level than the loader. First-frame readiness is set after actual render submission rather than after imports alone.
- Environment source/notes show locally generated texture fields, no Earth-image loading, bounded natural meteor scheduling and shared active time. The initial overview visibly shows a blue water world and the new dark navigation. Final integrated resource/timing evidence is still required; a generated field is not automatically cheaper in fragment work.

## Evidence still needed before scoring

Fresh corrected reader captures/alignment; clean desktop/tablet/390px/320px overview with all label text and wings; non-neutral rapid-hover/flight/pause/reader camera traces; individual ninth and second-page project workflows; delayed-hydration loader escape; current accessibility audits after actual fallback if claiming them; built-Worker/no-JS metadata checks; current build/typecheck/lint/workflow/security evidence. Retain the distinction between actual browser frames and mathematical/model-only probes, and between CPU submission time, frame cadence and network performance. Leave the local server running at handoff.
