# Cloud delivery comparison

Completed evidence: [startup delivery results](startup-summary.md), [browser GPU and preparation audit](gpu-audit.md), and their linked raw reports. The startup comparison retains every scheduled sample, including the slower decode observation. The browser audit separates the measurement interval from later visual/build checks.

The comparison separates three approaches:

| Approach | Client startup | Each rendered frame |
| --- | --- | --- |
| A: original hybrid clouds | Generate a small 3D basis plus the existing nebula | Evaluate weather, density, and shading with 17 desktop / 11 mobile 3D texture lookups |
| B: new field generated at startup | Generate the density, height, and tangent-slope atlas | Render the new cloud volume from that atlas |
| C: developer-prebuilt new field | Acquire and decompress the asset | Use the same shader and atlas bytes as B |

B and C must produce identical field bytes. Their rendering cost should therefore be compared through the same production shader; different delivery alone is not a GPU optimization. Comparing A against the new volume also changes the cloud representation and requires visual evaluation, including motion and the horizon.

`scripts/benchmarks/cloud-reference.ts` preserves the exact original environment from `/tmp/orbital-environment-cloud-baseline.ts`. Both had SHA-256 `ec83790e30c7559d17580076fbda53addc2aa67a1d1c9895dffb29bbb0de21c9` when copied. Its factory includes sky/stars/geometry work, and its procedural generation metric includes the nebula; do not compare that whole-factory number against B's field-only cost as if they had equal scope.

The benchmark defaults to dry-run. No cloud generation, compression, or timing occurs without `--verify` or `--run`. `--verify` performs substantial developer-side field generation and compression, so also schedule it outside browser captures.

```sh
node scripts/benchmark-cloud-delivery.mjs --dry-run

node scripts/benchmark-cloud-delivery.mjs --verify \
  --sizes=2048x1024 \
  --assets='{"2048x1024":"public/textures/cloud-banks-v1.cfd.gz"}' \
  --out=docs/evidence/performance/cloud-delivery/verification.json

node --expose-gc scripts/benchmark-cloud-delivery.mjs --run \
  --sizes=2048x1024 \
  --telemetry-argv='["/tmp/orbital-folio-mac-thermal-snapshot","--pmset"]' \
  --assets='{"2048x1024":"public/textures/cloud-banks-v1.cfd.gz"}' \
  --out=docs/evidence/performance/cloud-delivery/startup.json
```

The generic script supports 2048×1024 and 1024×512, but the current production asset uses **2048×1024 on both desktop and mobile**. The commands explicitly select that actual size. Omitted assets are generated as local raw fixtures alongside the report. Explicit assets can be raw RGBA or CFD1 packets, optionally gzip-compressed; both headers are detected. The report retains compressed-file, transport-body, and decoded-field hashes, repeat-generation equality, compression roundtrips, byte sizes, and estimated RGBA8 mip storage. CFD1 unpacking has its own measured stage, separate from gzip decompression.

## Lossless layout selection

`lib/cloud-field-codec.ts` implements CFD1: an eight-byte header (`CFD1`, then little-endian uint16 width and height), followed by four separate channel planes containing horizontal byte differences modulo 256, reset at each row. Decoding restores the original RGBA8 data and does not change texture/shader inputs. Gzip compression remains external to the codec.

On the captured atlas with decoded SHA-256 `a3b45edb88bb9e44beb8bb979eabbbd474365d84cbc1f117f364f83b0657b966`, gzip level 9 shrank from 4,259,591 bytes for raw RGBA to 3,165,073 bytes for CFD1: a lossless saving of 1,094,518 bytes, approximately 25.7%. The interleaved row-delta alternative was 3,311,438 bytes. CFD1 with Brotli quality 5 was 3,091,163 bytes. These are size measurements on that atlas, not decode-speed claims or predictions for future artwork. [Full comparison and exact roundtrip proof](codec-comparison.json).

Four unit tests cover the specified byte layout, random/extreme inputs, non-power-of-two dimensions, typed-array offsets, input preservation, and malformed packets. The size probe also verifies the actual complete atlas roundtrip plus gzip/Brotli roundtrips. Re-run the untimed probe against a final asset after changing its field content:

```sh
node scripts/probe-cloud-field-codec.mjs \
  --input=public/textures/cloud-banks-v1.cfd.gz \
  --out=docs/evidence/performance/cloud-delivery/codec-comparison.json
```

Timing records separate field generation, warm local file reading, raw typed-array preparation, and Node decompression. B/C startup samples alternate BC/CB with fixed sample counts and idle gaps; two A samples bracket them under their separately labeled scope. The default initial rest is 60 seconds, with 10-second gaps between samples. When native telemetry is supplied, elevated/unavailable thermal pressure can postpone or skip a sample. Preserve all readings and flags, and inspect power sources across samples. These are bounded descriptive samples; there is no automatic promotion or claim that a fixed rest establishes thermal equilibrium.

Node file reading is not network transfer. Actual compressed response bytes, browser decompression, cold versus warm cache, first correct cloud frame, WebGL upload/mip generation, shader compilation, and GPU frame cost require separate production-browser measurements. Keep viewport, pixel ratio, cloud time, and camera pose consistent, and compare multiple fixed times plus motion. Texture lookup counts are workload descriptions, not measured GPU timings. Screenshots and movement checks determine whether the new banks read as continuous, fluffy volume and remain stable at the horizon.
