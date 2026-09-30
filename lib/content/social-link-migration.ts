import type { Content } from './types.ts';

/** Import old shared links as independent room drafts. Stable source metadata
 * reconnects a repeated legacy import to its previously generated About copy. */
export function splitImportedSocialLinks<
  T extends { id: string; kind: string; data: Record<string, any> },
>(imported: T[], existing: Content[], createId: () => string): T[] {
  const reserved = new Set(
    [...existing, ...imported].map((record) => record.id),
  );
  return imported.flatMap((record) => {
    if (record.kind !== 'link' || record.data.room) return [record];
    const contact = {
      ...record,
      data: { ...record.data, room: 'contact', aboutSlot: 'off' },
    };
    const prior = existing.find(
      (item) =>
        item.kind === 'link' &&
        item.draft.room === 'about' &&
        item.draft.legacyLinkId === record.id,
    );
    if (!prior && !['left', 'center', 'right'].includes(record.data.aboutSlot))
      return [contact];
    let id = prior?.id;
    if (id && imported.some((item) => item.id === id)) return [contact];
    if (!id) {
      do {
        id = createId();
      } while (reserved.has(id));
      reserved.add(id);
    }
    return [
      contact,
      {
        ...record,
        id,
        data: {
          ...record.data,
          room: 'about',
          screen: 'list',
          legacyLinkId: record.id,
        },
      },
    ];
  });
}
