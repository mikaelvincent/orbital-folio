import type { Portfolio } from './content-types';
export function socialImage(data: Portfolio, id?: string) {
  const media = data.media.find((m) => m.id === id);
  return media
    ? [{ url: new URL(media.url, data.site.domain).href, alt: media.alt }]
    : [];
}
export function pageMetadata(
  data: Portfolio,
  section: string,
  record?: Record<string, any>,
) {
  const s = data.site;
  const path = section + (record ? '/' + record.slug : '');
  const title =
    record?.seoTitle || `${s[section + 'Label'] || s.privacyLabel} — ${s.name}`;
  const description =
    record?.seoDescription || s[section + 'Intro'] || s.seoDescription;
  const images = socialImage(data, record ? record.mediaId : s.seoImageId);
  return {
    title,
    description,
    alternates: { canonical: s.domain + '/' + path },
    robots:
      s.sampleMode || record?.sample
        ? { index: false, follow: true }
        : undefined,
    openGraph: {
      title,
      description,
      url: s.domain + '/' + path,
      type: 'website',
      images,
    },
    twitter: {
      card: images.length ? 'summary_large_image' : 'summary',
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}
