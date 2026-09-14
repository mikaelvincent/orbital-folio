# Sky motion review

The star field keeps its existing positions, colors and sizes. Stronger
independent two-frequency modulation makes individual stars brighten and soften
in the opening seconds. Mean field brightness remains essentially unchanged.

The three meteor banks now span nine seconds instead of 4.5. Single events and
small groups have spaced starts, coherent directions and staggered members.
Trails are shorter, dimmer, slower and fade gently at both ends.

## Deterministic before/after audit

`sky-measurements.json` samples the actual source modules for 180 seconds at
30 samples/second, plus all 3,100 stars across the first eight seconds. Brightness
means the analytical central fragment in linear RGB before output/compositing;
these are not photographic brightness or GPU timing measurements.

| Metric | Before | After |
| --- | ---: | ---: |
| Individual shooting-star arrivals/minute | 69.0 | 34.3 |
| Scheduled groups/minute | 40 | 20 |
| Maximum simultaneous streaks in the sampled window | 9 | 4 |
| Median full travel duration | 1.32 s | 2.40 s |
| Median gap between group starts | 1.35 s | 2.63 s |
| Median authored tail length | 0.120 | 0.081 |
| Median meteor head central linear luminance | 0.907 | 0.384 |
| Median regular star central linear luminance | 0.428 | 0.427 |
| Median individual relative brightness swing in eight seconds | 0.349 | 0.890 |
| Stars with at least 40% base-brightness swing | 42.2% | 97.6% |
| Whole-field aggregate relative swing | 2.0% | 4.4% |

Arrivals decrease by 50.2%; median travel duration rises 81.4%. Median meteor head
peak luminance falls 57.7%. Its resulting 0.259–0.529 range sits within the regular
stars' sampled 5th–95th percentile range of 0.195–1.129.

Slower streaks stay visible longer. The fraction of samples containing any
mathematically visible meteor only falls from 86.6% to 84.0%, including faint
fade endpoints. Half the arrivals does **not** mean half the occupied time.
The intended calmer impression comes from spacing, restrained brightness and
removing synchronized bursts together.

Star buffer size remains 136,400 bytes, with 3,100 desktop stars and nine reused
meteor slots. The 8192×4096 Earth remains active. Existing pause, deterministic
seek, disposal and world-camera behavior are covered by the tests. No rendering
speed improvement is claimed for this art-direction change.
