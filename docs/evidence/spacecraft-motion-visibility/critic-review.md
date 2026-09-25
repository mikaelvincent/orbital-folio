# Independent critic — spacecraft motion visibility

Reviewed the final dish, radio, Contact display and overview-bound source; the motion and AO tests; current project context; the 19 finite captures and six ordinary-app captures. This is a visual and code review of the revision after the stable overview-bound fix. **Score: 91/100. No blocking finding.**

| Criterion | Score | Assessment |
| --- | ---: | --- |
| User fulfillment | 24/25 | The dish now changes pose substantially and starts within a second. The central Contact signal sequence is visible at normal wide room distance. The physical radio fill provides a stronger close-view detail. The dish and display are smaller in portrait overview/room views, so their salience there is less certain. |
| Visual quality and pacing | 23/25 | The dish stays seated on its axle with its feed and stays attached at both extremes. The three screen arcs follow existing artwork, with a clear sequential rhythm and no unrelated flashing. Smoothstep and sine-squared envelopes avoid hard reversals; static captures cannot prove the feel of continuous playback. |
| Correctness and access | 19/20 | Reduced motion restores the rest pose, all-lit radio and unlit signal; reading view hides the idle display. Material-only cues leave geometry revision and shadow invalidation alone. The stable envelope prevents overview framing from changing with dish phase. Final isolated suite: 591 passed, zero failed; focused tests: 18 passed. |
| Organization | 9/10 | Motion lives with its assemblies; the model only coordinates time, shadow state and fitting. The explicit material rebinding after highlight cloning is justified and tested, though it adds a small coupling to mesh names. |
| Performance implications | 7/10 | The new three arc meshes add one visible submission at the sampled Contact phase. The dish now moves for about 53% of its cycle, so cached shadow and desktop contact shading refresh much more often than before. This is an intentional art cost; no controlled time, power or thermal result is available. |
| Evidence | 9/10 | Source hashes, matched finite views, live wide/portrait views, exact viewports and fixture omissions are recorded. Native Safari and physical devices were not tested. Stills cannot establish frame pacing or how quickly a first-time visitor notices the cue. |

The matched wide Service views show a clear dish difference without a detached reflector or solar-wing interference. Close and oblique portrait views keep the support geometry coherent. The live wide overview makes the sweep observable while preserving the Earth, sky and navigation composition. The live Contact view makes the central arc the primary room-scale cue; the meter bars are appropriately secondary. The portrait live captures retain both cues at a smaller size.

There is no required follow-up for this revision. If the owner still misses motion in normal use, watch a short continuous playback on the target device before adding more animated equipment; that would distinguish a visibility gap from capture-phase or viewing-duration effects. The current two areas form a coherent, limited motion language.
