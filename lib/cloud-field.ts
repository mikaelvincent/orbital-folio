/** Original weather atlas, baked by developers; NASA orbital photographs are visual references only. */
export const CLOUD_FIELD_VERSION = 'orbital-cloud-banks-v1';
export const CLOUD_FIELD_SEED = 803719;
export type CloudField = {
  data: Uint8Array;
  width: number;
  height: number;
  channels: 4;
  version: string;
};
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function createCloudFieldData({
  width,
  height,
  seed = CLOUD_FIELD_SEED,
}: {
  width: number;
  height: number;
  seed?: number;
}): CloudField {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 8 ||
    height < 4 ||
    width !== height * 2
  )
    throw new Error('Cloud field must be a 2:1 atlas, at least 8×4.');
  const hash = (x: number, y: number, z: number) => {
    let h =
      Math.imul(x, 374761393) ^
      Math.imul(y, 668265263) ^
      Math.imul(z, 2147483647) ^
      seed;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x: number, y: number, z: number) => {
    const ix = Math.floor(x),
      iy = Math.floor(y),
      iz = Math.floor(z);
    const fx = x - ix,
      fy = y - iy,
      fz = z - iz;
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const wx = fade(fx),
      wy = fade(fy),
      wz = fade(fz);
    const a = hash(ix, iy, iz),
      b = hash(ix + 1, iy, iz),
      c = hash(ix, iy + 1, iz),
      d = hash(ix + 1, iy + 1, iz);
    const e = hash(ix, iy, iz + 1),
      f = hash(ix + 1, iy, iz + 1),
      g = hash(ix, iy + 1, iz + 1),
      h = hash(ix + 1, iy + 1, iz + 1);
    return (
      ((a + (b - a) * wx) * (1 - wy) + (c + (d - c) * wx) * wy) * (1 - wz) +
      ((e + (f - e) * wx) * (1 - wy) + (g + (h - g) * wx) * wy) * wz
    );
  };
  const data = new Uint8Array(width * height * 4);
  const heights = new Float32Array(width * height);
  // A cyclonic front in the opening view; additional nonperiodic weather covers the globe.
  const ax = -0.481,
    ay = 0.792,
    az = 0.377;
  const uLen = Math.hypot(az, ax),
    ux = az / uLen,
    uz = -ax / uLen;
  const vx = ay * uz,
    vy = az * ux - ax * uz,
    vz = -ay * ux;
  for (let y = 0; y < height; y++) {
    const lat = Math.PI * ((y + 0.5) / height - 0.5),
      cy = Math.sin(lat),
      r = Math.cos(lat);
    for (let x = 0; x < width; x++) {
      const lon = 2 * Math.PI * ((x + 0.5) / width - 0.5),
        cx = r * Math.cos(lon),
        cz = r * Math.sin(lon);
      const w1 = noise(cx * 3.1 + 7.2, cy * 3.1 - 3.5, cz * 3.1 + 8.7);
      const w2 = noise(cx * 6.3 - 9.2, cy * 6.3 + 2.5, cz * 6.3 + 4.7);
      const px = cx + (w1 - 0.5) * 0.095,
        py = cy + (w2 - 0.5) * 0.095,
        pz = cz + (w1 - w2) * 0.08;
      const n1 = noise(px * 13.7 + 31.2, py * 13.7 - 7.3, pz * 13.7 + 4.9);
      const n2 = noise(px * 31.3 - 13.2, py * 31.3 + 8.1, pz * 31.3 - 6.3);
      const n3 = noise(px * 71.9 + 5.2, py * 71.9 - 13.4, pz * 71.9 + 1.7);
      const n4 = noise(px * 161.3 - 3.9, py * 161.3 + 7.6, pz * 161.3 + 4.1);
      const n5 = noise(px * 347.9 + 7.1, py * 347.9 - 11.2, pz * 347.9 - 4.4);
      const dot = cx * ax + cy * ay + cz * az;
      const tx = cx * ux + cz * uz,
        ty = cx * vx + cy * vy + cz * vz;
      const angle = Math.exp(-Math.max(0, 1 - dot) * 18) * 2.2;
      const qx = tx * Math.cos(angle) - ty * Math.sin(angle),
        qy = tx * Math.sin(angle) + ty * Math.cos(angle);
      const distance = qx + 0.018 + (n1 - 0.5) * 0.085 + (n2 - 0.5) * 0.036;
      const widthFront = 0.035 + 0.055 * smooth(-0.3, 0.22, qy);
      const front =
        Math.exp(-Math.pow(distance / widthFront, 2)) * smooth(0.74, 0.92, dot);
      const regional = smooth(0.45, 0.64, w1 * 0.58 + w2 * 0.24 + n1 * 0.18);
      const bank = Math.max(
        front,
        regional * (1 - smooth(0.72, 0.96, dot) * 0.35),
      );
      // Dense connected interiors and irregular lobed edges; detail modulates height,
      // rather than punching an evenly scattered collection of holes in the sheet.
      const coverage = smooth(
        0.15,
        0.56,
        bank + (n2 - 0.5) * 0.353 + (n3 - 0.5) * 0.2 + (n4 - 0.5) * 0.075,
      );
      const billow = clamp(
        0.52 +
          (n2 - 0.5) * 0.35 +
          (n3 - 0.5) * 0.9 +
          (n4 - 0.5) * 0.32 +
          (n5 - 0.5) * 0.09,
      );
      const density = Math.pow(coverage, 1.35) * (0.58 + 0.42 * billow);
      const top = Math.sqrt(coverage) * (0.19 + 0.76 * billow);
      const i = (y * width + x) * 4;
      data[i] = Math.round(density * 255);
      data[i + 1] = Math.round(top * 255);
      heights[y * width + x] = top;
    }
  }
  // Tangent-space slopes are baked with the weather. These are data, not lit color:
  // sunlight and optical depth remain responsive to the planet/view at runtime.
  for (let y = 0; y < height; y++) {
    const metric = Math.max(
      0.04,
      Math.cos(Math.PI * ((y + 0.5) / height - 0.5)),
    );
    const ym = Math.max(0, y - 1),
      yp = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const xm = (x + width - 1) % width,
        xp = (x + 1) % width;
      const sx =
        ((heights[y * width + xp] - heights[y * width + xm]) /
          (((4 * Math.PI) / width) * metric)) *
        0.009;
      const sy =
        ((heights[yp * width + x] - heights[ym * width + x]) /
          ((2 * Math.PI) / height)) *
        0.009;
      const i = (y * width + x) * 4;
      data[i + 2] = Math.round(
        clamp(0.5 + Math.max(-1, Math.min(1, sx)) * 0.5) * 255,
      );
      data[i + 3] = Math.round(
        clamp(0.5 + Math.max(-1, Math.min(1, sy)) * 0.5) * 255,
      );
    }
  }
  return { data, width, height, channels: 4, version: CLOUD_FIELD_VERSION };
}
