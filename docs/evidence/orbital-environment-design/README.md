# Stage 12 — orbital environment

The atmosphere now has a quieter, slightly broader blue crest and outer shoulder, with a shorter inward haze falloff. This is a restrained lighting-profile change around the existing photographic Earth; it does not add surface detail or replace the approved regional loop. Meteor groups have more breathing room: the three timing banks now span 18 seconds instead of 9, retaining the established singles, pairs and occasional triples.

The baseline is `939b611190491cffcd59b52b6692965e1e427df9`. The final orbital source-tree hash is `7f98d391308e51d77745c957c5f13b2a721fa8f5ef456e4b22acfdc9d4f8007d`. [Fixture provenance](fixture-manifest.json), [motion audit](motion-audit.json) and [verification](verification-checks.json) bind the runtime, test, preview helper and asset hashes.

## Scope and preserved decisions

Only the atmosphere profile/colors and meteor schedule change in production. Individual meteor duration, travel, opacity, tails, direction and grouping descriptors remain identical for the 51 compared events. The surrounding star distribution, size hierarchy, independent twinkle, sky texture and shaders are unchanged.

The 2560×1536 `earth-europe-loop.webp` remains exactly the baseline asset: 2,862,376 encoded bytes, SHA256 `19ac5ed0c9796d81a36c2619a67396e1630f36b9915e1bd716c0057b65bf3cf1`. Europe at Night, the 0.0045 rad/s rate, one-sample fixed-sphere mapping, portrait composition anchor, shared world registration and temporary Earth playback controls are preserved. No camera, spacecraft, content or visitor-interface implementation changes are included. The protected 1536×1536 native European core and fictional-continuation provenance remain those in the [current Earth asset record](../earth-consistent-loop/README.md); no regeneration or re-encoding occurred.

## Rendered comparisons

Captures use the hidden Codex built-in **Chromium 153**, not Safari. The finite fixture uses the production orbital environment at [captured application camera poses](camera-poses.json), normalizing their rounded quaternions. Actual CSS viewports are 1280×720 desktop and 390×844 portrait, without a scaled wrapper. Browser DPR is 2; explicit render DPR 1 gives matching 1280×720 and 390×844 drawing buffers. Tone mapping is ACES Filmic at exposure 0.95.

Earth phase and sky time are independent. The eight matched pairs below keep pose, viewport, phase and sky time equal. See [complete capture metadata](finite-captures.json).

| Comparison | Earth phase / sky seconds | Before | After |
| --- | --- | --- | --- |
| Desktop opening | 0 / 0 | [before](before-finite-opening-desktop.jpg) | [after](after-finite-opening-desktop.jpg) |
| Desktop quarter loop | 0.25 / 0 | [before](before-finite-quarter-desktop.jpg) | [after](after-finite-quarter-desktop.jpg) |
| Desktop midpoint | 0.5 / 0 | [before](before-finite-midpoint-desktop.jpg) | [after](after-finite-midpoint-desktop.jpg) |
| Desktop three-quarter loop | 0.75 / 0 | [before](before-finite-threequarter-desktop.jpg) | [after](after-finite-threequarter-desktop.jpg) |
| Portrait opening | 0 / 0 | [before](before-finite-opening-portrait.jpg) | [after](after-finite-opening-portrait.jpg) |
| Portrait Contact pose | 0.5 / 10 | [before](before-finite-room-portrait.jpg) | [after](after-finite-room-portrait.jpg) |
| Desktop oblique | 0.5 / 0 | [before](before-finite-oblique-desktop.jpg) | [after](after-finite-oblique-desktop.jpg) |
| Meteor timing | 0 / 11 | [active before](before-finite-meteor-11.jpg) | [quiet after](after-finite-meteor-11.jpg) |

Supplementary stills show the [after loop endpoint](after-finite-wrap-desktop.jpg) and [after meteor group at 22 s](after-finite-meteor-22.jpg). Play-sky captures at [22.277 s](after-playing-sky-1.jpg), [29.742 s](after-playing-sky-2.jpg) and [43.610 s](after-playing-sky-3.jpg) sample active/quiet/active states. These are screenshots taken during playback, **not a continuous video record**.

The fixture omits the spacecraft, its shadows/lights, GTAO, portfolio interfaces and navigation animation. [Live captures](live-captures.json) provide integration context separately; their animation time is not frozen, so they are not pixel-matched comparisons. Recorded desktop live buffers are 2560×1440 at 1280×720 CSS; portrait live buffers are 682×1477 at 390×844 CSS. A temporary fixture interruption required a restart; [restart verification](fixture-restart.json) confirms identical frozen inputs except the timestamp, and the failed navigation page is excluded.

Reproduce from the completed Stage 12 source checkout, using an unused loopback port:

```sh
node scripts/benchmarks/orbital-art-preview.mjs \
  --baseline 939b611190491cffcd59b52b6692965e1e427df9 \
  --poses docs/evidence/orbital-environment-design/camera-poses.json \
  --port 3021 --manifest /tmp/orbital-environment-reproduction.json
```

