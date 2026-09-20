'use client';
import { Checkbox } from '@/components/ui/checkbox';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { SocialLinkFields } from './social-link-fields';
import type { Content, Kind } from '@/lib/content/types';

export const names: Record<Kind, string> = {
  site: 'Identity & copy',
  project: 'Projects',
  experience: 'Experience',
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
    period: '',
    demoUrl: '',
    sourceUrl: '',
    mediaId: '',
    seoTitle: '',
    seoDescription: '',
  },
  experience: {
    title: '',
    slug: '',
    organization: '',
    period: '',
    role: '',
    summary: '',
    context: '',
    decisions: '',
    impact: '',
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
  sampleMode: 'Show sample notice & keep search indexing off',
  accent: 'Accent color',
  seoTitle: 'Search & social title',
  seoDescription: 'Search & social description',
  sample: 'Clearly label as sample content',
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
}: {
  kind: Kind;
  data: Record<string, any>;
  siteGroup: string;
  search: string;
  setData: (data: Record<string, any>) => void;
  records: Content[];
  selected: string;
}) {
  const filteredKeys = [
    ...new Set([
      ...Object.keys(data),
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
    );
  return (
    <div className="editor-fields">
      {kind === 'link' ? (
        <SocialLinkFields
          data={data}
          onChange={setData}
          records={records}
          selected={selected}
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
    </div>
  );
}
