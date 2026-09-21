/** Authored collections shared by the archive, Studio and semantic readers. */
export const CASE_STUDY_CATEGORIES = [
  { id: 'product', label: 'Product engineering' },
  { id: 'systems', label: 'Systems & reliability' },
  { id: 'research', label: 'Research & experiments' },
  { id: 'interfaces', label: 'Design & interfaces' },
] as const;
export type CaseStudyCategory = (typeof CASE_STUDY_CATEGORIES)[number]['id'];
export type CaseStudyFilter = 'all' | CaseStudyCategory;

type CaseStudy = Record<string, unknown>;

export function caseStudyCategories(study: CaseStudy): CaseStudyCategory[] {
  const categories = study.categories;
  if (!Array.isArray(categories)) return [];
  return CASE_STUDY_CATEGORIES.filter(({ id }) => categories.includes(id)).map(
    ({ id }) => id,
  );
}

/** Older unassigned stories belong to All; titles never imply a category. */
export function caseStudyCategoryCount(
  studies: readonly CaseStudy[],
  category: CaseStudyFilter,
): number {
  return category === 'all'
    ? studies.length
    : studies.filter((study) => caseStudyCategories(study).includes(category))
        .length;
}

/** Preserve legacy sections until the author explicitly edits a Markdown body. */
export function caseStudyBody(study: CaseStudy): string {
  if (typeof study.body === 'string') return study.body;
  return [
    ['context', 'Context'],
    ['decisions', 'Key decisions'],
    ['impact', 'Impact'],
  ]
    .flatMap(([key, heading]) =>
      typeof study[key] === 'string' && study[key].trim()
        ? [`## ${heading}\n\n${study[key].trim()}`]
        : [],
    )
    .join('\n\n');
}

export const CASE_STUDY_STORY_TEMPLATE = `## Context\n\nWhat was the situation, and why did it matter?\n\n## My contribution\n\nDescribe your role and what you changed.\n\n## Approach\n\nExplain how you investigated and solved the problem.\n\n## Key decisions\n\nDescribe the tradeoffs and the evidence behind your choices.\n\n## Impact\n\nWhat changed, and what did you learn?\n`;
