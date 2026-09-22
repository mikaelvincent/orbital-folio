import { resolveAboutSocials, type AboutSocialLinks } from './social-links.ts';
import type { Portfolio } from './types.ts';

export type ImageCrop = { x: number; y: number; zoom: number };
export const ABOUT_PORTRAIT_ASPECT = 1;
export const DEFAULT_IMAGE_CROP: Readonly<ImageCrop> = {
  x: 0.5,
  y: 0.5,
  zoom: 1,
};

/** Position describes the available travel of the crop, with 0/1 reaching the
 * original image's edges. Originals remain untouched and can be reframed later. */
export function normalizeImageCrop(value: unknown): ImageCrop {
  const input =
    value && typeof value === 'object' ? (value as Partial<ImageCrop>) : {};
  const bounded = (
    value: unknown,
    fallback: number,
    min: number,
    max: number,
  ) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(min, value))
      : fallback;
  return {
    x: bounded(input.x, 0.5, 0, 1),
    y: bounded(input.y, 0.5, 0, 1),
    zoom: bounded(input.zoom, 1, 1, 3),
  };
}

/** Source-pixel rectangle for canvas/WebGL, matching the CSS preview below. */
export function imageCropRect(
  sourceWidth: number,
  sourceHeight: number,
  frameAspect: number,
  crop: unknown,
) {
  if (
    ![sourceWidth, sourceHeight, frameAspect].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  )
    throw new RangeError('Image dimensions and frame aspect must be positive.');
  const { x, y, zoom } = normalizeImageCrop(crop);
  const width = Math.min(sourceWidth, sourceHeight * frameAspect) / zoom;
  const height = Math.min(sourceHeight, sourceWidth / frameAspect) / zoom;
  return {
    x: (sourceWidth - width) * x,
    y: (sourceHeight - height) * y,
    width,
    height,
  };
}

/** Apply to a full-size object-fit:cover image inside an overflow:hidden frame.
 * Scaling around the same anchor as object-position keeps the crop edge-safe. */
export function imageCropStyle(crop: unknown) {
  const { x, y, zoom } = normalizeImageCrop(crop);
  const anchor = `${x * 100}% ${y * 100}%`;
  return {
    objectPosition: anchor,
    transform: `scale(${zoom})`,
    transformOrigin: anchor,
  };
}

export type AboutPhoto = { media: Record<string, any>; crop: ImageCrop };
export type AboutIcon = { media: Record<string, any> };
export type AboutPhotos = {
  portrait: (AboutPhoto & { readingCrop: ImageCrop }) | null;
  socials: {
    [Slot in keyof AboutSocialLinks]: {
      link: NonNullable<AboutSocialLinks[Slot]>;
      icon: AboutIcon | null;
    } | null;
  };
};

function safeImageUrl(value: unknown) {
  if (typeof value !== 'string') return false;
  if (/^\/media\/[a-zA-Z0-9-]{1,100}$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Portfolio already contains either published records or authenticated drafts.
 * Missing portrait assets retain the existing artwork; custom icons fall back
 * to their platform preset. Retired social photographs never become icons. */
export function resolveAboutPhotos(portfolio: Portfolio): AboutPhotos {
  const photo = (id: unknown, crop: unknown): AboutPhoto | null => {
    const media = portfolio.media.find(
      (item) =>
        item.id === id &&
        String(item.mime).startsWith('image/') &&
        safeImageUrl(item.url),
    );
    return media ? { media, crop: normalizeImageCrop(crop) } : null;
  };
  const portrait = photo(
    portfolio.site.portraitMediaId,
    portfolio.site.portraitCrop,
  );
  const links = resolveAboutSocials(portfolio.links);
  const social = (slot: keyof AboutSocialLinks) => {
    const link = links[slot];
    if (!link) return null;
    const media = portfolio.media.find(
      (item) =>
        item.id === link.iconMediaId &&
        item.mime === 'image/png' &&
        safeImageUrl(item.url),
    );
    return { link, icon: media ? { media } : null };
  };
  return {
    portrait: portrait
      ? {
          ...portrait,
          readingCrop: normalizeImageCrop(portfolio.site.portraitReadingCrop),
        }
      : null,
    socials: {
      left: social('left'),
      center: social('center'),
      right: social('right'),
    },
  };
}
