import type { Content } from './types.ts';
import { projectBody } from './project-content.ts';
import { projectMediaReferences } from './project-markdown.ts';
import { HttpError } from '../http-error.ts';

export function directProjectMediaIds(project: Record<string, any>): string[] {
  const ids = new Set<string>(project.mediaId ? [project.mediaId] : []);
  for (const destination of projectMediaReferences(projectBody(project))) {
    const match = /^\/media\/([a-zA-Z0-9-]{1,100})$/.exec(destination);
    if (match) ids.add(match[1]);
  }
  return [...ids];
}

/** Dependency order is captions/poster first, then video. Never includes media
 * merely because it exists in Studio; only the exact authored reference graph. */
export function projectMediaClosure(
  project: Record<string, any>,
  records: Content[],
  published = false,
): Content[] {
  return mediaDependencyClosure(
    directProjectMediaIds(project),
    records,
    published,
  );
}
export function mediaDependencyClosure(
  ids: string[],
  records: Content[],
  published = false,
): Content[] {
  const output: Content[] = [];
  const seen = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id))
      throw new HttpError(400, 'Media dependencies cannot form a cycle.');
    if (seen.has(id)) return;
    const record = records.find((r) => r.kind === 'media' && r.id === id);
    if (!record)
      throw new HttpError(
        400,
        `Referenced media ${id} is missing from the library.`,
      );
    const data = published ? record.published : record.draft;
    if (!data)
      throw new HttpError(
        400,
        `Publish the referenced media “${record.draft.title}” first. Publishing media makes that asset public.`,
      );
    visiting.add(id);
    for (const [field, prefix] of [
      ['posterMediaId', 'image/'],
      ['captionsMediaId', 'text/vtt'],
    ] as const)
      if (data[field]) {
        if (!String(data.mime).startsWith('video/'))
          throw new HttpError(
            400,
            'Only video media may have poster or caption dependencies.',
          );
        const dependency = records.find(
          (r) => r.kind === 'media' && r.id === data[field],
        );
        const dependencyData = published
          ? dependency?.published
          : dependency?.draft;
        if (dependencyData && !String(dependencyData.mime).startsWith(prefix))
          throw new HttpError(
            400,
            'Video posters must be images and captions must be WebVTT.',
          );
        visit(data[field]);
      }
    visiting.delete(id);
    seen.add(id);
    output.push(record);
  };
  ids.forEach(visit);
  return output;
}

export function validateProjectPublication(
  project: Record<string, any>,
  records: Content[],
) {
  const used = projectMediaClosure(project, records, true);
  if (project.mediaId) {
    const cover = used.find((r) => r.id === project.mediaId)?.published;
    if (cover?.mime && !String(cover.mime).startsWith('image/'))
      throw new HttpError(400, 'Choose an image for the project cover.');
  }
  return used;
}
