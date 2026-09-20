import { zipSync } from 'fflate';
import { parseDocument, stringify } from 'yaml';
import { HttpError } from '../http-error.ts';
import { validateContent } from './validation.ts';
import { projectBody, projectSlug } from './project-content.ts';
import {
  projectMediaReferences,
  rewriteProjectMedia,
} from './project-markdown.ts';
import {
  MEDIA_TYPES,
  mimeForFilename,
  validateMediaBytes,
  type ManagedMediaType,
} from './media-upload.ts';

import {
  PROJECT_PACKAGE_LIMITS,
  readProjectArchive,
  safePackagePath,
} from './project-package-archive.ts';
export {
  PROJECT_PACKAGE_LIMITS,
  readProjectArchive,
} from './project-package-archive.ts';

const documentName = 'project.md';
const decoder = new TextDecoder('utf-8', { fatal: true });
const encoder = new TextEncoder();
export type PackageMedia = {
  path: string;
  title?: string;
  alt: string;
  mime: ManagedMediaType;
  bytes: Uint8Array;
  poster?: string;
  captions?: string;
};
export type ParsedProjectPackage = {
  project: Record<string, any>;
  cover?: string;
  media: PackageMedia[];
};
function invalid(message: string): never {
  throw new HttpError(400, message);
}

export function parseProjectPackage(bytes: Uint8Array): ParsedProjectPackage {
  return parseProjectFiles(readProjectArchive(bytes));
}

function parseProjectFiles(
  files: Map<string, Uint8Array>,
): ParsedProjectPackage {
  let text: string;
  try {
    text = decoder.decode(files.get(documentName)!);
  } catch {
    return invalid('project.md must be UTF-8 text.');
  }
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(text);
  if (!match) invalid('project.md needs YAML metadata between --- lines.');
  let metadata: Record<string, unknown>;
  try {
    const doc = parseDocument(match[1], { uniqueKeys: true, schema: 'core' });
    if (doc.errors.length || doc.warnings.length)
      invalid('Invalid or duplicate project metadata.');
    metadata = doc.toJS({ maxAliasCount: 0 });
  } catch {
    invalid('Use ordinary YAML metadata without aliases or duplicate keys.');
  }
  if (
    !metadata! ||
    typeof metadata !== 'object' ||
    Array.isArray(metadata) ||
    metadata.format !== 'orbital-project/v1'
  )
    invalid('Use project format orbital-project/v1.');
  const {
    format: _format,
    cover,
    media: definitions = [],
    body: _body,
    ...data
  } = metadata;
  const allowed = new Set([
    'slug',
    'title',
    'subtitle',
    'summary',
    'category',
    'categories',
    'order',
    'sample',
    'stack',
    'role',
    'period',
    'problem',
    'approach',
    'system',
    'decisions',
    'outcomes',
    'next',
    'demoUrl',
    'sourceUrl',
    'seoTitle',
    'seoDescription',
  ]);
  if (Object.keys(data).some((key) => !allowed.has(key)) || _body !== undefined)
    invalid(
      'Unknown project metadata. Put the Markdown story after the closing --- line.',
    );
  if (
    cover !== undefined &&
    (typeof cover !== 'string' || !safePackagePath(cover))
  )
    invalid('Cover must reference a file inside assets/.');
  if (
    !Array.isArray(definitions) ||
    definitions.length > PROJECT_PACKAGE_LIMITS.entries
  )
    invalid('Media metadata must be a list.');
  const declared = new Map<string, Record<string, any>>();
  for (const definition of definitions) {
    if (
      !definition ||
      typeof definition !== 'object' ||
      Array.isArray(definition) ||
      Object.keys(definition).some(
        (key) => !['path', 'title', 'alt', 'poster', 'captions'].includes(key),
      )
    )
      invalid(
        'Each media entry needs a path and alt text, with an optional title, poster and captions paths.',
      );
    const { path, title, alt, poster, captions } = definition;
    if (
      title !== undefined &&
      (typeof title !== 'string' || !title.trim() || title.length > 20000)
    )
      invalid('Media titles must be nonempty text under 20,000 characters.');
    if (
      typeof path !== 'string' ||
      !files.has(path) ||
      path === documentName ||
      declared.has(path) ||
      typeof alt !== 'string' ||
      !alt.trim() ||
      alt.length > 1000
    )
      invalid(
        'Media paths must be unique existing assets with concise alt text.',
      );
    for (const dependency of [poster, captions])
      if (
        dependency !== undefined &&
        (typeof dependency !== 'string' || !files.has(dependency))
      )
        invalid('Video poster or caption file is missing.');
    declared.set(path, {
      path,
      ...(title !== undefined ? { title: title.trim() } : {}),
      alt: alt.trim(),
      poster,
      captions,
    });
  }
  const body = match[2].replace(/^\r?\n/, '');
  const references = new Set(projectMediaReferences(body));
  if (typeof cover === 'string') references.add(cover);
  for (const path of references)
    if (!declared.has(path))
      invalid(
        `Add the asset and media metadata for ${path}. Packages cannot reference external or previously uploaded media.`,
      );
  for (const definition of declared.values()) {
    if (definition.poster) {
      if (
        !declared.has(definition.poster) ||
        !mimeForFilename(definition.poster)?.startsWith('image/')
      )
        invalid('Video posters must reference a declared image.');
      references.add(definition.poster);
    }
    if (definition.captions) {
      if (
        !declared.has(definition.captions) ||
        mimeForFilename(definition.captions) !== 'text/vtt'
      )
        invalid('Video captions must reference a declared WebVTT file.');
      references.add(definition.captions);
    }
    if (
      (definition.poster || definition.captions) &&
      !mimeForFilename(definition.path)?.startsWith('video/')
    )
      invalid('Only videos can have posters or captions.');
  }
  if (
    [...files.keys()].some(
      (path) => path !== documentName && !declared.has(path),
    ) ||
    [...declared.keys()].some((path) => !references.has(path))
  )
    invalid(
      'Every asset must be declared and used by the project, its cover or video metadata.',
    );
  if (cover && !mimeForFilename(String(cover))?.startsWith('image/'))
    invalid('Choose an image for the cover.');
  if (
    data.categories === undefined &&
    !['problem', 'approach', 'system', 'decisions', 'outcomes', 'next'].some(
      (key) => typeof data[key] === 'string' && String(data[key]).trim(),
    )
  )
    invalid('Add at least one category: systems, interfaces or experiments.');
  const project = validateContent('project', {
    ...data,
    slug:
      data.slug ||
      projectSlug(typeof data.title === 'string' ? data.title : ''),
    ...(data.categories !== undefined ? { categories: data.categories } : {}),
    body,
  });
  const media = [...declared.values()].map((definition) => {
    const bytes = files.get(definition.path)!;
    const mime = mimeForFilename(definition.path)!;
    validateMediaBytes(bytes, mime);
    return { ...definition, mime, bytes } as PackageMedia;
  });
  return { project, cover: cover as string | undefined, media };
}

