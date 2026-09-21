/** Shared project information for the studio, readers and spacecraft gallery. */
export const PROJECT_CATEGORIES = [
  { id: 'systems', label: 'Systems' },
  { id: 'interfaces', label: 'Interfaces' },
  { id: 'experiments', label: 'Experiments' },
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]['id'];

type Project = Record<string, unknown>;

export function projectCategories(project: Project): ProjectCategory[] {
  const categories = project.categories;
  if (!Array.isArray(categories)) return [];
  return PROJECT_CATEGORIES.filter(({ id }) => categories.includes(id)).map(
    ({ id }) => id,
  );
}

/** Public collections use explicit assignments, never the legacy display label. */
export function projectCategoryCount(
  projects: readonly Project[],
  category: 'all' | ProjectCategory,
): number {
  return category === 'all'
    ? projects.length
    : projects.filter((project) =>
        projectCategories(project).includes(category),
      ).length;
}

/** Older projects keep their authored story without requiring a migration. */
export function projectBody(project: Project): string {
  if (typeof project.body === 'string') return project.body;
  const sections = [
    ['problem', 'The problem'],
    ['approach', 'My approach'],
    ['system', 'How it works'],
    ['decisions', 'Key decisions'],
    ['outcomes', 'Results'],
    ['next', 'What’s next'],
  ] as const;
  return sections
    .flatMap(([key, heading]) =>
      typeof project[key] === 'string' && project[key].trim()
        ? [`## ${heading}\n\n${project[key].trim()}`]
        : [],
    )
    .join('\n\n');
}

export function projectSlug(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
    .replace(/-$/, '');
}

export const PROJECT_STORY_TEMPLATE = `## Overview\n\nWhat did you build, and who is it for?\n\n## My contribution\n\nDescribe your role and contribution.\n\n## How it works\n\nExplain the important parts.\n\n## Key decisions\n\nWhat choices made a difference?\n\n## Results\n\nWhat changed, and what did you learn?\n`;
