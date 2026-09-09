# Floating callouts and active space background

Baseline: `ff15f6a`. Scope: spacecraft and space-background renders only. The standing temporary target is 75/100 with a 6/10 floor; the previous 95 target applied to one earlier chassis iteration. See the independent [critic report](CRITIC-REPORT.md). Deferred readers, forms, studio workflows and SEO are outside this review.

## Changes

- Four native dark callouts replace all exterior room-name plates. Fine leaders attach to the front-aperture edges. Published navigation labels provide the text; orientation determines the two label rows. Hover highlights the label, leader and room. Buttons share the existing bounded-drag coordinator and support keyboard activation. A live endpoint clamp preserves narrow-screen margins for long labels.
- The portfolio identity retains its overview typography and world-projects from that position. A bounded spring fades it during travel. Settled rooms hide and disable it. A stable outer wrapper supplies layout measurements, avoiding feedback from animated transforms.
- Overview fitting uses 112 support points from 14 subassemblies instead of the empty corners of one global box. An analytic view-plane shift centers the visible craft inside measured UI reservations. The fit includes drag angles, hover translation and 2.5% hover dolly. Callout space and small page margins remain reserved.
- The upper ladder landing is a narrow wall-supported transfer sill at its original doorway height, reaching the ladder rail. The lower landing and all four cabin interiors are preserved.
- Three staggered meteor timing banks replace one, using nine persistent slots. Events include singles, staggered parallel groups and independent trajectories with varied origins and directions. Stars have moderately higher base brightness and independently seeded twinkle amplitudes and frequencies. Earth/cloud rendering is unchanged.

## Evidence and limits

[Model audit](evidence/floating-callouts/spacecraft-callout-audit.json): 68 exterior label source meshes and eight ink textures removed; four interior headers and 616 protected cabin sources preserved through ten wide/compact states. Geometry probes confirm the transfer sill touches its support and ladder while clearing the docking opening.

[Meteor audit](evidence/floating-callouts/stars-meteors-audit.json): 720 starts versus 240 over 630 active seconds, exactly 3×; maximum concurrency nine versus three. Single meteors occupy 43.0% of samples, nine occupy 0.99%. The audit records 174 parallel and 66 independent multi-member groups. Mean stored star brightness rises 38%. Pause/reset, deterministic timing, resource identity and disposal checks pass. These timing counts are not a promise that every meteor is unobscured by the craft or Earth.

[Independent fit audit](evidence/floating-callouts/framing-audit.json): seven viewport fixtures, 13×13 angular samples, nine hover-offset combinations and full hover dolly. All 112 hull support points fit. Maximum-width callout fixtures retain at least 12 pixels of outer clearance and 16 pixels between their row partners. These are declared geometry/layout fixtures, complemented by actual browser captures.

[Built-browser evidence](evidence/floating-callouts/browser-qa.json) links screenshot names to viewport, projected bounds, camera/animation state and runtime diagnostics. `final-phone320-callout-drag` records a 442-pixel native drag starting on a callout: the camera moves, the page remains in overview, and activation is false. Keyboard Enter subsequently reaches Projects. The departure sample records nonzero identity opacity and a changed projection after navigation; settled About and Projects hide the identity. Callout transform transitions are disabled so buttons and their SVG leaders share the same camera projection. Screenshot and DOM reads are sequential and may differ by a few frames.

GPU views include desktop, portrait, drag, settled room, ladder and meteor appearances. Records named `final-*` are from the final build after a clean emulator restart; `candidate-*` and `production-*` retain earlier development/pre-fix observations. Each final filename has one matching record. This is viewport emulation on the development host, not physical mobile hardware. The narrow-screen renderer retains its lower quality profile after resize, so its desktop-sized sample must not be presented as fresh desktop-tier performance. A separately reloaded desktop view verifies the 3,100-star desktop profile. Frame diagnostics are host observations, not a 60-fps guarantee. Static captures plus deterministic scheduler checks do not replace extended real-device animation testing. Long portrait leader lines can cross the appendage silhouette; routing polish remains possible.

[Typing](evidence/floating-callouts/typecheck.txt), [lint](evidence/floating-callouts/lint.txt) and [production build](evidence/floating-callouts/build.txt) pass. The build retains existing framework route-classification and Node deprecation notices. No runtime error/warning appeared in the captured browser logs. An independent HTTP check caught stale asset references in the temporary emulator after a rebuild; restarting it resolved the issue. The final check verifies the page and every directly referenced JS/CSS asset.

## Operation and upkeep

No dependency, remote texture, database migration or personal render constant was added. Removing exterior plaques saves geometry and textures; the native callout layer adds four buttons and one SVG. Extra twinkle attributes add 12.4 KB desktop / 9.2 KB mobile; the environment now has at most 15 draw calls. Earth texture allocations and shader sampling are unchanged. Maintain the callout anchor/support metadata when changing the hull. The shared clock and existing disposal own all environment resources.

Reproduce from the repository root with history available:

```sh
npm run typecheck
npm run lint
npm run build
node scripts/spacecraft-callout-audit.mjs . ff15f6a components/spacecraft-model.ts /tmp/callout-model.json
node scripts/stars-meteors-audit.mjs . components/orbital-environment.ts /tmp/stars.json ff15f6a
node scripts/floating-callout-fit-audit.mjs "$PWD" /tmp/callout-fit.json
npm run dev -- --port 3000
```

The editable sample site remains running at `http://localhost:3000/`. The temporary production verification server is stopped after review. [OPERATIONS.md](OPERATIONS.md) retains setup/admin and deployment instructions. No public deployment is claimed.
