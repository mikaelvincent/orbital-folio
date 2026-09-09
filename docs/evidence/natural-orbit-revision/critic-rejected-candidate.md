# V10 first working visual review — not a final score

Scope: only render imagery, spacecraft geometry and render navigation. Reviewed `/tmp/v10-cloud-second-look.jpg`, `/tmp/v10-experience-doors-first.jpg`, and the current cloud shader. The doorway capture predates the reported outline-only focus CSS fix; this note does not treat its filled focus state as current. No separate reading UI was exercised.

## Blocking visual concern: Earth clouds

The second cloud candidate is visibly more populated, but does not yet meet the requested realistic, high-fidelity appearance. At the supplied 1440×1000 view it reads as an evenly distributed foam/lace pattern: rounded white islands, many similarly sized blue holes, soft uniform edges and little perceptible thickness. The foreground is especially diagnostic; the planet's scale should allow coherent weather systems and finer filaments to coexist, while this pattern mostly advertises the same medium-sized noise shape. Saturated blue/white contrast further flattens it into a surface stencil.

This is a judgment of the supplied pixels, not a requirement to use ray marching. A thin cloud shell can be suitable at this orbital distance. The current implementation's named weather/cumulus/cirrus layers and density probes do not by themselves establish visual realism. I would not award Earth/space 8/10 from this image.

Concrete improvement targets:

- Make broad, directionally coherent weather fronts and clear-ocean regions recognizable in the default visible patch, with a hierarchy of large systems, medium clusters and small erosion. Avoid filling the patch with one evenly repeated apparent scale.
- Make wispy, anisotropic filaments visibly different from rounded low cloud. The present cirrus term is gated by regional field, frontal mask, clear-density mask and a 0.16 multiplier; it is not perceptually prominent in this capture.
- Give thick and thin cloud different opacity and restrained, consistent sunward relief. Current relief combines roughly 70–100% transmitted illumination with only a small powder variation; the image does not show enough depth or shaded structure. Avoid solving this with arbitrary dark borders.
- Retain filtering at distance, but verify foreground detail has not been flattened by broad remapping/mip filtering. A higher texture dimension alone would not solve the current pattern hierarchy.
- Recheck the naturally rotated view and the mobile tier. A single favorable camera/time cannot substantiate a stable, high-fidelity globe.

## Spacecraft observations

The swapped upper cabins and lit vertical circulation read clearly in the overview. The neutral exterior/amber fittings are coherent. Dimming is much stronger: both consoles are nearly black and only large interior outlines are discernible. This is near the lower useful visibility limit of the user's request to dim without pitch black; preserve a trace of instrument/fixture emission so discovering objects still feels intentional.

Desktop door labels now belong to the side walls and remain readable in the supplied cabin image. Narrow-view foreshortening is a physical consequence of this mounting; do not claim those plaques remain fully readable when projected to 16–25px. The persistent bottom navigation can provide the equivalent accessible destination choice. Check actual doorway hit regions independently of label ink size.

The large room header has a conspicuous near-black undershadow and appears to sit in front of a dark slot. The model agent's pending header/occlusion correction should be reviewed in a fresh settled image. The overview's top and bottom domain strips still resemble thin freestanding signboards; the pending flush hull-branding change should address that impression. These pending details are not marked resolved from intent alone.

No fresh five-area score is issued. Final model, clouds, responsive controls and performance evidence remain pending.