export function materializeProjectPackage(
  parsed: ParsedProjectPackage,
  createId: () => string,
) {
  const ids = new Map(parsed.media.map((media) => [media.path, createId()]));
  const destinations = new Map(
    [...ids].map(([path, id]) => [path, '/media/' + id]),
  );
  const project = validateContent('project', {
    ...parsed.project,
    body: rewriteProjectMedia(parsed.project.body, destinations),
    mediaId: parsed.cover ? ids.get(parsed.cover) : '',
  });
  // Ensure all parsed references were rewritten before any blob/database writes.
  if (
    projectMediaReferences(project.body).some((path) =>
      path.startsWith('assets/'),
    )
  )
    invalid(
      'A media reference uses unsupported Markdown destination formatting.',
    );
  const media = parsed.media.map((asset) => ({
    id: ids.get(asset.path)!,
    bytes: asset.bytes,
    data: {
      title: asset.title ?? asset.path.split('/').pop()!,
      alt: asset.alt,
      url: '/media/' + ids.get(asset.path),
      mime: asset.mime,
      size: asset.bytes.length,
      order: 0,
      ...(asset.poster ? { posterMediaId: ids.get(asset.poster) } : {}),
      ...(asset.captions ? { captionsMediaId: ids.get(asset.captions) } : {}),
    },
  }));
  return { project, media };
}

