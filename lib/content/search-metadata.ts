import { interfaceText } from './interface-text.ts';

// Keep existing About/Contact descriptions as the single editable override;
// older drafts and published snapshots need no migration or rewritten copy.
export const siteSearchFields = {
  home: ['seoTitle', 'seoDescription'],
  projects: ['projectsSeoTitle', 'projectsSeoDescription'],
  experience: ['experienceSeoTitle', 'experienceSeoDescription'],
  about: ['aboutSeoTitle', 'aboutIntro'],
  contact: ['contactSeoTitle', 'contactIntro'],
  privacy: ['privacySeoTitle', 'privacySeoDescription'],
} as const;
export type SearchSection = keyof typeof siteSearchFields;

const text = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';
const titleWithOwner = (title: unknown, name: unknown) =>
  [text(title), text(name)].filter(Boolean).join(' — ');

/** Resolve public metadata and the Studio preview from the same authored fields. */
export function searchMetadata(
  site: Record<string, any>,
  section: SearchSection,
  record?: Record<string, any>,
) {
  const [titleKey, descriptionKey] = siteSearchFields[section];
  const sharedDescription = text(site.seoDescription) || text(site.title);
  const contentDescriptions = {
    home: text(site.title),
    projects: text(site.projectsIntro),
    experience: text(site.experienceIntro),
    about: text(site.biography),
    contact: interfaceText(site, 'Start a conversation'),
    privacy: text(site.privacyText),
  };
  const pageDefaultTitle =
    section === 'home'
      ? titleWithOwner(site.name, site.title)
      : titleWithOwner(site[section + 'Label'], site.name);
  const pageDefaultDescription =
    contentDescriptions[section] || sharedDescription;
  const pageDescription = text(site[descriptionKey]) || pageDefaultDescription;
  const defaultTitle = record
    ? titleWithOwner(record.title, site.name)
    : pageDefaultTitle;
  const defaultDescription = record
    ? text(record.summary) || text(record.subtitle) || pageDescription
    : pageDefaultDescription;
  return {
    title: text(record ? record.seoTitle : site[titleKey]) || defaultTitle,
    description:
      text(record ? record.seoDescription : site[descriptionKey]) ||
      defaultDescription,
    defaultTitle,
    defaultDescription,
  };
}
