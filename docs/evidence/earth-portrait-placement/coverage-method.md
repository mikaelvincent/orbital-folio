# Portrait Earth placement: texture coverage recheck

The existing **2560 × 1536** regional texture remains valid for the audited
camera domain after adding the Earth-only responsive layout-roll compensation.
No texture or crop change is needed. This is a CPU geometry check, not a rendering
or performance benchmark.

| Mesh | Directly visible source rows, outward-rounded | Expanded source rows | North / south crop margin | Guarded geometric UV-seam clearance |
| --- | --- | --- | --- | --- |
| Desktop, 128 × 96 segments | 469–1449 | 469.333–1782.073 | 85.333 / 137.927 rows | 115.3125° |
| Mobile, 96 × 64 segments | 512–1441 | 512–1782.003 | 128 / 137.997 rows | 116.2500° |

Both meshes retain more than the chosen **64 source rows** of filtering allowance
at each edge of the existing row-384 crop (retained rows 384–1919, exclusive end
1920). The largest expanded longitude envelope is **87.1875°**, narrower than the
texture's **112.5°** repeat. The maximum sampled same-latitude span is 84.375° for
desktop and 86.250° for mobile. These are geometric limits for the checked domain,
not a proof of pixel-identical coarse mip filtering or universal optimal height.

## Method and domain

[The desktop report](coverage-desktop.json) and
[the mobile report](coverage-mobile.json) each contain **24,157 poses**, with
compressed raw records linked from their summaries: **48,314 poses total**.
The tool now passes each sampled `pose.roll` to production `followCamera` and
records `layoutRollRadians`, including the intermediate portrait-to-room values.
Earth and atmosphere compensate that layout roll; ordinary hover, drag and camera
translation still change the relative viewpoint. Stars are outside this audit.

The audit clips the actual front-facing sphere triangles against all six camera
frustum planes, carrying their perspective-correct UV bounds. It ignores hull,
atmosphere and interface occlusion, conservatively retaining hidden Earth pixels.
The same current camera fitting, responsive field of view, room, reader, Contact,
hover and drag fixtures are used as in the
[previous certificate](../earth-consistent-loop/coverage-method.md).
The 17 viewports are 1280×720, 1440×900, 1920×1080, 2560×1080, 2560×600,
1024×768, 768×1024, 390×844, 360×800, 844×390, 768×4096, 320×568,
320×1200, 1080×1920, 4096×768, 700×701 and 701×700.

The continuous-neighborhood calculation allows a 0.25-orbital-unit camera
translation and 5.5° change of each frustum-plane normal **relative to Earth's
transform at that sample's layout roll**. It does not additionally certify an
independent, unbounded Earth transform change. Travel uses eleven interpolated
Home-to-room states plus bounded drag samples, not a replay of every spring,
ladder route, reverse transition or resize sequence. These neighborhoods do not
establish coverage of every possible runtime state or arbitrary viewport.

Texture playback still scrolls U on the presented sphere. At a given camera and
layout pose, V coverage and the geometric U=0/1 seam position remain unchanged
throughout the loop. Artistic image-edge continuity still requires visual checks;
the geometry calculation does not decode texture pixels.

## Provenance and checks

Both full reports and their raw records retain the actual source hashes used for
calculation. After the runs started, the root agent expanded two statements with
the formatter in `orbital-environment.ts` and clarified comments in
`earth-view-transform.ts` and `spacecraft-runtime.ts`. The exact earlier source
bytes were reconstructed and verified against their recorded hashes. Their
minified esbuild JavaScript is identical to the final source. This is explicitly
recorded in [source verification](coverage-source-verification.json), including
the base commit and both hashes; no rerun or replacement of computed hashes is
implied. Every other audited source hash matches the final file directly.

An earlier [390×844 quick check](coverage-portrait-quick.json) is retained with its
raw records. Its 1,421 poses are included again in the full desktop sweep, so they
are not added to the 48,314-pose total. It passed before the full runs finished:
expanded rows 469.333–1633.582, with 85.333 / 286.418 rows of margin.

The audit tool's affected lint and `git diff --check` passed. The parent task owns
the application test/build and rendered visual checks.

## Reproduce

```sh
node scripts/benchmarks/earth-visible-coverage.mjs --gzip-samples \
  --out docs/evidence/earth-portrait-placement/coverage-desktop.json
node scripts/benchmarks/earth-visible-coverage.mjs --mobile-mesh --gzip-samples \
  --out docs/evidence/earth-portrait-placement/coverage-mobile.json
```

These commands rerun against the current source. Preserve the checked-in evidence
before writing results from a later source revision over it.
