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
      : kind === 'link'
        ? data.photoMediaId
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

/** Publishing the parent never implicitly publishes a private photograph. */
export function validateAboutPhotoPublication(
  kind: Kind,
  data: Record<string, any>,
  records: Content[],
  id?: string,
) {
  for (const mediaId of directAboutPhotoMediaIds(kind, data, records)) {
    const media = records.find(
      (record) => record.kind === 'media' && record.id === mediaId,
    );
    if (!media)
      throw new HttpError(
        400,
        'The selected photo is missing from the media library. Choose another image.',
      );
    if (!media.published)
      throw new HttpError(
        400,
        `Publish the photo “${media.draft.title}” first. Publishing media makes that image public.`,
      );
    if (!String(media.published.mime).startsWith('image/'))
      throw new HttpError(400, 'Choose image media for the About photograph.');
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
        `The ${data.aboutSlot} About photo is used by “${occupied.published!.title}”. Change and publish its About position first.`,
      );
  }
}
