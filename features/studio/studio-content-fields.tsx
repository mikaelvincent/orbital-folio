'use client';
import { StudioSiteFields } from './studio-site-fields';
import { SocialLinkFields } from './social-link-fields';
import { ProjectEditor } from './project-editor';
import type { Content, Kind } from '@/lib/content/types';
import type { PhotoMediaActions } from './about-photo-fields';

export const names: Record<Kind, string> = {
  site: 'Site settings',
  project: 'Projects',
  experience: 'Case studies',
  journal: 'Notebook sections',
  link: 'Social links',
  media: 'Attachments',
};
export const templates: Record<string, Record<string, any>> = {
  project: {
    title: '',
    slug: '',
    subtitle: '',
    summary: '',
    categories: [],
    body: '',
    order: 0,
    sample: true,
    stack: '',
    role: '',
    demoUrl: '',
    sourceUrl: '',
    mediaId: '',
    seoTitle: '',
    seoDescription: '',
  },
  experience: {
    title: '',
    slug: '',
    subtitle: '',
    organization: '',
    period: '',
    role: '',
    summary: '',
    categories: [],
    body: '',
    mediaId: '',
    seoTitle: '',
    seoDescription: '',
    order: 0,
    sample: true,
  },
  journal: {
    title: '',
    slug: '',
    subtitle: '',
    body: '',
    order: 0,
    sample: true,
  },
  link: {
    title: '',
    url: '',
    order: 0,
    platform: 'custom',
    screen: 'auto',
    description: '',
    aboutSlot: 'off',
  },
};
export function StudioContentFields({
  kind,
  data,
  siteGroup,
  search,
  setData,
  records,
  selected,
  busy,
  onUpload,
  onPublishAssets,
  onMediaAction,
  onMediaDirtyChange,
}: {
  kind: Kind;
  data: Record<string, any>;
  siteGroup: string;
  search: string;
  setData: (data: Record<string, any>) => void;
  records: Content[];
  selected: string;
} & PhotoMediaActions) {
  if (kind === 'site')
    return (
      <StudioSiteFields
        data={data}
        setData={setData}
        siteGroup={siteGroup}
        search={search}
        records={records}
        busy={busy}
        onUpload={onUpload}
        onPublishAssets={onPublishAssets}
        onMediaAction={onMediaAction}
        onMediaDirtyChange={onMediaDirtyChange}
      />
    );
  if (kind === 'journal')
    return (
      <ProjectEditor
        kind="journal"
        data={data}
        records={records}
        busy={busy}
        onChange={setData}
        onUpload={onUpload}
        onPublishAssets={onPublishAssets}
        onMediaAction={onMediaAction}
        onMediaDirtyChange={onMediaDirtyChange}
        journalRecordId={selected}
        recordId={selected}
      />
    );
  if (kind !== 'link') return null;
  return (
    <fieldset
      className="editor-fields studio-fields-reset"
      aria-label="Social links fields"
      disabled={busy}
    >
      <SocialLinkFields
        data={data}
        onChange={setData}
        records={records}
        selected={selected}
        busy={busy}
        onUpload={onUpload}
        onPublishAssets={onPublishAssets}
        onMediaAction={onMediaAction}
        onMediaDirtyChange={onMediaDirtyChange}
      />
    </fieldset>
  );
}
