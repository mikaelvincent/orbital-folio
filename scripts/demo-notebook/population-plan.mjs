import { notebookSamples } from '../../lib/content/sample-notebook.mjs';
import { canonical, contentHash } from '../demo-projects/population-plan.mjs';

/** Exact shipped notebook records through 44ade77. Do not infer ownership from
 * sample=true or a recognizable title; every authored field must still match. */
export const ORIGINAL_NOTEBOOK_HASHES = {
  'my-story':
    '00b956d8114f4ddfcfb2aa777c9ee0a0a05f3b13312942995e6ed6ab6b33b9a1',
  'how-i-work':
    'c192fc567c2c2a9c12822164be72b6fc39ef217526ff531a528194dc68142794',
  'beyond-the-screen':
    '4ea24099129d8eab278e2275f154b9509cea1da85372bd7c0185d06b04c77e91',
};

export function notebookPopulationPlan(records) {
  const update = [],
    create = [],
    skipped = [];
  for (const seed of notebookSamples) {
    const { slug } = seed.data;
    const candidates = records.filter(
      (record) =>
        record.id === seed.id ||
        (record.kind === 'journal' &&
          [record.draft?.slug, record.published?.slug].includes(slug)),
    );
    if (!candidates.length) {
      create.push({ seedId: seed.id, slug, data: seed.data });
      continue;
    }
    if (candidates.length !== 1 || candidates[0].kind !== 'journal') {
      skipped.push({
        slug,
        reason: 'Conflicting identity or slug; preserve existing records.',
      });
      continue;
    }
    const current = candidates[0];
    if (
      !current.draft?.sample ||
      !current.published?.sample ||
      canonical(current.draft) !== canonical(current.published)
    ) {
      skipped.push({
        slug,
        reason: 'Unpublished, non-sample or divergent private draft.',
      });
      continue;
    }
    if (
      ![ORIGINAL_NOTEBOOK_HASHES[slug], contentHash(seed.data)].includes(
        contentHash(current.draft),
      )
    ) {
      skipped.push({
        slug,
        reason:
          'Content differs from exact known samples; preserve owner edits.',
      });
      continue;
    }
    update.push({
      id: current.id,
      slug,
      revision: current.revision,
      data: seed.data,
      unchanged: canonical(current.draft) === canonical(seed.data),
    });
  }
  return { create, update, skipped };
}
