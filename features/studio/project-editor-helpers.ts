import { projectSlug } from '../../lib/content/project-content.ts';
import { projectMediaClosure } from '../../lib/content/project-package-media.ts';
import { caseStudyMediaClosure } from '../../lib/content/case-study-media.ts';
import type { Content } from '../../lib/content/types.ts';

/** A generated slug becomes an authored value on first save and stays stable. */
export function projectEditorDraft(data: Record<string, any>) {
  return { ...data, slug: data.slug?.trim() || projectSlug(data.title || '') };
}

export function projectMediaMarkdown(media: Record<string, any>): string {
  const label = String(media.alt || media.title || 'Media')
    .replace(/\\/g, '\\\\')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replace(/[\r\n]+/g, ' ');
  return `${String(media.mime).startsWith('image/') ? '!' : ''}[${label}](/media/${media.id})`;
}

/** Insert at the author’s selection without dropping surrounding Markdown. */
export function insertProjectMedia(
  body: string,
  media: Record<string, any>,
  start = body.length,
  end = start,
) {
  const from = Math.max(0, Math.min(start, body.length));
  const to = Math.max(from, Math.min(end, body.length));
  const prefix = body.slice(0, from);
  const suffix = body.slice(to);
  const inserted = `${prefix && !prefix.endsWith('\n\n') ? '\n\n' : ''}${projectMediaMarkdown(media)}${suffix && !suffix.startsWith('\n\n') ? '\n\n' : ''}`;
  return {
    body: prefix + inserted + suffix,
    caret: prefix.length + inserted.length,
  };
}

export function projectAssetPublication(
  data: Record<string, any>,
  records: Content[],
  kind: 'project' | 'experience' = 'project',
) {
  try {
    const mediaClosure =
      kind === 'experience' ? caseStudyMediaClosure : projectMediaClosure;
    return {
      pending: mediaClosure(data, records).filter(
        (r) => JSON.stringify(r.draft) !== JSON.stringify(r.published),
      ),
      error: '',
    };
  } catch (error) {
    return {
      pending: [],
      error:
        error instanceof Error
          ? error.message
          : 'Check the story’s media references.',
    };
  }
}

export function projectUploadError(
  file: Pick<File, 'type' | 'size' | 'name'>,
): string | null {
  const captions = /\.vtt$/i.test(file.name);
  const image = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
    file.type,
  );
  const video = ['video/mp4', 'video/webm'].includes(file.type);
  if (!image && !video && !captions)
    return 'Choose PNG, JPEG, WebP, GIF, MP4, WebM or WebVTT.';
  const limit = captions
    ? 256 * 1024
    : image
      ? 5 * 1024 * 1024
      : 12 * 1024 * 1024;
  if (!file.size || file.size > limit)
    return captions
      ? 'Use a nonempty caption file up to 256 KiB.'
      : `Use a nonempty ${image ? 'image up to 5' : 'video up to 12'} MiB.`;
  return null;
}
