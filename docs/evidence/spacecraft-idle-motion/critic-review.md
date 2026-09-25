# Independent critic review — ambient spacecraft motion

**Final score: 92/100. No unresolved blockers.** This review covers the final
model source tree `5b0015365af1317743b1e11aa5fe7a97fe90b53803f96993f8eed723525606ea`,
the source-matched finite images and metadata, the live Chromium captures, and
the recorded verification. I inspected the final implementation and evidence;
I did not run the full suite or conduct a timed performance comparison myself.

| Rubric | Score | Assessment |
| --- | ---: | --- |
| Fulfillment and restraint | 19/20 | Both approved cues are present. They animate existing functional equipment without adding decorative motion or changing the stationary spacecraft. The dish cue is intentionally difficult to notice at overview scale. |
| Visual design and physical credibility | 27/30 | The reflector, feed, rim and stays move as one supported assembly around the captive axle. The restored feed-stay shadows keep the bowl dimensional in the matched service views and close support view. The Contact bars vary quietly without competing with the room label or active screens. Wide and portrait live views retain the approved composition. |
| Correctness and reduced motion | 19/20 | The dish eases through four short trims and rests between them. A pose change invalidates the geometry and shadow caches; settled frames reuse them. The radio modulates only its own six material channels after room dimming. Reduced motion restores the original dish pose and steady bars. The tests cover these states and the shadow-caster flag. |
| Performance implications | 12/15 | The finite fixture reports Contact front 719→736 draws and service front 857→875 draws, with matched service triangles unchanged. Shadow and desktop GTAO refreshes occur during the 16 moving seconds of each 198-second cycle; this is an authored visual cost. No timed CPU/GPU, frame-pacing, memory, heat or battery measurement establishes its live impact. |
| Evidence and reproducibility | 15/15 | The manifest identifies baseline and final source, and its changed-file hashes match the reviewed files. Captures record viewport, buffer, DPR, camera pose and time. The before/after service comparison confirms the shadow correction; radio detail captures show the meter states. Live views include normal interfaces and orbital context in hidden Chromium. The verification record distinguishes the initial 587/590 fixture/setup run from the final isolated 590/590 pass and records build, typecheck, lint and format checks. |

The initial review scored **86/100** because the moving dish had lost its
feed-stay shadows. The final source marks the dish as an animated shadow caster
and invalidates the cached key-light shadow map only when its pose changes.
The refreshed service front and support images resolve that visual finding.

**Limitations:** The finite fixture omits GTAO, sky/Earth, live interfaces and
navigation, and its one-shot draw counts include shadow rendering; they are not
steady application timings. The live screenshots are integration checks rather
than matched baseline comparisons. Native Safari and a physical device were
not tested. These limits are accurately disclosed in the evidence and do not
block this restrained visual change. I recommend no additional idle cues now;
the existing camera and orbital scene already supply motion.
