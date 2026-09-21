import { PROJECT_CATEGORIES } from './project-content.ts';
import { CASE_STUDY_CATEGORIES } from './case-study-content.ts';
import { socialPlatforms, socialScreens } from './social-links.ts';
import { kinds, type Kind } from './types.ts';
import { seedSite } from './seed.ts';
import { HttpError } from '../http-error.ts';
const fields: Record<Kind, string[]> = {
  // Retired presentation copy is no longer seeded or edited, but existing
  // identity exports must round-trip without silently discarding owner text.
  site: [...Object.keys(seedSite), 'periodLabel'],
  project: [
    'slug',
    'title',
    'subtitle',
    'summary',
    'category',
    'categories',
    'body',
    'order',
    'sample',
    'stack',
    'role',
    'problem',
    'approach',
    'system',
    'decisions',
    'outcomes',
    'next',
    'demoUrl',
    'sourceUrl',
    'mediaId',
    'seoTitle',
    'seoDescription',
  ],
  experience: [
    'slug',
    'title',
    'subtitle',
    'organization',
    'period',
    'role',
    'summary',
    'categories',
    'body',
    'mediaId',
    'seoTitle',
    'seoDescription',
    'context',
    'decisions',
    'impact',
    'order',
    'sample',
  ],
  journal: ['slug', 'title', 'subtitle', 'body', 'order', 'sample'],
  link: ['title', 'url', 'order', 'platform', 'screen', 'description'],
  media: [
    'title',
    'alt',
    'url',
    'mime',
    'size',
    'order',
    'posterMediaId',
    'captionsMediaId',
  ],
};
export function safeUrl(value: string, allowMail = false) {
  try {
    const u = new URL(value);
    return (
      (u.protocol === 'https:' || (allowMail && u.protocol === 'mailto:')) &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}
export function validateContent(kind: Kind, data: any): Record<string, any> {
  if (
    !kinds.includes(kind) ||
    !data ||
    Array.isArray(data) ||
    typeof data !== 'object'
  )
    throw new HttpError(400, 'Invalid content type.');
  const clean: Record<string, any> = {};
  for (const key of fields[kind]) {
    const value = data[key];
    if (value === undefined) continue;
    if (key === 'categories') {
      const categories =
        kind === 'experience' ? CASE_STUDY_CATEGORIES : PROJECT_CATEGORIES;
      if (
        !Array.isArray(value) ||
        value.length > categories.length ||
        value.some((id) => !categories.some((c) => c.id === id))
      )
        throw new HttpError(
          400,
          kind === 'experience'
            ? 'Choose Product engineering, Systems & reliability, Research & experiments or Design & interfaces.'
            : 'Choose Systems, Interfaces or Experiments.',
        );
      clean[key] = [...new Set(value)];
    } else if (key === 'sample' || key === 'sampleMode') {
      if (typeof value !== 'boolean')
        throw new HttpError(400, `${key} must be true or false.`);
      clean[key] = value;
    } else if (key === 'order' || key === 'size') {
      if (!Number.isSafeInteger(value) || Math.abs(value) > 100000000)
        throw new HttpError(400, `${key} must be a valid integer.`);
      clean[key] = value;
    } else {
      const markdown =
        key === 'body' && (kind === 'project' || kind === 'experience');
      const limit = markdown ? 100000 : 20000;
      if (typeof value !== 'string' || value.length > limit)
        throw new HttpError(
          400,
          `${key} must be text under ${limit.toLocaleString('en-US')} characters.`,
        );
      // Markdown indentation and surrounding newlines are authored content.
      // Trimming the story can turn an indented code block into ordinary prose.
      clean[key] = markdown ? value : value.trim();
    }
  }
  if (kind === 'site') {
    for (const key of Object.keys(seedSite)) {
      if (!(key in clean))
        throw new HttpError(400, `Missing site field: ${key}`);
    }
    if (!clean.name || !clean.headline || !clean.seoTitle)
      throw new HttpError(400, 'Name, headline and SEO title are required.');
    if (!/^#[0-9a-f]{6}$/i.test(clean.accent))
      throw new HttpError(400, 'Use a six-digit hex accent color.');
    const luminance = (hex: string) => {
      const v = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const light = luminance(clean.accent);
    if ((light + 0.05) / (luminance('#142235') + 0.05) < 4.5)
      throw new HttpError(
        400,
        'Choose a brighter accent color to preserve readable text and buttons.',
      );
    for (const key of [
      'homeLabel',
      'projectsLabel',
      'experienceLabel',
      'aboutLabel',
      'contactLabel',
      'skipLabel',
      'sendLabel',
      'nameLabel',
      'emailLabel',
      'messageLabel',
    ])
      if (!clean[key]) throw new HttpError(400, `${key} cannot be empty.`);
    for (const key of [
      'projectsLabel',
      'experienceLabel',
      'aboutLabel',
      'contactLabel',
    ])
      if (clean[key].length > 40)
        throw new HttpError(
          400,
          'Navigation labels must be 40 characters or fewer.',
        );
    if (clean.initials.length > 4 || !clean.initials)
      throw new HttpError(400, 'Brand initials must contain 1–4 characters.');
    if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(clean.language))
      throw new HttpError(400, 'Use a valid language tag.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email))
      throw new HttpError(400, 'Enter a valid contact email.');
    if (!safeUrl(clean.domain))
      throw new HttpError(400, 'Domain must be an HTTPS URL.');
    clean.domain = new URL(clean.domain).origin;
  } else if (!clean.title) throw new HttpError(400, 'A title is required.');
  if (
    ['project', 'experience', 'journal'].includes(kind) &&
    (typeof clean.slug !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean.slug) ||
      clean.slug.length > 100)
  )
    throw new HttpError(400, 'Use a unique lowercase URL slug with hyphens.');
  if ((kind === 'media' || kind === 'link') && !clean.url)
    throw new HttpError(400, 'A URL is required.');
  for (const key of ['demoUrl', 'sourceUrl', 'url'])
    if (
      clean[key] &&
      !safeUrl(clean[key], kind === 'link') &&
      !(kind === 'media' && /^\/media\/[a-zA-Z0-9-]+$/.test(clean[key]))
    )
      throw new HttpError(400, `${key} must be a safe HTTPS URL.`);
  if (kind === 'link') {
    if (clean.platform && !socialPlatforms.some((p) => p.id === clean.platform))
      throw new HttpError(400, 'Choose a social platform or Custom.');
    if (clean.screen && !socialScreens.some((s) => s.id === clean.screen))
      throw new HttpError(400, 'Choose a valid contact screen placement.');
    if (clean.title.length > 60 || (clean.description || '').length > 64)
      throw new HttpError(
        400,
        'Keep the social name under 61 characters and its caption under 65.',
      );
    if (clean.url.length > 2000)
      throw new HttpError(
        400,
        'Keep the destination URL under 2,001 characters.',
      );
  }
  // Legacy stories have no categories field and remain valid without conversion.
  if (
    (kind === 'project' || kind === 'experience') &&
    'categories' in clean &&
    (!clean.categories.length || !clean.summary)
  )
    throw new HttpError(
      400,
      'Add a short description and at least one category.',
    );
  for (const key of ['mediaId', 'posterMediaId', 'captionsMediaId'])
    if (clean[key] && !/^[a-zA-Z0-9-]{1,100}$/.test(clean[key]))
      throw new HttpError(400, `Choose a valid ${key}.`);
  if (kind === 'media' && !clean.alt)
    throw new HttpError(400, 'Add descriptive alternative text for the media.');
  return clean;
}
export { fields };
