# Earth representation, resolution and delivery tradeoffs

Consolidates former ledger entries **05–13** (14 September 2026): cloud-field
precomputation, satellite coverage, and day/night resolution comparisons. These
are related choices about the orbital background, **all historical**. The
production regional night loop has its own later
[asset and comparison record](../evidence/earth-consistent-loop/README.md).
The revisions below have different art, shaders, maps and protocols; their
improvements are neither additive nor interchangeable baselines.

## Procedural clouds versus a prepared field

The original hybrid generated a small 3D basis and evaluated weather/shading
with 17 desktop/11 mobile texture lookups per fragment. Connected clouds moved
to a deterministic 2048×1024 density/height/slope atlas with a bounded volume
shader. Shipping the field avoids generating that new atlas on a visitor's
machine but adds download and decoded storage; generated and shipped versions
feed identical field bytes into the same shader.

[Cloud delivery evidence](../evidence/performance/cloud-delivery/README.md)
retains source identity, exact roundtrips, all startup samples, codec experiments
and four short browser runs. The CFD1 planar delta layout cut gzip **4,259,591 →
3,165,073 bytes (25.7%)** without changing the 8,388,608-byte atlas. Four warm Node
BC/CB pairs observed generation **560.30–567.37 ms** versus local read/inflate/unpack
**36.73–150.98 ms**, retaining the slow decode. This is not a network or cold
browser first-display claim. Nominal RGBA8 mip storage is 11,184,812 bytes.

The separate background GPU comparison observed lower means in all four short
ABBA/BAAB trials, but baseline variation was large; its qualified
[GPU audit](../evidence/performance/cloud-delivery/gpu-audit.md) preserves the
ranges and limits. This change also replaces continuously morphing weather with
a fixed rotating field. A later satellite-mask field improved the art and cut
its payload to 2,781,463 bytes (12.1%); it was not retimed and cannot inherit the
prior procedural generator's startup saving. The subsequent
[2K satellite comparison](../evidence/performance/satellite-earth-2k/audit-summary.md)
uses that satellite volume as its baseline, not the original hybrid.

## Satellite day-map resolution

The 2K day map looked too soft to the owner. 4K and then 8K trials were prepared
from the original 8192×4096 NASA source, with unchanged sampling within the map
family. The [four-way audit](../evidence/performance/earth-fourway/audit-summary.md)
compares the **original hybrid**, 2K, 4K and 8K in four Williams orders at each
of two viewports: Chromium/ANGLE Metal on one M4, frozen time 180 seconds,
1280×720/DPR2 and 390×844/DPR1. The compact cohort is not phone hardware.

All eight rounds/1,920 GPU queries were retained; 72 native observations reported
nominal pressure, Low Power Mode off and battery. Background GPU means were
**6.921 / 3.596 / 3.281 / 3.413 ms** desktop and
**0.918 / 0.461 / 0.474 / 0.514 ms** compact. This supports lower background cost
for those satellite designs than the original procedural design in this lab.
Resolution block ranges overlap; the experiment does not rank 2K/4K/8K reliably.
All variants paced around 16.67 ms, so no whole-site FPS gain is claimed.

Image downloads were 526,263 / 1,925,103 / 6,615,276 bytes; nominal mip payloads
11.185 / 44.739 / 178.957 MB. First local desktop submissions were 68.1 / 133.8 /
447.4 ms, but preparation ran once in fixed order with shared caches. These are
neither replicated cold starts nor measured process/GPU memory. The lab kept
all four environments resident. [Protocol and raw reports](../evidence/performance/earth-fourway/protocol.md),
[asset identities](../evidence/performance/earth-fourway/assets/) and visual
comparisons remain together. The earlier
[4K framing review](../evidence/performance/satellite-earth-4k/resolution-review.md)
explains why a full-world map's nominal resolution overstates its visible detail.

## Night-map quality versus footprint

Night imagery and the cinematic atmosphere were authored changes, not inherited
day-map performance gains. The owner ultimately selected 8K detail. The
[night resolution evidence](../evidence/performance/night-earth-resolution/README.md)
compares six permutations of 2K/4K/8K separately in historical native Safari and
Chromium at 1422×871/DPR2, frozen Mediterranean opening.

Downloads are **179,391 / 637,946 / 2,329,878 bytes**; nominal mip storage is again
11.2 / 44.7 / 179.0 MB. Chromium background GPU means 2.243 / 2.182 / 2.207 ms
have overlapping block ranges. Safari GPU timing was unavailable; frame
intervals were about 16.67 ms. There is no reliable resolution speed ranking.
The slower 8K local preparation is one fixed-order observation per browser,
not a cold-network benchmark. A Safari lock interruption is retained and
excluded; Chromium's native display condition was unobserved, qualifying its
GPU results. Browser observations are not a Safari-versus-Chromium speed test.

The evidence preserves exact sources/assets, raw/excluded reports, conditions,
matched 2K/4K/8K previews and preparation phases. No heat, battery or physical
memory saving was measured. Use the
[resolution lab](../../scripts/benchmarks/earth-resolution-lab.md) and read-only
auditors for reproductions; historical native Safari interaction is not standing
permission to control the user's browser.