Open `/before` and `/after` with matching query values, for example `?pose=overview-desktop&phase=0.5&time=0&dpr=1&hide=1`. Set the actual browser viewport to the pose's recorded dimensions. Use `pose=overview-portrait` or `contact-portrait` for portrait checks. The helper freezes source/assets at startup; restart after edits. Its explicit Play sky control advances only the fixture sky clock while Earth remains paused. Check source hashes before treating a reproduction as this comparison.

## Motion and rendering cost

The deterministic audit samples 180 seconds at 30 Hz in both wide and compact construction paths. Its active fraction counts meteor descriptors, before viewport clipping or Earth/spacecraft occlusion; it is not the fraction of pixels or visitor time visibly occupied by meteors.

| Sampled motion measure | Before | After |
| --- | ---: | ---: |
| Groups in 180 seconds | 60 | 30 |
| Individual starts | 103 | 51 |
| Frames with active descriptors | 84.04% | 44.28% |
| Complete quiet intervals | 0.03–2.13 s | 1.63–5.57 s |
| Maximum simultaneous active descriptors | 4 | 3 |

Actual emitted geometry/resource inventories are unchanged:

| Inventory, before = after | Wide | Compact |
| --- | ---: | ---: |
| Triangle capacity, including hidden meteor slots | 48,660 | 24,212 |
| Star points | 12,000 | 9,000 |
| Unique geometry-array bytes | 1,074,476 | 670,476 |
| Potential submissions | 13 | 13 |

The quiet finite frames submit 4 draws and 48,642/24,194 triangles plus their star points. At desktop sky time 11 s, the before fixture submits 7 draws/48,648 triangles while the after fixture submits 4/48,642; at after time 22 s it submits 7/48,648. These are fixture counts for different scheduled event states, not whole-application timing measurements or an optimization claim. Array bytes are nominal typed-array payload, not measured process/GPU memory. CPU/GPU speed, frame pacing, heat, power and battery changes were not measured.

## Verification and review

The [isolated verification record](verification-checks.json) records **588/588 tests passed**, typecheck, production build including the indexed-cylinder geometry check, and affected four-file lint. The [focused orbital audit](motion-audit.json) records 35/35 checks, exact unchanged resource/registration invariants and the strengthened cadence assertions. Full tests ran from a disposable source-only checkout with fresh test-only D1/R2/secrets, bootstrapped owner and explicit `TEST_BASE_URL=http://127.0.0.1:3003`; the main store/environment were not copied or used for mutations.

The [build log](checks/build.log) retains Node's `module.register()` deprecation, the >500 kB chunk warning and Vinext's incomplete route classification. No required automated check failed. The test fixture/server is removed, port3003 is closed and main localhost:3000 was HTTP200 at cleanup. Raw logs and normalized durable logs are retained, with hashes and normalization disclosed.

The [live review](live-review.json) records desktop overview, all four cabin close views and ordinary inter-room travel, plus portrait overview/Contact/return and released drag in both layouts. The completed craft remains prominent, with no new environment seams or star-field edges in these views. The Earth helper seek-paused, played at 60×, returned to 1× on close/reopen and restarted at the opening. No messages were sent or stored inquiries altered. Desktop and portrait console checks returned no warnings/errors. Reduced-motion and visibility rules were checked by automated tests, not a new manual browser session.

The [capture integrity audit](capture-integrity.json) verifies all 37 JPEGs, 21 fixture metadata records and 16 live records, eight matched pairs and final source bindings. Opening and loop-endpoint candidate images are byte- and pixel-identical. A wrongly sized initial portrait capture was rejected and replaced; no browser error-page capture is retained. Live screenshots and sampled Play-sky frames advance between metadata and image reads; they are not frame-perfect motion measurements.

Both temporary servers (3003/3021) are stopped and the test state removed; main port 3000 remains HTTP 200. Valid review tabs and the unused blank tab are closed, and the viewport override reset. One hidden browser-generated connection-error tab remains because its close call was rejected by the browser URL policy for its `data:` error-page URL. It has no running application.

The [independent critic](critic-review.md) scores the final result **95/100**, with 55% visual-design weight and no unresolved blockers or required-check failures. It preserves the rubric, findings and limitations. Finite pose equality is bounded evidence, not a newly exhaustive camera/UV-envelope proof. Native Safari/physical-device tests and rendering-performance measurements were not performed.

## Stage 13 handoff

Carry forward the restrained blue horizon, unchanged Earth imagery/world motion and clear pauses between meteor groups. Shared screen artwork, native applications, notebook/reading typography and interface states remain Stage 13 work; preserve their existing camera fit, accessibility and truthful content. Use the opening, portrait-room and oblique comparisons above when checking interface contrast against the orbital background. No new Earth asset, camera change or pending performance-ledger candidate is required for that stage.
