import { caseStudyBody } from './case-study-content.ts';
import {
  directProjectMediaIds,
  projectMediaClosure,
  validateProjectPublication,
} from './project-package-media.ts';
import type { Content } from './types.ts';

const withBody = (study: Record<string, any>) => ({
  ...study,
  body: caseStudyBody(study),
});

export function directCaseStudyMediaIds(study: Record<string, any>): string[] {
  return directProjectMediaIds(withBody(study));
}

export function caseStudyMediaClosure(
  study: Record<string, any>,
  records: Content[],
  published = false,
): Content[] {
  return projectMediaClosure(withBody(study), records, published);
}

export function validateCaseStudyPublication(
  study: Record<string, any>,
  records: Content[],
) {
  return validateProjectPublication(withBody(study), records, 'case study');
}
