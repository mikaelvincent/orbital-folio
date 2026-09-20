import { bindings, getRecords } from '@/lib/content/repository';
import {
  buildProjectPackage,
  PROJECT_PACKAGE_LIMITS,
} from '@/lib/content/project-package';
import { projectMediaClosure } from '@/lib/content/project-package-media';
import { requireAdmin, HttpError, apiError } from '@/lib/security';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const records = await getRecords();
    const project = records.find(
      (record) => record.id === id && record.kind === 'project',
    );
    if (!project) throw new HttpError(404, 'Project not found.');
    const references = projectMediaClosure(project.draft, records);
    if (references.length >= PROJECT_PACKAGE_LIMITS.entries)
      throw new HttpError(
        413,
        'This project has too many assets for a package.',
      );
    const assets = [];
    let size = 0;
    for (const asset of references) {
      if (asset.draft.url !== '/media/' + asset.id)
        throw new HttpError(
          400,
          `Upload “${asset.draft.title}” into Studio before exporting. External media is never downloaded by export.`,
        );
      const object = await bindings().MEDIA.get(asset.id);
      if (!object)
        throw new HttpError(
          400,
          `The stored file for “${asset.draft.title}” is missing.`,
        );
      size += object.size;
      if (size > PROJECT_PACKAGE_LIMITS.expanded) {
        await object.body.cancel();
        throw new HttpError(
          413,
          'Project assets exceed the 24 MiB expanded package limit.',
        );
      }
      assets.push({
        id: asset.id,
        data: asset.draft,
        bytes: new Uint8Array(await object.arrayBuffer()),
      });
    }
    const bytes = buildProjectPackage(project.draft, assets);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.draft.slug}.zip"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
