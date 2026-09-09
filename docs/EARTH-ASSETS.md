# Procedural ocean environment

All ocean, cloud and sky visuals are generated in `components/orbital-environment.ts`. No Earth image, external noise asset or runtime asset service is used. Historical image credits remain in [EARTH-ASSETS-PREVIOUS.md](EARTH-ASSETS-PREVIOUS.md).

| Logical GPU texture payload | Desktop | Mobile |
| --- | ---: | ---: |
| Periodic RG8 gradient/cellular volume, mip chain | 64³ / 599,186 bytes | 32³ / 74,898 bytes |
| Baked nebula, mip chain | 174,764 bytes | 43,692 bytes |
| Total | 773,950 bytes | 118,590 bytes |
| Cloud texture samples per fragment | 17 | 11 |

These estimates exclude geometry, framebuffers, driver padding and Three.js’s shared 1 KiB lighting lookup. GPU timing is separate evidence. Volumes generate once and are never updated during animation.

The cloud algorithm separates regional weather from local texture. A rotating spherical flow axis organizes a broad comma front with changing width. Fractal variation softens the edges and varies a continuous stratiform interior. Smaller cumulus is restricted to the cold side of that front, while weaker directional cirrus follows its shoulder. This replaces the rejected uniform cellular foam. Local billows use separate, mildly warped coordinates to avoid inheriting the weather front’s stretching. Desktop detail uses a bounded two-tap major-axis filter. Two sunward density probes and a bounded screen-derivative density normal provide relief. Exponential extinction approximates optical thickness. This thin shell has no true volumetric parallax, complete ray integration or multiple scattering.

The design draws on the separation of weather organization, cloud types, density and lighting in [Guerrilla’s Nubis](https://www.guerrilla-games.com/read/nubis-authoring-real-time-volumetric-cloudscapes-with-the-decima-engine); the organized fronts and clear sectors in [NASA’s cloud streets and comma clouds](https://science.nasa.gov/earth/earth-observatory/clouds-streets-and-comma-clouds-near-svalbard-87749/); and [PBRT’s treatment of transmittance](https://pbr-book.org/4ed/Volume_Scattering/Transmittance). These are primary research and visual references, not copied code or a claim of meteorological simulation.

Ocean rotation remains 0.003 radians/second. Clouds rotate at 0.0072 radians/second (0.413 degrees/second), with slow morphing. A full cloud turn takes about 14.5 minutes. Ocean, cloud shell and atmospheric limb are separate meshes. All texture/derivative operations occur before discard to keep mip gradients valid at cloud edges.

Meteor groups begin every 3.8–5.2 active seconds, alternating direction. Small companions and occasional triples last 1.15–1.50 seconds; at most three appear simultaneously. A 1,800-second numeric sweep observes meteors during about 33.6% of active time and triples during 2.4%. All effects share the caller’s active clock and stop under reduced motion, hidden/offscreen suspension or Reading view. No independent timers are introduced.

Run `node scripts/orbital-environment-audit.mjs` for allocation, periodic continuity, sampled cellular-field correctness, meteor schedule, pause invariance and disposal checks. It executes CPU code, not GLSL. The [current validation](NATURAL-ORBIT-VALIDATION.md) distinguishes browser evidence from those calculations. Candidate notes, rejected render captures and the portable audit output remain in `docs/evidence/natural-orbit-revision/`.
