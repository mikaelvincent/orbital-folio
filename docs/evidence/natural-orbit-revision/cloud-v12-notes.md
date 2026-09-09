# Foreground cloud detail v12

Integrated source: `components/orbital-environment.ts`; final source SHA is recorded by the packaged `environment-audit.json`. This memo describes the foreground detail refinement after the third GPU candidate was rejected.

## Source diagnosis and change

The actual v11 browser image preserved a useful curved weather system but stretched the foreground sheet into soft streaks. The shader sampled local billows using the same nonlinear cyclone coordinates as the broad weather system. Its secondary deck also multiplied a smooth mask by `0.58 + billows * 0.36`, allowing little internal or edge variation.

V12 separates local convection coordinates from the broad weather warp. A small `.008` warp perturbs the local billows while the existing cyclone/front coordinates still control the weather envelope and directional cirrus. Detail frequencies rise from 61/167/431 to 137/379/997. Existing cellular channels supply restrained irregular erosion and small rounded detail, while the main sheet remains controlled by the broad weather envelope. Secondary deck edges now include multiple frequencies, and their interiors use the same substantial density variation as the main sheet.

Sunward probes now sample those local billow coordinates. The density-gradient normal has more influence, with the same determinant guard and a bounded maximum slope. Shadow contrast is stronger but clamped. This is still an approximate thin layer, with no true cloud parallax or full volumetric transport. It does not establish a realism pass without the browser image.

## Filtering change

Desktop detail and sun probes use two equal-weight samples along the larger screen derivative. Their centers are at minus/plus one quarter of that derivative, with its filter footprint halved for each tap. This splits the major-axis pixel interval into two adjacent half intervals; weights remain positive and sum to one. It preserves more detail across an elongated footprint without applying an arbitrary negative mip bias to the whole pixel. It is a bounded two-tap approximation, not full elliptical anisotropic filtering. Mobile retains one sample per field.

The camera-aware finite-difference audit uses a four-pixel grid in the lower Earth band and excludes the outermost grazing edge (`mu <= .08`). For 15,337 desktop sample points, the median projected coordinate footprint axis ratio decreases from 6.86 with the cyclone field to 2.77 with local billow coordinates; the 95th percentile decreases from 15.20 to 7.43. On 2,779 phone points, the median decreases from 2.85 to 2.05. The remaining stretch includes the real perspective projection. This supports the coordinate diagnosis; it is not a GPU aliasing measurement.

At frequency 137, the desktop two-tap footprint changes the estimated mip level by median .028 and 95th percentile 1.0. Thus the most substantial improvement at that frequency comes from separating coordinates, while the two-tap filter helps longer footprints. The audit also checks that the two subintervals exactly partition the original major-axis interval and preserve the average of a linear field.

Evidence: `cloud-detail-footprint-audit.json` (candidate-specific CPU diagnostic; not a GPU benchmark).

## Cost and verification

Texture storage is unchanged: 773,950 desktop / 118,590 mobile logical GPU bytes including cloud and sky mips. The cloud volumes remain 64³ RG8 and 32³ RG8. CPU texture arrays remain 655,360 / 98,304 bytes. These exclude geometry, render targets, driver padding and Three's shared 1,024-byte DFG lookup.

Desktop cloud sample instructions rise from 12 to 17, a 41.7% increase; mobile remains at 11. Of the desktop total, ten are the two-tap reads for three detail fields and two sun probes, with seven ordinary reads for weather, cumulus and cirrus. A two-mip uncached logical corner-read estimate is 544 / 352 bytes per fragment, not measured bandwidth. Caching and mip selection govern real traffic. No extra draw, framebuffer, texture upload, external asset request or independent timer is added. The environment still draws at most nine objects including meteors. Rotation, active-time pause behavior, placement and atmosphere remain unchanged.

`node scripts/orbital-environment-audit.mjs` writes `/tmp/orbital-environment-audit.json`. Strict TypeScript and CPU allocation/mip, periodic field, unchanged texture version, pause, meteor bounds and disposal checks pass. All 14 unique resources dispose once. The 1,800-second animation sweep still observes at most three meteors. The texture-generation algorithm is unchanged; measured one-time times varied with host state (49.24 ms desktop / 3.52 ms mobile in this run), so no initialization-speed improvement is claimed.

Final browser screenshots and motion records are retained beside this memo. The earlier CPU previews are explicitly candidate-specific; acceptance uses the actual GPU image and browser cadence. Research references remain in `environment-notes.md` and `docs/EARTH-ASSETS.md`; no external code or imagery was added.
