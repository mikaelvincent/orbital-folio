import type { Content, Kind } from './types.ts';
import { HttpError } from '../http-error.ts';

export function directAboutPhotoMediaIds(
  kind: Kind,
  data: Record<string, any>,
  records: Content[] = [],
): string[] {
  const id =
    kind === 'site'
      ? data.portraitMediaId
      : kind === 'link' && ['left', 'center', 'right'].includes(data.aboutSlot)
        ? data.iconMediaId
        : undefined;
  if (!id) return [];
  const selected = records.find(
    (record) => record.kind === 'media' && record.id === id,
  )?.published;
  // Imported or edited metadata can use another managed record's uploaded URL.
  // /media/:id serves that record's bytes directly; it does not follow its URL.
  const sourceId =
    typeof selected?.url === 'string'
      ? /^\/media\/([a-zA-Z0-9-]{1,100})$/.exec(selected.url)?.[1]
      : undefined;
  return sourceId && sourceId !== id ? [id, sourceId] : [id];
}

/** Publishing the parent never implicitly publishes private portrait/icon media.
 * Retired social photos and inactive About icon choices create no live usage. */
export function validateAboutPhotoPublication(
  kind: Kind,
  data: Record<string, any>,
  records: Content[],
  id?: string,
) {
  const icon = kind === 'link';
  for (const mediaId of directAboutPhotoMediaIds(kind, data, records)) {
    const media = records.find(
      (record) => record.kind === 'media' && record.id === mediaId,
    );
    if (!media)
      throw new HttpError(
        400,
        `The selected ${icon ? 'icon' : 'photo'} is missing from the media library. Choose another ${icon ? 'PNG icon' : 'image'}.`,
      );
    if (!media.published)
      throw new HttpError(
        400,
        `Publish the ${icon ? 'icon' : 'photo'} “${media.draft.title}” first. Publishing media makes that image public.`,
      );
    if (
      icon
        ? media.published.mime !== 'image/png'
        : !String(media.published.mime).startsWith('image/')
    )
      throw new HttpError(
        400,
        icon
          ? 'Choose a PNG icon. Upload SVG icons through the icon editor to convert them safely.'
          : 'Choose image media for the About photograph.',
      );
  }
  if (kind === 'link' && ['left', 'center', 'right'].includes(data.aboutSlot)) {
    const occupied = records.find(
      (record) =>
        record.kind === 'link' &&
        record.id !== id &&
        record.published?.aboutSlot === data.aboutSlot,
    );
    if (occupied)
      throw new HttpError(
        409,
        `The ${data.aboutSlot} About icon is used by “${occupied.published!.title}”. Change and publish its About position first.`,
      );
  }
}
