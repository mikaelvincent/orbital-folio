# Procedural ocean environment

The current scene generates all ocean, cloud and sky visuals in `components/orbital-environment.ts`. It loads no Earth images and needs no external asset service. The previous NASA maps were removed from the runtime and repository; historical credits and measurements remain in [EARTH-ASSETS-PREVIOUS.md](EARTH-ASSETS-PREVIOUS.md).

| Generated texture payload | Desktop | Mobile |
| --- | ---: | ---: |
| R8 periodic cloud-noise volume |64³ /262,144bytes|32³ /32,768bytes|
| Small baked nebula, with mipmaps |174,764bytes|43,692bytes|
| Total |436,908bytes (0.417MiB)|76,460bytes (0.073MiB)|

These are exact texture payload estimates, excluding driver/geometry/framebuffer overhead and Three.js's shared1KiB lighting lookup. The prior highest image tier required244.82MiB of texture payload. Lower memory and zero image downloads do not by themselves prove lower GPU frame time; current browser evidence records rendering cadence separately.

A seamless three-dimensional noise lattice is sampled on the sphere to form moving cloud wisps without a land map, longitude seam or polar pinch. Ocean rotates at 0.0015radians/second, clouds at 0.0021, with slow cloud morphing. The blue atmospheric edge is a separate shell. A low-resolution nebula is baked once; star twinkle and meteor cores/tails use small shaders.

Two staggered streams schedule meteors every roughly 8–14 active seconds, lasting 1.1–1.6seconds each. They remain above the low horizon and move diagonally with tapered tails. Pause/reduced motion, hidden tabs and offscreen state stop the shared simulation clock. Desktop and mobile use the same art direction with smaller mobile procedural fields.

All editable assets are repository-native geometry, shader source and deterministic generated data. No third-party Earth imagery is used in the current build.
