import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import {
  createSatelliteCloudField,
  SATELLITE_CLOUD_FIELD_VERSION,
} from '../lib/satellite-cloud-field.ts';
import {
  CLOUD_ASSET,
  CLOUD_FIELD_WIDTH,
  CLOUD_FIELD_HEIGHT,
} from '../components/cloud-volume.ts';
import { decodeCloudField } from '../lib/cloud-field-codec.ts';

test('Satellite conversion rejects malformed dimensions and mask payloads', () => {
  for (const [width, height] of [
    [4, 2],
    [8, 8],
    [8.5, 4],
    [NaN, 4],
    [Infinity, 4],
    [8, 0],
    [Number.MAX_SAFE_INTEGER - 1, (Number.MAX_SAFE_INTEGER - 1) / 2],
  ])
    assert.throws(
      () =>
        createSatelliteCloudField({ mask: new Uint8Array(32), width, height }),
      /2:1 atlas/,
    );
  for (const mask of [
    null,
    new Uint8Array(31),
    new Uint8Array(33),
    new Float32Array(32),
    Array(32).fill(0),
  ])
    assert.throws(
      () => createSatelliteCloudField({ mask, width: 8, height: 4 }),
      /one byte per atlas pixel/,
    );
});

test('Original mask is preserved, including typed-array offsets, and conversion is deterministic', () => {
  const width = 64,
    height = 32;
  const padded = Uint8Array.from(
    { length: width * height + 29 },
    (_, i) => (i * 73 + i * i * 11) % 256,
  );
  const original = padded.slice();
  const mask = padded.subarray(13, 13 + width * height);
  const first = createSatelliteCloudField({ mask, width, height });
  const second = createSatelliteCloudField({
    mask: mask.slice(),
    width,
    height,
  });
  assert.deepEqual(first, second);
  assert.notEqual(first.data, second.data);
  assert.deepEqual(padded, original);
  assert.equal(first.version, SATELLITE_CLOUD_FIELD_VERSION);
  assert.equal(first.channels, 4);
  assert.equal(first.data.length, width * height * 4);
});

test('Ocean gaps stay empty beside bright clouds; north/south orientation is unchanged', () => {
  const width = 64,
    height = 32;
  const mask = new Uint8Array(width * height);
  // North is the final row, as required by the sphere mapping.
  for (let y = 23; y < height; y++)
    for (let x = 17; x < 39; x++) mask[y * width + x] = 230;
  const { data } = createSatelliteCloudField({ mask, width, height });
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 0) {
      assert.equal(
        data[i * 4],
        0,
        'Smoothing must not create extra cloud cover',
      );
      assert.equal(data[i * 4 + 1], 0, 'Ocean has no cloud height');
    } else {
      assert.ok(data[i * 4] > 0);
      assert.ok(data[i * 4 + 1] > 0);
    }
  }
  assert.equal(data[(2 * width + 28) * 4], 0);
  assert.ok(data[((height - 3) * width + 28) * 4] > 0);
});

test('Uniform thin, medium, and bright layers have increasing opacity and independently varied height', () => {
  const samples = [0, 20, 65, 110, 155, 200, 245].map((level) => {
    const { data } = createSatelliteCloudField({
      mask: new Uint8Array(64 * 32).fill(level),
      width: 64,
      height: 32,
    });
    for (let i = 0; i < data.length; i += 4) {
      assert.equal(data[i], data[0]);
      assert.equal(data[i + 1], data[1]);
      assert.equal(data[i + 2], 128, 'Flat layer has no east/west relief');
      assert.equal(data[i + 3], 128, 'Flat layer has no north/south relief');
    }
    return [data[0], data[1]];
  });
  assert.deepEqual(samples[0], [0, 0]);
  assert.deepEqual(samples[1], [0, 0]);
  for (let i = 3; i < samples.length; i++) {
    assert.ok(samples[i][0] > samples[i - 1][0]);
    assert.ok(samples[i][1] > samples[i - 1][1]);
  }
  assert.ok(
    samples[2][0] > 0 && samples[2][0] < 45,
    'Thin cloud remains translucent',
  );
  assert.ok(
    samples[2][1] < samples.at(-1)[1] / 3,
    'Veils stay much lower than dense cores',
  );
  assert.ok(samples.at(-1)[1] > 150 && samples.at(-1)[1] < 210);
});

test('An isolated bright speck remains lower than a coherent bright core, without enlarging either', () => {
  const width = 128,
    height = 64,
    x = 64,
    y = 32;
  const tiny = new Uint8Array(width * height);
  tiny[y * width + x] = 255;
  const broad = new Uint8Array(width * height);
  for (let yy = y - 12; yy <= y + 12; yy++)
    for (let xx = x - 12; xx <= x + 12; xx++) broad[yy * width + xx] = 255;
  const speck = createSatelliteCloudField({ mask: tiny, width, height });
  const core = createSatelliteCloudField({ mask: broad, width, height });
  const at = (y * width + x) * 4;
  assert.ok(speck.data[at] > 0, 'The observed small cloud remains visible');
  assert.ok(speck.data[at + 1] < core.data[at + 1] * 0.6);
  const clouds = (data) =>
    data.filter((value, i) => i % 4 === 0 && value > 0).length;
  assert.equal(clouds(speck.data), 1);
  assert.equal(clouds(core.data), 25 * 25);
});

