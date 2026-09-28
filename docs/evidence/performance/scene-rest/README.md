# Let the visible scene rest

**Historical optimization, superseded by the owner's preference for continuous
visible motion.** Current rendering pauses when hidden/offscreen and preserves
reduced-motion behavior. The measurements below remain evidence for this trial,
not the current scheduling policy.

The trial addressed a visible portfolio that submitted a complete frame
continuously, even after the camera and cached lighting had settled.
After 15 seconds without input or scene updates, the trial scheduler finishes any
remaining transitions and stops requesting animation frames. Dish scanning,
Earth, stars, meteors and signal displays hold their current state. Input wakes
the next frame; its zero time delta prevents animation catch-up after a pause.

The deliberate visual cost is stillness after inactivity. Active rendering keeps
the same resolution, geometry, materials, shadows and contact shading. Reduced
motion remains independent. Diagnostics and an open, playing Earth inspection
panel stay awake; held gestures, travel, doors, notebook turns and feedback also
finish before rest. No preference or backend record is written.

## Measured result

The hidden built-in **Chromium 154** browser ran production builds on an Apple M4,
macOS 27.0, AC power, battery not charging, Low Power Mode off. Each capture used
Projects at 1280×720 CSS pixels, DPR 2, a 2560×1440 drawing buffer, normal quality,
reduced motion off, no reader/hover, and both inspection panels closed.

| Block | Order | Frames submitted in each 10-second window |
| --- | --- | --- |
| 1 | A · B · B · A | 603 · 0 · 0 · 590 |
| 2 | B · A · A · B | 0 · 601 · 587 · 0 |

A is the original continuous scheduler; B is automatic rest. All four B windows
held both the frame counter and animation clock unchanged. A's median was 595.5
frames, with a 587–603 range. The active counter's publication interval contributes
endpoint uncertainty, so these are approximately 60 frames/second references,
not precise frame-pacing measurements. **Recurring submissions fell to zero
during every captured resting window.** This does not quantify energy savings,
per-frame CPU/GPU speed, or the benefit across an entire visit. Savings in
rendering work depend on time spent inactive; active use and explicit inspection
continue rendering normally.

## Reproduction and scope

Baseline: `895ba0e8cce9b821aa4d271bd2e1985bd19e0551`, plus only the
[counter instrumentation](baseline-instrumentation.patch). The candidate's exact
source/lockfile/asset hashes and declared protocol are in [source.json](source.json).
Candidate implementation commit: `85b5907996aa5d4293a5ded8b3eb34c0b7060c2e`.
The two production builds used the same disposable source checkout and isolated
D1/R2 data. No owner state or private environment was copied. Build/test work and
the temporary development server finished before a 60-second nonrendering rest.
One hidden browser tab alternated between the builds on loopback ports 3019/3020.

Every capture navigated or reloaded, allowed 24 seconds for startup, travel and
the idle deadline, then read `data-rendered-frames` before and after a ten-second
wall-time window. Reads did not send input. The counter increments once per scene
draw, publishes about every 200 ms while active and flushes at rest in B. A carries
the same counter without the idle policy. Actual windows were 10.011–10.019
seconds. Camera, room, buffer, motion, readiness and absence of hover/travel
matched at both ends of all eight captures. No captures were excluded or retried.

This is the [wall-time scheduling comparison](../../../performance-diagnostics.md#interpret-the-work-correctly),
not the diagnostics panel's per-frame CPU/GPU protocol. Opening that panel would
intentionally prevent rest. Earth runs at its default speed before each pause;
animation phases are not matched for per-frame timing conclusions. Browser/OS
background work is outside the counter, and other user applications were left
alone. See [raw samples](samples.json), [browser settings](browser-metadata.json)
and [condition records](conditions.json).

## Behavior checks and engineering detail

The scheduler has no idle polling timer. It stops the existing frame chain and
coalesces wake requests into one next-frame callback. Requests made during a draw
are preserved, including on-demand rendering. Hiding and disposal cancel queued
work. A separate model transition flag keeps doors, page turns and feedback alive
without letting perpetual ambient dish movement prevent rest.

Independent review found a subtle trap: travel springs retain small residual
velocities when arrival ends their integration. Counting those frozen velocities
as ongoing motion would keep the scene awake forever. The scheduler instead uses
the travel state for those axes and checks only springs that continue settling.
Browser checks confirmed rest after ordinary Projects→About travel and after
opening the notebook; turning a page woke rendering. The post-turn return to idle
was not separately sampled before opening diagnostics.

The isolated full suite passed **568 tests**, including eight scheduler regressions
and the ambient/transition distinction. Typecheck, production build and affected
lint passed. Hidden-browser checks cover desktop/portrait rest and wake, keyboard
navigation, notebook use, diagnostics, Earth inspection, reduced-motion demand
rendering and context-loss fallback. Two resting Projects screenshots taken one
second apart were byte-identical. These checks establish behavior in Chromium;
Safari was not exercised. No claim of precisely measured presentation latency is
made. Functional observations are retained in [qa.json](qa.json).
The [resting desktop capture](projects-resting.jpg) shows the retained appearance.
