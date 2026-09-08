# Independent critique — second working revision

9 September 2026. Reviewed updated overview, Projects room, project dossier and Projects hover screenshots plus current source. No final score: mobile and full validation evidence are still pending.

## Current visual assessment

The new warm point lighting and contact shading visibly improve the recessed rooms. The Projects screenshot now communicates three physical lockers and the dossier is visibly held by a modeled clipboard/clip/tray. The About wall is closed. This is closer to the requested toybox spacecraft and an appreciable improvement over the first working screenshot.

The left docking sleeve still has a visibly rough, wavy near-vertical dark seam in `desktop-projects.png` and `desktop-dossier.png` (approximately x200–245 across the sleeve). The tangent torus/sleeve geometry is unchanged in the source. This remains a concrete instance to resolve under the user's explicit black-seam complaint; a still cannot prove shimmer is gone. Compare shadows on/off at identical camera/time, then inspect a slow cursor sweep. The new Earth limb reads more clearly, but still warrants first-load and moving-detail evidence rather than a resolution-only claim.

The clipboard's lettering is comfortably sized in the supplied desktop shot. A room-first state and physically framed reader are both now evidenced by separate screenshots. Hover visibly lifts the selected room and changes the framing slightly. These screenshots are development captures, including the dev audit panel, and should be replaced by clean final captures when validation is complete.

## Independent numerical verification

Evidence: `/tmp/mockup-revision-model-v51-audit.json`. These are geometry-only Node probes, not browser/GPU or live database tests.

- Project datasets of0,1,3 and8 items map correctly into three slots. Negative and excessive page requests clamp correctly. Blank slots have no stale project slug. Page2 of an8-item dataset exposes items7/8 and a blank slot.
- All four fully deployed world-reader anchors exactly match their advertised positions; numerical position error is0.
- Six rays through the formerly open About terminal cross-section now hit real surfaces. The earlier missing-wall finding is resolved in geometry.
-300 cheap project proxy picks returned the expected page1 slugs. p50≈0.0065ms and p95≈0.0133ms on this machine, versus the earlier dense-model p95≈4.35ms. These timings exclude rendering and browser event overhead.

## Remaining concrete issues

1. **Slow-frame reader alignment can diverge.** Camera arrival is determined by800ms of wall time, but model deployment progresses using clamped active deltas. With only two50ms model updates, the reader anchor is[-3,-0.2280,1.4765], tilted−0.2589rad, while the CSS paper is fixed at[-3,0,1.72]. A long frame gap can therefore mark the camera settled and show the CSS page before its physical plane arrives. Use the actual `model.readerSurfaces[active]` world transform for the CSS surface and/or a deployment-readiness condition. Normal-speed final-anchor agreement does not cover this case.

2. **Automatic readable fallback can discard a composed contact message.** The new viewport handler calls `setReading(true)` below480px height or above1.15 visualViewport scale. That unmounts WorldReader and replaces it with a fresh ContactView; ContactForm currently holds text in uncontrolled DOM inputs. A threshold-crossing resize or pinch zoom can erase entered text and focus. Keep draft values in shared state, preserve the form instance, or defer automatic switching while editing; verify the exact threshold with a populated message.

3. **New Earth memory/network budget needs evidence.** Current desktop assets are about5.5MB clouds plus1.0MB day before other assets. An8192×4096 RGBA texture with mipmaps consumes about179MB decoded GPU storage;5400×2700 day adds roughly78MB. Actual driver formats may vary. The8K cloud source is reported native, which addresses the earlier upscale concern, but native detail does not remove the memory cost. Provide first-load and steady-frame measurements and a lower-memory quality path selected by more than viewport width. The old performance measurements are no longer representative after AO and these maps.

4. **Return/query behavior still deserves a targeted regression.** The parser now rejects unsupported explicit open states and forwards contact result flags, but `go`'s same-destination comparison still ignores sent/error. Verify Back/Forward between contact query states, as well as the direct sent/error reload already being tested.

## Earlier findings addressed in current source

Explicit reader opening is limited to supported sections; contact result flags are passed to WorldReader; chapter navigation uses a bounded three-page window; paper logical width and camera distance now fit the viewport together; reduced motion removes hover dolly and background parallax; hotspot text is replaced only when changed; contact CSS targets actual component classes; the reader scroll region is keyboard focusable; focus return remembers the project slug. New navigation labels are database content with an additive migration, preserving custom text through `json_insert`.

These are source confirmations. Final browser checks must still establish actual focus/scroll behavior, populated-form resize behavior, pause/visibility continuity, CSS corner alignment, keyboard/touch access, no-JavaScript content, private preview and admin persistence. Final scoring remains five equal areas,90/100 overall and at least8/10 each, with no local requirement blockers. The already documented external hosting incident is separate from this local revision.
