import { interfaceTextSiteFields } from '@/lib/content/interface-text';
import { interfaceTextCatalog } from '@/lib/content/interface-text-catalog';

export type StudioArea =
  | 'general'
  | 'projects'
  | 'experience'
  | 'about'
  | 'contact'
  | 'inbox'
  | 'settings';
export type SiteSection = {
  id: string;
  area: StudioArea;
  title: string;
  description: string;
  keys: string[];
  messages?: string[];
};
const messages = (...groups: string[]) => [
  ...new Set(
    groups.flatMap((group) =>
      (interfaceTextCatalog[group] || []).filter(
        (message) => !Object.hasOwn(interfaceTextSiteFields, message),
      ),
    ),
  ),
];
export const siteSections: SiteSection[] = [
  {
    id: 'identity',
    area: 'general',
    title: 'Identity',
    description:
      'Your name, role and website identity. These settings are shared by both views.',
    keys: ['name', 'title', 'domain', 'availability', 'accent'],
  },
  {
    id: 'navigation',
    area: 'general',
    title: 'Navigation & messages',
    description:
      'View switching, navigation, loading, empty states and shared controls.',
    keys: [
      'homeLabel',
      'sectionLabel',
      'readLabel',
      'sceneLabel',
      'skipLabel',
      'backHomeLabel',
      'sceneLoading',
      'sceneUnavailable',
      'emptyLabel',
      'studioLabel',
    ],
    messages: messages('shared'),
  },
  {
    id: 'search',
    area: 'general',
    title: 'Search & sharing',
    description:
      'Page metadata, language and the image shown when someone shares your portfolio.',
    keys: [
      'seoTitle',
      'seoDescription',
      'seoImageId',
      'language',
      'sampleMode',
    ],
  },
  {
    id: 'privacy',
    area: 'general',
    title: 'Privacy & missing pages',
    description:
      'The privacy page and the message shown for an unavailable URL.',
    keys: [
      'privacyLabel',
      'privacyText',
      'notFoundEyebrow',
      'notFoundHeading',
      'notFoundText',
    ],
  },
  {
    id: 'projects',
    area: 'projects',
    title: 'Page & interface',
    description:
      'The room name, collection headings, monitor categories and project application. Both views use these settings.',
    keys: [
      'projectsLabel',
      'projectsHeading',
      'projectsIntro',
      'allProjectsLabel',
      'backLabel',
      'demoLabel',
      'codeLabel',
      'roleLabel',
      'stackLabel',
    ],
    messages: messages('projects'),
  },
  {
    id: 'project-headings',
    area: 'projects',
    title: 'Legacy section headings',
    description:
      'Headings for older projects with separate story fields. Markdown projects use the headings in their own body.',
    keys: [
      'problemLabel',
      'approachLabel',
      'systemLabel',
      'decisionsLabel',
      'outcomesLabel',
      'nextLabel',
    ],
  },
  {
    id: 'experience',
    area: 'experience',
    title: 'Page & interface',
    description:
      'The room name, collection text, category names, cartridge labels and case study application.',
    keys: ['experienceLabel', 'experienceHeading', 'experienceIntro'],
    messages: messages('experience'),
  },
  {
    id: 'about',
    area: 'about',
    title: 'Profile & notebook',
    description:
      'The room name, opening biography, fallback section title and notebook controls.',
    keys: [
      'aboutLabel',
      'biography',
      'aboutHeading',
      'journalLabel',
      'previousPageLabel',
      'nextPageLabel',
    ],
    messages: messages('about'),
  },
  {
    id: 'portrait',
    area: 'about',
    title: 'Portrait',
    description:
      'One shared portrait image with separate crops for the room frame and reading page.',
    keys: ['portraitMediaId'],
  },
  {
    id: 'contact',
    area: 'contact',
    title: 'Page & displays',
    description: 'The room name, email address and contact screen headings.',
    keys: ['contactLabel', 'email', 'emailLabelCta'],
    messages: messages('contact'),
  },
  {
    id: 'contact-form',
    area: 'contact',
    title: 'Form & messages',
    description:
      'Contact choices, field labels, validation, sending and confirmation messages in both views. Call requests are previews; they do not book or send.',
    keys: ['nameLabel', 'emailLabel', 'messageLabel'],
    messages: messages('contact-form'),
  },
];
export const siteFieldLabels: Record<string, string> = {
  name: 'Owner name',
  title: 'Role / subtitle',
  domain: 'Website address (HTTPS)',
  initials: 'Initials',
  availability: 'Availability message',
  accent: 'Accent color',
  homeLabel: 'Overview name',
  sectionLabel: 'Navigation label',
  readLabel: 'Switch to reading view',
  sceneLabel: 'Switch to interactive view',
  skipLabel: 'Skip navigation link',
  backHomeLabel: 'Back to overview',
  sceneLoading: 'Loading message',
  sceneUnavailable: 'Reading fallback message',
  emptyLabel: 'Empty content message',
  studioLabel: 'Content Studio link',
  seoTitle: 'Search & social title',
  seoDescription: 'Search & social description',
  seoImageId: 'Social preview image',
  language: 'Language tag',
  sampleMode: 'Keep search indexing off while using sample content',
  privacyLabel: 'Privacy page name',
  privacyText: 'Privacy policy',
  notFoundEyebrow: 'Missing page label',
  notFoundHeading: 'Missing page heading',
  notFoundText: 'Missing page message',
  projectsLabel: 'Room & navigation name',
  projectsHeading: 'Collection heading',
  projectsIntro: 'Collection introduction',
  allProjectsLabel: 'All projects category',
  backLabel: 'Back to collection button',
  demoLabel: 'Live project link',
  codeLabel: 'Source code link',
  roleLabel: 'Role label (shared with case studies)',
  stackLabel: 'Technology label',
  experienceLabel: 'Room & navigation name',
  experienceHeading: 'Collection heading',
  experienceIntro: 'Collection introduction',
  aboutLabel: 'Room & navigation name',
  biography: 'Opening biography',
  aboutHeading: 'Title when the notebook has no sections',
  journalLabel: 'Notebook name',
  previousPageLabel: 'Previous page button',
  nextPageLabel: 'Next page button',
  portraitMediaId: 'Portrait image',
  contactLabel: 'Room & navigation name',
  contactRoom: 'Contact display label',
  contactHeading: 'Form heading',
  contactIntro: 'Form introduction',
  email: 'Public email address',
  emailLabelCta: 'Email alternative label',
  nameLabel: 'Name field',
  emailLabel: 'Email field',
  messageLabel: 'Message field',
  sendLabel: 'Send message button',
  sendingLabel: 'Sending status',
  sentHeading: 'Success heading',
  sentMessage: 'Success message',
  contactPrivacy: 'Form privacy note',
};
export const messageLabels: Record<string, string> = {
  project: 'Count label: one project',
  projects: 'Count label: multiple projects',
  PROJECT: 'Uncategorized project caption',
  'Projects application': 'Project window name (accessibility)',
  'Close Projects application': 'Close project window (accessibility)',
  'Case studies application': 'Case study window name (accessibility)',
  'Close Case studies application': 'Close case study window (accessibility)',
  '{application} content': 'Application content region (accessibility)',
  'Scroll {application}': 'Application scrollbar (accessibility)',
  'IDEAS, BUILT.': 'Collection label',
  'THE DECISIONS BEHIND THE WORK': 'Collection label',
  'LET’S CONNECT': 'Monitor heading',
  'Start a conversation': 'Monitor subtitle',
  'COM / 01': 'Main monitor identifier',
  'OPEN TO CONNECT': 'Monitor status',
  STANDBY: 'Empty monitor label (shared)',
  'Click wall to return': 'Return to room hint',
  'No projects here yet': 'Empty collection heading',
  'More details about this project will be added here.':
    'Empty project body message',
  'No case studies are available yet.': 'Empty collection message',
  'No case studies have been added to this category yet.':
    'Empty category message',
  'More details about this case study will be added here.':
    'Empty case study body message',
  'At least 10 characters · {count} / 5,000 including company and subject':
    'Message length hint',
  'Email address copied.': 'Email copy confirmation',
  'Copy unavailable. Select the address to copy it.': 'Email copy failure',
  'Your message could not be saved. Please try again or use email.':
    'Send failure message',
  'Too many messages were sent recently. Please try again later or use email.':
    'Rate limit message',
  'Nothing was sent or saved, and no call was booked. You can still edit the details or use email to get in touch.':
    'Call preview confirmation',
  'Call requests aren’t sent yet. Use email to arrange a time.':
    'Call preview explanation',
};
export function fieldLabel(key: string) {
  return (
    siteFieldLabels[key] ||
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
  );
}
export function messageLabel(message: string) {
  return (
    messageLabels[message] ||
    (message.length > 90 ? message.slice(0, 87) + '…' : message)
  );
}
