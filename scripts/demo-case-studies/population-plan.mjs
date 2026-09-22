import {
  caseStudySamples,
  sampleCaseStudyData,
} from '../../lib/content/sample-case-studies.mjs';
import { canonical, contentHash } from '../demo-projects/population-plan.mjs';

/** Exact three shipped legacy records, captured before the case-study samples. */
export const ORIGINAL_CASE_STUDY_HASHES = {
  'building-products':
    '84174cc718c3fb9dd7e80453b709381a8512e854622f8a844dc4b2e3e7207d83',
  'reliable-systems':
    'f047cbd62bc4d3a93f56e25a02abb96406746d380de365175375248c0f9239f0',
  'learning-by-building':
    'f464c8bdce0f8c4014a4a48ea681bb5f80c70230b04021fb507a133144c7de69',
};

/** No inference from sample=true: every authored field must match a known version.
 * Asset IDs are trusted only after the caller verifies their bytes and metadata. */
export function caseStudyPopulationPlan(records, assets = {}) {
  const update = [],
    create = [],
    skipped = [];
  for (const seed of caseStudySamples) {
    const slug = seed.data.slug;
    const candidates = records.filter(
      (record) =>
        record.id === seed.id ||
        (record.kind === 'experience' &&
          [record.draft?.slug, record.published?.slug].includes(slug)),
    );
    const data = sampleCaseStudyData(seed.data, assets);
    if (!candidates.length) {
      create.push({ seedId: seed.id, slug, data });
      continue;
    }
    if (candidates.length !== 1 || candidates[0].kind !== 'experience') {
      skipped.push({
        slug,
        reason:
          'Conflicting sample identity or URL; preserve every existing record.',
      });
      continue;
    }
    const current = candidates[0];
    if (
      !current.draft.sample ||
      !current.published?.sample ||
      canonical(current.draft) !== canonical(current.published)
    ) {
      skipped.push({
        slug,
        reason:
          'Unpublished, non-sample or divergent private draft; preserve existing content.',
      });
      continue;
    }
    if (
      ![
        ORIGINAL_CASE_STUDY_HASHES[slug],
        contentHash(seed.data),
        contentHash(data),
      ].includes(contentHash(current.draft))
    ) {
      skipped.push({
        slug,
        reason:
          'Content differs from exact known sample versions; preserve owner edits.',
      });
      continue;
    }
    update.push({
      id: current.id,
      slug,
      revision: current.revision,
      data,
      unchanged: canonical(current.draft) === canonical(data),
    });
  }
  return { create, update, skipped };
}
