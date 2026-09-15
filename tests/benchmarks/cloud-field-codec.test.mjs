import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeCloudField,
  decodeCloudField,
} from '../../scripts/benchmarks/clouds/cloud-field-codec.ts';

test('CFD1 defines channel order, little-endian dimensions, row resets and wraparound', () => {
  const data = Uint8Array.from([
    10, 20, 30, 40, 15, 22, 25, 255, 0, 255, 128, 64, 255, 0, 127, 63,
  ]);
  const encoded = encodeCloudField({ data, width: 2, height: 2 });
  assert.deepEqual(
    Array.from(encoded),
    [
      67, 70, 68, 49, 2, 0, 2, 0, 10, 5, 0, 255, 20, 2, 255, 1, 30, 251, 128,
      255, 40, 215, 64, 255,
    ],
  );
  assert.deepEqual(decodeCloudField(encoded), {
    data,
    width: 2,
    height: 2,
    channels: 4,
    codecVersion: 1,
  });
});

test('Random and extreme bytes round-trip across rows, channels, and non-power-of-two sizes', () => {
  let seed = 0x12abcd;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return seed & 255;
  };
  for (const [width, height] of [
    [1, 1],
    [2, 7],
    [7, 3],
    [8, 4],
    [31, 17],
    [128, 64],
  ]) {
    for (const kind of ['random', 'zero', 'full', 'alternating']) {
      const data = Uint8Array.from(
        { length: width * height * 4 },
        (_, index) =>
          kind === 'random'
            ? random()
            : kind === 'full'
              ? 255
              : kind === 'alternating'
                ? (index % 2) * 255
                : 0,
      );
      const original = data.slice();
      const encoded = encodeCloudField({ data, width, height });
      assert.deepEqual(decodeCloudField(encoded).data, original);
      assert.deepEqual(data, original, 'Encoder does not mutate input');
      assert.deepEqual(
        encodeCloudField({ data, width, height }),
        encoded,
        'Encoding is deterministic',
      );
    }
  }
});

test('Codec respects typed-array offsets and does not mutate packet bytes', () => {
  const backing = Uint8Array.from({ length: 60 }, (_, i) => (i * 11) & 255);
  const data = backing.subarray(12, 44);
  const encoded = encodeCloudField({ data, width: 4, height: 2 });
  const padded = new Uint8Array(encoded.length + 19).fill(99);
  padded.set(encoded, 9);
  const packet = padded.subarray(9, 9 + encoded.length);
  assert.deepEqual(decodeCloudField(packet).data, data);
  assert.deepEqual(packet, encoded);
});

test('Malformed headers, lengths and dimensions fail before decoding', () => {
  const field = { data: new Uint8Array(8), width: 2, height: 1 };
  const valid = encodeCloudField(field);
  assert.throws(() => decodeCloudField(valid.subarray(0, 7)), /header/);
  const unknown = valid.slice();
  unknown[3] = 50;
  assert.throws(() => decodeCloudField(unknown), /magic or version/);
  const wrongSize = valid.slice();
  wrongSize[4] = 255;
  wrongSize[5] = 255;
  assert.throws(() => decodeCloudField(wrongSize), /payload length/);
  const zero = valid.slice();
  zero[4] = 0;
  assert.throws(() => decodeCloudField(zero), /dimensions/);
  assert.throws(
    () => decodeCloudField(valid.subarray(0, valid.length - 1)),
    /payload length/,
  );
  assert.throws(
    () =>
      decodeCloudField(
        new Uint8Array(valid.length + 1).map((_, i) => valid[i] ?? 0),
      ),
    /payload length/,
  );
  for (const width of [0, -1, 1.5, 65536, NaN])
    assert.throws(() => encodeCloudField({ ...field, width }), /dimensions/);
  assert.throws(
    () => encodeCloudField({ ...field, data: new Uint8Array(7) }),
    /exactly/,
  );
});