export type ExportMedia = {
  id: string;
  data: Record<string, any>;
  bytes: Uint8Array;
};
export function buildProjectPackage(
  project: Record<string, any>,
  media: ExportMedia[],
): Uint8Array {
  const paths = new Map<string, string>();
  const definitions: Record<string, string>[] = [];
  const files: Record<string, Uint8Array> = {};
  let size = 0;
  for (const asset of media) {
    const mime = asset.data.mime;
    validateMediaBytes(asset.bytes, mime);
    const path = `assets/${asset.id}.${MEDIA_TYPES[mime]}`;
    paths.set('/media/' + asset.id, path);
    files[path] = asset.bytes;
    size += asset.bytes.length;
    if (size > PROJECT_PACKAGE_LIMITS.expanded)
      throw new HttpError(
        413,
        'Project assets exceed the 24 MiB package limit. Export smaller projects separately.',
      );
  }
  for (const asset of media) {
    const definition: Record<string, string> = {
      path: paths.get('/media/' + asset.id)!,
      title: asset.data.title,
      alt: asset.data.alt,
    };
    for (const [key, field] of [
      ['poster', 'posterMediaId'],
      ['captions', 'captionsMediaId'],
    ] as const)
      if (asset.data[field]) {
        const path = paths.get('/media/' + asset.data[field]);
        if (!path) invalid('An exported video dependency is missing.');
        definition[key] = path;
      }
    definitions.push(definition);
  }
  const body = projectBody(project);
  // Legacy section fields can each be valid while their generated story exceeds
  // the current single-body limit. Never export a document import will reject.
  if (body.length > 100000)
    throw new HttpError(
      413,
      'The project story exceeds 100,000 characters. Shorten the story or legacy sections before exporting.',
    );
  for (const reference of projectMediaReferences(body))
    if (!paths.has(reference))
      invalid(
        `Cannot export ${reference}. Upload the media into Studio first; external media is never downloaded by export.`,
      );
  const { id: _id, mediaId, body: _body, ...metadata } = project;
  const cover = mediaId ? paths.get('/media/' + mediaId) : undefined;
  if (mediaId && !cover)
    invalid('The project cover is missing from the managed media library.');
  // Preserve legacy information, while choosing an explicit category during the
  // import review if this old record was never classified.
  const normalized = validateContent('project', metadata);
  const rewrittenBody = rewriteProjectMedia(body, paths);
  if (rewrittenBody.length > 100000)
    throw new HttpError(
      413,
      'The exported story exceeds 100,000 characters after media paths are rewritten. Shorten the story before exporting.',
    );
  // Older records may have short media IDs. Import creates 36-character UUIDs,
  // so also prove this package remains within the story limit after reimport.
  const importedBody = rewriteProjectMedia(
    rewrittenBody,
    new Map(
      [...paths.values()].map((path) => [
        path,
        '/media/00000000-0000-4000-8000-000000000000',
      ]),
    ),
  );
  if (importedBody.length > 100000)
    throw new HttpError(
      413,
      'The story would exceed 100,000 characters when its media is imported. Shorten the story before exporting.',
    );
  if (
    projectMediaReferences(rewrittenBody).some((reference) =>
      paths.has(reference),
    )
  )
    invalid(
      'A media reference uses unsupported Markdown destination formatting. Rewrite that destination as an ordinary inline link before exporting.',
    );
  const document = `---\n${stringify({ format: 'orbital-project/v1', ...normalized, ...(cover ? { cover } : {}), media: definitions })}---\n\n${rewrittenBody}`;
  files[documentName] = encoder.encode(document);
  if (files[documentName].length > PROJECT_PACKAGE_LIMITS.document)
    throw new HttpError(
      413,
      'Project Markdown plus metadata exceeds the 256 KiB document limit. Shorten the story or metadata before exporting.',
    );
  if (
    Object.keys(files).length > PROJECT_PACKAGE_LIMITS.entries ||
    size + files[documentName].length > PROJECT_PACKAGE_LIMITS.expanded
  )
    throw new HttpError(413, 'This project exceeds the package limits.');
  // Reuse the actual importer against the in-memory file map before offering a
  // download. This also covers legacy metadata, media titles/alt text and future
  // format rules without inflating another archive or fetching any assets.
  materializeProjectPackage(
    parseProjectFiles(new Map(Object.entries(files))),
    () => '00000000-0000-4000-8000-000000000000',
  );
  const archive = zipSync(files, { level: 0 });
  if (archive.length > PROJECT_PACKAGE_LIMITS.compressed)
    throw new HttpError(
      413,
      'This project exceeds the 16 MiB download package limit.',
    );
  return archive;
}
