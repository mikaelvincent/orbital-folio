import type { CloudField } from './cloud-field';

export const SATELLITE_CLOUD_FIELD_VERSION = 'orbital-satellite-clouds-v1';

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** A separable, longitude-wrapped blur. Latitude clamps at the polar image rows. */
function soften(
  source: Float32Array,
  width: number,
  height: number,
  radius: number,
) {
  const kernel = new Float64Array(radius * 2 + 1);
  const sigma = Math.max(0.65, radius / 2);
  let total = 0;
  for (let j = -radius; j <= radius; j++) {
    const weight = Math.exp(-(j * j) / (2 * sigma * sigma));
    kernel[j + radius] = weight;
    total += weight;
  }
  for (let j = 0; j < kernel.length; j++) kernel[j] /= total;
  const horizontal = new Float32Array(source.length);
  const result = new Float32Array(source.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      for (let j = -radius; j <= radius; j++) {
        const wrapped = (((x + j) % width) + width) % width;
        value += source[y * width + wrapped] * kernel[j + radius];
      }
      horizontal[y * width + x] = value;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      for (let j = -radius; j <= radius; j++) {
        const row = Math.max(0, Math.min(height - 1, y + j));
        value += horizontal[row * width + x] * kernel[j + radius];
      }
      result[y * width + x] = value;
    }
  }
  return result;
}

/**
 * Prepare a cloud-only, greyscale satellite mask for the bounded volume shader.
 *
 * Rows must already run SOUTH to NORTH, matching cloud-volume.ts sphereUv.
 * R retains the photograph's cloud topology; G and tangent slopes B/A are an
 * artistic depth interpretation, not measured cloud altitude or satellite data.
 * The output contains no lighting, added noise, land, or ocean coloration.
 */
export function createSatelliteCloudField({
  mask,
  width,
  height,
}: {
  mask: Uint8Array;
  width: number;
  height: number;
}): CloudField {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 8 ||
    height < 4 ||
    width !== height * 2 ||
    !Number.isSafeInteger(width * height * 4)
  )
    throw new Error('Satellite cloud field must be a 2:1 atlas, at least 8×4.');
  if (!(mask instanceof Uint8Array) || mask.length !== width * height)
    throw new Error(
      'Satellite cloud mask must contain one byte per atlas pixel.',
    );

  const brightness = Float32Array.from(mask, (value) => value / 255);
  // The production atlas is 2048×1024. Keep the same angular smoothing when a
  // developer prepares another resolution; small synthetic fixtures use 1px.
  const nearRadius = Math.max(1, Math.round((2 * width) / 2048));
  const broadRadius = Math.max(1, Math.round((6 * width) / 2048));
  const nearby = soften(brightness, width, height, nearRadius);
  const broad = soften(brightness, width, height, broadRadius);
  const data = new Uint8Array(mask.length * 4);
  const heights = new Float32Array(mask.length);
  for (let pixel = 0; pixel < mask.length; pixel++) {
    const value = brightness[pixel];
    // Suppress the faint image background while preserving feathered edges and
    // distinct thin/mid/bright cloud regions. Blurs never expand the cloud mask.
    const coverage = smooth(0.1, 0.95, value);
    const density =
      Math.pow(coverage, 1.18) * (0.42 + 0.4 * smooth(0.35, 0.9, broad[pixel]));
    const core =
      smooth(0.58, 0.92, nearby[pixel]) * smooth(0.48, 0.9, broad[pixel]);
    const top =
      smooth(0.1, 0.3, value) *
      (0.075 +
        0.21 * smooth(0.14, 0.84, nearby[pixel]) +
        0.42 * Math.pow(core, 1.6));
    const offset = pixel * 4;
    data[offset] = Math.round(density * 255);
    data[offset + 1] = Math.round(top * 255);
    heights[pixel] = top;
  }

  // Smooth only the lighting normals. Fine bright speckles retain their original
  // opacity without becoming sharp relief, and cloud heights remain independent.
  const smoothHeights = soften(heights, width, height, nearRadius);
  const slopeScale = 0.0035;
  const maximumSlope = 0.28;
  for (let y = 0; y < height; y++) {
    const metric = Math.max(
      0.04,
      Math.cos(Math.PI * ((y + 0.5) / height - 0.5)),
    );
    const previous = Math.max(0, y - 1);
    const next = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const left = (x + width - 1) % width;
      const right = (x + 1) % width;
      const sx =
        ((smoothHeights[y * width + right] - smoothHeights[y * width + left]) /
          (((4 * Math.PI) / width) * metric)) *
        slopeScale;
      const sy =
        ((smoothHeights[next * width + x] -
          smoothHeights[previous * width + x]) /
          ((2 * Math.PI) / height)) *
        slopeScale;
      const offset = (y * width + x) * 4;
      data[offset + 2] = Math.round(
        (0.5 + Math.max(-maximumSlope, Math.min(maximumSlope, sx)) * 0.5) * 255,
      );
      data[offset + 3] = Math.round(
        (0.5 + Math.max(-maximumSlope, Math.min(maximumSlope, sy)) * 0.5) * 255,
      );
    }
  }
  return {
    data,
    width,
    height,
    channels: 4,
    version: SATELLITE_CLOUD_FIELD_VERSION,
  };
}