test('Smoothing and all four output channels wrap across longitude without a seam', () => {
  const width = 128,
    height = 64;
  const mask = new Uint8Array(width * height);
  // This asymmetric cloud crosses the image seam. Rolling it away from the seam
  // must produce exactly the same volume, height, and directional shading.
  for (let y = 16; y < 47; y++)
    for (let x = -12; x < 9; x++)
      mask[y * width + ((x + width) % width)] = 90 + ((y * 11 + x * x) % 160);
  const shift = 39;
  const rolled = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      rolled[y * width + ((x + shift) % width)] = mask[y * width + x];
  const a = createSatelliteCloudField({ mask, width, height }).data;
  const b = createSatelliteCloudField({ mask: rolled, width, height }).data;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      for (let channel = 0; channel < 4; channel++)
        assert.equal(
          a[(y * width + x) * 4 + channel],
          b[(y * width + ((x + shift) % width)) * 4 + channel],
        );
  assert.ok(
    a.some((v, i) => i % 4 > 1 && v !== 128),
    'Cloud slopes are present',
  );
  for (let i = 2; i < a.length; i += 4) {
    assert.ok(a[i] >= 91 && a[i] <= 164, 'East/west relief remains restrained');
    assert.ok(
      a[i + 1] >= 91 && a[i + 1] <= 164,
      'North/south relief remains restrained',
    );
  }
});

test('Shipped satellite atlas matches its source record and preserves ocean gaps, thin clouds, and varied heights', () => {
  // Inspect the exact production bytes; never rebake the full field in tests.
  const asset = readFileSync(
    new URL(`../public${CLOUD_ASSET}`, import.meta.url),
  );
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        `../public${CLOUD_ASSET.replace(/\.cfd\.gz$/, '.json')}`,
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const { data, width, height, channels } = decodeCloudField(gunzipSync(asset));
  const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
  assert.equal(manifest.version, SATELLITE_CLOUD_FIELD_VERSION);
  assert.equal(manifest.gzipBytes, asset.length);
  assert.equal(manifest.rawBytes, data.length);
  assert.equal(manifest.sha256, digest(data));
  assert.deepEqual(
    [width, height, channels],
    [CLOUD_FIELD_WIDTH, CLOUD_FIELD_HEIGHT, 4],
  );
  assert.deepEqual(
    [manifest.width, manifest.height, manifest.channels],
    [width, height, channels],
  );
  const mask = gunzipSync(
    readFileSync(
      new URL(
        '../scripts/assets/nasa-cloud-mask-2048.gray.gz',
        import.meta.url,
      ),
    ),
  );
  assert.equal(mask.length, width * height);
  assert.equal(manifest.source.maskSha256, digest(mask));
  assert.deepEqual(
    [manifest.source.maskWidth, manifest.source.maskHeight],
    [width, height],
  );
  assert.match(manifest.source.maskOrientation, /south-to-north/);

  let area = 0,
    clear = 0,
    thin = 0,
    strong = 0,
    dense = 0,
    cloudy = 0;
  const cloudHeights = new Float64Array(256);
  for (let y = 0; y < height; y++) {
    // Equirectangular pixels represent less planetary area near the poles.
    const weight = Math.cos(Math.PI * ((y + 0.5) / height - 0.5));
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const density = data[pixel * 4] / 255;
      const top = data[pixel * 4 + 1];
      area += weight;
      if (density === 0) clear += weight;
      if (density > 0.01 && density < 0.1) thin += weight;
      if (density > 0.2) strong += weight;
      if (density > 0.6) dense += weight;
      if (density > 0) {
        cloudy += weight;
        cloudHeights[top] += weight;
      }
      if (mask[pixel] === 0) {
        assert.equal(density, 0, 'Source ocean gaps remain empty in the asset');
        assert.equal(top, 0, 'Source ocean gaps do not acquire relief');
      }
    }
  }
  const heightAt = (percentile) => {
    let sum = 0;
    return (
      cloudHeights.findIndex(
        (weight) => (sum += weight) >= cloudy * percentile,
      ) / 255
    );
  };
  // Broad art-direction guards, not a claim that pixel coverage predicts the
  // final grazing-angle appearance. Visual checks still assess that separately.
  assert.ok(
    clear / area > 0.35 && clear / area < 0.7,
    'Substantial ocean gaps without an almost-empty planet',
  );
  assert.ok(thin / area > 0.12, 'Thin clouds remain alongside dense regions');
  assert.ok(
    strong / area > 0.08 && strong / area < 0.3,
    'Strong clouds are selected clusters, not a global blanket',
  );
  assert.ok(
    dense / area > 0.003 && dense / area < 0.08,
    'Very dense cores occupy a small fraction of the globe',
  );
  assert.ok(heightAt(0.1) < 0.08, 'Thin low veils are present');
  assert.ok(
    heightAt(0.5) > 0.08 && heightAt(0.5) < 0.24,
    'Typical clouds retain modest height',
  );
  assert.ok(
    heightAt(0.99) > 0.4 && heightAt(0.99) < 0.8,
    'Only the tallest clouds extend well above the typical layer',
  );
});
