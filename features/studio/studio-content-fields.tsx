'use client';
import { Checkbox } from '@/components/ui/checkbox';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { SocialLinkFields } from './social-link-fields';
import { ProjectEditor } from './project-editor';
import type { Content, Kind } from '@/lib/content/types';
import {
  ABOUT_PORTRAIT_ASPECT,
  normalizeImageCrop,
} from '@/lib/content/about-photos';
import {
  PhotoCropFields,
  PhotoMediaFields,
  type PhotoMediaActions,
} from './about-photo-fields';

export const names: Record<Kind, string> = {
  site: 'Identity & copy',
  project: 'Projects',
  experience: 'Case studies',
  journal: 'Journal',
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
  name: 'Owner name',
  initials: 'Brand initials',
  domain: 'Canonical domain (HTTPS)',
  email: 'Public contact email',
  sampleMode: 'Sample mode · keep search indexing off',
  sampleNotice: 'Sample notice text (retained metadata)',
  accent: 'Accent color',
  seoTitle: 'Search & social title',
  seoDescription: 'Search & social description',
  sample: 'Sample content metadata',
  order: 'Display order (smaller numbers first)',
  demoUrl: 'Independent demo URL (optional)',
  sourceUrl: 'Source repository URL (optional)',
  mediaId: 'Project image',
  url: 'URL',
  alt: 'Image alternative text',
  portraitMediaId: 'Portrait image',
  seoImageId: 'Social preview image (optional)',
  posterMediaId: 'Video poster image (optional)',
  captionsMediaId: 'Video captions · WebVTT (optional)',
};
const label = (k: string) =>
  labels[k] ||
  k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
const longKeys = new Set([
  'intro',
  'headline',
  'biography',
  'summary',
  'body',
  'context',
  'decisions',
  'impact',
  'problem',
  'approach',
  'system',
  'outcomes',
  'next',
  'seoDescription',
  'privacyText',
]);
const profileKeys = [
  'name',
  'initials',
  'title',
  'headline',
  'intro',
  'biography',
  'availability',
  'location',
  'email',
  'brand',
  'accent',
  'sampleMode',
  'sampleNotice',
  'portraitMediaId',
  'portraitCrop',
  'portraitReadingCrop',
];
const seoKeys = [
  'domain',
  'seoTitle',
  'seoDescription',
  'language',
  'seoImageId',
];

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
  const siteFieldOrder =
    siteGroup === 'profile' ? profileKeys : siteGroup === 'seo' ? seoKeys : [];
  const filteredKeys = [
    ...new Set([
      ...Object.keys(data),
      ...(kind === 'site' ? ['portraitMediaId'] : []),
      ...(kind === 'media' && String(data.mime).startsWith('video/')
        ? ['posterMediaId', 'captionsMediaId']
        : []),
    ]),
  ]
    .filter(
      (key) =>
        !['posterMediaId', 'captionsMediaId'].includes(key) ||
        String(data.mime).startsWith('video/'),
    )
    .filter((k) => !(kind === 'site' && k === 'periodLabel'))
    .filter((key) => !['portraitCrop', 'portraitReadingCrop'].includes(key))
    .filter(
      (k) =>
        kind !== 'site' ||
        (siteGroup === 'profile'
          ? profileKeys.includes(k)
          : siteGroup === 'seo'
            ? seoKeys.includes(k)
            : !profileKeys.includes(k) && !seoKeys.includes(k)),
    )
    .filter(
      (k) => !search || label(k).toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      kind === 'site' && siteFieldOrder.length
        ? siteFieldOrder.indexOf(a) - siteFieldOrder.indexOf(b)
        : 0,
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
      ) : kind === 'site' && search && !filteredKeys.length ? (
        <p className="studio-fields-empty wide-field" role="status">
          No settings match “{search}” in this section. Try another field name
          or clear the search.
        </p>
      ) : (
        filteredKeys.map((key) => {
          const value = data[key];
          if (kind === 'site' && key === 'portraitMediaId')
            return (
              <PhotoMediaFields
                key={key}
                title="Portrait image"
                description="Use one original for the About room's mounted photo and your Reading view portrait. Frame each version independently below."
                emptyLabel="Keep the room's landscape artwork"
                mediaId={value || ''}
                records={records}
                busy={busy}
                onUpload={onUpload}
                onPublishAssets={onPublishAssets}
                onSelect={(id) =>
                  setData({
                    ...data,
                    portraitMediaId: id,
                    portraitCrop: normalizeImageCrop(null),
                    portraitReadingCrop: normalizeImageCrop(null),
                  })
                }
              >
                {(media) => (
                  <>
                    <PhotoCropFields
                      title="About room frame"
                      media={media}
                      value={data.portraitCrop}
                      aspect={ABOUT_PORTRAIT_ASPECT}
                      onChange={(portraitCrop) =>
                        setData({ ...data, portraitCrop })
                      }
                    />
                    <PhotoCropFields
                      title="Reading view portrait"
                      media={media}
                      value={data.portraitReadingCrop}
                      aspect={1}
                      onChange={(portraitReadingCrop) =>
                        setData({ ...data, portraitReadingCrop })
                      }
                    />
                  </>
                )}
              </PhotoMediaFields>
            );
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
