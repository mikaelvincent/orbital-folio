# Mediterranean night Earth — 14 September 2026

The approved final opening is Mediterranean. The subsequent request selects **2K**. This pass fixes that composition, removes the temporary picker, and replaces the night globe's broad saturated blue glow with a softer atmospheric treatment.

## Art direction and reference

NASA's [Aurora, Meet Airglow](https://earthobservatory.nasa.gov/images/147122/aurora-meet-airglow) shows a blue lower horizon caused by the rising Sun, below a muted warm airglow band; its green aurora is a separate phenomenon. NASA's [Moon and Milky Way photograph](https://www.nasa.gov/image-article/light-of-moon-starry-milky-way/) also places its blue limb between day and night. A uniform electric-blue outline is not a general depiction of deep night.

The implementation takes an artistic twilight interpretation: a feathered blue-violet lower limb, a faint amber upper layer, and gradually varying brightness along the curve. It does not add an aurora over the Mediterranean. The image remains a historical cloud-free night composite, not a simulation of one astronomical instant. Artistic readability takes priority over physically exact brightness and scale.

One transparent sphere renders both profiles. The shader computes the ray's distance from Earth's center, so the edge follows the actual spherical silhouette rather than an interpolated mesh-normal rim. Its density falls away inward to keep the ocean dark, and outward to avoid an abrupt outer edge. The shared sphere geometry is reused; no new map, blur pass, bloom pass or per-frame atmospheric texture generation is added. The old night haze mesh and unused daylight lights are removed. Daytime atmosphere and assets remain available to the existing comparison tools.

## Cleanup and delivery

- Removed the Earth toolbar button, selector component, manual-adjustment CSS, saved preferences, setting/replay React state, spacecraft control API and effects, selector-only dismissal helper and tests.
- Removed the unused preset catalogue, value normalization, local-storage key and runtime custom-view setter. The renderer now uses the fixed Mediterranean geographic transform. Previously saved custom settings cannot override it.
- Preserved global reduced-motion/active-clock behavior and waiting for asset readiness. Room cameras and navigation are unchanged.
- Downsampled the retained, verified 13500×6750 NASA GeoTIFF directly to 2048×1024. Production fetches only the 2K night JPEG. The old 8K night asset and explicit loader option remain for reproducing comparisons, alongside the existing daytime benchmark assets.

| Asset cost | Previous 8K night | Current 2K night |
| --- | ---: | ---: |
| JPEG bytes | 2,329,878 | 179,391 |
| Pixel dimensions | 8192×4096 | 2048×1024 |
| Estimated RGBA8 texture with mipmaps, bytes | 178,956,972 | 11,184,812 |
| Earth surface / atmosphere draws | 1 / 2 | 1 / 1 |

The download is 92.3% smaller; nominal texture payload is 93.75% smaller. CPU decoded bitmap storage and driver overhead are additional. City lights are visibly softer at the close foreground scale, as expected at the requested 2K resolution. The atmosphere saves one draw of the shared sphere but changes fragment work; these structural differences do not establish an end-to-end GPU or thermal improvement. No controlled timing comparison or next performance candidate was run.

## Validation

**25 focused tests passed**, including static Mediterranean projection at 0/5/10 seconds across 1280×720, 2560×600, 390×844 and 768×4096; delayed image readiness and active-clock behavior; resource reuse/disposal; the single night atmosphere and absence of the daylight rig; loader failure/cancellation; and actual 2K image dimensions, bytes, hash and provenance. Type checking, targeted type-aware lint and the production build also passed. [Tests](tests.log) · [Type checking](typecheck.log) · [Lint](lint.log) · [Build](build.log).

Visual checks used actual desktop **Safari 26.6.2** and Chromium responsive viewports. The captures are running scenes, not matched-frame quality comparisons:

- [Safari desktop](safari-desktop.png): fixed Mediterranean opening; no Earth picker remains.
- [Compact 390×844](compact.png): atmospheric arc fits below the vertical ship.
- [Wide 1920×640](wide.png): continuous curved glow with no faceted edge or abrupt cutoff.

The [live environment record](environment.json) confirms night appearance, Mediterranean coordinates, a successfully loaded local 2048×1024 texture, 179,391 transferred bytes, 11,184,812 estimated texture bytes with mipmaps, and one atmosphere layer. Chromium reported no warning/error console entries. The [production diagnostics snapshot](production-diagnostics.json) is retained as integration evidence; incidental timing samples are not a controlled before/after benchmark. Physical phone hardware was not tested. Temporary browser viewport changes were restored and the test tab closed; the user's Safari preview remains available.
