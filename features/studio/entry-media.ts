import type { Content } from '../../lib/content/types.ts';
import { directProjectMediaIds } from '../../lib/content/project-package-media.ts';
import { directCaseStudyMediaIds } from '../../lib/content/case-study-media.ts';

/** Organization includes private uploads and both snapshots. Publication still
 * follows only the current story's actual dependency graph. Missing media must
 * not hide the rest of an entry's attachments. */
export function entryMedia(
  records: Content[],
  id: string | undefined,
  data: Record<string, any>,
  kind: string,
  field?: string,
) {
  const parent = records.find((record) => record.id === id);
  const seeds = (
    snapshot: Record<string, any> | null | undefined,
  ): string[] => {
    if (!snapshot) return [];
    if (field) return snapshot[field] ? [snapshot[field]] : [];
    if (kind === 'link')
      return snapshot.iconMediaId ? [snapshot.iconMediaId] : [];
    return kind === 'experience'
      ? directCaseStudyMediaIds(snapshot)
      : directProjectMediaIds(snapshot);
  };
  const ids = new Set([
    ...seeds(data),
    ...seeds(parent?.draft),
    ...seeds(parent?.published),
  ]);
  for (const record of records) {
    if (
      record.kind === 'media' &&
      id &&
      record.draft.ownerId === id &&
      (!field || record.draft.ownerField === field)
    )
      ids.add(record.id);
  }
  const visited = new Set<string>();
  const visit = (mediaId: string) => {
    if (visited.has(mediaId)) return;
    visited.add(mediaId);
    const record = records.find(
      (item) => item.kind === 'media' && item.id === mediaId,
    );
    for (const snapshot of [record?.draft, record?.published]) {
      if (!snapshot) continue;
      const source = /^\/media\/([a-zA-Z0-9-]+)$/.exec(snapshot.url || '')?.[1];
      if (source) ids.add(source);
      for (const child of [snapshot.posterMediaId, snapshot.captionsMediaId]) {
        if (child) {
          ids.add(child);
          visit(child);
        }
      }
    }
  };
  [...ids].forEach(visit);
  return records.filter(
    (record) => record.kind === 'media' && ids.has(record.id),
  );
}

/** Explicit per-attachment publishing includes only its dependency chain. */
export function attachmentPublication(id: string, records: Content[]) {
  const pending: Content[] = [],
    seen = new Set<string>(),
    visiting = new Set<string>();
  const visit = (key: string) => {
    if (visiting.has(key))
      throw new Error('Attachment dependencies form a cycle.');
    if (seen.has(key)) return;
    const item = records.find(
      (record) => record.kind === 'media' && record.id === key,
    );
    if (!item)
      throw new Error(
        'A referenced attachment is missing. Choose another file.',
      );
    visiting.add(key);
    const alias = /^\/media\/([a-zA-Z0-9-]+)$/.exec(item.draft.url || '')?.[1];
    for (const child of [item.draft.posterMediaId, item.draft.captionsMediaId])
      if (child) visit(child);
    if (alias && alias !== key) {
      const source = records.find(
        (record) => record.kind === 'media' && record.id === alias,
      );
      if (!source)
        throw new Error(
          'A referenced attachment is missing. Choose another file.',
        );
      // /media/:id serves that record's bytes, not the URL in its metadata.
      // Existing public bytes need no publication of unrelated private edits.
      if (
        !source.published &&
        !pending.some((record) => record.id === source.id)
      )
        pending.push(source);
    }
    visiting.delete(key);
    seen.add(key);
    if (
      JSON.stringify(item.draft) !== JSON.stringify(item.published) &&
      !pending.some((record) => record.id === item.id)
    )
      pending.push(item);
  };
  try {
    if (id) visit(id);
    return { pending, error: '' };
  } catch (failure) {
    return {
      pending: [],
      error:
        failure instanceof Error
          ? failure.message
          : 'Check the attachment references.',
    };
  }
}
