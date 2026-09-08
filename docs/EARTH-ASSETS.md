# Procedural ocean environment

All ocean, cloud and sky visuals are generated in `components/orbital-environment.ts`. No Earth image or external asset service is needed. Historical image credits remain in [EARTH-ASSETS-PREVIOUS.md](EARTH-ASSETS-PREVIOUS.md).

| Generated GPU texture payload | Desktop | Mobile |
| --- | ---: | ---: |
| Periodic R8 noise volume, complete mip chain | 64³ / 299,593 bytes | 32³ / 37,449 bytes |
| Baked nebula, complete mip chain | 174,764 bytes | 43,692 bytes |
| Total | 474,357 bytes (0.4524 MiB) | 81,141 bytes (0.0774 MiB) |

These estimates exclude geometry, framebuffers, driver overhead and Three.js’s shared 1 KiB lighting lookup. Memory and image-transfer savings do not prove GPU speed; browser cadence is recorded separately.

The seamless volume controls spatial variation rather than a fixed screen resolution. Quintic interpolation, rotated octave domains, several scales of billows and stretched fibers, and fine edge erosion produce the cloud structure. Explicit gradients and mip filtering soften compressed detail at the horizon without discontinuous cell-edge LOD. The shader uses eight cloud samples per fragment on desktop and seven on mobile. Mips are generated once on upload.

Ocean rotation is 0.003 radians/second. Clouds rotate at 0.0072 radians/second (0.413 degrees/second), 3.43 times the previous rate, with slow morphing. A full cloud turn takes about 14.5 minutes. Ocean, cloud shell and atmospheric edge remain separate meshes.

Meteor groups begin every 5–9 active seconds, alternating direction. Every fourth group includes a slightly delayed, dimmer companion; no more than two appear simultaneously. Events last 1.1–1.55 seconds. The navigation region is masked and tails are tapered. Twinkling stars, meteors, ocean and clouds share the caller’s active clock, preserving Pause and reduced motion.

`node scripts/orbital-environment-audit.mjs` checks allocation, periodic continuity, rotation, the meteor schedule over 3,600 active seconds per tier, paused state and disposal. Browser screenshots and observed phases supplement this numeric audit; it does not execute a GPU shader.
