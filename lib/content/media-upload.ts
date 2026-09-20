import { HttpError } from '../http-error.ts';

export const MEDIA_LIMITS = {
  image: 5 * 1024 * 1024,
  video: 12 * 1024 * 1024,
  captions: 256 * 1024,
} as const;
export const MEDIA_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'text/vtt': 'vtt',
} as const;
export type ManagedMediaType = keyof typeof MEDIA_TYPES;
const ascii = (bytes: Uint8Array, from: number, to: number) =>
  new TextDecoder().decode(bytes.subarray(from, to));

export function mimeForFilename(name: string): ManagedMediaType | undefined {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'jpeg') return 'image/jpeg';
  return (Object.entries(MEDIA_TYPES) as [ManagedMediaType, string][]).find(
    ([, ext]) => extension === ext,
  )?.[0];
}

export function validateMediaBytes(
  bytes: Uint8Array,
  mime: string,
): asserts mime is ManagedMediaType {
  if (!Object.hasOwn(MEDIA_TYPES, mime))
    throw new HttpError(400, 'Use PNG, JPEG, WebP, GIF, MP4, WebM or WebVTT.');
  const limit = mime.startsWith('image/')
    ? MEDIA_LIMITS.image
    : mime === 'text/vtt'
      ? MEDIA_LIMITS.captions
      : MEDIA_LIMITS.video;
  if (!bytes.length || bytes.length > limit)
    throw new HttpError(
      413,
      `This media must be nonempty and no larger than ${limit / 1024 / 1024} MiB.`,
    );
  let valid = false;
  if (mime === 'image/png')
    valid =
      bytes.length >= 24 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  else if (mime === 'image/jpeg')
    valid =
      bytes.length >= 4 &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255;
  else if (mime === 'image/webp')
    valid =
      bytes.length >= 16 &&
      ascii(bytes, 0, 4) === 'RIFF' &&
      ascii(bytes, 8, 12) === 'WEBP';
  else if (mime === 'image/gif')
    valid =
      bytes.length >= 14 &&
      ['GIF87a', 'GIF89a'].includes(ascii(bytes, 0, 6)) &&
      bytes[6] + bytes[7] * 256 > 0 &&
      bytes[8] + bytes[9] * 256 > 0;
  else if (mime === 'video/mp4') {
    // ISO base media file with an MP4-compatible brand; never accept arbitrary HTML renamed .mp4.
    const brands = ascii(bytes, 8, Math.min(bytes.length, 64));
    valid =
      bytes.length >= 24 &&
      ascii(bytes, 4, 8) === 'ftyp' &&
      /isom|iso[2-9]|mp4[12]|avc1|M4V |dash/.test(brands);
  } else if (mime === 'video/webm')
    valid =
      bytes.length >= 16 &&
      [0x1a, 0x45, 0xdf, 0xa3].every((v, i) => bytes[i] === v) &&
      ascii(bytes, 0, Math.min(bytes.length, 256)).includes('webm');
  else {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      valid =
        /^\uFEFF?WEBVTT(?:[ \t].*)?(?:\r?\n|$)/.test(text) &&
        !text.includes('\0');
    } catch {
      valid = false;
    }
  }
  if (!valid)
    throw new HttpError(400, 'The file contents do not match its media type.');
}
