/** Lossless transport layout for an RGBA8 cloud field. Compression is external.
 * CFD1: four magic/version bytes, uint16 LE width, uint16 LE height, then R/G/B/A
 * planes. Each plane stores byte differences from the previous pixel in its row;
 * the first pixel is relative to zero. Arithmetic wraps modulo 256.
 */
export const CLOUD_FIELD_CODEC_VERSION = 1;
export const CLOUD_FIELD_CODEC_HEADER_BYTES = 8;
const MAGIC = [0x43, 0x46, 0x44, 0x31] as const; // ASCII CFD1

type CloudFieldPixels = {
  data: Uint8Array;
  width: number;
  height: number;
};

function payloadBytes(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 65535 ||
    height > 65535
  )
    throw new Error('Cloud codec dimensions must be integers in 1..65535.');
  return width * height * 4;
}

export function encodeCloudField({
  data,
  width,
  height,
}: CloudFieldPixels): Uint8Array {
  const length = payloadBytes(width, height);
  if (!(data instanceof Uint8Array) || data.byteLength !== length)
    throw new Error(
      'Cloud codec expected exactly width × height × 4 RGBA8 bytes.',
    );
  const encoded = new Uint8Array(CLOUD_FIELD_CODEC_HEADER_BYTES + length);
  encoded.set(MAGIC);
  const header = new DataView(encoded.buffer);
  header.setUint16(4, width, true);
  header.setUint16(6, height, true);
  const plane = width * height;
  for (let channel = 0; channel < 4; channel++) {
    let target = CLOUD_FIELD_CODEC_HEADER_BYTES + channel * plane;
    for (let row = 0; row < height; row++) {
      let source = row * width * 4 + channel;
      let previous = 0;
      for (let x = 0; x < width; x++, source += 4) {
        const value = data[source];
        encoded[target++] = (value - previous) & 255;
        previous = value;
      }
    }
  }
  return encoded;
}

export function decodeCloudField(encoded: Uint8Array): CloudFieldPixels & {
  channels: 4;
  codecVersion: typeof CLOUD_FIELD_CODEC_VERSION;
} {
  if (
    !(encoded instanceof Uint8Array) ||
    encoded.byteLength < CLOUD_FIELD_CODEC_HEADER_BYTES
  )
    throw new Error('Cloud codec header is missing or truncated.');
  if (MAGIC.some((byte, index) => encoded[index] !== byte))
    throw new Error('Unknown cloud field codec magic or version.');
  const header = new DataView(
    encoded.buffer,
    encoded.byteOffset,
    encoded.byteLength,
  );
  const width = header.getUint16(4, true);
  const height = header.getUint16(6, true);
  const length = payloadBytes(width, height);
  // Validate the complete packet before allocating a decoded field.
  if (encoded.byteLength !== CLOUD_FIELD_CODEC_HEADER_BYTES + length)
    throw new Error(
      'Cloud codec payload length does not match its dimensions.',
    );
  const data = new Uint8Array(length);
  const plane = width * height;
  for (let channel = 0; channel < 4; channel++) {
    let source = CLOUD_FIELD_CODEC_HEADER_BYTES + channel * plane;
    for (let row = 0; row < height; row++) {
      let target = row * width * 4 + channel;
      let previous = 0;
      for (let x = 0; x < width; x++, target += 4) {
        previous = (previous + encoded[source++]) & 255;
        data[target] = previous;
      }
    }
  }
  return {
    data,
    width,
    height,
    channels: 4,
    codecVersion: CLOUD_FIELD_CODEC_VERSION,
  };
}
