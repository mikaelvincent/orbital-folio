# Safari Earth controls regression — 14 September 2026

## Reproduction and cause

Tested directly in the installed **Safari 26.6.2** on macOS at `http://localhost:3000/`. This was native Safari UI interaction, not Chromium or an emulated WebKit run. The preceding night-Earth review had used Chromium only.

Before the fix, opening Earth controls worked, but clicking **East Asia** dismissed the panel without changing the Mediterranean selection. Safari moved focus from the close button to the surrounding focusable `main` container. The document's unconditional outside `focusin` dismissal unmounted the preset before its `click` handler could apply the selection.

## Change

`lib/panel-dismissal.ts` records whether a pointer press began inside the controls. It tolerates the ancestor focus caused by that press, allowing the button's click to complete. Focus entering an unrelated element still dismisses. Any keyboard input clears the pointer exception, preserving Tab-out; an outside pointer press also dismisses. Escape remains consumed and restores focus to the Earth toggle, so it does not navigate the spacecraft. No default pointer behavior is cancelled, preserving native inputs and slider dragging. Listeners are removed when the panel closes.

There is no texture, rendering, camera, animation, or Earth-layout change in this fix. No new performance candidates or benchmarks were run.

## Native Safari checks

| Check | Observed result |
| --- | --- |
| Preset clicks | East Asia, India and North America apply and keep the panel open; Reset restores Mediterranean. |
| Earth rendering | East Asia visibly shows the China/Korea/Japan coastlines; custom geographic/framing changes visibly change the globe. |
| Five numeric controls | Typed longitude 18°, latitude 22°, tilt −10°, size 112%, horizon 72%; displayed values and paired sliders update. |
| Slider drag | Dragged longitude from 18° to 126°; paired numeric value updates and panel stays open. |
| Pause / resume | Button changes between Resume rotation and Pause rotation without dismissal. |
| Replay | Clicking Replay retains the panel and settings; the existing environment tests separately verify that only the Earth opening clock resets. |
| Persistence | Reloaded Safari after saving custom settings; 126°, 22°, −10°, 112%, 72%, and paused state all restored. |
| Keyboard within / outside | Option-Tab traversed the final slider, Pause, Replay and Reset; the following Option-Tab focused diagnostics and dismissed the panel. Safari's ordinary Shift-Tab moved to browser chrome; that is outside DOM focus handling. |
| Outside click | Clicking Contact while the panel is open dismisses it and navigates to Contact. |
| Escape in a room | Opened Earth controls in Contact, pressed Escape; panel closed, focus returned to the Earth toggle, route remained `/contact`. |
| Final state | Restored overview and original Mediterranean/default settings with rotation enabled; left controls open in the existing Safari tab. |

[East Asia in Safari](east-asia.png) · [Custom view](custom.png) · [Custom accessibility state](custom-state.txt) · [Restored state after reload](reloaded-state.txt).

## Automated checks

**29 focused tests pass**, including seven new dismissal regressions. The new tests dispatch the actual registered listeners through Node EventTarget and a minimal containment tree. They model Safari's mouse/touch press → ancestor focus → click sequence; they also cover input editing, outside focus/press, keyboard focus after pointer use, Escape, and listener cleanup. These deterministic tests model browser event order; they are not substitutes for the native Safari checks above.

Type checking, targeted type-aware lint, and the production build were run for the fix. Logs: [tests](tests.log), [type checking](typecheck.log), [lint](lint.log), [build](build.log).

Scope: one installed desktop Safari version. Physical iPhone/iPad touch interaction was not tested. No new frame-time, GPU, thermal or memory measurements are claimed.
