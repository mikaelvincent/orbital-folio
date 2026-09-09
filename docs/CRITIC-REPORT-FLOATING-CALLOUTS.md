# Independent critic — floating callouts and space background

**86.4/100. Pass for the current render-only target of 75/100, with every area above 6/10. No unresolved scoped requirement blocker was found.** This is a fresh assessment of the spacecraft, its render navigation and the space background; readers, forms, admin and SEO are excluded without penalty.

| Equally weighted area | Score | Finding |
|---|---:|---|
| Spacecraft and floating-callout design | 9.0/10 | The physical exterior labels are gone. Four restrained floating labels, attached leaders and lit endpoints clearly identify the cabins while preserving the ship’s silhouette. |
| Geometry, placement and framing | 8.9/10 | The ladder transfer sill has plausible support and doorway alignment. Support-based framing uses the stage more effectively while accommodating full drag and hover output. |
| Stars, meteors and atmosphere | 8.7/10 | The brighter field gives the background more presence. The threefold meteor schedule, nine-slot capacity and varied paths are concretely supported; some streaks are naturally occluded. |
| Responsive input and accessible render navigation | 8.6/10 | Native callout drag and keyboard activation work. The identity moves out with the journey, and departing/hidden annotations become inert. Physical-device and OS assistive-technology operation remain unverified. |
| Render performance and maintainability | 8.0/10 | Resource counts remain bounded and no dependency or remote asset was added. Current production checks pass, but host frame cadence varies substantially and initialization profile matters. |

Overall = sum of the five scores × 2.

## Verified result

I independently reviewed current source, saved actual GPU images, the implementation’s focused audits, and my own numerical framing and production HTTP checks. Browser operation was performed by the implementation agent. [Source hashes](evidence/floating-callouts/source-hashes.json) identify the reviewed implementation.

The [desktop](evidence/floating-callouts/final-fresh-desktop.jpg), [320-pixel overview](evidence/floating-callouts/final-phone320.jpg) and [held-drag view](evidence/floating-callouts/final-phone320-callout-drag.jpg) show the intended floating identification and full-craft presentation. The [model audit](evidence/floating-callouts/spacecraft-callout-audit.json) confirms removal of 68 exterior label source meshes and eight ink textures, while preserving four internal headers and 616 protected cabin sources across ten wide/compact states. The upper landing is now a narrow wall-supported transfer sill that reaches the ladder and clears the docking entrance. The existing deck heights and lower landing remain consistent with the adjacent cabins.

The [independent fit audit](evidence/floating-callouts/framing-audit.json) checks 112 actual subassembly support points at seven viewport fixtures, using 13×13 angle samples, nine hover-offset combinations and the complete 2.5% hover dolly. Hull containment passes within floating-point tolerance. After a review-discovered overflow was fixed, maximum-width label fixtures retain at least 12 pixels of outside clearance and 16 pixels between row partners. This is source-matched geometry with declared inset/size fixtures, not a browser typography certification. The actual phone captures complement it.

The [browser records](evidence/floating-callouts/browser-qa.json) show a native drag beginning on a callout that moves the camera while remaining on overview, with navigation activation suppressed. Keyboard Enter subsequently reaches the [upright Projects cabin](evidence/floating-callouts/final-projects-arrived.jpg). The final desktop sequence retains one renderer through departure and About arrival; a separate phone renderer retains continuity through drag and Projects arrival. The identity’s projection changes during departure and its opacity reaches zero on arrival. Stable layout measurement is separated from the moving identity. Callouts share the existing gesture coordinator; their CSS now excludes transform transitions so projected buttons and SVG endpoints do not acquire different animation delays.

The [environment audit](evidence/floating-callouts/stars-meteors-audit.json) counts 720 meteor starts versus 240 over 630 active seconds, exactly 3×, and reaches nine simultaneous events. It checks event lifetime, varied origins/directions, parallel and independent groups, pause/reset behavior, deterministic scheduling, stable resources and disposal. The mean stored star brightness increases 38%, with independently seeded twinkle amplitudes and two frequencies. These are CPU/source measurements. The [GPU meteor capture](evidence/floating-callouts/final-meteor-group.jpg) and runtime diagnostics demonstrate the integrated effects, but do not prove that all nine scheduled streaks are simultaneously unobscured or replace extended animation observation.

[Typecheck](evidence/floating-callouts/typecheck.txt), [lint](evidence/floating-callouts/lint.txt) and [build](evidence/floating-callouts/build.txt) pass. My [production HTTP check](evidence/floating-callouts/critic-http.json) confirms the homepage and all eleven directly referenced JS/CSS assets return 200 after restarting the final Worker. An earlier stale-emulator asset-reference failure was resolved; it is not counted as a passing run.

## Remaining limits

Long portrait leaders can cross the solar or ladder silhouette before reaching their room dots. Routing those lines outside the appendages would improve polish. Long editable labels may be visually truncated inside their bounded buttons; their full text remains in native markup. The numerical fit is tight for the selected support envelope, not a proof of a globally optimal camera solution.

Performance records must retain their profile context. A scene initialized on a phone-sized viewport keeps its lower-cost profile when enlarged; its fast desktop-sized observation is not fresh desktop-tier evidence. The final fresh desktop profile (3,100 stars, 17 cloud samples) records 16.7/17.6 ms p50/p95; the earlier 50.1/67.6 ms desktop observation remains in the evidence. Final phone-profile observations are also separate. These host measurements do not establish physical-phone performance, GPU timings, a causal speed improvement or guaranteed 60 FPS. Static screenshots and deterministic background checks also leave extended real-device motion quality unverified.

The requested render changes are complete at the current threshold. This conclusion makes no claim about deferred application workflows or public deployment.
