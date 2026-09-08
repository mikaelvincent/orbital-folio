export type Kind =
  | 'site'
  | 'project'
  | 'experience'
  | 'journal'
  | 'link'
  | 'media';
export type Content = {
  id: string;
  kind: Kind;
  draft: Record<string, any>;
  published: Record<string, any> | null;
  revision: number;
  updatedAt: string;
};
export type Portfolio = {
  site: Record<string, any>;
  projects: Record<string, any>[];
  experience: Record<string, any>[];
  journal: Record<string, any>[];
  links: Record<string, any>[];
  media: Record<string, any>[];
};
export const kinds: Kind[] = [
  'site',
  'project',
  'experience',
  'journal',
  'link',
  'media',
];
export function toPortfolio(records: Content[], preview = false): Portfolio {
  const list = (kind: Kind) =>
    records
      .filter((r) => r.kind === kind && (preview || r.published))
      .map((r) => ({ ...(preview ? r.draft : r.published), id: r.id }))
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  return {
    site: list('site')[0] || {},
    projects: list('project'),
    experience: list('experience'),
    journal: list('journal'),
    links: list('link'),
    media: list('media'),
  };
}
