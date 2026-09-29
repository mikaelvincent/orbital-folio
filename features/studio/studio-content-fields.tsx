'use client';
import { StudioSiteFields } from './studio-site-fields';
import { Checkbox } from '@/components/ui/checkbox';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
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
  media: 'Media library',
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
  media: {
    title: '',
    alt: '',
    url: '',
    mime: '',
    size: 0,
    order: 0,
    posterMediaId: '',
    captionsMediaId: '',
  },
};
const labels: Record<string, string> = {
  sample: 'Sample content metadata',
  order: 'Display order (smaller numbers first)',
  url: 'URL',
  alt: 'Alternative text',
  posterMediaId: 'Video poster image (optional)',
  captionsMediaId: 'Video captions · WebVTT (optional)',
};
const label = (k: string) =>
  labels[k] ||
  k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const longKeys = new Set(['alt']);
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
        journalRecordId={selected}
      />
    );
  const filteredKeys = [
    ...new Set([
      ...Object.keys(data),
      ...(kind === 'media' && String(data.mime).startsWith('video/')
        ? ['posterMediaId', 'captionsMediaId']
        : []),
    ]),
  ]
    .filter((key) => !['portraitCrop', 'portraitReadingCrop'].includes(key))
    .filter(
      (key) =>
        !['posterMediaId', 'captionsMediaId'].includes(key) ||
        String(data.mime).startsWith('video/'),
    );
  return (
    <fieldset
      className="editor-fields studio-fields-reset"
      aria-label={`${names[kind]} fields`}
      disabled={busy}
    >
      {kind === 'link' ? (
        <SocialLinkFields
          data={data}
          onChange={setData}
          records={records}
          selected={selected}
          busy={busy}
          onUpload={onUpload}
          onPublishAssets={onPublishAssets}
        />
      ) : (
        filteredKeys.map((key) => {
          const value = data[key];
          if (typeof value === 'boolean')
            return (
              <label className="studio-check" key={key}>
                <Checkbox
                  checked={value}
                  onCheckedChange={(v) => setData({ ...data, [key]: v })}
                />
                <span>{label(key)}</span>
              </label>
            );
          if (
            [
              'mediaId',
              'portraitMediaId',
              'seoImageId',
              'posterMediaId',
              'captionsMediaId',
            ].includes(key)
          )
            return (
              <label className="studio-field" key={key}>
                {label(key)}
                <NativeSelect
                  value={value || ''}
                  onChange={(e) => setData({ ...data, [key]: e.target.value })}
                >
                  <NativeSelectOption value="">
                    {key === 'captionsMediaId' ? 'No captions' : 'No image'}
                  </NativeSelectOption>
                  {records
                    .filter(
                      (r) =>
                        r.kind === 'media' &&
                        (key === 'captionsMediaId'
                          ? r.draft.mime === 'text/vtt'
                          : String(r.draft.mime).startsWith('image/')),
                    )
                    .map((r) => (
                      <NativeSelectOption key={r.id} value={r.id}>
                        {r.draft.title}
                        {r.published ? '' : ' (draft)'}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              </label>
            );
          return (
            <label
              className={`studio-field ${longKeys.has(key) ? 'wide-field' : ''}`}
              key={key}
            >
              {label(key)}
              {longKeys.has(key) || String(value).length > 150 ? (
                <textarea
                  rows={key === 'body' ? 12 : 4}
                  value={value}
                  maxLength={20000}
                  onChange={(e) => setData({ ...data, [key]: e.target.value })}
                />
              ) : (
                <input
                  type={
                    typeof value === 'number'
                      ? 'number'
                      : key === 'accent'
                        ? 'color'
                        : 'text'
                  }
                  value={value}
                  onChange={(e) =>
                    setData({
                      ...data,
                      [key]:
                        typeof value === 'number'
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                  maxLength={20000}
                />
              )}
            </label>
          );
        })
      )}
    </fieldset>
  );
}
